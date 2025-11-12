import { makeAutoObservable } from 'mobx'
import {
  getRealtimeStationConcentration,
  getTodayStationConcentration,
  getWeekStationConcentration,
  getMonthStationConcentration,
  getRealtimeFacilityData,
  getTodayFacilityData,
  getWeekFacilityData,
  getMonthFacilityData
} from '../utils/api/statisticsApi'
import type { ChartDataPoint } from '../utils/chart/sensorDataTransform'
import type { StationConcentrationData, FacilityData, FacilitySimulationData } from '../types/statistics'

/**
 * 목업 데이터 생성 유틸리티
 */

// 랜덤 PM10 값 생성 (0-150)
function randomPM10(): number {
  return Math.floor(Math.random() * 150)
}

// 랜덤 PM2.5 값 생성 (0-75)
function randomPM25(): number {
  return Math.floor(Math.random() * 75)
}

// 랜덤 VOCs 값 생성 (0-500)
function randomVOC(): number {
  return Math.floor(Math.random() * 500)
}

// 랜덤 매우나쁨 횟수 (0-10)
function randomVeryBadCount(): number {
  return Math.floor(Math.random() * 11)
}

// 랜덤 나쁨 횟수 (0-15)
function randomBadCount(): number {
  return Math.floor(Math.random() * 16)
}

// ============================================================================
// 정류장별 농도 데이터 (Bar + Line 그래프용)
// ============================================================================

export const MOCK_STATION_CONCENTRATION_DATA: StationConcentrationData[] = [
  { stationName: '연제공용버스차고지(13179)', stationId: '13179', maxConcentration: 85, avgConcentration: 52 },
  { stationName: '초읍고개(13183)', stationId: '13183', maxConcentration: 92, avgConcentration: 58 },
  { stationName: '서면한전(05713)', stationId: '05713', maxConcentration: 78, avgConcentration: 48 },
  { stationName: '범내골역(05715)', stationId: '05715', maxConcentration: 95, avgConcentration: 61 },
  { stationName: '당감초교앞(05720)', stationId: '05720', maxConcentration: 68, avgConcentration: 42 },
  { stationName: '초읍역(05725)', stationId: '05725', maxConcentration: 72, avgConcentration: 45 },
  { stationName: '부전역(05730)', stationId: '05730', maxConcentration: 105, avgConcentration: 72 },
  { stationName: '전포동(05735)', stationId: '05735', maxConcentration: 88, avgConcentration: 55 },
  { stationName: '서면역(05740)', stationId: '05740', maxConcentration: 98, avgConcentration: 65 },
  { stationName: '범천동(05745)', stationId: '05745', maxConcentration: 82, avgConcentration: 51 }
]

// ============================================================================
// 실시간 목업 데이터
// ============================================================================

export const MOCK_REALTIME_STATION_DATA: ChartDataPoint[] = [
  {
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    timestamp: new Date().toISOString(),
    pm10: 45,
    pm25: 28,
    voc: 350
  }
]

export const MOCK_REALTIME_FACILITY_DATA: FacilitySimulationData[] = [
  {
    time: '현재',
    timestamp: new Date().toISOString(),
    veryBadCount: 3,
    badCount: 7
  }
]

// ============================================================================
// 오늘 목업 데이터 (24시간 hourly)
// ============================================================================

export const MOCK_TODAY_STATION_DATA: ChartDataPoint[] = Array.from({ length: 24 }, (_, i) => {
  const now = new Date()
  const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i, 0, 0)

  return {
    time: hour.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    timestamp: hour.toISOString(),
    pm10: randomPM10(),
    pm25: randomPM25(),
    voc: randomVOC()
  }
})

export const MOCK_TODAY_FACILITY_DATA: FacilitySimulationData[] = Array.from({ length: 24 }, (_, i) => {
  const now = new Date()
  const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i, 0, 0)

  return {
    time: hour.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    timestamp: hour.toISOString(),
    veryBadCount: randomVeryBadCount(),
    badCount: randomBadCount()
  }
})

// ============================================================================
// 최근 7일 목업 데이터 (daily)
// ============================================================================

export const MOCK_WEEK_STATION_DATA: ChartDataPoint[] = Array.from({ length: 7 }, (_, i) => {
  const now = new Date()
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 0, 0, 0)

  return {
    time: day.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\. /g, '/').replace(/\.$/, ''),
    timestamp: day.toISOString(),
    pm10: randomPM10(),
    pm25: randomPM25(),
    voc: randomVOC()
  }
})

