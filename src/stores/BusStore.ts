import { makeAutoObservable, runInAction } from 'mobx'
import { getBusTrajectoryInitial, getBusTrajectoryLatest, type BusTrajectoryData, type BusPosition } from '@/utils/api/busApi'
import { renderBusModels, animateSingleBus, trackBusEntity, stopTracking, getCurrentTrackedBus } from '@/utils/cesium/glbRenderer'

// Timeline 시뮬레이션을 위한 인터페이스
interface BusSimulationTrack {
  vehicleNumber: string
  positions: BusPosition[]
  currentIndex: number
  isCompleted: boolean
}

interface SimulationState {
  isPlaying: boolean
  currentStep: number
  maxSteps: number
  busTracks: Map<string, BusSimulationTrack>
  playbackSpeed: number
  simulationTimer?: NodeJS.Timeout
}

class BusStore {
  isLoading = false
  busData: BusTrajectoryData[] = []
  latestPositions: Map<string, BusPosition> = new Map()

  // 실시간 폴링 상태
  isPolling = false
  pollInterval?: NodeJS.Timeout
  pollIntervalSeconds = 10
  lastSuccessfulPoll: Date | null = null
  pollFailureCount = 0
  maxPollFailures = 3

  // Timeline 시뮬레이션 상태
  simulation: SimulationState = {
    isPlaying: false,
    currentStep: 0,
    maxSteps: 0,
    busTracks: new Map(),
    playbackSpeed: 1.0,
    simulationTimer: undefined
  }

  constructor() {
    makeAutoObservable(this)
  }

  async initializeBusSystem() {
    if (this.isLoading) return

    runInAction(() => {
      this.isLoading = true
    })

    try {
      const response = await getBusTrajectoryInitial()

      runInAction(() => {
        // 초기 데이터에서도 각 버스별로 최신 2건만 저장
        this.busData = response.data.map(bus => ({
          ...bus,
          positions: bus.positions
            .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
            .slice(-2) // 시간순 정렬 후 최신 2건만 유지
        }))
      })

      await renderBusModels(this.busData)
      await this.updateLatestPositions()

      // 초기화 완료 후 실시간 폴링 자동 시작
      console.log('[BusStore] Initialization complete, starting real-time polling')
      this.startRealTimePolling()

    } catch (error) {
      console.error('[BusStore] Initialization failed:', error)
      throw error
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  cleanup() {
    this.stopRealTimePolling()
    this.busData = []
    this.latestPositions.clear()
  }

  // 실시간 폴링 시스템

  /**
   * 실시간 버스 위치 폴링 시작
   */
  startRealTimePolling(): void {
    if (this.isPolling) {
      console.log('[BusStore] Real-time polling already running')
      return
    }

    console.log(`[BusStore] Starting real-time polling every ${this.pollIntervalSeconds} seconds`)

    runInAction(() => {
      this.isPolling = true
    })

    // 즉시 첫 번째 업데이트 실행
    this.updateLatestPositions()

    // 이후 주기적 업데이트
    this.pollInterval = setInterval(() => {
      this.updateLatestPositions()
    }, this.pollIntervalSeconds * 1000)
  }

  /**
   * 실시간 버스 위치 폴링 중지
   */
  stopRealTimePolling(): void {
    if (!this.isPolling) return

    console.log('[BusStore] Stopping real-time polling')

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = undefined
    }

    runInAction(() => {
      this.isPolling = false
    })
  }

  /**
   * 최신 버스 위치 업데이트 (최신 2건만 유지)
   */
  async updateLatestPositions() {
    try {
      const response = await getBusTrajectoryLatest()

      // 시간순으로 정렬된 새 위치 데이터
      const sortedNewData = response.data.sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )

      let hasNewData = false

      runInAction(() => {
        sortedNewData.forEach(newPosition => {
          const vehicleNumber = newPosition.vehicle_number

          // 해당 버스의 기존 데이터 찾기
          const busData = this.busData.find(bus => bus.vehicle_number === vehicleNumber)

          if (busData) {
            // 데이터 자체 중복 체크 - work_id와 recorded_at 기준으로 완전한 중복 확인
            const isDuplicate = busData.positions.some(pos =>
              pos.work_id === newPosition.work_id &&
              pos.recorded_at === newPosition.recorded_at &&
              pos.position.longitude === newPosition.position.longitude &&
              pos.position.latitude === newPosition.position.latitude
            )

            if (!isDuplicate) {
              // 새 위치를 추가하고 최신 2건만 유지
              busData.positions.push(newPosition)

              // 시간순으로 재정렬
              busData.positions.sort((a, b) =>
                new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
              )

              // 최신 2건만 유지 (가장 최근 2개 위치)
              if (busData.positions.length > 2) {
                busData.positions = busData.positions.slice(-2)
              }

              hasNewData = true
              console.log(`[BusStore] Added new position to bus ${vehicleNumber}: keeping latest ${busData.positions.length} positions`)
            } else {
              console.log(`[BusStore] Skipped duplicate data ${newPosition.work_id} for bus ${vehicleNumber}`)
            }
          }

          // latestPositions도 업데이트 (기존 로직 호환성)
          this.latestPositions.set(vehicleNumber, newPosition)
        })

        // 성공적인 폴링 기록
        this.lastSuccessfulPoll = new Date()
        this.pollFailureCount = 0
      })

      // 새 데이터가 있고 시뮬레이션이 완료된 상태라면 자동 재시작
      if (hasNewData && !this.simulation.isPlaying && this.simulation.currentStep >= this.simulation.maxSteps) {
        console.log('[BusStore] New data received, restarting simulation automatically')
        await this.startTimelineSimulation()
      }

      // 업데이트된 데이터로 시뮬레이션 트랙 갱신 (진행 중인 시뮬레이션이 있다면)
      if (this.simulation.busTracks.size > 0) {
        this.updateSimulationTracks()
      }

    } catch (error) {
      console.error('[BusStore] Latest positions update failed:', error)

      runInAction(() => {
        this.pollFailureCount++
      })

      // 연속 실패 시 경고
      if (this.pollFailureCount >= this.maxPollFailures) {
        console.warn(`[BusStore] Polling failed ${this.pollFailureCount} times consecutively`)
        this.handlePollingFailure()
      }
    }
  }

