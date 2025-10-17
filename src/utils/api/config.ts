/**
 * API 설정 관리
 * 하나의 변수만 변경해도 모든 API 요청 경로가 일괄 변경됩니다.
 */

// Backend API Base Path 설정
export const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || '/api';

/**
 * API 경로를 생성하는 헬퍼 함수
 * @param endpoint - API 엔드포인트 (예: '/buses', '/stations')
 * @returns 완전한 API 경로
 */
export function getApiPath(endpoint: string): string {
  // API_BASE_PATH의 끝 슬래시 정규화
  const basePath = API_BASE_PATH.endsWith('/') ? API_BASE_PATH.slice(0, -1) : API_BASE_PATH;

  // endpoint가 이미 /로 시작하는 경우
  if (endpoint.startsWith('/')) {
    return `${basePath}${endpoint}`;
  }

  // endpoint가 /로 시작하지 않는 경우
  return `${basePath}/${endpoint}`;
}

/**
 * 자주 사용되는 API 경로들을 미리 정의
 */
export const API_PATHS = {
  // 노선 관련 API (PM Backend)
  ROUTE_INFO: getApiPath('api/v1/route/getInfo'),
  ROUTE_GEOM: (routeName: string) => getApiPath(`api/v1/route/geom/${routeName}`),
  ROUTE_STATIONS: (routeName: string, direction: string) => getApiPath(`api/v1/route/stations/${routeName}?direction=${direction}`),
  ROUTE_STATIONS_SEARCH: getApiPath('api/v1/route/stations/search'),

  // 센서 데이터 API (PM Backend)
  SENSOR_DATA_HOURLY: (stationId: string, hours?: number) => getApiPath(`api/v1/sensor-data/stations/${stationId}/hourly${hours ? `?hours=${hours}` : ''}`),
  SENSOR_DATA_DAILY: (stationId: string, days?: number) => getApiPath(`api/v1/sensor-data/stations/${stationId}/daily${days ? `?days=${days}` : ''}`),
  SENSOR_DATA_LATEST_ALL: getApiPath('api/v1/sensor-data/stations/latest-all'),

  // 시뮬레이션 API (PM Backend)
  SIMULATION_PROCESS: getApiPath('api/v1/simulation/process'),
  SIMULATION_LIST: getApiPath('api/v1/simulation/list'),
  SIMULATION_DETAIL: (uuid: string) => getApiPath(`api/v1/simulation/${uuid}`),
} as const;

/**
 * API 경로 타입 정의
 */
export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];