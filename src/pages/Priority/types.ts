// Priority configuration data types

export interface PriorityConfig {
  date: string;
  time: string;
  city: string;
  district: string;
  dong: string;
}

export interface VulnerableFacility {
  id: string;
  rank: number;
  name: string;
  address: string;
  predictedConcentration: number;
  predictedLevel: 'good' | 'normal' | 'bad' | 'very-bad';
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

export type PriorityView = 'config' | 'result';