  /**
   * 폴링 실패 처리
   */
  private handlePollingFailure(): void {
    console.warn('[BusStore] Handling polling failure - extending poll interval')

    runInAction(() => {
      // 폴링 간격을 일시적으로 늘림 (30초)
      this.pollIntervalSeconds = 30
    })

    // 폴링 재시작
    if (this.isPolling) {
      this.stopRealTimePolling()
      setTimeout(() => {
        console.log('[BusStore] Restarting polling with extended interval')
        this.startRealTimePolling()
      }, 5000) // 5초 후 재시작
    }
  }

  /**
   * 시뮬레이션 트랙을 새 데이터로 업데이트
   */
  private updateSimulationTracks(): void {
    this.busData.forEach(bus => {
      const track = this.simulation.busTracks.get(bus.vehicle_number)
      if (track) {
        // 시간순 정렬된 위치로 트랙 업데이트
        const sortedPositions = [...bus.positions].sort((a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        )

        track.positions = sortedPositions

        // maxSteps 재계산
        const newMaxSteps = Math.max(...Array.from(this.simulation.busTracks.values()).map(t => t.positions.length))
        this.simulation.maxSteps = newMaxSteps

        console.log(`[BusStore] Updated simulation track for bus ${bus.vehicle_number}: ${sortedPositions.length} positions`)
      }
    })
  }


  // 개별 버스 제어 함수

  animateBusToPosition(
    vehicleNumber: string,
    longitude: number,
    latitude: number,
    durationSeconds: number = 3
  ): boolean {
    const success = animateSingleBus(vehicleNumber, longitude, latitude, durationSeconds)
    return success
  }


  // 카메라 추적 함수
  trackBus(vehicleNumber: string): boolean {
    const success = trackBusEntity(vehicleNumber)
    return success
  }

  stopCameraTracking() {
    stopTracking()
  }

  get trackedBusId(): string | null {
    return getCurrentTrackedBus()
  }

  get totalBuses() {
    return this.busData.length
  }

  get activeBuses() {
    return this.latestPositions.size
  }

  get isSystemReady() {
    return !this.isLoading && this.totalBuses > 0
  }

  /**
   * 인접한 두 버스 위치의 시간 차이를 초 단위로 계산
   * @param position1 첫 번째 위치 데이터
   * @param position2 두 번째 위치 데이터
   * @returns 시간 차이 (초), 파싱 실패 시 null
   */
  static getTimeDifferenceInSeconds(position1: BusPosition, position2: BusPosition): number | null {
    try {
      const time1 = new Date(position1.recorded_at).getTime()
      const time2 = new Date(position2.recorded_at).getTime()

      if (isNaN(time1) || isNaN(time2)) {
        console.error('[BusStore] Invalid timestamp format:', {
          position1: position1.recorded_at,
          position2: position2.recorded_at
        })
        return null
      }

      return Math.abs(time2 - time1) / 1000
    } catch (error) {
      console.error('[BusStore] Error calculating time difference:', error)
      return null
    }
  }

  // Timeline 시뮬레이션 시스템

  /**
   * 각 버스별 시뮬레이션 트랙 생성 (최신 2건만 사용)
   */
  private createBusTracks(): void {
    console.log('[BusStore] Creating bus tracks from latest 2 positions per bus...')

    const busTracks = new Map<string, BusSimulationTrack>()
    let maxSteps = 0

    // 각 버스별로 트랙 생성
    this.busData.forEach(bus => {
      // 시간순으로 정렬 (가장 오래된 것부터)
      const sortedPositions = [...bus.positions].sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )

      // 최신 2건만 사용 (가장 최근 + 그 전 시점)
      // sortedPositions는 오래된 것부터 → 최신 순이므로 마지막 2개가 최신 2건
      const latestTwoPositions = sortedPositions.slice(-2) // [두번째최신, 가장최신]

      if (latestTwoPositions.length >= 2) {
        busTracks.set(bus.vehicle_number, {
          vehicleNumber: bus.vehicle_number,
          positions: latestTwoPositions,
          currentIndex: 0,
          isCompleted: false
        })

        // 최대 스텝 수 계산 (항상 2가 될 것)
        maxSteps = Math.max(maxSteps, latestTwoPositions.length)

        console.log(`[BusStore] Bus ${bus.vehicle_number}: Using positions from ${latestTwoPositions[0].recorded_at} to ${latestTwoPositions[1].recorded_at}`)
      } else {
        console.warn(`[BusStore] Bus ${bus.vehicle_number} has insufficient data (${latestTwoPositions.length} positions)`)
      }
    })

    runInAction(() => {
      this.simulation.busTracks = busTracks
      this.simulation.maxSteps = maxSteps
      this.simulation.currentStep = 0
    })

    console.log(`[BusStore] Bus tracks created: ${busTracks.size} buses, max ${maxSteps} steps (latest 2 positions only)`)
  }

