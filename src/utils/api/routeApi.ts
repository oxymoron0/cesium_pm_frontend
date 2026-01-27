/**
 * Route API 호출 함수들
 * PM Backend의 Route API와 통신
 */

import { get } from './request';
import { API_PATHS } from './config';
import type { RouteInfoResponse, RouteGeom, RouteStationsResponse, StationSearchResponse, HourlySensorDataResponse, DailySensorDataResponse, StationSensorResponse } from './types';

/**
 * 모든 노선 기본 정보 조회
 * GET /api/v1/route/getInfo
 * 
 * @returns 노선 목록 (노선번호, 출발지, 도착지)
 */
export async function getRouteInfo(): Promise<RouteInfoResponse> {
  try {
    const response = await get<RouteInfoResponse>(API_PATHS.ROUTE_INFO);
    
    if (!response.ok) {
      throw new Error(`Route info API failed with status ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('[getRouteInfo] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 특정 노선의 상행/하행 경로 geometry 조회
 * GET /api/v1/route/geom/{route_name}
 * 
 * @param routeName - 노선 번호 (10, 31, 44, 167)
 * @returns 상행/하행 LineString geometry
 */
export async function getRouteGeometry(routeName: string): Promise<RouteGeom> {
  try {
    const response = await get<RouteGeom>(API_PATHS.ROUTE_GEOM(routeName));
    
    if (!response.ok) {
      throw new Error(`Route geometry API failed with status ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`[getRouteGeometry] API 호출 실패 (노선: ${routeName}):`, error);
    throw error;
  }
}

/**
 * 특정 노선의 방향별 정류장 데이터 조회
 * GET /api/v1/route/stations/{route_name}?direction={direction}
 * 
 * @param routeName - 노선 번호 (10, 31, 44, 167)
 * @param direction - 방향 (inbound, outbound)
 * @returns 노선별 정류장 목록 및 메타데이터
 */
export async function getRouteStations(routeName: string, direction: 'inbound' | 'outbound'): Promise<RouteStationsResponse> {
  try {
    const response = await get<RouteStationsResponse>(API_PATHS.ROUTE_STATIONS(routeName, direction));
    
    if (!response.ok) {
      throw new Error(`Route stations API failed with status ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`[getRouteStations] API 호출 실패 (노선: ${routeName}, 방향: ${direction}):`, error);
    throw error;
  }
}

/**
 * 모든 노선의 geometry를 일괄 조회
 * 
 * @param routeNames - 조회할 노선 번호 배열 (기본값: ['10', '31', '44', '167'])
 * @returns 노선별 geometry 배열
 */
export async function getAllRouteGeometries(routeNames: string[] = ['10', '31', '44', '167']) {
  try {
    const geometryPromises = routeNames.map(async (routeName) => {
      try {
        const geometry = await getRouteGeometry(routeName);
        return { routeName, geometry: geometry, success: true };
      } catch (error) {
        console.error(`[getAllRouteGeometries] 노선 ${routeName} geometry 조회 실패:`, error);
        return { routeName, geometry: null, success: false, error };
      }
    });
    
    const results = await Promise.all(geometryPromises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`[getAllRouteGeometries] 성공: ${successful.length}/${routeNames.length}`);
    
    if (failed.length > 0) {
      console.warn('[getAllRouteGeometries] 실패한 노선들:', failed.map(f => f.routeName));
    }
    
    return results;
  } catch (error) {
    console.error('[getAllRouteGeometries] 일괄 조회 실패:', error);
    throw error;
  }
}

/**
 * 정류장 검색
 * GET /api/v1/route/stations/search?query={query}&page={page}&limit={limit}
 *
 * @param query - 검색어
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지당 결과 수 (기본값: 4)
 * @returns 검색된 정류장 목록
 */
export async function searchStations(query: string): Promise<StationSearchResponse> {
  try {
    // 전체 결과를 가져오기 위해 큰 limit 값 사용
    const url = `${API_PATHS.ROUTE_STATIONS_SEARCH}?q=${encodeURIComponent(query)}&limit=1000`;
    const response = await get<StationSearchResponse>(url);

    if (!response.ok) {
      throw new Error(`Station search API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[searchStations] API 호출 실패 (검색어: ${query}):`, error);
    throw error;
  }
}

/**
 * 정류장 시간별 센서 데이터 조회
 * GET /api/v1/sensor-data/stations/{station_id}/hourly?hours={hours}
 *
 * @param stationId - 정류장 ID
 * @param hours - 조회할 시간 수 (1-168, 기본값: 2)
 * @returns 시간별 센서 데이터
 */
export async function getHourlySensorData(stationId: string, hours: number = 2): Promise<HourlySensorDataResponse> {
  try {
    const response = await get<HourlySensorDataResponse>(API_PATHS.SENSOR_DATA_HOURLY(stationId, hours));

    if (!response.ok) {
      throw new Error(`Hourly sensor data API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[getHourlySensorData] API 호출 실패 (정류장 ID: ${stationId}, hours: ${hours}):`, error);
    throw error;
  }
}

/**
 * 정류장 일별 센서 데이터 조회
 * GET /api/v1/sensor-data/stations/{station_id}/daily?days={days}
 *
 * @param stationId - 정류장 ID
 * @param days - 조회할 일 수 (1-60, 기본값: 30)
 * @returns 일별 센서 데이터
 */
export async function getDailySensorData(stationId: string, days: number = 30): Promise<DailySensorDataResponse> {
  try {
    const response = await get<DailySensorDataResponse>(API_PATHS.SENSOR_DATA_DAILY(stationId, days));

    // 404는 일별 데이터가 없는 정상적인 상황 - 빈 응답 반환
    if (response.status === 404) {
      console.log(`[getDailySensorData] 일별 데이터 없음 (정류장 ID: ${stationId}, days: ${days})`)
      return {
        status: 'success',
        data: {
          station_id: stationId,
          route_name: '',
          station_name: '',
          daily_data: []
        }
      }
    }

    if (!response.ok) {
      throw new Error(`Daily sensor data API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[getDailySensorData] API 호출 실패 (정류장 ID: ${stationId}, days: ${days}):`, error);
    // 네트워크 오류 등의 경우에도 빈 응답 반환하여 전체 로딩이 실패하지 않도록 함
    return {
      status: 'error',
      data: {
        station_id: stationId,
        route_name: '',
        station_name: '',
        daily_data: []
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 모든 정류장 최신 센서 데이터 조회
 * GET /api/v1/sensor-data/stations/latest-all
 *
 * @returns 모든 정류장의 최신 센서 데이터
 */
export async function getLatestSensorData(): Promise<StationSensorResponse> {
  try {
    const response = await get<StationSensorResponse>(API_PATHS.SENSOR_DATA_LATEST_ALL);

    if (!response.ok) {
      throw new Error(`Latest sensor data API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error('[getLatestSensorData] API 호출 실패:', error);
    throw error;
  }
}