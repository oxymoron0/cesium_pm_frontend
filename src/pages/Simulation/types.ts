/**
 * Simulation Page Type Definitions
 */

// ============================================================================
// Address Search Types
// ============================================================================

/**
 * 공통 에러 응답 구조
 */
export interface ApiErrorResponse {
  status: "error";
  error: string;
  details?: string;
}

/**
 * UI 컴포넌트 구조
 */
export interface AddressSearchResult {
  id: string;
  roadAddress?: string;
  jibunAddress?: string;
  detailAddress?: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  height?: number; // Terrain height in meters
}

// --- 주소 검색 API (GET /api/v1/address/search) ---
export interface ApiAddressSearchResult {
  id: string;
  address: {
    zipcode: string;
    category: "road" | "parcel" | string;
    road: string;
    parcel: string;
    bldnm: string;
    bldnmdc: string;
  };
  point: {
    longitude: number;
    latitude: number;
  };
}

export interface AddressSearchSuccessResponse {
  status: "success";
  items: ApiAddressSearchResult[];
  total: number;
}

export type AddressSearchResponse = AddressSearchSuccessResponse | ApiErrorResponse;

// --- 좌표 -> 주소 변환 API (GET /api/v1/address/reverse) ---
export interface ApiReverseGeocodeResult {
  zipcode: string;
  type: "parcel" | "road" | string;
  text: string;
  structure: {
    level4L: string; // 읍면동/도로명
    level5: string;  // 번지
    detail: string;  // 상세주소
    // 필요한 다른 필드들 추가 가능
  };
}

export interface ReverseGeocodeSuccessResponse {
  status: "success";
  results: ApiReverseGeocodeResult[];
}

export type ReverseGeocodeResponse = ReverseGeocodeSuccessResponse | ApiErrorResponse;

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
export type SimulationConfirmType =   | "moveReset" //이동시 초기화 컨펌
  | "locStart" //위치 지정확인 컨펌
  | "stopSim" //시뮬레이션 분석 중지 컨펌
  | "startSim" //시뮬레이션 분석 중지 컨펌
  | "delSim" //시뮬레이션 삭제 컨펌
  | "runCustom" //상세 설정 시뮬레이션 시작 컨펌
  | "runDup" //상세 설정 시뮬레이션 중복 있을시에 나오는 컨펌
  | "runList"; //실행 목록 시뮬레이션 컨펌