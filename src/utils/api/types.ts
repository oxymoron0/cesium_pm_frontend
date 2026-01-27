/**
 * Backend API 응답 타입 정의
 * CLAUDE.md의 명세에 따른 정확한 타입 정의
 */

// =============================================================================
// Route API Types (실제 서비스용)
// =============================================================================

/**
 * 노선 기본 정보
 * GET /api/v1/route/getInfo 응답
 */
export interface RouteInfo {
  route_name: string;    // 노선 번호 (10, 31, 44, 167)
  origin: string;        // 출발지
  destination: string;   // 도착지
}

/**
 * 노선 기본 정보 목록 응답 (실제 API 구조)
 */
export interface RouteInfoResponse {
  routes: RouteInfo[];
  total: number;
}

/**
 * GeoJSON LineString geometry type (actual API response)
 */
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number, number][];  // [longitude, latitude, 0]
}

/**
 * GeoJSON Polygon geometry type (for future use)
 */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];  // Array of linear rings [longitude, latitude, height?]
}

/**
 * Route geometry (inbound/outbound separated + entire route)
 * GET /api/v1/route/geom/{route_name} response
 */
export interface RouteGeom {
  route_name: string;
  inbound: GeoJSONLineString;    // Correct: LineString not Polygon
  outbound: GeoJSONLineString;   // Correct: LineString not Polygon
  entire: GeoJSONLineString;     // Combined route (inbound + outbound)
}


// =============================================================================
// Station API Types (Route Stations)
// =============================================================================

/**
 * GeoJSON Point geometry
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Route Station Properties (GeoJSON Feature properties)
 * API 응답의 각 Feature.properties 구조
 */
export interface RouteStationProperties {
  route_name: string;
  station_id: string;
  station_order: number;
  station_name: string;
  station_name_eng?: string;
  city: string;
  county_district?: string;
  dong?: string;
  ars_id: string;
  progress_percent: number;  // Position on route (0-100)
}

/**
 * Route Station GeoJSON Feature
 * API 응답의 각 Feature 항목
 */
export interface RouteStationFeature {
  type: 'Feature';
  geometry: GeoJSONPoint;
  properties: RouteStationProperties;
}

/**
 * Route Stations API 응답 (GeoJSON FeatureCollection)
 * GET /api/v1/route/stations/{route_name}?direction={direction}
 */
export interface RouteStationsResponse {
  type: 'FeatureCollection';
  route_name: string;
  direction: 'inbound' | 'outbound';
  direction_name: string;
  total: number;
  features: RouteStationFeature[];
}

/**
 * Station Search API 응답 (GeoJSON FeatureCollection)
 * GET /api/v1/route/stations/search?q={query}&page={page}&limit={limit}
 */
export interface StationSearchResponse {
  type: 'FeatureCollection';
  query: string;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  features: RouteStationFeature[];
}

/**
 * 기존 RouteStation 인터페이스 (하위 호환성 유지)
 * @deprecated 새로운 GeoJSON Feature 구조 사용 권장
 */
export interface RouteStation {
  route_name: string;
  station_id: string;
  station_order: number;
  station_name: string;
  station_name_eng?: string;
  city: string;
  county_district?: string;
  dong?: string;
  ars_id: string;
  longitude: number;
  latitude: number;
  progress_percent: number;  // Position on route (0-100)
}

// =============================================================================
// Common Types
// =============================================================================

/**
 * API 공통 에러 응답
 */
export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

/**
 * API 성공 응답 공통 구조
 */
export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}

// =============================================================================
// Air Quality Sensor Types
// =============================================================================

/**
 * 공기질 상태 등급
 */
export type AirQualityLevel = 'good' | 'normal' | 'bad' | 'very_bad';

/**
 * 공기질 상태 색상 (CSS 색상값)
 */
export type AirQualityColor = '#1C67D7' | '#18A274' | '#FEE046' | '#D32F2D' | '#C8C8C8';

/**
 * 센서 타입
 */
export type SensorType = 'pm10' | 'pm25' | 'vocs';

/**
 * 공기질 센서 데이터
 */
export interface AirQualitySensorData {
  type: SensorType;
  value: number;
  level: AirQualityLevel;
  levelText: string; // '좋음', '보통', '나쁨', '매우 나쁨'
}

/**
 * 공기질 센서 컴포넌트 Props
 */
export interface AirQualitySensorProps {
  data: AirQualitySensorData;
  title: string; // '미세먼지', '초미세먼지', 'VOCs'
}

// =============================================================================
// Bookmark API Types
// =============================================================================

/**
 * User Entity (snake_case as per Go backend)
 */
