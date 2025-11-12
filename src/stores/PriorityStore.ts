import { makeAutoObservable } from 'mobx';
import type { PriorityConfig, NearbyStation, NearbyRoad, VulnerableFacility } from '../pages/Priority/types';
import { API_PATHS } from '../utils/api/config';

// ============================================================================
// API Response Types (향후 백엔드 API 연동용)
// ============================================================================

/**
 * 우선순위 취약시설 검색 API 응답
 * GET /api/v1/priority/search
 */
export interface PrioritySearchResponse {
  simulation_uuid: string;
  total_count: number;
  facilities: PriorityFacilityItem[];
}

export interface PriorityFacilityItem {
  order: number;
  type: 'senior' | 'childcare';
  id: number;
  name: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  pm_value: number;
  pm_grade: string;
}

/**
 * 읍면동 목록 API 응답
 * GET /api/priority/regions/{city}/{district}/dongs
 */
export interface DongListResponse {
  city: string;
  district: string;
  dongs: DongOption[];
}

export interface DongOption {
  value: string;
  label: string;
}

/**
 * 취약시설 우선순위 조회 API 응답
 * POST /api/priority/search
 * Request Body: { date, time, city, district, dong }
 */
export interface VulnerableFacilitiesResponse {
  facilities: VulnerableFacility[];
  totalCount: number;
  config: {
    date: string;
    time: string;
    city: string;
    district: string;
  };
}

/**
 * 주변 정류장 조회 API 응답
 * GET /api/priority/facilities/{facilityId}/nearby-stations
 */
export interface NearbyStationsResponse {
  facilityId: string;
  facilityName: string;
  stations: NearbyStation[];
}

/**
 * 근방 도로 조회 API 응답
 * GET /api/priority/facilities/{facilityId}/nearby-roads
 */
export interface NearbyRoadsResponse {
  facilityId: string;
  facilityName: string;
  roads: NearbyRoad[];
}

// ============================================================================
// Internal Types
// ============================================================================

interface AdminRegion {
  city: string;
  district: string;
  dongs: DongOption[];
}

// ============================================================================
// Mock Data (향후 API 호출로 대체 예정)
// ============================================================================

const MOCK_ADMIN_REGIONS: AdminRegion[] = [
  {
    city: '부산시',
    district: '부산진구',
    dongs: [
      { value: '전체', label: '전체' },
      { value: '부전동', label: '부전동' },
      { value: '전포동', label: '전포동' },
      { value: '당감동', label: '당감동' },
      { value: '초읍동', label: '초읍동' },
      { value: '범천동', label: '범천동' },
      { value: '연지동', label: '연지동' }
    ]
  },
  {
    city: '부산시',
    district: '해운대구',
    dongs: [
      { value: '전체', label: '전체' },
      { value: '우동', label: '우동' },
      { value: '중동', label: '중동' },
      { value: '좌동', label: '좌동' },
      { value: '송정동', label: '송정동' }
    ]
  },
  {
    city: '부산시',
    district: '동래구',
    dongs: [
      { value: '전체', label: '전체' },
      { value: '명륜동', label: '명륜동' },
      { value: '온천동', label: '온천동' },
      { value: '사직동', label: '사직동' }
    ]
  }
];

// Mock data removed - now using real API data

// ============================================================================
// PriorityStore Class
// ============================================================================

class PriorityStore {
  // ============================================================================
  // Observable State
  // ============================================================================

  // 설정 데이터
  config: PriorityConfig | null = null;

  // 드롭다운 상태
  isDropdownOpen: boolean = false;

  // 취약시설 선택 상태 (주변 정류장 표시용)
  selectedFacilityIds: Set<string> = new Set();

  // 도로 선택 상태
  selectedRoadIds: Set<string> = new Set();

