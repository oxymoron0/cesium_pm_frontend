/**
 * Statistics API 호출 함수들
 * PM Backend의 Statistics API와 통신
 */

import { API_PATHS } from './config';
import type { StationConcentrationData, FacilityData, PM10RankingResponse, AlertRankingResponse } from '../../types/statistics';

/**
 * PM10 랭킹 API period 매핑
 */
type PM10RankingPeriod = 'current' | 'today' | 'week' | 'month';

/**
 * PM10 랭킹 데이터 조회
 * GET /api/v1/sensor-data/stations/pm10-ranking
 *
 * @param period - 조회 기간 (current, today, week, month)
 * @param limit - 조회 개수 (1-10, 기본값 7)
 * @returns PM10 랭킹 데이터를 StationConcentrationData 형식으로 변환
 */
export async function getPM10Ranking(
  period: PM10RankingPeriod = 'current',
  limit: number = 7
): Promise<StationConcentrationData[]> {
  try {
    const url = API_PATHS.SENSOR_DATA_PM10_RANKING(period, limit);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`PM10 ranking API failed with status ${response.status}`);
    }

    const result: PM10RankingResponse = await response.json();

    if (result.status !== 'success') {
      throw new Error('PM10 ranking API returned error status');
    }

    // API 응답을 StationConcentrationData 형식으로 변환
    return result.data.map(item => ({
      stationName: `${item.station_name}\n<${item.station_id.slice(-5)}>`,
      stationId: item.station_id,
      maxConcentration: Math.round(item.pm10_value * 100) / 100,
      avgConcentration: Math.round(item.pm10_value * 100) / 100
    }));
  } catch (error) {
    console.error(`[getPM10Ranking] API 호출 실패 (period: ${period}):`, error);
    throw error;
  }
}

/**
 * 취약시설 알림 랭킹 데이터 조회
 * GET /api/v1/vulnerable-facilities/alert-ranking
 *
 * @param period - 조회 기간 (current, today, week, month)
 * @param limit - 조회 개수 (기본값 7, 최대 100)
 * @returns 취약시설 알림 랭킹 데이터를 FacilityData 형식으로 변환
 */
export async function getAlertRanking(
  period: PM10RankingPeriod = 'current',
  limit: number = 7
): Promise<FacilityData[]> {
  try {
    const url = API_PATHS.VULNERABLE_FACILITIES_ALERT_RANKING(period, limit);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alert ranking API failed with status ${response.status}`);
    }

    const result: AlertRankingResponse = await response.json();

    if (result.status !== 'success') {
      throw new Error('Alert ranking API returned error status');
    }

    // API 응답을 FacilityData 형식으로 변환
    return result.data.facilities.map(item => ({
      facilityName: item.facility_name,
      facilityId: item.facility_id.toString(),
      badCount: item.bad_count,
      veryBadCount: item.very_bad_count,
      totalCount: item.total_count
    }));
  } catch (error) {
    console.error(`[getAlertRanking] API 호출 실패 (period: ${period}):`, error);
    throw error;
  }
}

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