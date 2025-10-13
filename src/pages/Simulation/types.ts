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

// ============================================================================
// Simulation State
// ============================================================================

export type SimulationView = 'config' | 'running' | 'result';