export const MOCK_WEEK_FACILITY_DATA: FacilitySimulationData[] = Array.from({ length: 7 }, (_, i) => {
  const now = new Date()
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 0, 0, 0)

  return {
    time: day.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\. /g, '/').replace(/\.$/, ''),
    timestamp: day.toISOString(),
    veryBadCount: randomVeryBadCount(),
    badCount: randomBadCount()
  }
})

// ============================================================================
// 최근 1개월 목업 데이터 (daily)
// ============================================================================

export const MOCK_MONTH_STATION_DATA: ChartDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const now = new Date()
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i), 0, 0, 0)

  return {
    time: day.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\. /g, '/').replace(/\.$/, ''),
    timestamp: day.toISOString(),
    pm10: randomPM10(),
    pm25: randomPM25(),
    voc: randomVOC()
  }
})

export const MOCK_MONTH_FACILITY_DATA: FacilitySimulationData[] = Array.from({ length: 30 }, (_, i) => {
  const now = new Date()
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i), 0, 0, 0)

  return {
    time: day.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\. /g, '/').replace(/\.$/, ''),
    timestamp: day.toISOString(),
    veryBadCount: randomVeryBadCount(),
    badCount: randomBadCount()
  }
})

// ============================================================================
// 취약시설별 데이터 (Bar + Line 그래프용)
// ============================================================================

export const MOCK_FACILITY_DATA: FacilityData[] = [
  { facilityName: '부산진교육청', facilityId: 'F001', badCount: 120, veryBadCount: 72, totalCount: 192 },
  { facilityName: '부산대박물관', facilityId: 'F002', badCount: 95, veryBadCount: 65, totalCount: 160 },
  { facilityName: '광안1동 주민센터', facilityId: 'F003', badCount: 85, veryBadCount: 55, totalCount: 140 },
  { facilityName: '부산진구청', facilityId: 'F004', badCount: 78, veryBadCount: 48, totalCount: 126 },
  { facilityName: '남천도서관', facilityId: 'F005', badCount: 45, veryBadCount: 30, totalCount: 75 },
  { facilityName: '부산진 성당병원', facilityId: 'F006', badCount: 35, veryBadCount: 22, totalCount: 57 }
]

/**
 * Time period type for statistics data
 */
export type TimePeriod = 'realtime' | 'today' | 'week' | 'month'

/**
 * Facility type selection for chart display
 */
export type FacilityType = 'bad' | 'veryBad'

/**
 * Statistics data structure per time period
 */
interface PeriodData {
  stationData: StationConcentrationData[]
  facilityData: FacilityData[]
  isLoading: boolean
  error: string | null
  lastLoaded: number | null
}

/**
 * PriorityStatisticsStore
 *
 * Manages statistics data for priority analysis:
 * - Station concentration data (정류장 실측 농도)
 * - Facility simulation data (취약시설별 시뮬레이션)
 * - Time period selection (realtime, today, week, month)
 * - Facility type filter (bad, veryBad)
 */
class PriorityStatisticsStore {
  // ============================================================================
  // Observable State
  // ============================================================================

  /**
   * Statistics data storage per time period
   */
  private dataMap: Map<TimePeriod, PeriodData> = new Map()

  /**
   * Current facility type selection (bad or veryBad)
   * Shared across all time periods
   */
  facilityType: FacilityType = 'bad'

  /**
   * Flag to determine whether to use mock data or fetch from API
   * @default true
   */
  useMockData = true

  /**
   * Statistics popup minimize state
   */
  isStatisticsPopupMinimized = false

