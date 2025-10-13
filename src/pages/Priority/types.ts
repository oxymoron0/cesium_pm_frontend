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

export type PriorityView = 'config' | 'result';
