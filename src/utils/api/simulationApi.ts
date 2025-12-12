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
  SimulationQuickDataResponse,
  SimulationQuickCivilDataResponse,
  PMType,
  Weather,
  SimulationInProgressResponse,
  SimulationCivilQuickDataResponse,
} from '../../types/simulation_request_types';
import type { AddressSearchResponse, ReverseGeocodeResponse } from '@/pages/Simulation/types';
import type { VulnerableFacilitiesResponse } from './types';

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
 * GET /api/v1/simulation_auto/list
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
): Promise<SimulationQuickDataResponse> {
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
    const response = await get<SimulationQuickDataResponse>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation list API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error("[getSimulationQuickList] API 호출 실패:", error);
    throw error;
  }
}

/**
 * 시뮬레이션(auto) 시민용 목록 조회
 * GET /api/v1/simulation_auto/civil/list
 *
 * @param startDate - 시작일 (2025-10-23)
 * @param endDate - 종료일 (2025-10-30)
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 7, 최대: 100)
 * @returns 시뮬레이션 목록과 페이지네이션 정보
 */
export async function getSimulationQuickCivilList(
  startDate: Date,
  endDate: Date,
  page: number = 1,
  limit: number = 7
): Promise<SimulationQuickCivilDataResponse> {
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

    const url = `${API_PATHS.SIMULATION_QUICK_CIVIL_LIST}?${params.toString()}`;
    const response = await get<SimulationQuickCivilDataResponse>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation civil list API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error("[getSimulationQuickCivilList] API 호출 실패:", error);
    throw error;
  }
}

/**
 * 빠른실행 시뮬레이션 GLB 상세 정보 조회
 * GET /api/v1/simulation_auto/:uuid
 *
 * @param uuid - 시뮬레이션 UUID
 * @returns GLB 18개에 대한 포인트 50개씩 포함된 배열
 */
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSimulationQuickGlbDetail(uuid: string): Promise<any> {
  try {
    const url = API_PATHS.SIMULATION_QUICK_GLB_IFNOLIST(uuid);
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await get<any>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation quick GLB detail API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error(`[getSimulationQuickGlbDetail] API 호출 실패 (UUID: ${uuid}):`, error);
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
    const response = await get<Weather>(API_PATHS.SIMULATION_CURRENT_WEATHER);

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

/**
 * '주소 검색' API 호출
 * GET /api/v1/address/search
 *
 * @param query - 검색할 주소 문자열
 * @param page - 페이지 번호
 * @param size - 페이지 크기
 */
export async function searchAddressAPI(
  query: string,
  page: number = 1,
  size: number = 10
): Promise<AddressSearchResponse> {
  try {
    const params = new URLSearchParams({
      query: query,
      page: page.toString(),
      size: size.toString(),
    });

    const url = `${API_PATHS.ADDRESS_SEARCH}?${params.toString()}`;
    const response = await get<AddressSearchResponse>(url);

    if (!response.ok) {
       throw new Error(`Address Search API failed with status ${response.status}`);
    }
    return response.data;

  } catch (error) {
    console.error('[searchAddressAPI] API 호출 실패:', error);
    throw error;
  }
}

/**
 * '좌표 -> 주소' (Reverse Geocoding) API 호출
 * GET /api/v1/address/reverse
 *
 * @param longitude - 경도 (x)
 * @param latitude - 위도 (y)
 */
export async function reverseGeocodeAPI(
  longitude: number,
  latitude: number
): Promise<ReverseGeocodeResponse> {
  try {
    const params = new URLSearchParams({
      longitude: longitude.toString(),
      latitude: latitude.toString(),
    });

    const url = `${API_PATHS.ADDRESS_REVERSE}?${params.toString()}`;

    const response = await get<ReverseGeocodeResponse>(url);

    if (!response.ok) {
       throw new Error(`Reverse Geocode API failed with status ${response.status}`);
    }
    return response.data;

  } catch (error) {
    console.error('[reverseGeocodeAPI] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 시뮬레이션 결과 요약 조회 (취약시설 영향)
 * GET /api/v1/simulation/{uuid}/vulnerable-facilities
 *
 * @param uuid - 시뮬레이션 UUID
 * @returns 취약시설 영향 요약 정보
 */
export async function getVulnerableFacilities(
  uuid: string
): Promise<VulnerableFacilitiesResponse> {
  try {
    const response = await get<VulnerableFacilitiesResponse>(
      API_PATHS.SIMULATION_DETAIL_SUMMARY(uuid)
    );

    if (!response.ok) {
      throw new Error(
        `Vulnerable facilities API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      `[getVulnerableFacilities] API 호출 실패 (UUID: ${uuid}):`,
      error
    );
    throw error;
  }
}

/**
 * 시뮬레이션 GLB 개수 조회
 * GET /api/v1/simulation/{uuid}/glb/count
 *
 * @param uuid - 시뮬레이션 UUID
 * @returns GLB 파일 개수
 */
export async function getSimulationGlbCount(
  uuid: string
): Promise<number> {
  try {
    const response = await get<{ success: boolean; message: string; data: { uuid: string; count: number } }>(
      API_PATHS.SIMULATION_GLB_COUNT(uuid)
    );

    if (!response.ok) {
      throw new Error(
        `GLB count API failed with status ${response.status}`
      );
    }

    if (!response.data.success) {
      throw new Error(
        `GLB count API failed: ${response.data.message}`
      );
    }

    return response.data.data.count;
  } catch (error) {
    console.error(
      `[getSimulationGlbCount] API 호출 실패 (UUID: ${uuid}):`,
      error
    );
    throw error;
  }
}

/**
 * 시뮬레이션(auto) 목록 조회
 * GET /api/v1/simulation_auto/civil/list
 *
 * @param concentration - 미세먼지 농도
 * @param sortOrder - 정렬 순서 (내림차순, 오름차순)
 * @param sortName - 정렬 유형
 * @param page - 페이지 번호 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 7)
 * @returns 시뮬레이션 목록과 페이지네이션 정보
 */
export async function getSimulationCivilList(
  page: number = 1,
  limit: number = 7,
  sortOrder: 'latest' | 'oldest' = 'latest',
  // 정렬 기준 값들 (하나만 값이 들어오면 해당 기준으로 정렬됨)
  concentration?: string,
  windDirection?: string,
  windSpeed?: string,
  measuredAt?: string
): Promise<SimulationCivilQuickDataResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort_order: sortOrder
    });

    if (concentration) params.append('concentration', concentration);
    if (windDirection) params.append('wind_direction', windDirection);
    if (windSpeed) params.append('wind_speed', windSpeed);
    if (measuredAt) params.append('measured_at', measuredAt);

    const url = `${API_PATHS.SIMULATION_QUICK_CIVIL_LIST}?${params.toString()}`;
    const response = await get<SimulationCivilQuickDataResponse>(url);

    if (!response.ok) {
      throw new Error(
        `Simulation list API failed with status ${response.status}`
      );
    }

    return response.data;
  } catch (error) {
    console.error("[getSimulationCivilList] API 호출 실패:", error);
    throw error;
  }
}