  constructor() {
    makeAutoObservable(this)
    this.initializeDataMap()
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize data map with default values for all time periods
   */
  private initializeDataMap() {
    const periods: TimePeriod[] = ['realtime', 'today', 'week', 'month']
    periods.forEach(period => {
      this.dataMap.set(period, {
        stationData: [],
        facilityData: [],
        isLoading: false,
        error: null,
        lastLoaded: null
      })
    })
  }

  // ============================================================================
  // Mock Data Control
  // ============================================================================

  setUseMockData(useMock: boolean) {
    this.useMockData = useMock
    this.reset() // Reset data when switching between mock and real data
  }


  // ============================================================================
  // Facility Type Selection
  // ============================================================================

  setFacilityType(type: FacilityType) {
    this.facilityType = type
  }

  toggleFacilityType() {
    this.facilityType = this.facilityType === 'bad' ? 'veryBad' : 'bad'
  }

  // ============================================================================
  // Data Access Methods
  // ============================================================================

  /**
   * Get period data safely
   */
  private getPeriodData(period: TimePeriod): PeriodData {
    const data = this.dataMap.get(period)
    if (!data) {
      throw new Error(`[PriorityStatisticsStore] Invalid period: ${period}`)
    }
    return data
  }

  /**
   * Get station concentration data for a specific period
   */
  getStationData(period: TimePeriod): StationConcentrationData[] {
    return this.getPeriodData(period).stationData
  }

  /**
   * Get facility simulation data for a specific period
   */
  getFacilityData(period: TimePeriod): FacilityData[] {
    return this.getPeriodData(period).facilityData
  }

  /**
   * Check if data is loading for a specific period
   */
  isLoading(period: TimePeriod): boolean {
    return this.getPeriodData(period).isLoading
  }

  /**
   * Get error message for a specific period
   */
  getError(period: TimePeriod): string | null {
    return this.getPeriodData(period).error
  }

  /**
   * Check if data exists for a specific period
   */
  hasData(period: TimePeriod): boolean {
    const data = this.getPeriodData(period)
    return data.stationData.length > 0 || data.facilityData.length > 0
  }

  // ============================================================================
  // Data Loading Methods
  // ============================================================================

  /**
   * Load statistics data for a specific period
   * Fetches both station and facility data in parallel
   */
  async loadPeriodData(period: TimePeriod): Promise<void> {
    const periodData = this.getPeriodData(period)

    // Skip if already loading
    if (periodData.isLoading) {
      console.log(`[PriorityStatisticsStore] Already loading data for ${period}`)
      return
    }

    // Update loading state
    periodData.isLoading = true
    periodData.error = null

    try {
      // Select API functions based on period
      const [stationResponse, facilityResponse] = await Promise.all([
        this.fetchStationData(period),
        this.fetchFacilityData(period)
      ])

      // Update data
      periodData.stationData = stationResponse
      periodData.facilityData = facilityResponse
      periodData.lastLoaded = Date.now()

      console.log(`[PriorityStatisticsStore] Loaded ${period} data successfully`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to load ${period} data`
      periodData.error = errorMessage
      console.error(`[PriorityStatisticsStore] Failed to load ${period} data:`, error)
    } finally {
      periodData.isLoading = false
    }
  }

  /**
   * Fetch station concentration data based on period
   */
  private async fetchStationData(period: TimePeriod): Promise<StationConcentrationData[]> {
    if (this.useMockData) {
      console.log(`[PriorityStatisticsStore] Using MOCK station data for ${period}`)
      // For mock data, we return the same detailed station concentration data for all periods
      return Promise.resolve(MOCK_STATION_CONCENTRATION_DATA)
    }

    switch (period) {
      case 'realtime':
        return await getRealtimeStationConcentration()
      case 'today':
        return await getTodayStationConcentration()
      case 'week':
        return await getWeekStationConcentration()
      case 'month':
        return await getMonthStationConcentration()
    }
  }

  /**
   * Fetch facility simulation data based on period
   */
  private async fetchFacilityData(period: TimePeriod): Promise<FacilityData[]> {
    if (this.useMockData) {
      console.log(`[PriorityStatisticsStore] Using MOCK facility data for ${period}`)
      // For mock data, we return the same detailed facility data for all periods
      return Promise.resolve(MOCK_FACILITY_DATA)
    }

    switch (period) {
      case 'realtime':
        return await getRealtimeFacilityData()
      case 'today':
        return await getTodayFacilityData()
      case 'week':
        return await getWeekFacilityData()
      case 'month':
        return await getMonthFacilityData()
    }
  }

  /**
   * Reload data for a specific period (force refresh)
   */
  async reloadPeriodData(period: TimePeriod): Promise<void> {
    const periodData = this.getPeriodData(period)
    periodData.lastLoaded = null
    await this.loadPeriodData(period)
  }

  /**
   * Load all periods data
   */
  async loadAllPeriods(): Promise<void> {
    const periods: TimePeriod[] = ['realtime', 'today', 'week', 'month']
    await Promise.all(periods.map(period => this.loadPeriodData(period)))
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear data for a specific period
   */
  clearPeriodData(period: TimePeriod) {
    const periodData = this.getPeriodData(period)
    periodData.stationData = []
    periodData.facilityData = []
    periodData.error = null
    periodData.lastLoaded = null
  }

  /**
   * Clear all data
   */
  clearAllData() {
    this.dataMap.forEach((_, period) => {
      this.clearPeriodData(period)
    })
  }

  /**
   * Reset store to initial state
   */
  reset() {
    this.clearAllData()
    this.facilityType = 'bad'
  }

  // ============================================================================
  // Popup Minimize Management
  // ============================================================================

  /**
   * Toggle statistics popup minimize/maximize
   */
  toggleStatisticsPopupMinimize = () => {
    this.isStatisticsPopupMinimized = !this.isStatisticsPopupMinimized
  }
}

export const priorityStatisticsStore = new PriorityStatisticsStore()