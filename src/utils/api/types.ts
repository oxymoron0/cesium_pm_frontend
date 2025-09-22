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
 * Route geometry (inbound/outbound separated)
 * GET /api/v1/route/geom/{route_name} response
 */
export interface RouteGeom {
  route_name: string;
  inbound: GeoJSONLineString;    // ✅ Correct: LineString not Polygon
  outbound: GeoJSONLineString;   // ✅ Correct: LineString not Polygon
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
}

/**
 * Station 기본 인터페이스 (기존 테스트용 예제)
 */
export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  ars_id?: string;
  station_id?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

/**
 * Station 목록 응답 (페이지네이션)
 */
export interface StationListResponse {
  data: Station[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Station 상세 응답
 */
export interface StationResponse {
  data: Station;
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
export type AirQualityColor = '#18A274' | '#FFD040' | '#F70' | '#D32F2D' | '#C8C8C8';

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