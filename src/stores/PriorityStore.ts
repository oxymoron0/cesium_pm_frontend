import { makeAutoObservable } from 'mobx';
import type { PriorityConfig, NearbyStation, VulnerableFacility } from '../pages/Priority/types';

// ============================================================================
// API Response Types (향후 백엔드 API 연동용)
// ============================================================================

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
 * POST /api/priority/facilities
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
    dong: string;
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

const MOCK_NEARBY_STATIONS: Record<string, NearbyStation[]> = {
  '1': [ // 백병원
    {
      id: 'station_1',
      stationName: '서면한전',
      stationId: '05713',
      measurements: [
        { time: '05:53', concentration: 59, level: 'normal' },
        { time: '07:18', concentration: 68, level: 'normal' }
      ]
    },
    {
      id: 'station_2',
      stationName: '범내골역',
      stationId: '05715',
      measurements: [
        { time: '05:23', concentration: 68, level: 'normal' },
        { time: '06:18', concentration: 65, level: 'normal' },
        { time: '07:27', concentration: 71, level: 'normal' },
        { time: '08:15', concentration: 59, level: 'normal' }
      ]
    }
  ],
  '2': [ // 당감초등학교
    {
      id: 'station_3',
      stationName: '당감초교앞',
      stationId: '05720',
      measurements: [
        { time: '06:15', concentration: 55, level: 'normal' },
        { time: '07:30', concentration: 62, level: 'normal' }
      ]
    }
  ],
  '3': [ // 초읍초등학교
    {
      id: 'station_4',
      stationName: '초읍역',
      stationId: '05725',
      measurements: [
        { time: '06:00', concentration: 48, level: 'normal' },
        { time: '07:45', concentration: 52, level: 'normal' }
      ]
    }
  ]
};

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

  // 데이터 캐시
  private adminRegionsCache: Map<string, AdminRegion> = new Map();
  private nearbyStationsCache: Map<string, NearbyStation[]> = new Map();

  // 로딩 상태
  isLoadingDongs: boolean = false;
  isLoadingStations: boolean = false;

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
    Object.entries(MOCK_NEARBY_STATIONS).forEach(([facilityId, stations]) => {
      this.nearbyStationsCache.set(facilityId, stations);
    });
  }

  // ============================================================================
  // 설정 관리
  // ============================================================================

  setConfig(config: PriorityConfig) {
    this.config = config;
  }

  updateDong(dong: string) {
    if (this.config) {
      this.config = {
        ...this.config,
        dong
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
  // 주변 정류장 데이터 조회
  // ============================================================================

  getNearbyStations(facilityId: string): NearbyStation[] {
    return this.nearbyStationsCache.get(facilityId) || [];
  }

  get selectedStations(): NearbyStation[] {
    const stations: NearbyStation[] = [];
    this.selectedFacilityIds.forEach(facilityId => {
      const nearby = this.getNearbyStations(facilityId);
      stations.push(...nearby);
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

  /**
   * 캐시 초기화
   */
  clearCache() {
    this.adminRegionsCache.clear();
    this.nearbyStationsCache.clear();
    this.initializeMockData();
  }

  // ============================================================================
  // Computed Properties
  // ============================================================================

  get hasConfig(): boolean {
    return this.config !== null;
  }

  get selectedDong(): string {
    return this.config?.dong || '전체';
  }

  get hasSelectedFacilities(): boolean {
    return this.selectedFacilityIds.size > 0;
  }
}

export const priorityStore = new PriorityStore();
