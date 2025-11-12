/**
 * Road Search API
 * 지정된 좌표 지점의 100미터 이내 도로를 검색합니다.
 */

import { API_PATHS } from '@/utils/api/config';
import type { RoadSearchRequest, RoadSearchResponse } from '../types';

/**
 * 도로 검색 API 호출
 * @param longitude - 경도 (X 좌표) [-180 ~ 180]
 * @param latitude - 위도 (Y 좌표) [-90 ~ 90]
 * @returns 도로 검색 결과
 */
export async function searchNearbyRoads(
  longitude: number,
  latitude: number
): Promise<RoadSearchResponse> {
  const requestBody: RoadSearchRequest = {
    longitude,
    latitude
  };

  console.log(`[searchNearbyRoads] Searching roads near (${longitude}, ${latitude})`);

  try {
    const response = await fetch(API_PATHS.ROAD_SEARCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Road search failed: ${response.status} ${response.statusText}` +
        (errorData.error ? ` - ${errorData.error}` : '')
      );
    }

    const data: RoadSearchResponse = await response.json();
    console.log(`[searchNearbyRoads] Found ${data.total} road segments`);

    return data;
  } catch (error) {
    console.error('[searchNearbyRoads] Failed to search roads:', error);
    throw error;
  }
}

/**
 * 여러 좌표에 대해 도로 검색 (병렬 처리)
 * @param coordinates - 좌표 배열 [[longitude, latitude], ...]
 * @returns 도로 검색 결과 배열
 */
export async function searchNearbyRoadsMultiple(
  coordinates: Array<[number, number]>
): Promise<RoadSearchResponse[]> {
  console.log(`[searchNearbyRoadsMultiple] Searching roads for ${coordinates.length} locations`);

  const promises = coordinates.map(([longitude, latitude]) =>
    searchNearbyRoads(longitude, latitude)
  );

  try {
    const results = await Promise.all(promises);
    console.log(`[searchNearbyRoadsMultiple] Completed ${results.length} searches`);
    return results;
  } catch (error) {
    console.error('[searchNearbyRoadsMultiple] Failed to search roads:', error);
    throw error;
  }
}
