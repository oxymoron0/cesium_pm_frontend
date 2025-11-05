/**
 * Simulation API 호출 함수들
 * PM Backend의 Simulation API와 통신
 */

import { del, get, post, put } from './request';
import { API_PATHS } from './config';
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationListResponse,
  SimulationDetail,
  SimulationQuckDataResponse,
  PMType,
  Weather,
  SimulationInProgressResponse,
} from '../../types/simulation_request_types';

/**
 * 시뮬레이션 프로세스 요청
 * POST /api/v1/simulation/process
 *
 * @param simulationData - 시뮬레이션 요청 데이터
 * @returns 시뮬레이션 응답 (UUID, 상태, 대기열 위치)
 */
export async function submitSimulation(
  simulationData: SimulationRequest
): Promise<SimulationResponse> {
  try {
    const response = await post<SimulationResponse>(
      API_PATHS.SIMULATION_PROCESS,
      simulationData
    );

    if (!response.ok) {
      throw new Error(
        `Simulation process API failed with status ${response.status}`
      );
    }

    // Backend error handling (success: false)
    if (!response.data.success) {
      throw new Error(
        `Simulation request failed: ${response.data.message}`
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      '[submitSimulation] API 호출 실패:',
      error
    );
    throw error;
  }
}

/**
 * 진행중인 시뮬레이션 체크
 * GET /api/v1/simulation/check
 */
export async function runSimulationCheck(
): Promise<SimulationInProgressResponse> {
  try {

    const url = `${API_PATHS.SIMULATION_CHECK}`;
    const response = await get<SimulationInProgressResponse>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation list API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error("[getSimulationList] API 호출 실패:", error);
    throw error;
  }
}

/**
 * 시뮬레이션 목록 조회
 * GET /api/v1/simulation/list
 *
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 7, 최대: 100)
 * @param userId - 사용자 ID (선택)
 * @param pmType - 미세먼지 유형 (선택)
 * @param sortOrder - 정렬 순서 (내림차순, 오름차순)
 * @param startDate - 기간 지정 (시작일, 선택)
 * @param endDate - 기간 지정 (종료일, 선택)
 * @returns 시뮬레이션 목록과 페이지네이션 정보
 */
export async function getSimulationList(
  page: number = 1,
  limit: number = 7,
  userId?: string,
  pmType: PMType | 'all' = 'all',
  sortOrder: 'latest' | 'oldest' = 'latest',
  startDate: string | null = null,
  endDate: string | null = null,
): Promise<SimulationListResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (userId) {
      params.append('user_id', userId);
    }
    if (pmType !== 'all') {
      params.append('pm_type', pmType);
    }
    params.append('sort_order', sortOrder);

    if (startDate) {
      params.append('start_date', startDate);
    }
    if (endDate) {
      params.append('end_date', endDate);
    }

    const url = `${API_PATHS.SIMULATION_LIST}?${params.toString()}`;
    const response = await get<SimulationListResponse>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation list API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error("[getSimulationList] API 호출 실패:", error);
    throw error;
  }
}

/**
 * 시뮬레이션(auto) 목록 조회
 * GET /api/v1/simulation/list
 *
 * @param startDate - 시작일 (2025-10-23)
 * @param endDate - 종료일 (2025-10-30)
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 7, 최대: 100)
 * @returns 시뮬레이션 목록과 페이지네이션 정보
 */
export async function getSimulationQuickList(
  startDate: Date,
  endDate: Date,
  page: number = 1,
  limit: number = 7
): Promise<SimulationQuckDataResponse> {
  try {
    const toYMDLocal = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const params = new URLSearchParams({
      start_date: toYMDLocal(startDate),
      end_date: toYMDLocal(endDate),
      page: page.toString(),
      limit: limit.toString(),
    });

    const url = `${API_PATHS.SIMULATION_QUICK_LIST}?${params.toString()}`;
    const response = await get<SimulationQuckDataResponse>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation list API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error("[getSimulationList] API 호출 실패:", error);
    throw error;
  }
}

/**
 * 시뮬레이션 상세 정보 조회
 * GET /api/v1/simulation/:uuid
 *
 * @param uuid - 시뮬레이션 UUID
 * @returns 시뮬레이션 상세 정보
 */
export async function getSimulationDetail(
  uuid: string
): Promise<SimulationDetail> {
  try {
    const response = await get<SimulationDetail>(
      API_PATHS.SIMULATION_DETAIL(uuid)
    );

    if (!response.ok) {
      throw new Error(
        `Simulation detail API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      `[getSimulationDetail] API 호출 실패 (UUID: ${uuid}):`,
      error
    );
    throw error;
  }
}

/**
 * 시뮬레이션 공개/비공개 상태 업데이트
 * PUT /api/v1/simulation/{uuid}/privacy
 *
 * @param uuid - 업데이트할 시뮬레이션 UUID
 * @param isPrivate - 새로운 공개/비공개 상태
 * @param userId - 사용자 ID
 */
export async function updateSimulationPrivacyAPI(
  uuid: string, 
  isPrivate: boolean,
  userId: string
): Promise<void> { 
  try {
    const payload = { 
      is_private: isPrivate,
      user_id: userId
    };
    
    const url = API_PATHS.SIMULATION_UPDATE_PRIVACY(uuid); 

    const response = await put(url, payload);

    if (!response.ok) {
      throw new Error(
        `API failed with status ${response.status}`
      );
    }

    console.log(`[API] Privacy updated successfully for ${uuid}`);

  } catch (error) {
    console.error(`[updateSimulationPrivacyAPI] API 호출 실패 (UUID: ${uuid}):`, error);
    throw error;
  }
}


/**
 * 시뮬레이션 삭제
 * DELETE /api/v1/simulation
 *
 * @param userId - 사용자 ID
 * @param uuids - 삭제할 UUID 배열
 */
export async function deleteSimulationsAPI(
  userId: string, 
  uuids: string[]
): Promise<SimulationResponse> { 
  try {
    const payload = {
      user_id: userId,
      uuids: uuids
    };
    
    const response = await del<SimulationResponse>(API_PATHS.SIMULATION_DELETE, { body: payload }); 

    if (!response.ok) {
      throw new Error(
        `API failed with status ${response.status}`
      );
    }
    return response.data;

  } catch (error) {
    console.error('[deleteSimulationsAPI] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 기상청 최신 기상 데이터 조회
 * GET /api/v1/weather/current
 */
export async function getCurrentWeatherAPI(): Promise<Weather>{
  try {
    const response = await get<Weather>(API_PATHS.SIMULATION_CURRNET_WEATHER);

    if (!response.ok) {
      throw new Error(
        `Current weather API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error('[getCurrentWeatherAPI] API 호출 실패:', error);
    throw error;
  }
}
