import { get } from './request'
import { getApiPath } from './config'
import type { StationSensorResponse } from './types'

export interface BusPosition {
  work_id: string
  sensor_id: string
  vehicle_number: string
  route_name: string
  recorded_at: string
  position: {
    longitude: number
    latitude: number
  }
  sensor_data: {
    humidity: number
    temperature: number
    voc: number
    co2: number
    pm: number
    fpm: number
  }
}

export interface BusTrajectoryData {
  vehicle_number: string
  route_name: string
  positions: BusPosition[]
}

export interface BusTrajectoryResponse {
  status: string
  data: BusTrajectoryData[]
  meta: {
    total_buses: number
    total_records: number
    last_updated: string
    polling_interval_sec: number
  }
}

export interface BusLatestResponse {
  status: string
  data: BusPosition[]
  meta: {
    total_buses: number
    total_records: number
    last_updated: string
    polling_interval_sec: number
  }
}

/**
 * 버스 초기 궤적 데이터를 가져오는 함수
 * 19개 버스 × 10개 위치 = 190개 레코드
 */
export async function getBusTrajectoryInitial(): Promise<BusTrajectoryResponse> {
  try {
    const response = await get<BusTrajectoryResponse>(getApiPath('api/v1/buses/trajectory/initial'))

    if (!response.ok) {
      throw new Error(`Bus trajectory API failed with status ${response.status}`)
    }

    console.log('[getBusTrajectoryInitial] API 호출 성공:', {
      totalBuses: response.data.meta.total_buses,
      totalRecords: response.data.meta.total_records,
      lastUpdated: response.data.meta.last_updated
    })

    return response.data
  } catch (error) {
    console.error('[getBusTrajectoryInitial] API 호출 실패:', error)
    throw error
  }
}

/**
 * 버스 최신 위치 데이터를 가져오는 함수
 * 19개 버스 × 1개 최신 위치 = 19개 레코드
 */
export async function getBusTrajectoryLatest(): Promise<BusLatestResponse> {
  try {
    const response = await get<BusLatestResponse>(getApiPath('api/v1/buses/trajectory/latest'))

    if (!response.ok) {
      throw new Error(`Bus latest positions API failed with status ${response.status}`)
    }

    console.log('[getBusTrajectoryLatest] API 호출 성공:', {
      totalBuses: response.data.meta.total_buses,
      totalRecords: response.data.meta.total_records,
      lastUpdated: response.data.meta.last_updated
    })

    return response.data
  } catch (error) {
    console.error('[getBusTrajectoryLatest] API 호출 실패:', error)
    throw error
  }
}

/**
 * 모든 정류장의 최신 센서 데이터를 가져오는 함수
 * GET /api/v1/sensor-data/stations/latest-all
 */
export async function getStationSensorData(): Promise<StationSensorResponse> {
  try {
    const response = await get<StationSensorResponse>(getApiPath('api/v1/sensor-data/stations/latest-all'))

    if (!response.ok) {
      throw new Error(`Station sensor data API failed with status ${response.status}`)
    }

    console.log('[getStationSensorData] API 호출 성공:', {
      totalStations: response.data.data.length,
      sampleData: response.data.data[0] // 첫 번째 데이터 샘플 로그
    })

    return response.data
  } catch (error) {
    console.error('[getStationSensorData] API 호출 실패:', error)
    throw error
  }
}