/**
 * PostGIS/GeoJSON 기하 구조 타입 정의
 * API 실제 응답 구조를 기반으로 정확히 정의
 */

// 기본 좌표 타입 (3D 지원)
export type PostGISCoordinate2D = [number, number];
export type PostGISCoordinate3D = [number, number, number];
export type PostGISCoordinate = PostGISCoordinate2D | PostGISCoordinate3D;

// GeoJSON LineString (실제 API에서 사용)
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: PostGISCoordinate[];  // [lng, lat, height?][]
}

// GeoJSON Polygon (향후 확장용)
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: PostGISCoordinate[][]; // Array of linear rings
}

// Route Geometry API 응답 (실제 구조)
export interface RouteGeometry {
  route_name: string;
  inbound: GeoJSONLineString;   // 올바른 타입
  outbound: GeoJSONLineString;  // 올바른 타입
}

// Cesium 변환용 2D 좌표 타입
export interface CesiumCoordinates2D {
  type: 'LineString';
  coordinates: PostGISCoordinate2D[];  // Z축 제거된 좌표
}

// Z 좌표 제거 함수 타입 정의
export type CoordinateProcessor = (coords: PostGISCoordinate[]) => PostGISCoordinate2D[];
export type GeometryProcessor = (geometry: GeoJSONLineString) => CesiumCoordinates2D;