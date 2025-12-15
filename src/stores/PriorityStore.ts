import { makeAutoObservable, runInAction } from 'mobx';
import type {
  PriorityConfig,
  NearbyStation,
  NearbyRoad,
  VulnerableFacility,
  StationStatisticsResponse,
  RoadSearchResponse,
  VulnerableFacilitiesApiResponse,
  NearbyBadAirQualityResponse
} from '../pages/Priority/types';
import { API_PATHS } from '../utils/api/config';
import { searchNearbyRoads } from '../pages/Priority/api/roadSearch';
import { fetchVulnerableFacilitiesData, searchNearbyBuildingFacilities } from '../pages/Priority/api/buildingFacilitiesSearch';
import type { BuildingFacilitiesResponse } from '@/utils/cesium/nearbyBuildingFacilitiesRenderer';
import { getSimulationGlbCount } from '../utils/api/simulationApi';

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

/**
 * 주변 정류장 센서 데이터 API 응답
 * POST /api/v1/stations/nearby-sensor
 */
export interface NearbySensorApiResponse {
  status: string;
  stations: NearbySensorStation[];
  total: number;
}

export interface NearbySensorStation {
  station: {
    station_id: string;
    station_name: string;
  };
  readings: NearbySensorReading[];
}

export interface NearbySensorReading {
  recorded_at: string;
  pm: number;
  pm_grade: string;
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
  // NOTE: composite key 사용 (${id}_${type})
  selectedFacilityIds: Set<string> = new Set();

  // 도로 선택 상태
  selectedRoadIds: Set<string> = new Set();

  // 데이터 캐시
  // NOTE: 모든 캐시는 composite key 사용 (${id}_${type})
  private adminRegionsCache: Map<string, AdminRegion> = new Map();
  private nearbyStationsCache: Map<string, NearbyStation[]> = new Map(); // facilityKey -> NearbyStation[]
  private nearbyRoadsCache: Map<string, Set<string>> = new Map(); // facilityKey -> Set<roadName>

  // 로딩 상태
  isLoadingDongs: boolean = false;
  isLoadingStations: boolean = false;
  isLoadingRoads: boolean = false;
  isLoadingFacilities: boolean = false;

  // 취약시설 검색 결과
  vulnerableFacilities: VulnerableFacility[] = [];
  simulationUuid: string | null = null;
  simulationGlbCount: number = 0;

  // 정류장 통계 데이터 (전체)
  stationStatisticsData: StationStatisticsResponse | null = null;

  // 도로 검색 결과 캐시 (facilityKey → RoadSearchResponse)
  // NOTE: composite key 사용 (${id}_${type})
  roadSearchCache: Map<string, RoadSearchResponse> = new Map();

  // 건물 시설물 데이터 캐시
  // NOTE: composite key 사용 (${id}_${type})
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

