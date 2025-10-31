import { makeAutoObservable } from 'mobx';
import type { PriorityConfig, NearbyStation, NearbyRoad, VulnerableFacility } from '../pages/Priority/types';

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

const MOCK_NEARBY_STATIONS: Record<string, NearbyStation[]> = {
  '1': [ // 백병원
    {
      id: 'station_1',
      stationName: '서면한전',
      stationId: '05713',
      measurements: [
        { time: '05:53', concentration: 59, level: 'normal' },
        { time: '07:18', concentration: 68, level: 'normal' }
      ],
      geometry: {
        type: 'Point',
        coordinates: [129.0592867, 35.15241336]
      }
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
      ],
      geometry: {
        type: 'Point',
        coordinates: [129.0593354, 35.14977663]
      }
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
      ],
      geometry: {
        type: 'Point',
        coordinates: [129.0397679, 35.16346526]
      }
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
      ],
      geometry: {
        type: 'Point',
        coordinates: [129.054089, 35.18547513]
      }
    }
  ]
};

const MOCK_NEARBY_ROADS: Record<string, NearbyRoad[]> = {
  '1': [ // 백병원
    {
      id: 'road_1',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 복지로 75번길 10',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 전포동 10-28',
      startPoint: '부산광역시 부산진구 정보 10-번지 28'
    },
    {
      id: 'road_2',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 초읍동 5-11',
      startPoint: '부산광역시 부산진구 초읍동 5-번'
    },
    {
      id: 'road_3',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 복지로 402-11',
      startPoint: '부산광역시 부산진구 초읍동 402-11'
    },
    {
      id: 'road_4',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 초읍동 506-6',
      startPoint: '부산광역시 부산진구 초읍동 506-6'
    },
    {
      id: 'road_5',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 전포대로 833',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 개금동 833-179',
      startPoint: '부산광역시 부산진구 개금동 833-179'
    }
  ],
  '2': [ // 당감초등학교
    {
      id: 'road_6',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 당감로 100-1',
      startPoint: '부산광역시 부산진구 당감동 100-1'
    },
    {
      id: 'road_7',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 당감중앙로 55',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 당감동 55-3',
      startPoint: '부산광역시 부산진구 당감동 55-3'
    },
    {
      id: 'road_8',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 당감동 22-5',
      startPoint: '부산광역시 부산진구 당감동 22-5'
    }
  ],
  '3': [ // 초읍초등학교
    {
      id: 'road_9',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 성지로104번길 26',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 초읍동 88-15',
      startPoint: '부산광역시 부산진구 초읍동 104번길 26'
    },
    {
      id: 'road_10',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 초읍중앙로 88-7',
      startPoint: '부산광역시 부산진구 초읍동 88-7'
    },
    {
      id: 'road_11',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 초읍동 256-8',
      startPoint: '부산광역시 부산진구 초읍동 256-8'
    }
  ],
  '4': [ // 부전역
    {
      id: 'road_12',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 부전로 181',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 부전동 88-3',
      startPoint: '부산광역시 부산진구 부전동 181'
    },
    {
      id: 'road_13',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 중앙대로 255',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 부전동 255-6',
      startPoint: '부산광역시 부산진구 부전동 255-6'
    },
    {
      id: 'road_14',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 부전동 88-12',
      startPoint: '부산광역시 부산진구 부전동 88-12'
    }
  ],
  '5': [ // 범내골역
    {
      id: 'road_15',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 중앙대로 612',
      startPoint: '부산광역시 부산진구 범천동 612'
    },
    {
      id: 'road_16',
      roadName: '도로명',
      roadAddress: '부산광역시 부산진구 범내골로 45',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 범천동 45-2',
      startPoint: '부산광역시 부산진구 범천동 45-2'
    },
    {
      id: 'road_17',
      lotNumber: '지번',
      lotAddress: '부산광역시 부산진구 범천동 123-7',
      startPoint: '부산광역시 부산진구 범천동 123-7'
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

    // Mock 근방 도로 데이터 초기화
    Object.entries(MOCK_NEARBY_ROADS).forEach(([facilityId, roads]) => {
      this.nearbyRoadsCache.set(facilityId, roads);
    });
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

  get selectedDong(): string {
    return this.config?.dong || '전체';
  }

  get hasSelectedFacilities(): boolean {
    return this.selectedFacilityIds.size > 0;
  }
}

export const priorityStore = new PriorityStore();