  /**
   * 시뮬레이션 시작 위치로 모든 버스 초기화 (최신 2건 중 이전 시점)
   */
  private async renderInitialPositions(): Promise<void> {
    console.log('[BusStore] Rendering initial simulation positions...')

    // 각 버스의 시뮬레이션 시작 위치 (최신 2건 중 첫 번째) 추출
    const initialData: BusTrajectoryData[] = this.busData.map(bus => {
      // 시간순 정렬 후 최신 2건 가져오기
      const sortedPositions = [...bus.positions].sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )
      const latestTwo = sortedPositions.slice(-2)

      return {
        ...bus,
        positions: latestTwo.length >= 2 ? [latestTwo[0]] : latestTwo // 첫 번째 위치 또는 가능한 위치
      }
    }).filter(bus => bus.positions.length > 0) // 위치 데이터가 있는 버스만

    await renderBusModels(initialData)
    console.log('[BusStore] Initial simulation positions rendered')
  }

  /**
   * Timeline 시뮬레이션 시작
   */
  async startTimelineSimulation(): Promise<void> {
    if (this.simulation.busTracks.size === 0) {
      this.createBusTracks()
    }

    if (this.simulation.busTracks.size === 0) {
      console.error('[BusStore] No bus track data available')
      return
    }

    // 초기 위치 렌더링
    await this.renderInitialPositions()

    runInAction(() => {
      this.simulation.isPlaying = true
      this.simulation.currentStep = 0
    })

    console.log(`[BusStore] Timeline simulation started with ${this.simulation.busTracks.size} buses, ${this.simulation.maxSteps} steps`)
    this.processNextStep()
  }

  /**
   * 다음 시뮬레이션 스텝 처리 (모든 버스 동시 이동)
   */
  private processNextStep(): void {
    if (!this.simulation.isPlaying || this.simulation.currentStep >= this.simulation.maxSteps) {
      this.stopTimelineSimulation()
      this.cleanupOldDataAfterSimulation()
      return
    }

    let totalDuration = 0
    let movingBusCount = 0

    // 모든 버스를 동시에 다음 위치로 이동
    this.simulation.busTracks.forEach((track, vehicleNumber) => {
      if (track.isCompleted || track.currentIndex >= track.positions.length) {
        return
      }

      const currentPosition = track.positions[track.currentIndex]
      const { longitude, latitude } = currentPosition.position

      // 이전 위치와의 시간 차이 계산
      let duration = 2.0 // 기본 2초
      if (track.currentIndex > 0) {
        const prevPosition = track.positions[track.currentIndex - 1]
        const timeDiff = BusStore.getTimeDifferenceInSeconds(prevPosition, currentPosition)
        duration = timeDiff ? Math.min(timeDiff, 60) : 2.0 // 최대 60초로 제한
      }

      // 재생 속도 적용
      const animationDuration = duration / this.simulation.playbackSpeed

      console.log(`[BusStore] Step ${this.simulation.currentStep + 1}/${this.simulation.maxSteps}: Moving bus ${vehicleNumber} to ${latitude}, ${longitude} (duration: ${animationDuration.toFixed(1)}s)`)

      animateSingleBus(vehicleNumber, longitude, latitude, animationDuration)

      // 다음 인덱스로 이동
      track.currentIndex++
      if (track.currentIndex >= track.positions.length) {
        track.isCompleted = true
      }

      totalDuration = Math.max(totalDuration, animationDuration)
      movingBusCount++
    })

    runInAction(() => {
      this.simulation.currentStep++
    })

    if (movingBusCount === 0) {
      // 더 이상 움직일 버스가 없으면 종료
      this.stopTimelineSimulation()
      return
    }

    // 다음 스텝 스케줄링 (가장 긴 애니메이션 시간 기준)
    const nextStepDelay = (totalDuration * 1000)
    this.simulation.simulationTimer = setTimeout(() => {
      this.processNextStep()
    }, nextStepDelay)
  }

  /**
   * Timeline 시뮬레이션 일시정지
   */
  pauseTimelineSimulation(): void {
    runInAction(() => {
      this.simulation.isPlaying = false
    })

    if (this.simulation.simulationTimer) {
      clearTimeout(this.simulation.simulationTimer)
      this.simulation.simulationTimer = undefined
    }

    console.log('[BusStore] Timeline simulation paused')
  }

  /**
   * Timeline 시뮬레이션 재개
   */
  resumeTimelineSimulation(): void {
    if (this.simulation.currentStep >= this.simulation.maxSteps) {
      console.log('[BusStore] Simulation already completed')
      return
    }

    runInAction(() => {
      this.simulation.isPlaying = true
    })

    console.log('[BusStore] Timeline simulation resumed')
    this.processNextStep()
  }

  /**
   * Timeline 시뮬레이션 정지 및 초기화
   */
  stopTimelineSimulation(): void {
    runInAction(() => {
      this.simulation.isPlaying = false
      this.simulation.currentStep = 0
      // 모든 트랙 초기화
      this.simulation.busTracks.forEach(track => {
        track.currentIndex = 0
        track.isCompleted = false
      })
    })

    if (this.simulation.simulationTimer) {
      clearTimeout(this.simulation.simulationTimer)
      this.simulation.simulationTimer = undefined
    }

    console.log('[BusStore] Timeline simulation stopped')
  }

  /**
   * 시뮬레이션 완료 시 오래된 데이터 정리
   */
  private cleanupOldDataAfterSimulation(): void {
    // 최신 2건만 유지하는 구조에서는 정리할 필요 없음
    console.log('[BusStore] Simulation completed - data already maintained at 2 positions per bus')
  }

  /**
   * 시뮬레이션 재생 속도 설정
   */
  setPlaybackSpeed(speed: number): void {
    runInAction(() => {
      this.simulation.playbackSpeed = Math.max(0.1, Math.min(10, speed)) // 0.1x ~ 10x
    })

    console.log(`[BusStore] Playback speed set to ${this.simulation.playbackSpeed}x`)
  }

  // Getters for simulation state
  get isSimulationPlaying(): boolean {
    return this.simulation.isPlaying
  }

  get simulationProgress(): number {
    if (this.simulation.maxSteps === 0) return 0
    return (this.simulation.currentStep / this.simulation.maxSteps) * 100
  }

  get simulationEventCount(): number {
    return this.simulation.maxSteps
  }

  get currentSimulationEvent(): { step: number, maxSteps: number, activeBuses: number } | null {
    if (this.simulation.maxSteps === 0) return null

    const activeBuses = Array.from(this.simulation.busTracks.values())
      .filter(track => !track.isCompleted).length

    return {
      step: this.simulation.currentStep,
      maxSteps: this.simulation.maxSteps,
      activeBuses
    }
  }
}

export const busStore = new BusStore()