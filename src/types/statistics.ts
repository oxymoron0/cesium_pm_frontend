/**
 * 정류장별 농도 데이터 타입
 */
export interface StationConcentrationData {
  stationName: string   // 정류장명(ID) 형식
  stationId: string     // 정류장 ID
  maxConcentration: number    // 최고농도
  avgConcentration: number    // 평균농도
}

/**
 * 취약시설 시뮬레이션 데이터 타입
 */
export interface FacilitySimulationData {
  time: string          // 화면 표시용 레이블
  timestamp: string     // 원본 ISO timestamp
  veryBadCount: number  // 매우나쁨 횟수
  badCount: number      // 나쁨 횟수
}

/**
 * 취약시설별 시뮬레이션 데이터 타입
 */
export interface FacilityData {
  facilityName: string  // 시설명
  facilityId: string    // 시설 ID
  badCount: number      // 나쁨 횟수
  veryBadCount: number  // 매우나쁨 횟수
  totalCount: number    // 총 횟수
}

/**
 * PM10 랭킹 API 응답 데이터 타입
 * GET /api/v1/sensor-data/stations/pm10-ranking
 */
export interface PM10RankingItem {
  station_id: string
  station_name: string
  route_name: string
  pm10_value: number
  avg_pm10: number
  recorded_at: string
}

export interface PM10RankingResponse {
  status: 'success' | 'error'
  data: PM10RankingItem[]
  meta: {
    period: 'current' | 'today' | 'week' | 'month'
    count: number
  }
}

/**
 * 취약시설 알림 랭킹 API 응답 데이터 타입
 * GET /api/v1/vulnerable-facilities/alert-ranking
 */
export interface AlertRankingFacility {
  facility_type: string
  facility_id: number
  facility_name: string
  bad_count: number
  very_bad_count: number
  total_count: number
  latest_alert: string
}

export interface AlertRankingResponse {
  status: 'success' | 'error'
  data: {
    period: 'current' | 'today' | 'week' | 'month'
    total_count: number
    facilities: AlertRankingFacility[]
  }
}
