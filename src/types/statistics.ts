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
