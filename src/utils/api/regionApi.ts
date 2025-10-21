/**
 * Region API 호출 함수들
 * PM Backend의 Region API와 통신
 */

import { get } from './request';
import { API_PATHS } from './config';

/**
 * 시도 정보
 */
export interface City {
  code: string;
  name: string;
}

export interface CityListResponse {
  cities: City[];
}

/**
 * 시군구 정보
 */
export interface District {
  code: string;
  name: string;
  geometry?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface DistrictListResponse {
  cityCode: string;
  districts: District[];
}

/**
 * 읍면동 정보
 */
export interface Dong {
  code: string;
  name: string;
}

export interface DongListResponse {
  districtCode: string;
  dongs: Dong[];
}

/**
 * 시도 목록 조회
 * GET /api/v1/region/cities
 *
 * @returns 시도 목록 (코드, 명칭)
 */
export async function getCityList(): Promise<CityListResponse> {
  try {
    const response = await get<CityListResponse>(API_PATHS.REGION_CITIES);

    if (!response.ok) {
      throw new Error(`City list API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error('[getCityList] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 시군구 목록 조회
 * GET /api/v1/region/districts?cityCode={cityCode}
 *
 * @param cityCode - 시도 코드 (예: '26' - 부산광역시)
 * @returns 시군구 목록 (코드, 명칭, geometry)
 */
export async function getDistrictList(cityCode: string): Promise<DistrictListResponse> {
  try {
    const response = await get<DistrictListResponse>(API_PATHS.REGION_DISTRICTS(cityCode));

    if (!response.ok) {
      throw new Error(`District list API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[getDistrictList] API 호출 실패 (시도 코드: ${cityCode}):`, error);
    throw error;
  }
}

/**
 * 읍면동 목록 조회
 * GET /api/v1/region/dongs?districtCode={districtCode}
 *
 * @param districtCode - 시군구 코드 (예: '26230' - 부산진구)
 * @returns 읍면동 목록 (코드, 명칭)
 */
export async function getDongList(districtCode: string): Promise<DongListResponse> {
  try {
    const response = await get<DongListResponse>(API_PATHS.REGION_DONGS(districtCode));

    if (!response.ok) {
      throw new Error(`Dong list API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[getDongList] API 호출 실패 (시군구 코드: ${districtCode}):`, error);
    throw error;
  }
}
