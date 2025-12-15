// Priority configuration data types

import type { GeoJSONPoint } from "@/utils/api/types";

export interface PriorityConfig {
  date: string;
  time: string;
  city: string;
  district: string;
}

export interface VulnerableFacility {
  id: string;
  type: 'senior' | 'childcare';
  rank: number;
  name: string;
  address: string;
  predictedConcentration: number;
  predictedLevel: 'good' | 'normal' | 'bad' | 'very-bad';
  geometry: GeoJSONPoint;
}

// 정류장 측정 데이터
export interface StationMeasurement {
  time: string; // HH:MM 형식
  concentration: number;
  level: 'good' | 'normal' | 'bad' | 'very-bad';
}

// 주변 정류장 데이터
export interface NearbyStation {
  id: string;
  stationName: string;
  stationId: string;
  measurements: StationMeasurement[];
  geometry: GeoJSONPoint;
}

// 근방 도로 데이터
export interface NearbyRoad {
  id: string;
  roadName?: string; // 도로명 (optional)
  roadAddress?: string; // 도로명 주소 (optional)
  lotNumber?: string; // 지번 (optional)
  lotAddress?: string; // 지번 주소 (optional)
  startPoint: string; // 시작점 주소 (기존 호환용)
}

export type PriorityView = 'config' | 'customConfig' | 'result';

// 주변 나쁨 대기질 정류장 API 요청 타입
export interface NearbyBadAirQualityRequest {
  lat: number;
  lng: number;
  radius?: number;  // default: 1000, max: 5000
  datetime: string; // YYYY-MM-DD HH:MM format
}

// 주변 나쁨 대기질 정류장 API 응답 타입
export interface NearbyBadAirQualityStationItem {
  station_id: string;
  station_name: string;
  route_name: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  distance_m: number;
  measurements: {
    recorded_at: string; // ISO 8601
    pm10: number | null;
    pm25: number | null;
  }[];
}

export interface NearbyBadAirQualityResponse {
  center: {
    lat: number;
    lng: number;
  };
  radius_m: number;
  datetime: string;
  stations: NearbyBadAirQualityStationItem[];
  total: number;
}

// 정류장 통계 API 응답 타입
export interface StationStatisticsItem {
  station_id: string;
  station_name: string;
  route_name: string;
  max_pm10: number;
  max_pm25: number;
  max_pm10_recorded_at: string; // ISO 8601
  max_pm25_recorded_at: string; // ISO 8601
  measurement_count: number;
}

export interface StationStatisticsResponse {
  period: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  stations: StationStatisticsItem[];
  total: number;
  sort_criteria: 'pm10' | 'pm25';
}

// Road Search API types
export interface RoadSearchRequest {
  longitude: number;
  latitude: number;
}

export interface RoadFeatureProperties {
  ogc_fid: number;
  rn_cd: string; // 도로명 코드
  sig_cd: string; // 지역 코드
  rn: string; // 도로명 (한글)
  eng_rn: string; // 도로명 (영문)
}

export interface RoadFeature {
  type: 'Feature';
  geometry: {
    type: 'MultiLineString';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };
  properties: RoadFeatureProperties;
}

export interface SearchAreaFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], ...]]
  };
  properties: {
    radius_meters: number;
    description: string;
  };
}

export interface RoadSearchResponse {
  type: 'FeatureCollection';
  features: RoadFeature[];
  total: number;
  search_area: SearchAreaFeature;
}

// Building Facilities API types (from simulation vulnerable-facilities endpoint)
export interface NearbyBuildingGeometry {
  lod1_shape_id: number;
  geom: {
    coordinates: number[][][][]; // MultiPolygon
    type: 'MultiPolygon';
  };
  height: number;
  ground_level: number;
  distance_m: number;
}

export interface BuildingFacilityData {
  type: string; // 'childcare', 'senior', etc.
  id: number;
  name: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  pm_value: number;
  geom_shape: {
    coordinates: number[][][][]; // MultiPolygon
    type: 'MultiPolygon';
  };
  geom_height: number;
  geom_ground_level: number;
  lod1_shape_id: number;
  nearby_buildings: NearbyBuildingGeometry[];
}

export interface VulnerableFacilitiesApiResponse {
  convex_hull_area_sqm: number;
  total_affected_facilities: number;
  facilities_by_grade: {
    good?: BuildingFacilityData[];
    normal?: BuildingFacilityData[];
    bad?: BuildingFacilityData[];
    very_bad?: BuildingFacilityData[];
  };
}
