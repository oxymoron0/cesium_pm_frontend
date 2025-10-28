/**
 * Simulation API 호출 함수들
 * PM Backend의 Simulation API와 통신
 */

import { get, post } from './request';
import { API_PATHS } from './config';
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationListResponse,
  SimulationDetail,
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
 * 시뮬레이션 목록 조회
 * GET /api/v1/simulation/list
 *
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 7, 최대: 100)
 * @param userId - 사용자 ID (선택)
 * @param includePrivate - 비공개 시뮬레이션 포함 여부 (기본값: false)
 * @returns 시뮬레이션 목록과 페이지네이션 정보
 */
export async function getSimulationList(
  page: number = 1,
  limit: number = 7,
  userId?: string,
  includePrivate: boolean = false
  // pmType: PMType | 'all' = 'all',
  // sortOrder: 'asc' | 'desc' = 'desc'
): Promise<SimulationListResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      include_private: includePrivate.toString(),
    });

    if (userId) {
      params.append('user_id', userId);
    }
    // if (pmType !== 'all') {
    //   params.append('pm_type', pmType);
    // }
    // params.append('sort_order', sortOrder);

    const url = `${API_PATHS.SIMULATION_LIST}?${params.toString()}`;
    const response = await get<SimulationListResponse>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation list API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error('[getSimulationList] API 호출 실패:', error);
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
