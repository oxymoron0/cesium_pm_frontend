/**
 * Bookmark API 호출 함수들
 * PM Backend의 Bookmark API와 통신
 */

import { get, post, del } from './request';
import { API_PATHS } from './config';
import type {
  RouteBookmarksResponse,
  RouteBookmark,
  CreateRouteBookmarkRequest,
  StationBookmarksResponse,
  StationBookmark,
  CreateStationBookmarkRequest
} from './types';

/**
 * 사용자의 노선 북마크 목록 조회
 * GET /api/v1/bookmarks/routes?user={user}
 *
 * @param user - 사용자 ID
 * @returns 노선 북마크 목록
 */
export async function getRouteBookmarks(user: string): Promise<RouteBookmarksResponse> {
  try {
    const response = await get<RouteBookmarksResponse>(API_PATHS.BOOKMARKS_ROUTES(user));

    if (!response.ok) {
      throw new Error(`Route bookmarks API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[getRouteBookmarks] API 호출 실패 (사용자: ${user}):`, error);
    throw error;
  }
}

/**
 * 노선 북마크 생성
 * POST /api/v1/bookmarks/routes
 *
 * @param user - 사용자 ID
 * @param routeName - 노선 번호
 * @returns 생성된 북마크 정보
 */
export async function createRouteBookmark(user: string, routeName: string): Promise<RouteBookmark> {
  try {
    const requestBody: CreateRouteBookmarkRequest = {
      user,
      route_name: routeName
    };

    const response = await post<RouteBookmark>(
      API_PATHS.BOOKMARKS_ROUTES_CREATE,
      requestBody
    );

    if (!response.ok) {
      throw new Error(`Create route bookmark API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[createRouteBookmark] API 호출 실패 (사용자: ${user}, 노선: ${routeName}):`, error);
    throw error;
  }
}

/**
 * 노선 북마크 삭제
 * DELETE /api/v1/bookmarks/routes/{route_name}?user={user}
 *
 * @param user - 사용자 ID
 * @param routeName - 노선 번호
 */
export async function deleteRouteBookmark(user: string, routeName: string): Promise<void> {
  try {
    const response = await del(API_PATHS.BOOKMARKS_ROUTES_DELETE(routeName, user));

    if (!response.ok) {
      throw new Error(`Delete route bookmark API failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`[deleteRouteBookmark] API 호출 실패 (사용자: ${user}, 노선: ${routeName}):`, error);
    throw error;
  }
}

/**
 * 사용자의 정류장 북마크 목록 조회
 * GET /api/v1/bookmarks/stations?user={user}
 *
 * @param user - 사용자 ID
 * @returns 정류장 북마크 목록
 */
export async function getStationBookmarks(user: string): Promise<StationBookmarksResponse> {
  try {
    const response = await get<StationBookmarksResponse>(API_PATHS.BOOKMARKS_STATIONS(user));

    if (!response.ok) {
      throw new Error(`Station bookmarks API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[getStationBookmarks] API 호출 실패 (사용자: ${user}):`, error);
    throw error;
  }
}

/**
 * 정류장 북마크 생성
 * POST /api/v1/bookmarks/stations
 *
 * @param user - 사용자 ID
 * @param stationId - 정류장 ID
 * @returns 생성된 북마크 정보
 */
export async function createStationBookmark(user: string, stationId: string): Promise<StationBookmark> {
  try {
    const requestBody: CreateStationBookmarkRequest = {
      user,
      station_id: stationId
    };

    const response = await post<StationBookmark>(
      API_PATHS.BOOKMARKS_STATIONS_CREATE,
      requestBody
    );

    if (!response.ok) {
      throw new Error(`Create station bookmark API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[createStationBookmark] API 호출 실패 (사용자: ${user}, 정류장: ${stationId}):`, error);
    throw error;
  }
}

/**
 * 정류장 북마크 삭제
 * DELETE /api/v1/bookmarks/stations/{station_id}?user={user}
 *
 * @param user - 사용자 ID
 * @param stationId - 정류장 ID
 */
export async function deleteStationBookmark(user: string, stationId: string): Promise<void> {
  try {
    const response = await del(API_PATHS.BOOKMARKS_STATIONS_DELETE(stationId, user));

    if (!response.ok) {
      throw new Error(`Delete station bookmark API failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`[deleteStationBookmark] API 호출 실패 (사용자: ${user}, 정류장: ${stationId}):`, error);
    throw error;
  }
}
