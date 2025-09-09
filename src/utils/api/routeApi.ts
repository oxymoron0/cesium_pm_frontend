/**
 * Route API 호출 함수들
 * PM Backend의 Route API와 통신
 */

import { get } from './request';
import { API_PATHS } from './config';
import type { RouteInfoResponse, RouteGeomResponse } from './types';

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
export async function getRouteGeometry(routeName: string): Promise<RouteGeomResponse> {
  try {
    const response = await get<RouteGeomResponse>(API_PATHS.ROUTE_GEOM(routeName));
    
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
        return { routeName, geometry: geometry.data, success: true };
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