  /**
   * 시설 선택 토글
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  toggleFacilitySelection(facilityKey: string) {
    if (this.selectedFacilityIds.has(facilityKey)) {
      this.selectedFacilityIds.delete(facilityKey);
    } else {
      this.selectedFacilityIds.add(facilityKey);
    }
  }

  clearFacilitySelection() {
    this.selectedFacilityIds.clear();
  }

  /**
   * 시설 선택 여부 확인
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  isFacilitySelected(facilityKey: string): boolean {
    return this.selectedFacilityIds.has(facilityKey);
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

  /**
   * 시설의 주변 정류장 가져오기
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  getNearbyStations(facilityKey: string): NearbyStation[] {
    return this.nearbyStationsCache.get(facilityKey) || [];
  }

  /**
   * 시설의 주변 정류장 저장
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  setNearbyStations(facilityKey: string, stations: NearbyStation[]) {
    this.nearbyStationsCache.set(facilityKey, stations);
  }

  get selectedStations(): NearbyStation[] {
    const stations: NearbyStation[] = [];
    this.selectedFacilityIds.forEach(facilityKey => {
      const nearby = this.getNearbyStations(facilityKey);
      nearby.forEach(newStation => {
        const isDuplicate = stations.some(existingStation => existingStation.id === newStation.id);
        if (!isDuplicate) {
            stations.push(newStation);
        }
      });
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
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  getNearbyRoadNames(facilityKey: string): Set<string> {
    return this.nearbyRoadsCache.get(facilityKey) || new Set();
  }

  /**
   * 시설에 도로명 저장
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  setNearbyRoadNames(facilityKey: string, roadNames: Set<string>) {
    this.nearbyRoadsCache.set(facilityKey, roadNames);
  }

  /**
   * 선택된 시설들의 모든 도로명 목록 (중복 제거)
   */
  get selectedRoadNames(): string[] {
    const roadNamesSet = new Set<string>();
    this.selectedFacilityIds.forEach(facilityKey => {
      const roadNames = this.getNearbyRoadNames(facilityKey);
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
        type: item.type as 'senior' | 'childcare',
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

      // GLB count 및 건물 데이터 조회
      if (this.simulationUuid) {
        await this.loadSimulationGlbCount();
        await this.loadBuildingFacilitiesData();
      }

      console.log(`[PriorityStore] ${data.total_count}개의 시설을 찾았습니다.`);
    } catch (error) {
      console.error('[PriorityStore] 취약시설 검색 실패:', error);
      this.vulnerableFacilities = [];
      this.simulationUuid = null;
    } finally {
      this.isLoadingFacilities = false;
    }
  }

  // ============================================================================
  // Simulation GLB Count API
  // ============================================================================

  /**
   * 시뮬레이션 GLB 개수 조회
   */
  async loadSimulationGlbCount(): Promise<void> {
    if (!this.simulationUuid) {
      console.warn('[PriorityStore] No simulation UUID available');
      return;
    }

    try {
      console.log(`[PriorityStore] Loading GLB count for UUID: ${this.simulationUuid}`);
      this.simulationGlbCount = await getSimulationGlbCount(this.simulationUuid);
      console.log(`[PriorityStore] GLB count loaded: ${this.simulationGlbCount}`);
    } catch (error) {
      console.error('[PriorityStore] Failed to load GLB count:', error);
      this.simulationGlbCount = 0;
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
   * @param facilityKey - 시설 composite key (${id}_${type})
   * @param longitude - 경도
   * @param latitude - 위도
   */
  async loadNearbyRoadsForFacility(
    facilityKey: string,
    longitude: number,
    latitude: number
  ): Promise<RoadSearchResponse | null> {
    // 캐시 확인
    if (this.roadSearchCache.has(facilityKey)) {
      return this.roadSearchCache.get(facilityKey)!;
    }

    try {
      console.log(`[PriorityStore] Searching roads for facility ${facilityKey}`);
      const roadData = await searchNearbyRoads(longitude, latitude);
      this.roadSearchCache.set(facilityKey, roadData);
      console.log(`[PriorityStore] Found ${roadData.total} roads for facility ${facilityKey}`);
      return roadData;
    } catch (error) {
      console.error(`[PriorityStore] Failed to search roads for facility ${facilityKey}:`, error);
      return null;
    }
  }

  /**
   * 모든 취약시설의 주변 도로 검색 (병렬 처리)
   */
  async loadAllNearbyRoads(): Promise<void> {
    const facilities = this.vulnerableFacilities.filter(
      f => f.predictedLevel === 'very-bad' || f.predictedLevel === 'bad' || f.predictedLevel === 'good' || f.predictedLevel === 'normal'
    );

    if (facilities.length === 0) {
      console.log('[PriorityStore] No facilities to search roads for');
      return;
    }

    console.log(`[PriorityStore] Loading roads for ${facilities.length} facilities in parallel`);

    const promises = facilities.map(facility => {
      const facilityKey = `${facility.id}_${facility.type}`;
      const [longitude, latitude] = facility.geometry.coordinates;
      return this.loadNearbyRoadsForFacility(facilityKey, longitude, latitude);
    });

    await Promise.all(promises);
    console.log('[PriorityStore] All road searches completed');
  }

  /**
   * 특정 시설의 도로 데이터 가져오기
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  getRoadData(facilityKey: string): RoadSearchResponse | null {
    return this.roadSearchCache.get(facilityKey) || null;
  }

  // ============================================================================
  // Building Facilities API
  // ============================================================================

  /**
   * 취약시설 건물 데이터 로드 (simulation UUID 기반)
   */
  async loadBuildingFacilitiesData(): Promise<void> {
    if (!this.simulationUuid) return;
    if (this.vulnerableFacilitiesApiData) return;

    try {
      this.vulnerableFacilitiesApiData = await fetchVulnerableFacilitiesData(this.simulationUuid);
      console.log(`[PriorityStore] 건물 데이터 로드 완료: ${this.vulnerableFacilitiesApiData.total_affected_facilities}개 시설`);
    } catch (error) {
      console.error('[PriorityStore] 건물 데이터 로드 실패:', error);
      this.vulnerableFacilitiesApiData = null;
    }
  }

  /**
   * 단일 시설의 주변 건물 검색
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  async loadBuildingFacilitiesForFacility(facilityKey: string): Promise<BuildingFacilitiesResponse | null> {
    // composite key에서 id와 type 추출
    const facility = this.vulnerableFacilities.find(f => `${f.id}_${f.type}` === facilityKey);
    if (!facility) return null;

    // 캐시 확인
    if (this.buildingFacilitiesCache.has(facilityKey)) {
      return this.buildingFacilitiesCache.get(facilityKey)!;
    }

    if (!this.simulationUuid) return null;

    try {
      const buildingData = await searchNearbyBuildingFacilities(
        facility.id,
        facility.type,
        this.simulationUuid,
        this.vulnerableFacilitiesApiData || undefined
      );
      this.buildingFacilitiesCache.set(facilityKey, buildingData);
      return buildingData;
    } catch (error) {
      console.error(`[PriorityStore] 건물 검색 실패 (key: ${facilityKey}):`, error);
      return null;
    }
  }

  /**
   * 모든 취약시설의 주변 건물 검색 (병렬 처리)
   */
  async loadAllBuildingFacilities(): Promise<void> {
    const facilities = this.vulnerableFacilities.filter(
      f => f.predictedLevel === 'very-bad' || f.predictedLevel === 'bad' || f.predictedLevel === 'good' || f.predictedLevel === 'normal'
    );

    if (facilities.length === 0) {
      console.log('[PriorityStore] No facilities to search buildings for');
      return;
    }

    console.log('[PriorityStore] Facilities to load buildings for:', facilities.map(f => ({ id: f.id, name: f.name, level: f.predictedLevel })));

    // 먼저 전체 데이터 로드
    await this.loadBuildingFacilitiesData();

    console.log(`[PriorityStore] Loading buildings for ${facilities.length} facilities in parallel`);

    facilities.map(facility => {
      const facilityKey = `${facility.id}_${facility.type}`;
      return this.loadBuildingFacilitiesForFacility(facilityKey);
    });

    console.log('[PriorityStore] All building searches completed');
    console.log('[PriorityStore] Building cache summary:',
      Array.from(this.buildingFacilitiesCache.entries()).map(([key, data]) => ({
        facilityKey: key,
        buildingCount: data.total
      }))
    );
  }

  /**
   * 특정 시설의 건물 데이터 가져오기
   * @param facilityKey - 시설 composite key (${id}_${type})
   */
  getBuildingFacilitiesData(facilityKey: string): BuildingFacilitiesResponse | null {
    return this.buildingFacilitiesCache.get(facilityKey) || null;
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
   * API 응답의 한글 등급을 내부 등급으로 변환
   * @param levelText - "좋음" | "보통" | "나쁨" | "매우나쁨"
   */
  private convertLevelFromApi(levelText: string | undefined): 'good' | 'normal' | 'bad' | 'very-bad' | null {
    if (!levelText) return null;
    switch (levelText) {
      case '좋음': return 'good';
      case '보통': return 'normal';
      case '나쁨': return 'bad';
      case '매우나쁨': return 'very-bad';
      default: return null;
    }
  }

  /**
   * 단일 시설의 주변 정류장 로드 (실시간 API 사용)
   * GET /api/v1/stations/nearby-bad-air-quality
   * @param facility - 취약시설 정보
   */
  async loadNearbyStationsForFacility(
    facility: VulnerableFacility
  ): Promise<void> {
    const facilityKey = `${facility.id}_${facility.type}`;

    // 이미 캐시에 있으면 스킵
    if (this.nearbyStationsCache.has(facilityKey)) {
      return;
    }

    // config에서 날짜/시간 가져오기
    if (!this.config) {
      console.log('[PriorityStore] Config not set, cannot load nearby stations');
      this.nearbyStationsCache.set(facilityKey, []);
      return;
    }

    const [facilityLng, facilityLat] = facility.geometry.coordinates;

    // datetime 형식 변환: "2025.01.15" + "17 ~ 18시" → "2025-01-15 17:00"
    // config.time 예시: "17 ~ 18시", "14시", "9 ~ 10시"
    const dateStr = this.config.date.replace(/\./g, '-');
    // 시작 시간만 추출: "17 ~ 18시" → "17", "14시" → "14"
    const timeMatch = this.config.time.match(/(\d+)/);
    const hourStr = timeMatch ? timeMatch[1].padStart(2, '0') : '00';
    const datetime = `${dateStr} ${hourStr}:00`;

    try {
      console.log(`[PriorityStore] Loading nearby stations for facility ${facilityKey} at ${datetime}`);

      const queryParams = new URLSearchParams({
        lat: facilityLat.toString(),
        lng: facilityLng.toString(),
        radius: '100', // 100m (도로 조회와 동일)
        datetime: datetime
      });

      const response = await fetch(`${API_PATHS.STATIONS_NEARBY_BAD_AIR_QUALITY}?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Nearby bad air quality API failed: ${response.status}`);
      }

      const data: NearbyBadAirQualityResponse = await response.json();

      // stations가 null이면 빈 배열 처리
      if (!data.stations || data.stations.length === 0) {
        console.log(`[PriorityStore] No nearby stations found for facility ${facilityKey}`);
        runInAction(() => {
          this.nearbyStationsCache.set(facilityKey, []);
        });
        return;
      }

      // API 응답을 NearbyStation 형식으로 변환
      const validStations: NearbyStation[] = data.stations.map(apiStation => {
        // sensor_data 배열에서 첫 번째 측정값 사용
        const sensorReading = apiStation.sensor_data[0];
        const pm10 = sensorReading?.pm10 ?? 0;

        const recordedTime = new Date(sensorReading?.recorded_at || datetime);
        const hours = recordedTime.getHours().toString().padStart(2, '0');
        const minutes = recordedTime.getMinutes().toString().padStart(2, '0');

        // API에서 level을 직접 제공하므로 사용, 없으면 계산
        const levelFromApi = sensorReading?.pm10_level;
        const level = this.convertLevelFromApi(levelFromApi) || this.getPM10Level(pm10);

        return {
          id: apiStation.station_id,
          stationName: apiStation.station_name,
          stationId: apiStation.station_id,
          measurements: [{
            time: `${hours}:${minutes}`,
            concentration: Math.round(pm10),
            level
          }],
          geometry: apiStation.geometry
        };
      });

      runInAction(() => {
        this.nearbyStationsCache.set(facilityKey, validStations);
      });

      console.log(`[PriorityStore] Found ${validStations.length} nearby stations with bad air quality for facility ${facilityKey}`);
    } catch (error) {
      console.error(`[PriorityStore] Failed to load nearby stations for facility ${facilityKey}:`, error);
      runInAction(() => {
        this.nearbyStationsCache.set(facilityKey, []);
      });
    }
  }

  /**
   * 모든 취약시설의 주변 정류장 로드 (병렬 처리)
   * 실시간 API를 사용하므로 초기화 시 호출하지 않음
   * @deprecated 취약시설 선택 시 개별 호출로 변경됨
   */
  async loadAllNearbyStations(): Promise<void> {
    const facilities = this.vulnerableFacilities.filter(
      f => f.predictedLevel === 'very-bad' || f.predictedLevel === 'bad' || f.predictedLevel === 'good' || f.predictedLevel === 'normal'
    );

    if (facilities.length === 0) {
      console.log('[PriorityStore] No facilities to search stations for');
      return;
    }

    console.log(`[PriorityStore] Loading nearby stations for ${facilities.length} facilities`);

    const promises = facilities.map(facility =>
      this.loadNearbyStationsForFacility(facility)
    );

    await Promise.all(promises);
    console.log('[PriorityStore] All nearby station searches completed');
  }

  // ============================================================================
  // Integrated Initialization
  // ============================================================================

  /**
   * PriorityResult에서 필요한 모든 데이터 초기화
   * 주변 정류장은 실시간 API를 사용하므로 취약시설 선택 시 개별 로드
   */
  async initializePriorityResultData(): Promise<void> {
    console.log('[PriorityStore] 우선순위 결과 데이터 초기화를 시작합니다.');

    try {
      // NOTE: 도로/건물/정류장 개별 검색은 lazy loading으로 처리
      // - 체크박스 선택 시 toggleFacility()에서 로드
      // - 주변 정류장은 실시간 API (nearby-bad-air-quality)를 사용
      // - 초기화 시 모든 시설의 데이터를 로드하면 429 Too Many Requests 발생

      console.log('[PriorityStore] 우선순위 결과 데이터 초기화를 완료했습니다.');
    } catch (error) {
      console.error('[PriorityStore] 우선순위 결과 데이터 초기화 중 오류 발생:', error);
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

  /**
   * 중복 제거된 취약시설 목록 (우선순위 오름차순 정렬)
   * ID + type 조합으로 중복 제거 (같은 건물에 senior/childcare 모두 있을 수 있음)
   */
  get uniqueVulnerableFacilities(): VulnerableFacility[] {
    const uniqueMap = new Map<string, VulnerableFacility>();
    this.vulnerableFacilities.forEach(facility => {
      const key = `${facility.id}_${facility.type}`;
      uniqueMap.set(key, facility);
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.rank - b.rank);
  }
}

export const priorityStore = new PriorityStore();
