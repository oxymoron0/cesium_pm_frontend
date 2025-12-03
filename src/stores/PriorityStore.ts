import { makeAutoObservable } from 'mobx';
import type {
  PriorityConfig,
  NearbyStation,
  NearbyRoad,
  VulnerableFacility,
  StationStatisticsResponse,
  RoadSearchResponse,
  VulnerableFacilitiesApiResponse
} from '../pages/Priority/types';
import type { RouteStationFeature } from '../utils/api/types';
import { API_PATHS } from '../utils/api/config';
import { searchNearbyRoads } from '../pages/Priority/api/roadSearch';
import { fetchVulnerableFacilitiesData, searchNearbyBuildingFacilities } from '../pages/Priority/api/buildingFacilitiesSearch';
import type { BuildingFacilitiesResponse } from '@/utils/cesium/nearbyBuildingFacilitiesRenderer';

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
  private nearbyRoadsCache: Map<string, Set<string>> = new Map(); // facilityId -> Set<roadName>

  // 로딩 상태
  isLoadingDongs: boolean = false;
  isLoadingStations: boolean = false;
  isLoadingRoads: boolean = false;
  isLoadingFacilities: boolean = false;

  // 취약시설 검색 결과
  vulnerableFacilities: VulnerableFacility[] = [];
  simulationUuid: string | null = null;

  // 정류장 통계 데이터 (전체)
  stationStatisticsData: StationStatisticsResponse | null = null;

  // 도로 검색 결과 캐시 (facilityId → RoadSearchResponse)
  roadSearchCache: Map<string, RoadSearchResponse> = new Map();

  // 건물 시설물 데이터 캐시
  vulnerableFacilitiesApiData: VulnerableFacilitiesApiResponse | null = null;
  buildingFacilitiesCache: Map<string, BuildingFacilitiesResponse> = new Map();

  // 패널 최소화 상태
  isMinimized: boolean = false;

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
  // 패널 최소화/최대화
  // ============================================================================

  /**
   * 패널 최소화/최대화 토글
   */
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
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

  /**
   * 시설의 도로명 목록 가져오기
   */
  getNearbyRoadNames(facilityId: string): Set<string> {
    return this.nearbyRoadsCache.get(facilityId) || new Set();
  }

  /**
   * 시설에 도로명 저장
   */
  setNearbyRoadNames(facilityId: string, roadNames: Set<string>) {
    this.nearbyRoadsCache.set(facilityId, roadNames);
  }

  /**
   * 선택된 시설들의 모든 도로명 목록 (중복 제거)
   */
  get selectedRoadNames(): string[] {
    const roadNamesSet = new Set<string>();
    this.selectedFacilityIds.forEach(facilityId => {
      const roadNames = this.getNearbyRoadNames(facilityId);
      roadNames.forEach(name => roadNamesSet.add(name));
    });
    return Array.from(roadNamesSet).sort();
  }

  /**
   * 선택된 시설들의 도로 목록 (UI 표시용)
   */
  get selectedRoads(): NearbyRoad[] {
    return this.selectedRoadNames.map(roadName => ({
      id: roadName,
      roadName: roadName,
      startPoint: '' // Not used in current UI
    }));
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
  // Station Statistics API
  // ============================================================================

  /**
   * 정류장 통계 데이터 로드
   * @param startDate - YYYY-MM-DD 형식
   * @param endDate - YYYY-MM-DD 형식
   */
  async loadStationStatistics(startDate: string, endDate: string): Promise<void> {
    try {
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        limit: '100',
        sort_by: 'pm10'
      });

      console.log('[PriorityStore] Loading station statistics...');
      const response = await fetch(`${API_PATHS.STATION_STATISTICS}?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Station statistics API failed: ${response.status}`);
      }

      this.stationStatisticsData = await response.json();
      console.log(`[PriorityStore] Station statistics loaded: ${this.stationStatisticsData?.stations.length} stations`);
    } catch (error) {
      console.error('[PriorityStore] Failed to load station statistics:', error);
      this.stationStatisticsData = null;
    }
  }

  // ============================================================================
  // Road Search API
  // ============================================================================

  /**
   * 단일 시설의 주변 도로 검색
   * @param facilityId - 시설 ID
   * @param longitude - 경도
   * @param latitude - 위도
   */
  async loadNearbyRoadsForFacility(
    facilityId: string,
    longitude: number,
    latitude: number
  ): Promise<RoadSearchResponse | null> {
    // 캐시 확인
    if (this.roadSearchCache.has(facilityId)) {
      return this.roadSearchCache.get(facilityId)!;
    }

    try {
      console.log(`[PriorityStore] Searching roads for facility ${facilityId}`);
      const roadData = await searchNearbyRoads(longitude, latitude);
      this.roadSearchCache.set(facilityId, roadData);
      console.log(`[PriorityStore] Found ${roadData.total} roads for facility ${facilityId}`);
      return roadData;
    } catch (error) {
      console.error(`[PriorityStore] Failed to search roads for facility ${facilityId}:`, error);
      return null;
    }
  }

  /**
   * 모든 취약시설의 주변 도로 검색 (병렬 처리)
   */
  async loadAllNearbyRoads(): Promise<void> {
    const facilities = this.vulnerableFacilities.filter(
      f => f.predictedLevel === 'very-bad' || f.predictedLevel === 'bad'
    );

    if (facilities.length === 0) {
      console.log('[PriorityStore] No facilities to search roads for');
      return;
    }

    console.log(`[PriorityStore] Loading roads for ${facilities.length} facilities in parallel`);

    const promises = facilities.map(facility => {
      const [longitude, latitude] = facility.geometry.coordinates;
      return this.loadNearbyRoadsForFacility(facility.id, longitude, latitude);
    });

    await Promise.all(promises);
    console.log('[PriorityStore] All road searches completed');
  }

  /**
   * 특정 시설의 도로 데이터 가져오기
   */
  getRoadData(facilityId: string): RoadSearchResponse | null {
    return this.roadSearchCache.get(facilityId) || null;
  }

  // ============================================================================
  // Building Facilities API
  // ============================================================================

  /**
   * 취약시설 건물 데이터 로드 (simulation UUID 기반)
   */
  async loadBuildingFacilitiesData(): Promise<void> {
    if (!this.simulationUuid) {
      console.warn('[PriorityStore] No simulation UUID available');
      return;
    }

    // 이미 로드되어 있으면 스킵
    if (this.vulnerableFacilitiesApiData) {
      console.log('[PriorityStore] Building facilities data already loaded');
      return;
    }

    try {
      console.log(`[PriorityStore] Loading building facilities data for UUID: ${this.simulationUuid}`);
      this.vulnerableFacilitiesApiData = await fetchVulnerableFacilitiesData(this.simulationUuid);
      console.log('[PriorityStore] Building facilities API data structure:', {
        total_affected_facilities: this.vulnerableFacilitiesApiData.total_affected_facilities,
        grades_available: Object.keys(this.vulnerableFacilitiesApiData.facilities_by_grade),
        facilities_by_grade: Object.entries(this.vulnerableFacilitiesApiData.facilities_by_grade).map(([grade, facilities]) => ({
          grade,
          count: facilities?.length || 0,
          ids: facilities?.map(f => ({ id: f.id, name: f.name, type: f.type })) || []
        }))
      });
      console.log('[PriorityStore] Building facilities data loaded successfully');
    } catch (error) {
      console.error('[PriorityStore] Failed to load building facilities data:', error);
      this.vulnerableFacilitiesApiData = null;
    }
  }

  /**
   * 단일 시설의 주변 건물 검색
   */
  async loadBuildingFacilitiesForFacility(facilityId: string): Promise<BuildingFacilitiesResponse | null> {
    // 캐시 확인
    if (this.buildingFacilitiesCache.has(facilityId)) {
      const cached = this.buildingFacilitiesCache.get(facilityId)!;
      console.log(`[PriorityStore] Using cached building data for facility ${facilityId}: ${cached.total} buildings`);
      return cached;
    }

    if (!this.simulationUuid) {
      console.warn('[PriorityStore] No simulation UUID available');
      return null;
    }

    try {
      console.log(`[PriorityStore] Searching building facilities for facility ${facilityId}`);
      const buildingData = await searchNearbyBuildingFacilities(
        facilityId,
        this.simulationUuid,
        this.vulnerableFacilitiesApiData || undefined
      );
      this.buildingFacilitiesCache.set(facilityId, buildingData);
      console.log(`[PriorityStore] Cached ${buildingData.total} buildings for facility ${facilityId}`);

      if (buildingData.total === 0) {
        console.warn(`[PriorityStore] No buildings found for facility ${facilityId} - check API data`);
      }

      return buildingData;
    } catch (error) {
      console.error(`[PriorityStore] Failed to search buildings for facility ${facilityId}:`, error);
      return null;
    }
  }

  /**
   * 모든 취약시설의 주변 건물 검색 (병렬 처리)
   */
  async loadAllBuildingFacilities(): Promise<void> {
    const facilities = this.vulnerableFacilities.filter(
      f => f.predictedLevel === 'very-bad' || f.predictedLevel === 'bad'
    );

    if (facilities.length === 0) {
      console.log('[PriorityStore] No facilities to search buildings for');
      return;
    }

    console.log('[PriorityStore] Facilities to load buildings for:', facilities.map(f => ({ id: f.id, name: f.name, level: f.predictedLevel })));

    // 먼저 전체 데이터 로드
    await this.loadBuildingFacilitiesData();

    console.log(`[PriorityStore] Loading buildings for ${facilities.length} facilities in parallel`);

    facilities.map(facility =>
      this.loadBuildingFacilitiesForFacility(facility.id)
    );

    // const results = await Promise.all(promises);

    console.log('[PriorityStore] All building searches completed');
    console.log('[PriorityStore] Building cache summary:',
      Array.from(this.buildingFacilitiesCache.entries()).map(([id, data]) => ({
        facilityId: id,
        buildingCount: data.total
      }))
    );
  }

  /**
   * 특정 시설의 건물 데이터 가져오기
   */
  getBuildingFacilitiesData(facilityId: string): BuildingFacilitiesResponse | null {
    const data = this.buildingFacilitiesCache.get(facilityId) || null;
    if (!data) {
      console.warn(`[PriorityStore] No cached building data for facility ${facilityId}`);
    }
    return data;
  }

  // ============================================================================
  // Nearby Stations (from StationStore)
  // ============================================================================

  /**
   * 두 좌표 간 거리 계산 (Haversine formula, 단위: km)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * PM10 농도에 따른 등급 계산
   */
  private getPM10Level(concentration: number): 'good' | 'normal' | 'bad' | 'very-bad' {
    if (concentration <= 30) return 'good';
    if (concentration <= 80) return 'normal';
    if (concentration <= 150) return 'bad';
    return 'very-bad';
  }

  /**
   * 단일 시설의 주변 정류장 로드
   * @param facility - 취약시설 정보
   * @param allStations - StationStore의 모든 정류장 데이터
   */
  async loadNearbyStationsForFacility(
    facility: VulnerableFacility,
    allStations: RouteStationFeature[]
  ): Promise<void> {
    // 이미 캐시에 있으면 스킵
    if (this.nearbyStationsCache.has(facility.id)) {
      return;
    }

    const [facilityLng, facilityLat] = facility.geometry.coordinates;

    // 거리 계산 및 필터링
    const stationsWithDistance = allStations.map(feature => {
      const [stationLng, stationLat] = feature.geometry.coordinates;
      const distance = this.calculateDistance(facilityLat, facilityLng, stationLat, stationLng);
      return { ...feature, distance };
    });

    // 중복 제거 (같은 station_id)
    const uniqueStations = stationsWithDistance.reduce((acc, station) => {
      const existing = acc.find(s => s.properties.station_id === station.properties.station_id);
      if (!existing) {
        acc.push(station);
      }
      return acc;
    }, [] as Array<RouteStationFeature & { distance: number }>);

    // 거리 필터링: 3km 이내 정류장만 선택
    const MAX_DISTANCE_KM = 3.0;
    const MAX_STATIONS = 10;

    const nearbyStations = uniqueStations
      .filter(station => station.distance <= MAX_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_STATIONS);

    if (nearbyStations.length === 0) {
      console.log(`[PriorityStore] No stations found within ${MAX_DISTANCE_KM}km for facility ${facility.id}`);
      this.nearbyStationsCache.set(facility.id, []);
      return;
    }

    // 정류장 통계 데이터와 매칭
    if (!this.stationStatisticsData) {
      console.log('[PriorityStore] Station statistics data not loaded yet');
      this.nearbyStationsCache.set(facility.id, []);
      return;
    }

    const nearbyStationIds = new Set(nearbyStations.map(s => s.properties.station_id));
    const filteredApiStations = this.stationStatisticsData.stations.filter(apiStation =>
      nearbyStationIds.has(apiStation.station_id)
    );

    // NearbyStation 생성 (bad/very-bad만 필터링)
    const validStations = nearbyStations
      .map(feature => {
        const apiStation = filteredApiStations.find(s => s.station_id === feature.properties.station_id);

        if (!apiStation || !apiStation.max_pm10) {
          return null;
        }

        const level = this.getPM10Level(apiStation.max_pm10);

        if (level !== 'bad' && level !== 'very-bad') {
          return null;
        }

        const recordedTime = new Date(apiStation.max_pm10_recorded_at);
        const hours = recordedTime.getHours().toString().padStart(2, '0');
        const minutes = recordedTime.getMinutes().toString().padStart(2, '0');

        return {
          id: `${feature.properties.station_id}`,
          stationName: feature.properties.station_name,
          stationId: feature.properties.station_id,
          measurements: [{
            time: `${hours}:${minutes}`,
            concentration: Math.round(apiStation.max_pm10),
            level
          }],
          geometry: feature.geometry
        } as NearbyStation;
      })
      .filter((station): station is NearbyStation => station !== null);

    console.log(`[PriorityStore] Found ${validStations.length} nearby stations with bad/very-bad levels for facility ${facility.id}`);
    this.nearbyStationsCache.set(facility.id, validStations);
  }

  /**
   * 모든 취약시설의 주변 정류장 로드 (병렬 처리)
   * @param allStations - StationStore의 모든 정류장 데이터
   */
  async loadAllNearbyStations(allStations: RouteStationFeature[]): Promise<void> {
    const facilities = this.vulnerableFacilities.filter(
      f => f.predictedLevel === 'very-bad' || f.predictedLevel === 'bad'
    );

    if (facilities.length === 0) {
      console.log('[PriorityStore] No facilities to search stations for');
      return;
    }

    console.log(`[PriorityStore] Loading nearby stations for ${facilities.length} facilities`);

    const promises = facilities.map(facility =>
      this.loadNearbyStationsForFacility(facility, allStations)
    );

    await Promise.all(promises);
    console.log('[PriorityStore] All nearby station searches completed');
  }

  // ============================================================================
  // Integrated Initialization
  // ============================================================================

  /**
   * PriorityResult에서 필요한 모든 데이터 초기화
   * @param allStations - StationStore의 모든 정류장 데이터
   * @param startDate - 정류장 통계 시작일 (YYYY-MM-DD)
   * @param endDate - 정류장 통계 종료일 (YYYY-MM-DD)
   */
  async initializePriorityResultData(
    allStations: RouteStationFeature[],
    startDate: string,
    endDate: string
  ): Promise<void> {
    console.log('[PriorityStore] Initializing priority result data...');

    try {
      // 1. 정류장 통계 데이터 로드 (다른 API들의 선행 조건)
      await this.loadStationStatistics(startDate, endDate);

      // 2. 병렬로 나머지 데이터 로드
      await Promise.all([
        this.loadAllNearbyStations(allStations),
        this.loadAllNearbyRoads(),
        this.loadAllBuildingFacilities()
      ]);

      console.log('[PriorityStore] Priority result data initialization completed');
    } catch (error) {
      console.error('[PriorityStore] Failed to initialize priority result data:', error);
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
    this.stationStatisticsData = null;
    this.roadSearchCache.clear();
    this.vulnerableFacilitiesApiData = null;
    this.buildingFacilitiesCache.clear();
    this.nearbyStationsCache.clear();
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
