import { makeAutoObservable, runInAction } from 'mobx'
import { getBusTrajectoryInitial, getBusTrajectoryLatest, type BusTrajectoryData, type BusPosition } from '@/utils/api/busApi'
import { renderBusModels, animateSingleBus, trackBusEntity, stopTracking, getCurrentTrackedBus } from '@/utils/cesium/glbRenderer'

class BusStore {
  isLoading = false
  busData: BusTrajectoryData[] = []
  latestPositions: Map<string, BusPosition> = new Map()

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
        this.busData = response.data
      })

      await renderBusModels(response.data)
      await this.updateLatestPositions()


    } catch (error) {
      console.error('[BusStore] Initialization failed:', error)
      throw error
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateLatestPositions() {
    try {
      const response = await getBusTrajectoryLatest()

      runInAction(() => {
        this.latestPositions.clear()
        response.data.forEach(position => {
          this.latestPositions.set(position.vehicle_number, position)
        })
      })


    } catch (error) {
      console.error('[BusStore] Position update failed:', error)
    }
  }


  cleanup() {
    this.busData = []
    this.latestPositions.clear()
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
}

export const busStore = new BusStore()