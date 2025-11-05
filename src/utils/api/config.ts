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
  SIMULATION_CHECK: getApiPath('api/v1/simulation/check'),
  SIMULATION_QUICK_LIST: getApiPath('api/v1/simulation_auto/list'),
  SIMULATION_DETAIL: (uuid: string) => getApiPath(`api/v1/simulation/${uuid}`),
  SIMULATION_DELETE: getApiPath(`/api/v1/simulation`),
  SIMULATION_UPDATE_PRIVACY: (uuid: string) => getApiPath(`/api/v1/simulation/${uuid}/privacy`),
  SIMULATION_CURRENT_WEATHER: getApiPath('/api/v1/weather/current'),

  // 북마크 API (PM Backend)
  BOOKMARKS_ROUTES: (user: string) => getApiPath(`api/v1/bookmarks/routes?user=${user}`),
  BOOKMARKS_ROUTES_CREATE: getApiPath('api/v1/bookmarks/routes'),
  BOOKMARKS_ROUTES_DELETE: (routeName: string, user: string) => getApiPath(`api/v1/bookmarks/routes/${routeName}?user=${user}`),
  BOOKMARKS_STATIONS: (user: string) => getApiPath(`api/v1/bookmarks/stations?user=${user}`),
  BOOKMARKS_STATIONS_CREATE: getApiPath('api/v1/bookmarks/stations'),
  BOOKMARKS_STATIONS_DELETE: (stationId: string, user: string) => getApiPath(`api/v1/bookmarks/stations/${stationId}?user=${user}`),

  // 행정구역 API (PM Backend)
  ADMINISTRATIVE: getApiPath('api/v1/administrative'),
  ADMINISTRATIVE_PROVINCES: getApiPath('api/v1/administrative'),
  ADMINISTRATIVE_DISTRICTS: (provinceCode: string) => getApiPath(`api/v1/administrative?province_code=${provinceCode}`),
  ADMINISTRATIVE_NEIGHBORHOODS: (provinceCode: string, districtCode: string) => getApiPath(`api/v1/administrative?province_code=${provinceCode}&district_code=${districtCode}`),
  ADMINISTRATIVE_VILLAGES: (provinceCode: string, districtCode: string, neighborhoodCode: string) => getApiPath(`api/v1/administrative?province_code=${provinceCode}&district_code=${districtCode}&neighborhood_code=${neighborhoodCode}`),
  ADMINISTRATIVE_GEOMETRY: (params: { province_code: string; district_code?: string; neighborhood_code?: string; village_code?: string }) => {
    const queryParams = new URLSearchParams();
    queryParams.set('province_code', params.province_code);
    if (params.district_code) queryParams.set('district_code', params.district_code);
    if (params.neighborhood_code) queryParams.set('neighborhood_code', params.neighborhood_code);
    if (params.village_code) queryParams.set('village_code', params.village_code);
    return getApiPath(`api/v1/administrative/geometry?${queryParams.toString()}`);
  },

  // 통계 API (PM Backend) - 정류장 실측 농도
  STATISTICS_STATION_CONCENTRATION_REALTIME: getApiPath('api/v1/statistics/station-concentration/realtime'),
  STATISTICS_STATION_CONCENTRATION_TODAY: getApiPath('api/v1/statistics/station-concentration/today'),
  STATISTICS_STATION_CONCENTRATION_WEEK: getApiPath('api/v1/statistics/station-concentration/week'),
  STATISTICS_STATION_CONCENTRATION_MONTH: getApiPath('api/v1/statistics/station-concentration/month'),

  // 통계 API (PM Backend) - 취약시설별 시뮬레이션
  STATISTICS_FACILITY_REALTIME: getApiPath('api/v1/statistics/facility/realtime'),
  STATISTICS_FACILITY_TODAY: getApiPath('api/v1/statistics/facility/today'),
  STATISTICS_FACILITY_WEEK: getApiPath('api/v1/statistics/facility/week'),
  STATISTICS_FACILITY_MONTH: getApiPath('api/v1/statistics/facility/month'),

  // 주소 조회 API (PM Backend)
  ADDRESS_SEARCH: getApiPath('/api/v1/address/search'),
  ADDRESS_REVERSE: getApiPath('/api/v1/address/reverse'),
} as const;

/**
 * API 경로 타입 정의
 */
export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];