export interface User {
  user_id: string;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Route Bookmark (snake_case as per Go backend)
 */
export interface RouteBookmark {
  user_id: string;
  route_name: string;
}

/**
 * Route Bookmarks GET response
 * GET /api/v1/bookmarks/routes?user={user}
 */
export interface RouteBookmarksResponse {
  bookmarks: RouteBookmark[];
  total: number;
}

/**
 * Route Bookmark POST request
 * POST /api/v1/bookmarks/routes
 */
export interface CreateRouteBookmarkRequest {
  user: string;
  route_name: string;
}

/**
 * Station Bookmark (snake_case as per Go backend)
 */
export interface StationBookmark {
  user_id: string;
  station_id: string;
}

/**
 * Station Bookmarks GET response
 * GET /api/v1/bookmarks/stations?user={user}
 */
export interface StationBookmarksResponse {
  bookmarks: StationBookmark[];
  total: number;
}

/**
 * Station Bookmark POST request
 * POST /api/v1/bookmarks/stations
 */
export interface CreateStationBookmarkRequest {
  user: string;
  station_id: string;
}

// =============================================================================
// Station Sensor Data Types (실제 API 연동용)
// =============================================================================

/**
 * 정류장 센서 데이터 (API 응답 구조)
 * GET /api/v1/sensor-data/stations/latest-all
 */
export interface StationSensorApiData {
  station_id: string;
  route_name: string;
  recorded_at: string;
  sensor_data: {
    humidity: number;
    temperature: number;
    voc: number;  // VOCs 값
    co2: number;
    pm: number;   // PM10 값
    fpm: number;  // PM2.5 값
  };
}

/**
 * 정류장 센서 데이터 API 응답
 */
export interface StationSensorResponse {
  data: StationSensorApiData[];
}

// =============================================================================
// Hourly/Daily Sensor Data Types (시간별/일별 통계 API용)
// =============================================================================

/**
 * 센서 평균 수치 (hourly/daily 공통) - Legacy nested format
 * @deprecated 실제 API는 flat 구조를 반환, 이 타입은 하위 호환성 유지용
 */
export interface SensorReadings {
  humidity: number    // 습도 (%)
  temperature: number // 온도 (°C)
  voc: number        // 휘발성 유기화합물 (ppb)
  co2: number        // 이산화탄소 (ppm)
  pm: number         // 미세먼지 PM10 (μg/m³)
  fpm: number        // 초미세먼지 PM2.5 (μg/m³)
}

/**
 * 시간별 센서 데이터 포인트 (Nested API 구조)
 * GET /api/v1/sensor-data/stations/{station_id}/hourly
 */
export interface HourlyDataPoint {
  hour: string           // ISO datetime string
  average_readings: {
    humidity: number       // 습도 (%)
    temperature: number    // 온도 (°C)
    voc: number           // 휘발성 유기화합물 (ppb)
    co2: number           // 이산화탄소 (ppm)
    pm: number            // 미세먼지 PM10 (μg/m³)
    fpm: number           // 초미세먼지 PM2.5 (μg/m³)
  }
  sample_count: number  // 해당 시간 샘플 수
}

/**
 * 일별 센서 데이터 포인트 (Nested API 구조)
 * GET /api/v1/sensor-data/stations/{station_id}/daily
 */
export interface DailyDataPoint {
  date: string           // ISO datetime string
  average_readings: {
    humidity: number       // 습도 (%)
    temperature: number    // 온도 (°C)
    voc: number           // 휘발성 유기화합물 (ppb)
    co2: number           // 이산화탄소 (ppm)
    pm: number            // 미세먼지 PM10 (μg/m³)
    fpm: number           // 초미세먼지 PM2.5 (μg/m³)
  }
  sample_count: number   // 해당 날짜 샘플 수
}

/**
 * 센서 데이터 메타 정보
 */
export interface SensorDataMeta {
  period_start: string          // 데이터 시작 시간
  period_end: string           // 데이터 종료 시간
  total_data_points: number    // 총 데이터 포인트 수
  data_source: string          // 데이터 소스 (테이블명 등)
  last_refreshed?: string      // 마지막 갱신 시간
}

/**
 * 시간별 센서 데이터 API 응답
 * GET /api/v1/sensor-data/stations/{station_id}/hourly
 */
export interface HourlySensorDataResponse {
  status: 'success' | 'error'
  data?: {
    station_id: string
    route_name: string
    hourly_data: HourlyDataPoint[]
  }
  meta?: SensorDataMeta
  error?: string
  details?: string
}

/**
 * 일별 센서 데이터 API 응답
 * GET /api/v1/sensor-data/stations/{station_id}/daily
 */
export interface DailySensorDataResponse {
  status: 'success' | 'error'
  data?: {
    station_id: string
    route_name: string
    station_name: string
    daily_data: DailyDataPoint[]
  }
  meta?: SensorDataMeta
  error?: string
  details?: string
}

// =============================================================================
// Vulnerable Facilities API Types (시뮬레이션 취약시설 데이터)
// =============================================================================

/**
 * 취약시설 단일 항목
 */
export interface VulnerableFacility {
  type: string;
  id: string;
  name: string;
  address: string;
  location: GeoJSONPoint;
  pm_value: number;
}

/**
 * 등급별 취약시설 배열
 */
export interface FacilitiesByGrade {
  good: VulnerableFacility[];
  moderate: VulnerableFacility[];
  bad: VulnerableFacility[];
  very_bad: VulnerableFacility[];
}

/**
 * 시뮬레이션 결과 요약 API 응답
 * GET /api/v1/simulation/{uuid}/vulnerable-facilities
 */
export interface VulnerableFacilitiesResponse {
  convex_hull_area_sqm: number;
  total_affected_facilities: number;
  facilities_by_grade: FacilitiesByGrade;
  requested_at: string;
}