  // 데이터 캐시
  private adminRegionsCache: Map<string, AdminRegion> = new Map();
  private nearbyStationsCache: Map<string, NearbyStation[]> = new Map();
  private nearbyRoadsCache: Map<string, NearbyRoad[]> = new Map();

  // 로딩 상태
  isLoadingDongs: boolean = false;
  isLoadingStations: boolean = false;
  isLoadingRoads: boolean = false;
  isLoadingFacilities: boolean = false;

  // 취약시설 검색 결과
  vulnerableFacilities: VulnerableFacility[] = [];
  simulationUuid: string | null = null;

  constructor() {
    makeAutoObservable(this);
    // Mock 데이터로 캐시 초기화
    this.initializeMockData();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeMockData() {
    // Mock 행정구역 데이터 초기화
    MOCK_ADMIN_REGIONS.forEach(region => {
      const key = `${region.city}-${region.district}`;
      this.adminRegionsCache.set(key, region);
    });

    // Mock 주변 정류장 데이터 초기화
    // Object.entries(MOCK_NEARBY_STATIONS).forEach(([facilityId, stations]) => {
    //   this.nearbyStationsCache.set(facilityId, stations);
    // });

    // // Mock 근방 도로 데이터 초기화
    // Object.entries(MOCK_NEARBY_ROADS).forEach(([facilityId, roads]) => {
    //   this.nearbyRoadsCache.set(facilityId, roads);
    // });
  }

  // ============================================================================
  // 설정 관리
  // ============================================================================

  setConfig(config: PriorityConfig) {
    this.config = config;
  }

  updateDate(date: string) {
    if (this.config) {
      this.config = {
        ...this.config,
        date
      };
    }
  }

  updateTime(time: string) {
    if (this.config) {
      this.config = {
        ...this.config,
        time
      };
    }
  }

  updateCity(city: string) {
    if (this.config) {
      this.config = {
        ...this.config,
        city
      };
    }
  }

  updateDistrict(district: string) {
    if (this.config) {
      this.config = {
        ...this.config,
        district
      };
    }
  }

  clearConfig() {
    this.config = null;
  }

  // ============================================================================
  // 드롭다운 상태 관리
  // ============================================================================

  openDropdown() {
    this.isDropdownOpen = true;
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // ============================================================================
  // 읍면동 데이터 조회
  // ============================================================================

  getDongOptions(): DongOption[] {
    if (!this.config) return [{ value: '전체', label: '전체' }];

    const key = `${this.config.city}-${this.config.district}`;
    const region = this.adminRegionsCache.get(key);

    return region?.dongs || [{ value: '전체', label: '전체' }];
  }

  /**
   * 읍면동 목록 로드 (향후 API 연동)
   * @param city - 시/도
   * @param district - 군/구
   */
  async loadDongOptions(city: string, district: string): Promise<void> {
    const key = `${city}-${district}`;

    // 캐시에 이미 있으면 스킵
    if (this.adminRegionsCache.has(key)) {
      return;
    }

    this.isLoadingDongs = true;

    try {
      // TODO: 실제 API 호출
      // const response: DongListResponse = await fetch(`/api/priority/regions/${city}/${district}/dongs`).then(r => r.json());
      // this.adminRegionsCache.set(key, response);

      console.log(`[PriorityStore] Load dong options for ${city} ${district}`);
    } catch (error) {
      console.error('[PriorityStore] Failed to load dong options:', error);
    } finally {
      this.isLoadingDongs = false;
    }
  }

  // ============================================================================
  // 취약시설 선택 관리
  // ============================================================================

  toggleFacilitySelection(facilityId: string) {
    if (this.selectedFacilityIds.has(facilityId)) {
      this.selectedFacilityIds.delete(facilityId);
    } else {
      this.selectedFacilityIds.add(facilityId);
    }
  }

  clearFacilitySelection() {
    this.selectedFacilityIds.clear();
  }

  isFacilitySelected(facilityId: string): boolean {
    return this.selectedFacilityIds.has(facilityId);
  }

  // ============================================================================
  // 도로 선택 관리
  // ============================================================================

  toggleRoadSelection(roadId: string) {
    if (this.selectedRoadIds.has(roadId)) {
      this.selectedRoadIds.delete(roadId);
    } else {
      this.selectedRoadIds.add(roadId);
    }
  }

  clearRoadSelection() {
    this.selectedRoadIds.clear();
  }

  isRoadSelected(roadId: string): boolean {
    return this.selectedRoadIds.has(roadId);
  }

  // ============================================================================
  // 주변 정류장 데이터 조회
  // ============================================================================

  getNearbyStations(facilityId: string): NearbyStation[] {
    return this.nearbyStationsCache.get(facilityId) || [];
  }

  setNearbyStations(facilityId: string, stations: NearbyStation[]) {
    this.nearbyStationsCache.set(facilityId, stations);
  }

  get selectedStations(): NearbyStation[] {
    const stations: NearbyStation[] = [];
    this.selectedFacilityIds.forEach(facilityId => {
      const nearby = this.getNearbyStations(facilityId);
      nearby.forEach(newStation => {
        stations.forEach(ss => {
          console.log(17, ss.id, newStation.id);
        });
        const isDuplicate = stations.some(existingStation => existingStation.id === newStation.id);
        if (!isDuplicate) {
            stations.push(newStation);
        }
      });
      // stations.push(...nearby);
    });
    return stations;
  }

  /**
   * 주변 정류장 로드 (향후 API 연동)
   * @param facilityId - 취약시설 ID
   */
  async loadNearbyStations(facilityId: string): Promise<void> {
    // 캐시에 이미 있으면 스킵
    if (this.nearbyStationsCache.has(facilityId)) {
      return;
    }

    this.isLoadingStations = true;

    try {
      // TODO: 실제 API 호출
      // const response: NearbyStationsResponse = await fetch(`/api/priority/facilities/${facilityId}/nearby-stations`).then(r => r.json());
      // this.nearbyStationsCache.set(facilityId, response.stations);

      console.log(`[PriorityStore] Load nearby stations for facility ${facilityId}`);
    } catch (error) {
      console.error('[PriorityStore] Failed to load nearby stations:', error);
    } finally {
      this.isLoadingStations = false;
    }
  }

  // ============================================================================
  // 근방 도로 데이터 조회
  // ============================================================================

  getNearbyRoads(facilityId: string): NearbyRoad[] {
    return this.nearbyRoadsCache.get(facilityId) || [];
  }

  get selectedRoads(): NearbyRoad[] {
    const roads: NearbyRoad[] = [];
    this.selectedFacilityIds.forEach(facilityId => {
      const nearby = this.getNearbyRoads(facilityId);
      roads.push(...nearby);
    });
    return roads;
  }

  /**
   * 근방 도로 로드 (향후 API 연동)
   * @param facilityId - 취약시설 ID
   */
  async loadNearbyRoads(facilityId: string): Promise<void> {
    // 캐시에 이미 있으면 스킵
    if (this.nearbyRoadsCache.has(facilityId)) {
      return;
    }

    this.isLoadingRoads = true;

    try {
      // TODO: 실제 API 호출
      // const response: NearbyRoadsResponse = await fetch(`/api/priority/facilities/${facilityId}/nearby-roads`).then(r => r.json());
      // this.nearbyRoadsCache.set(facilityId, response.roads);

      console.log(`[PriorityStore] Load nearby roads for facility ${facilityId}`);
    } catch (error) {
      console.error('[PriorityStore] Failed to load nearby roads:', error);
    } finally {
      this.isLoadingRoads = false;
    }
  }

  /**
   * 캐시 초기화
   */
  clearCache() {
    this.adminRegionsCache.clear();
    this.nearbyStationsCache.clear();
    this.nearbyRoadsCache.clear();
    this.initializeMockData();
  }

  // ============================================================================
  // 우선순위 취약시설 검색
  // ============================================================================

  /**
   * PM 등급 한글 → 영문 변환
   */
  private convertPmGradeToLevel(pmGrade: string): 'good' | 'normal' | 'bad' | 'very-bad' {
    switch (pmGrade) {
      case '좋음':
        return 'good';
      case '보통':
        return 'normal';
      case '나쁨':
        return 'bad';
      case '매우나쁨':
        return 'very-bad';
      default:
        return 'normal';
    }
  }

  /**
   * 날짜/시간 문자열을 API 형식으로 변환
   * @param dateStr - "YYYY.MM.DD" 형식
   * @param timeStr - "HH시 ~ HH시" 형식
   * @returns "YYYY-MM-DD HH" 형식
   */
  private formatDateTimeForApi(dateStr: string, timeStr: string): string {
    // "2025.11.10" → "2025-11-10"
    const date = dateStr.replace(/\./g, '-');

    // "14시 ~ 15시" → "14"
    const hour = timeStr.split('시')[0].trim().padStart(2, '0');

    return `${date} ${hour}`;
  }

  /**
   * 우선순위 취약시설 검색
   * GET /api/v1/priority/search
   */
  async searchPriorityFacilities(
    provinceCode: string,
    districtCode: string,
    neighborhoodCode: string | null
  ): Promise<void> {
    if (!this.config) {
      console.error('[PriorityStore] No config set for search');
      return;
    }

    this.isLoadingFacilities = true;

    try {
      // API 요청 파라미터 생성
      const dateTime = this.formatDateTimeForApi(this.config.date, this.config.time);
      const params = new URLSearchParams({
        date: dateTime,
        province_code: provinceCode,
        district_code: districtCode
      });

      // neighborhood_code는 선택적 (전체가 아닌 경우에만 추가)
      if (neighborhoodCode && neighborhoodCode !== 'all') {
        params.append('neighborhood_code', neighborhoodCode);
      }

      const url = API_PATHS.PRIORITY_SEARCH + '?' + params.toString();
      console.log('[PriorityStore] Searching priority facilities:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: PrioritySearchResponse = await response.json();

      // 응답 데이터를 VulnerableFacility 형식으로 변환
      this.vulnerableFacilities = data.facilities.map((item) => ({
        id: item.id.toString(),
        rank: item.order,
        name: item.name,
        address: item.address,
        predictedConcentration: item.pm_value,
        predictedLevel: this.convertPmGradeToLevel(item.pm_grade),
        geometry: {
          type: 'Point',
          coordinates: item.location.coordinates
        }
      }));

      this.simulationUuid = data.simulation_uuid;

      console.log(`[PriorityStore] Found ${data.total_count} facilities`);
    } catch (error) {
      console.error('[PriorityStore] Failed to search priority facilities:', error);
      this.vulnerableFacilities = [];
      this.simulationUuid = null;
    } finally {
      this.isLoadingFacilities = false;
    }
  }

  // ============================================================================
  // Reset and Cleanup
  // ============================================================================

  /**
   * 결과 화면 선택 상태 초기화
   * 뒤로 가기 시 호출하여 선택 상태만 정리
   */
  resetResultState() {
    this.closeDropdown();
    this.clearFacilitySelection();
    this.clearRoadSelection();
  }

  /**
   * 전체 상태 초기화
   * 페이지 종료 시 호출
   */
  resetAll() {
    this.config = null;
    this.isDropdownOpen = false;
    this.selectedFacilityIds.clear();
    this.selectedRoadIds.clear();
  }

  // ============================================================================
  // Computed Properties
  // ============================================================================

  get hasConfig(): boolean {
    return this.config !== null;
  }

  get hasSelectedFacilities(): boolean {
    return this.selectedFacilityIds.size > 0;
  }
}

export const priorityStore = new PriorityStore();
