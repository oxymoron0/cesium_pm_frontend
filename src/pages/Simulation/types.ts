/**
 * Simulation Page Type Definitions
 */

// ============================================================================
// Address Search Types
// ============================================================================

export interface AddressSearchResult {
  id: string;
  roadAddress?: string; // 도로명 주소 (optional)
  jibunAddress?: string; // 지번 주소 (optional)
  detailAddress?: string; // 건물명 등
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface AddressSearchResponse {
  results: AddressSearchResult[];
  totalCount: number;
}

// ============================================================================
// Simulation Configuration
// ============================================================================

export interface SimulationConfig {
  location: AddressSearchResult;
  timestamp: string; // ISO 8601 format
}

export interface SimulationDetailConfig {
  title: string; // 시뮬레이션 제목
  pollutant: string; // 오염물질 항목
  concentration: number; // 농도
  location: AddressSearchResult; // 발생 위치
  altitude: number; // 발생 고도 (m)
  windDirection: number; // 풍향 (°)
  windSpeed: number; // 풍속 (m/s)
  useCurrentWeather: boolean; // 현재 기상 정보 적용 여부
  isPublic: boolean; // 공개 설정
}

// ============================================================================
// Simulation State
// ============================================================================

export type SimulationView = 'config' | 'detailConfig' | 'running' | 'result' | 'quick' | 'quickResult';
export type SimulationActiveTab = '상세설정' | '실행목록';