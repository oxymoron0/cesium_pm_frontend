/**
 * Statistics API 호출 함수들
 * PM Backend의 Statistics API와 통신
 */

import { API_PATHS } from './config';
import { get } from './request';
import type { StationConcentrationData, FacilityData } from '../../types/statistics';

/**
 * 실시간 정류장별 농도 통계 데이터 조회
 * GET /api/v1/statistics/station-concentration/realtime
 *
 * @returns 정류장별 최고농도, 평균농도 데이터 (실시간)
 */
export async function getRealtimeStationConcentration(): Promise<StationConcentrationData[]> {
  try {
    const response = await get<StationConcentrationData[]>(API_PATHS.STATISTICS_STATION_CONCENTRATION_REALTIME);
    if (!response.ok) {
      throw new Error(`Realtime station concentration API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getRealtimeStationConcentration] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 오늘 정류장별 농도 통계 데이터 조회
 * GET /api/v1/statistics/station-concentration/today
 *
 * @returns 정류장별 최고농도, 평균농도 데이터 (오늘)
 */
export async function getTodayStationConcentration(): Promise<StationConcentrationData[]> {
  try {
    const response = await get<StationConcentrationData[]>(API_PATHS.STATISTICS_STATION_CONCENTRATION_TODAY);
    if (!response.ok) {
      throw new Error(`Today station concentration API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getTodayStationConcentration] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 최근 7일 정류장별 농도 통계 데이터 조회
 * GET /api/v1/statistics/station-concentration/week
 *
 * @returns 정류장별 최고농도, 평균농도 데이터 (최근 7일)
 */
export async function getWeekStationConcentration(): Promise<StationConcentrationData[]> {
  try {
    const response = await get<StationConcentrationData[]>(API_PATHS.STATISTICS_STATION_CONCENTRATION_WEEK);
    if (!response.ok) {
      throw new Error(`Week station concentration API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getWeekStationConcentration] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 최근 1개월 정류장별 농도 통계 데이터 조회
 * GET /api/v1/statistics/station-concentration/month
 *
 * @returns 정류장별 최고농도, 평균농도 데이터 (최근 1개월)
 */
export async function getMonthStationConcentration(): Promise<StationConcentrationData[]> {
  try {
    const response = await get<StationConcentrationData[]>(API_PATHS.STATISTICS_STATION_CONCENTRATION_MONTH);
    if (!response.ok) {
      throw new Error(`Month station concentration API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getMonthStationConcentration] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 실시간 취약시설별 데이터 조회
 * GET /api/v1/statistics/facility/realtime
 *
 * @returns 취약시설별 나쁨/매우나쁨 횟수 데이터 (실시간)
 */
export async function getRealtimeFacilityData(): Promise<FacilityData[]> {
  try {
    const response = await get<FacilityData[]>(API_PATHS.STATISTICS_FACILITY_REALTIME);
    if (!response.ok) {
      throw new Error(`Realtime facility data API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getRealtimeFacilityData] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 오늘 취약시설별 데이터 조회
 * GET /api/v1/statistics/facility/today
 *
 * @returns 취약시설별 나쁨/매우나쁨 횟수 데이터 (오늘)
 */
export async function getTodayFacilityData(): Promise<FacilityData[]> {
  try {
    const response = await get<FacilityData[]>(API_PATHS.STATISTICS_FACILITY_TODAY);
    if (!response.ok) {
      throw new Error(`Today facility data API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getTodayFacilityData] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 최근 7일 취약시설별 데이터 조회
 * GET /api/v1/statistics/facility/week
 *
 * @returns 취약시설별 나쁨/매우나쁨 횟수 데이터 (최근 7일)
 */
export async function getWeekFacilityData(): Promise<FacilityData[]> {
  try {
    const response = await get<FacilityData[]>(API_PATHS.STATISTICS_FACILITY_WEEK);
    if (!response.ok) {
      throw new Error(`Week facility data API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getWeekFacilityData] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 최근 1개월 취약시설별 데이터 조회
 * GET /api/v1/statistics/facility/month
 *
 * @returns 취약시설별 나쁨/매우나쁨 횟수 데이터 (최근 1개월)
 */
export async function getMonthFacilityData(): Promise<FacilityData[]> {
  try {
    const response = await get<FacilityData[]>(API_PATHS.STATISTICS_FACILITY_MONTH);
    if (!response.ok) {
      throw new Error(`Month facility data API failed with status ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('[getMonthFacilityData] API 호출 실패:', error);
    throw error;
  }
}