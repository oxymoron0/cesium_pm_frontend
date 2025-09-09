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
 * GeoJSON Polygon geometry type
 */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];  // Array of linear rings [longitude, latitude]
}

/**
 * Route geometry (inbound/outbound separated)
 * GET /api/v1/route/geom/{route_name} response
 */
export interface RouteGeom {
  route_name: string;
  inbound: GeoJSONPolygon;    // Inbound route path (GeoJSON Polygon)
  outbound: GeoJSONPolygon;   // Outbound route path (GeoJSON Polygon)
}

/**
 * 노선 경로 응답 (실제 API 구조 - data wrapper 없음)
 */
export interface RouteGeomResponse extends RouteGeom {}

// =============================================================================
// Station API Types (테스트용 예제)
// =============================================================================

/**
 * Station 기본 인터페이스
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
export interface ApiSuccess<T = any> {
  data: T;
  message?: string;
}