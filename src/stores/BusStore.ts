import { makeAutoObservable, runInAction } from 'mobx'
import { getBusTrajectoryInitial, getBusTrajectoryLatest, type BusTrajectoryData, type BusPosition } from '@/utils/api/busApi'
import {
  renderBusModels,
  trackBusEntity,
  stopTracking,
  getCurrentTrackedBus,
  startProgressAnimationSystem,
  stopProgressAnimationSystem,
  setBusTargetProgress
} from '@/utils/cesium/glbRenderer'

// 개별 버스 애니메이션을 위한 인터페이스
interface BusAnimationState {
  vehicleNumber: string
  positionQueue: BusPosition[]  // 대기 중인 위치들
  isAnimating: boolean
  currentAnimation?: {
    from: BusPosition
    to: BusPosition
    startTime: number
    duration: number
    timer?: NodeJS.Timeout
  }
}

interface AnimationSystemState {
  playbackSpeed: number
  isEnabled: boolean
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

  // 개별 버스 애니메이션 시스템
  busAnimations: Map<string, BusAnimationState> = new Map()
  animationSystem: AnimationSystemState = {
    playbackSpeed: 1.0,
    isEnabled: true
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

      // 버스 애니메이션 상태 초기화
      this.initializeBusAnimations()

      // preRender 기반 progress 애니메이션 시스템 시작
      startProgressAnimationSystem()
      console.log('[BusStore] Progress animation system started')

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
    this.cleanupAllAnimations()
    stopProgressAnimationSystem()
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

      // 새 데이터가 있으면 개별 버스 애니메이션 시작
      if (hasNewData && this.animationSystem.isEnabled) {
        console.log('[BusStore] New data received, starting individual bus animations')
        this.processNewPositionData()
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
   * 버스 애니메이션 상태 초기화
   */
  private initializeBusAnimations(): void {
    console.log('[BusStore] Initializing bus animation states...')

    this.busData.forEach(bus => {
      if (!this.busAnimations.has(bus.vehicle_number)) {
        this.busAnimations.set(bus.vehicle_number, {
          vehicleNumber: bus.vehicle_number,
          positionQueue: [],
          isAnimating: false
        })
      }
    })

    console.log(`[BusStore] Animation states initialized for ${this.busAnimations.size} buses`)
  }

  /**
   * 새 위치 데이터 처리 및 애니메이션 시작
   */
  private processNewPositionData(): void {
    this.busData.forEach(bus => {
      const animationState = this.busAnimations.get(bus.vehicle_number)
      if (!animationState) return

      // 최신 2개 위치를 시간순으로 정렬
      const sortedPositions = [...bus.positions].sort((a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )

      if (sortedPositions.length >= 2) {
        // 큐에 최신 위치 추가 (중복 체크)
        const latestPosition = sortedPositions[sortedPositions.length - 1]
        const isDuplicate = animationState.positionQueue.some(pos =>
          pos.work_id === latestPosition.work_id && pos.recorded_at === latestPosition.recorded_at
        )

        if (!isDuplicate) {
          animationState.positionQueue.push(latestPosition)
          console.log(`[BusStore] Added position to queue for bus ${bus.vehicle_number}`)
        }

        // 애니메이션 중이 아니면 시작
        if (!animationState.isAnimating) {
          this.startNextAnimation(bus.vehicle_number)
        }
      }
    })
  }


  /**
   * 개별 버스의 다음 애니메이션 시작 (progress_percent 기반)
   */
  private startNextAnimation(vehicleNumber: string): void {
    const animationState = this.busAnimations.get(vehicleNumber)
    if (!animationState || animationState.isAnimating || animationState.positionQueue.length === 0) {
      return
    }

    // 큐에서 다음 위치 가져오기
    const nextPosition = animationState.positionQueue.shift()!

    // 현재 위치 찾기 (busData에서 가장 최근 위치)
    const busData = this.busData.find(bus => bus.vehicle_number === vehicleNumber)
    if (!busData || busData.positions.length === 0) {
      console.warn(`[BusStore] No current position found for bus ${vehicleNumber}`)
      return
    }

    const sortedPositions = [...busData.positions].sort((a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
    const currentPosition = sortedPositions[sortedPositions.length - 2] || sortedPositions[0]

    // progress_percent 필수 검증
    if (nextPosition.progress_percent === undefined || nextPosition.progress_percent === null) {
      console.error(`[BusStore] Missing progress_percent in nextPosition for bus ${vehicleNumber}:`, nextPosition)
      runInAction(() => {
        animationState.isAnimating = false
      })
      // 큐에 다음 데이터가 있으면 재시도
      if (animationState.positionQueue.length > 0) {
        setTimeout(() => this.startNextAnimation(vehicleNumber), 100)
      }
      return
    }

    if (currentPosition.progress_percent === undefined || currentPosition.progress_percent === null) {
      console.error(`[BusStore] Missing progress_percent in currentPosition for bus ${vehicleNumber}:`, currentPosition)
      runInAction(() => {
        animationState.isAnimating = false
      })
      return
    }

    // progress_percent 기반 애니메이션
    const targetProgressPercent = nextPosition.progress_percent
    const currentProgressPercent = currentPosition.progress_percent

    console.log(`[BusStore] Starting progress animation for bus ${vehicleNumber}: ${currentProgressPercent.toFixed(2)}% → ${targetProgressPercent.toFixed(2)}%`)

    // 두 위치 데이터의 시간 차이 계산
    const timeDiff = BusStore.getTimeDifferenceInSeconds(currentPosition, nextPosition)

    // 실제 시간 차이를 애니메이션 duration으로 사용 (최소 2초 보장)
    const durationSeconds = timeDiff && timeDiff > 0 ? timeDiff : 2.0
    const duration = durationSeconds / this.animationSystem.playbackSpeed

    console.log(`[BusStore] Animation duration for bus ${vehicleNumber}: ${durationSeconds.toFixed(1)}s (time diff between positions)`)

    // 애니메이션 상태 업데이트
    runInAction(() => {
      animationState.isAnimating = true
      animationState.currentAnimation = {
        from: currentPosition,
        to: nextPosition,
        startTime: Date.now(),
        duration: duration * 1000
      }
    })

    // Progress 기반 Cesium 애니메이션 시작 (시간 기반 선형 이동)
    setBusTargetProgress(vehicleNumber, targetProgressPercent, duration)

    // 애니메이션 완료 타이머 설정
    if (animationState.currentAnimation) {
      animationState.currentAnimation.timer = setTimeout(() => {
        this.onAnimationComplete(vehicleNumber)
      }, duration * 1000)
    }
  }

  /**
   * 애니메이션 완료 처리
   */
  private onAnimationComplete(vehicleNumber: string): void {
    const animationState = this.busAnimations.get(vehicleNumber)
    if (!animationState) return

    console.log(`[BusStore] Animation completed for bus ${vehicleNumber}`)

    runInAction(() => {
      animationState.isAnimating = false
      animationState.currentAnimation = undefined
    })

    // 큐에 더 있으면 다음 애니메이션 시작
    if (animationState.positionQueue.length > 0) {
      this.startNextAnimation(vehicleNumber)
    }
  }

  /**
   * 모든 애니메이션 정리
   */
  private cleanupAllAnimations(): void {
    this.busAnimations.forEach((animationState) => {
      if (animationState.currentAnimation?.timer) {
        clearTimeout(animationState.currentAnimation.timer)
      }
    })
    this.busAnimations.clear()
  }

  // 개별 버스 제어 함수

  /**
   * @deprecated Progress 기반 애니메이션으로 변경됨. setBusTargetProgress() 사용 권장
   */
  animateBusToPosition(): boolean {
    console.warn('[BusStore] animateBusToPosition is deprecated. Progress-based animation is now used automatically.')
    return false
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

  // 애니메이션 시스템 제어

  /**
   * 애니메이션 시스템 시작 (초기화 후 자동 호출)
   */
  async startAnimationSystem(): Promise<void> {
    if (!this.animationSystem.isEnabled) {
      runInAction(() => {
        this.animationSystem.isEnabled = true
      })
    }

    console.log('[BusStore] Animation system started')

    // 초기 로딩 시: 각 버스가 -3% 위치에서 최신 위치로 애니메이션 시작
    // renderBusModels()에서 이미 targetProgress가 최신 위치로 설정되어 있음
    this.busData.forEach(bus => {
      const animationState = this.busAnimations.get(bus.vehicle_number)
      if (!animationState) return

      // 애니메이션 상태가 초기화되어 있고, targetProgress가 설정되어 있으면
      // 즉시 애니메이션 시작 (초기 로딩용)
      if (!animationState.isAnimating && bus.positions.length >= 1) {
        const latestPosition = bus.positions[bus.positions.length - 1]
        const targetProgressPercent = latestPosition.progress_percent

        if (targetProgressPercent !== undefined && targetProgressPercent !== null) {
          // 초기 애니메이션 duration: 10초 (천천히 부드러운 시작)
          const initialDuration = 10.0
          setBusTargetProgress(bus.vehicle_number, targetProgressPercent, initialDuration)

          // 애니메이션 완료 후 상태 업데이트
          setTimeout(() => {
            runInAction(() => {
              animationState.isAnimating = false
            })
          }, initialDuration * 1000)

          console.log(`[BusStore] Initial animation started for bus ${bus.vehicle_number}: ${targetProgressPercent.toFixed(2)}% (${initialDuration}s)`)
        }
      }
    })
  }

  /**
   * 애니메이션 시스템 중지
   */
  stopAnimationSystem(): void {
    runInAction(() => {
      this.animationSystem.isEnabled = false
    })

    this.cleanupAllAnimations()
    console.log('[BusStore] Animation system stopped')
  }

  /**
   * 애니메이션 재생 속도 설정
   */
  setPlaybackSpeed(speed: number): void {
    runInAction(() => {
      this.animationSystem.playbackSpeed = Math.max(0.1, Math.min(10, speed)) // 0.1x ~ 10x
    })

    console.log(`[BusStore] Playback speed set to ${this.animationSystem.playbackSpeed}x`)
  }

  // Getters for animation state
  get isAnimationSystemEnabled(): boolean {
    return this.animationSystem.isEnabled
  }

  get activeAnimations(): number {
    return Array.from(this.busAnimations.values()).filter(state => state.isAnimating).length
  }

  get totalQueuedAnimations(): number {
    return Array.from(this.busAnimations.values()).reduce((total, state) => total + state.positionQueue.length, 0)
  }

  get animationSystemStatus(): { enabled: boolean, activeAnimations: number, queuedAnimations: number } {
    return {
      enabled: this.animationSystem.isEnabled,
      activeAnimations: this.activeAnimations,
      queuedAnimations: this.totalQueuedAnimations
    }
  }
}

export const busStore = new BusStore()