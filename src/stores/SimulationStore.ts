import { makeAutoObservable, observable, runInAction } from 'mobx';
import type { AddressSearchResult, SimulationConfig, SimulationView, SimulationConfirmType } from '../pages/Simulation/types';
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationListItem,
  SimulationListPagination,
  SimulationDetail,
  SimulationQuckData,
  SimulationInProgressResponse,
  PMType,
  Weather
} from '../types/simulation_request_types';
import type { VulnerableFacilitiesResponse } from '@/utils/api/types';
import { submitSimulation, getSimulationList, getSimulationDetail, getSimulationQuickList, deleteSimulationsAPI, updateSimulationPrivacyAPI, getCurrentWeatherAPI, runSimulationCheck, reverseGeocodeAPI, searchAddressAPI, getVulnerableFacilities } from '@/utils/api';
import { userStore } from './UserStore';
import { administrativeStore } from './AdministrativeStore';
// import { randomizeSimulationConcentration, ENABLE_MOCK_CONCENTRATION } from '@/utils/mockData/simulationConcentration';

// ============================================================================
// SimulationStore Class
// ============================================================================
class SimulationStore {
  // ============================================================================
  // Observable State
  // ============================================================================

  // 검색 상태
  searchQuery: string = '';
  searchResults: AddressSearchResult[] = [];
  isSearching: boolean = false;

  // 직접 위치 지정 모드
  isDirectLocationMode: boolean = false;
  directLocationResults: AddressSearchResult[] = []; // 직접 위치 지정 시 선택한 위치 목록
  selectedLocation: { lat: number; lng: number; height: number } | null = null;

  // 선택 상태 (검색 또는 직접 위치 지정)
  selectedAddressId: string | null = null;

  // 모드 전환 시 이전 선택 상태 임시 저장
  // private previousSelectedAddressId: string | null = null;

  // 시뮬레이션 설정
  config: SimulationConfig | null = null;

  // 현재 기상 정보
  currentWeather: Weather | null = null;
  isLoadingCurrentWeather: boolean = false;
  weatherLocation: string = '부전동';
  weatherTimestamp: string = '08.07. 09:00';

  // 시뮬레이션 제출
  isSubmitting: boolean = false;
  submitError: string | null = null;

  // 시뮬레이션 목록 (API 기반)
  simulationList: SimulationListItem[] = [];
  isLoadingList: boolean = false;
  listError: string | null = null;
  pagination: SimulationListPagination | null = null;
  selectedStartSimulation: SimulationListItem | null = null;
  pendingSimulationData: SimulationRequest | null = null;

  // 시뮬레이션auto(quick) 목록 (API 기반)
  simulationQuickList: SimulationQuckData[] = [];
  paginationQuick: SimulationListPagination | null = null;
  selectedsimulationQuick: SimulationQuckData | null = null;
  isLoadingQuickList: boolean = false;
  // 빠른실행 결과 가이드창 활성화
  isSimulationQuickGuideMode: boolean = false;

  // 시뮬레이션 상세 정보
  selectedSimulationUuid: string | null = null;
  simulationDetail: SimulationDetail | null = null;
  isLoadingDetail: boolean = false;
  detailError: string | null = null;

  // 시뮬레이션 결과 요약 (취약시설)
  vulnerableFacilities: VulnerableFacilitiesResponse | null = null;
  isLoadingVulnerableFacilities: boolean = false;
  vulnerableFacilitiesError: string | null = null;

  // 시뮬레이션 GLB 개수
  glbCount: number | null = null;
  isLoadingGlbCount: boolean = false;

  // 시뮬레이션 GLB 현재 프레임 (SimulationProgressIndicator와 SimulationGlbSampleRender 동기화)
  currentGlbFrame: number = 0;

  // 지역 정보
  isLoadingDistricts: boolean = false;

  // confirm modal active
  isModalOpen = false
  isModalConfirmType: SimulationConfirmType | null = null;
  private modalResolve?: (result: string) => void;

  // 팝업 상태 관리
  isConfigPopupOpen = false
  isResultPopupOpen = false

  // 팝업별 최소화 상태
  isConfigPopupMinimized = false
  isResultPopupMinimized = false

  // 시뮬레이션 Panel 상태 관리
  currentView: SimulationView = "config"
  pollutantFilter: PMType | 'all' = 'all';
  sortOrder: 'latest' | 'oldest' = 'latest'; // 기본값 'latest'
  isDeleteMode: boolean = false;
  itemsToDelete = new Set<string>();
  isMinimized: boolean = false;

  // 기간 설정 관리
  isDateModalOpen: boolean = false;
  startDate: string | null = null;
  endDate: string | null = null;

  constructor() {
    makeAutoObservable(this, {
      itemsToDelete: observable, // itemDelete 체크박스 이벤트 추적용
      currentWeather: observable
    });
  }

  // ============================================================================
  // 시뮬레이션 Panel 변경
  // ============================================================================
  setCurrentView(viewName: SimulationView) {
    this.currentView = viewName

    if (viewName !== 'config' && this.isDirectLocationMode) {
      this.disableDirectLocationMode();
    }

    if (viewName === 'result') {
      simulationStore.openResultPopup();
      simulationStore.openConfigPopup();
    } else {
      simulationStore.closeResultPopup();
      simulationStore.closeConfigPopup();
    }
  }

  /**
   * 패널 최소화/최대화 토글
   */
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }

  // ============================================================================
  // 주소 검색
  // ============================================================================

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  /**
   * 주소 검색 수행
   * GET /api/v1/address/search
   */
  async searchAddress(query: string): Promise<void> {
    if (!query.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;

    try {
      const districtPrefix = administrativeStore.selectedDivisionName || '';
      const fixedQuery = districtPrefix? `${districtPrefix} ${query}` : query;

      const response = await searchAddressAPI(fixedQuery, 1, 10);

        if (response.status === 'success') {
        // API 타입 -> UI 타입 매핑
        const mapped = response.items.map(item => ({
          id: item.id,
          roadAddress: item.address.road,
          jibunAddress: item.address.parcel,
          detailAddress: item.address.bldnm || item.address.bldnmdc,
          geometry: {
            type: 'Point' as const,
            coordinates: [item.point.longitude, item.point.latitude] as [number, number]
          }
        }));
        runInAction(() => { this.searchResults = mapped; });

      } else {
        // 에러 처리
        console.error('[SimulationStore] Search failed:', response.error);
        runInAction(() => { this.searchResults = []; });
      }
    } catch (error) {
      console.error('[SimulationStore] Address search failed:', error);
      runInAction(() => { this.searchResults = []; });
    } finally {
      runInAction(() => { this.isSearching = false; });
    }
  }

  clearSearchResults() {
    this.searchResults = [];
    this.searchQuery = '';
  }

  // ============================================================================
  // 주소 선택
  // ============================================================================

  selectAddress(addressId: string) {
    this.selectedAddressId = addressId;

    // 선택된 주소의 좌표를 selectedLocation에 설정
    const address = this.currentResults.find(result => result.id === addressId);
    if (address?.geometry) {
      const [lng, lat] = address.geometry.coordinates;
      const height = address.height ?? 0;
      this.selectedLocation = { lng, lat, height };
    }
  }

  clearSelection() {
    this.selectedAddressId = null;
  }

  /**
   * 모든 상태 초기화 (DetailConfig 뒤로가기 시)
   */
  resetToInitial() {
    this.selectedAddressId = null;
    this.selectedLocation = null;
    this.searchResults = [];
    this.searchQuery = '';
    this.directLocationResults = [];
    this.isDirectLocationMode = false;
    // this.previousSelectedAddressId = null;
  }

  isAddressSelected(addressId: string): boolean {
    return this.selectedAddressId === addressId;
  }

  /**
   * 선택된 주소 (양쪽 리스트에서 검색)
   */
  get selectedAddress(): AddressSearchResult | null {
    if (!this.selectedAddressId) return null;

    // 직접 위치 지정 리스트에서 먼저 검색
    const directResult = this.directLocationResults.find(result => result.id === this.selectedAddressId);
    if (directResult) return directResult;

    // 검색 결과 리스트에서 검색
    return this.searchResults.find(result => result.id === this.selectedAddressId) || null;
  }

  // ============================================================================
  // 시뮬레이션 설정
  // ============================================================================

  setConfig(config: SimulationConfig) {
    this.config = config;
  }

  clearConfig() {
    this.config = null;
  }

  // ============================================================================
  // 직접 위치 지정
  // ============================================================================

  enableDirectLocationMode() {
    this.isDirectLocationMode = true;

    // 현재 선택 상태를 임시 저장 후 초기화 (위치 설정 완료 버튼 숨김)
    // this.previousSelectedAddressId = this.selectedAddressId;
    this.selectedAddressId = null;

    // 위치 정보 초기화 (마커 제거)
    this.selectedLocation = null;

    // 직접 위치 지정 리스트 초기화 (검색 결과는 유지)
    this.directLocationResults = [];
  }

  disableDirectLocationMode() {
    this.isDirectLocationMode = false;

  }

  /**
   * 직접 위치 지정: 지도 클릭 시 호출
   * GET /api/v1/address/reverse
   */
  async addDirectLocationResult(lat: number, lng: number, height: number = 0) {
    runInAction(() => {
      this.selectedLocation = { lat, lng, height };
      this.isSearching = true;
      this.directLocationResults = []
    });

    try {
      const response = await reverseGeocodeAPI(lng, lat);

      if (response.status === 'success') {
        const results: AddressSearchResult[] = [];
        const geometry = { type: 'Point' as const, coordinates: [lng, lat] as [number, number] };

        response.results.forEach(item => {
          if (item.type === 'road') {
            results.push({
              id: `direct_road_${Date.now()}`,
              roadAddress: item.text,
              detailAddress: item.structure.detail,
              geometry,
              height
            });
          } else if (item.type === 'parcel') {
            results.push({
              id: `direct_jibun_${Date.now()}`,
              jibunAddress: item.text,
              geometry,
              height
            });
          }
        });

        runInAction(() => {
          this.directLocationResults = results;
          // 결과 설정 및 첫 번째 항목 자동 선택
          this.selectedAddressId = results.length > 0 ? results[0].id : null;
        });
      }
    } catch (error) {
      console.error("[SimulationStore] addDirectLocationResult failed:", error);
    } finally {
      runInAction(() => { this.isSearching = false; });
    }
  }

  clearDirectLocationResults() {
    this.directLocationResults = [];
    this.selectedLocation = null;
  }

  // ============================================================================
  // Computed Properties
  // ============================================================================

  /**
   * 현재 모드에 따라 표시할 결과 리스트 반환
   */
  get currentResults(): AddressSearchResult[] {
    return this.isDirectLocationMode ? this.directLocationResults : this.searchResults;
  }

  /**
   * 현재 모드의 결과가 있는지 확인
   */
  get hasSearchResults(): boolean {
    return this.currentResults.length > 0;
  }

  get hasSelectedAddress(): boolean {
    return this.selectedAddressId !== null;
  }

  get hasConfig(): boolean {
    return this.config !== null;
  }

  /**
   * 위치가 선택되었는지 확인 (주소 검색 또는 직접 위치 지정)
   */
  get hasSelectedLocation(): boolean {
    return this.selectedAddressId !== null || this.selectedLocation !== null;
  }

  /**
   * 선택된 위치의 좌표 반환 (Point Geometry)
   */
  get selectedLocationGeometry(): { type: 'Point'; coordinates: [number, number] } | null {
    // 주소 검색에서 선택된 경우
    if (this.selectedAddress) {
      return this.selectedAddress.geometry;
    }
    // 직접 위치 지정에서 선택된 경우
    if (this.selectedLocation) {
      return {
        type: 'Point',
        coordinates: [this.selectedLocation.lng, this.selectedLocation.lat]
      };
    }
    return null;
  }

  // ============================================================================
  // 현재 기상 정보
  // ============================================================================

  /**
   * 현재 기상 정보 불러오기
   * GET /api/v1/weather/current
   */
  async loadWeatherInfo(): Promise<void> {
    // 이미 로딩했거나 로딩 중이면 중복 호출 방지
    if (this.isLoadingCurrentWeather || this.currentWeather) return;
    
      runInAction(() => {
        this.isLoadingCurrentWeather = true;
      });

    try {
      const weatherData = await getCurrentWeatherAPI();

      runInAction(() => {
        this.currentWeather = weatherData;
        // this.weatherLocation = '기상청';

        const now = new Date(); // API 호출 성공 시점의 현재 시간
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.weatherTimestamp = `${month}.${day}. ${hours}:${minutes}`;
      });

    } catch (error) {
      console.error('[SimulationStore] Weather info load failed:', error);
    } finally {
      runInAction(() => {
        this.isLoadingCurrentWeather = false;
      })
    }
  }

  /**
   * 체크박스 라벨용 기상 정보 문자열
   */
  get weatherInfoLabel(): string {
    return `현재 기상 정보 적용 (기상청, ${this.weatherLocation}, ${this.weatherTimestamp} 기준)`;
  }

  // ============================================================================
  // 진행중인 시뮬레이션 확인
  // ============================================================================

  /**
   * 진행중인 시뮬레이션 확인
   * POST /api/v1/simulation/check
   */
  async runSimulationCheck(): Promise<SimulationInProgressResponse | null> {
    try {
      const response = await runSimulationCheck();
      
      return response;
    } catch (error) {
      console.error('[SimulationStore] Simulation runSimulationCheck failed:', error);
      return null;
    }
  }

  // ============================================================================
  // 시뮬레이션 제출
  // ============================================================================

  /**
   * 시뮬레이션 제출 후 목록 갱신
   * POST /api/v1/simulation/process
   */
  async submitSimulationRequest(simulationData: SimulationRequest): Promise<SimulationResponse | null> {
    this.isSubmitting = true;
    this.submitError = null;

    try {
      const response = await submitSimulation(simulationData);

      if (response.success && response.data) {
        // 성공 시 목록 갱신
        await this.loadSimulationList();
        this.setCurrentView('running');
      }

      return response;
    } catch (error) {
      console.error('[SimulationStore] Simulation submission failed:', error);
      this.submitError = error instanceof Error ? error.message : 'Unknown error occurred';
      return null;
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * 시뮬레이션 공개/비공개 상태 업데이트
   */
  async updateSimulationPrivacy(uuid: string, isPrivate: boolean): Promise<void> {    
    const userId = userStore.currentUser;
    if (!userId) {
        console.error("Privacy Update failed: User ID is missing.");
        throw new Error("User ID is missing.");
    }

    try {
      // API 엔드포인트는 PUT /api/v1/simulation/{uuid} 또는 유사 형태를 가정
      await updateSimulationPrivacyAPI(uuid, isPrivate, userId); 

      // API 성공 시 로컬 목록 업데이트
      runInAction(() => {
        const index = this.simulationList.findIndex(sim => sim.uuid === uuid);
        if (index !== -1) {
          this.simulationList[index] = { 
            ...this.simulationList[index], 
            is_private: isPrivate 
          };
          console.log("[Store] Local list updated.");
        }
      });
    } catch (error) {
      console.error(`[Store] Failed to update privacy for ${uuid}:`, error);
      throw error; 
    }
  }

  // ============================================================================
  // Pagination 관리
  // ============================================================================
  
  /**
   * 현재 페이지 번호를 반환
   */
  get currentPage(): number {
    return this.pagination?.page ?? 1;
  }

  /**
   * 총 페이지 수를 반환
   */
  get totalPages(): number {
    return this.pagination?.total_pages ?? 1;
  }

  // ============================================================================
  // 시뮬레이션 목록 관리
  // ============================================================================

  /**
   * 시뮬레이션 목록 조회
   * GET /api/v1/simulation/list
   *
   * userId가 제공되지 않으면 userStore.user를 사용합니다.
   */
  async loadSimulationList(
    page: number = 1,
    limit: number = 7,
    userId?: string,
  ): Promise<void> {
    this.isLoadingList = true;
    this.listError = null;

    try {
      // userId가 없으면 userStore의 현재 사용자 사용
      const effectiveUserId = userId || userStore.currentUser;

      const response = await getSimulationList(page, limit, effectiveUserId,
        this.pollutantFilter,
        this.sortOrder,
        this.startDate,
        this.endDate,
      );
      this.simulationList = response.simulations;
      this.pagination = response.pagination;
    } catch (error) {
      console.error('[SimulationStore] Failed to load simulation list:', error);
      this.listError = error instanceof Error ? error.message : 'Unknown error occurred';
      this.simulationList = [];
      this.pagination = null;
    } finally {
      this.isLoadingList = false;
    }
  }

  async loadSimulationQuickList(
    startDate : Date,
    endDate : Date,
    page: number = 1,
    limit: number = 7,
  ): Promise<void> {
    this.isLoadingQuickList = true;

    try {
      const response = await getSimulationQuickList(startDate, endDate, page, limit);
      this.simulationQuickList = response.simulations;
      this.paginationQuick = response.pagination;

    } catch (error) {
      console.error('[SimulationStore] Failed to load simulation list:', error);
      this.simulationQuickList = [];
      this.paginationQuick = null;
    } finally {
      this.isLoadingQuickList = false;
    }
  }

  /**
   * 오염물질 필터 변경 액션
   */
  setPollutantFilter(filter: PMType | 'all') {
    if (this.pollutantFilter === filter) return; // 변경 사항 없으면 중단
    
    this.pollutantFilter = filter;
    // 필터 변경 시 1페이지로 이동하며, 현재 정렬 순서 유지
    this.loadSimulationList(1);
  }

  /**
   * 날짜 정렬 순서 변경 액션
   */
  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'latest' ? 'oldest' : 'latest';
    this.loadSimulationList(1);
  }

  /**
   * 페이지 변경 액션
   */
  setPage(page: number) {
    // 유효한 페이지 범위 내에서만 API 재호출
    if (page > 0 && page !== this.currentPage && page <= this.totalPages) {
      this.loadSimulationList(page);
    }
  }

  openDateModal() {
    this.isDateModalOpen = true;
  }

  closeDateModal() {
    this.isDateModalOpen = false;
  }

  /**
   * 날짜 범위 설정 및 데이터 새로고침
   */
  async setDateRange(startDate: string, endDate: string) {
    runInAction(() => {
      this.startDate = startDate;
      this.endDate = endDate;
    })
    this.closeDateModal();
    await this.loadSimulationList(1);
  }

  /**
   * 날짜 범위 초기화 및 데이터 새로고침
   */
  async clearDateRange() {
    runInAction(() => {
      this.startDate = null;
      this.endDate = null;
    })
    this.closeDateModal();
    await this.loadSimulationList(1);
  }

  /**
   * 목록 초기화
   */
  clearSimulationList() {
    this.simulationList = [];
    this.pagination = null;
    this.listError = null;
  }

  // ============================================================================
  // 시뮬레이션 상세 정보
  // ============================================================================

  /**
   * 시뮬레이션 선택 및 상세 정보 조회
   * GET /api/v1/simulation/:uuid
   */
  async selectSimulation(uuid: string): Promise<void> {
    this.selectedSimulationUuid = uuid;
    this.isLoadingDetail = true;
    this.detailError = null;

    try {
      const detail = await getSimulationDetail(uuid);
      this.simulationDetail = detail;

      // simulationList에서 json_count 가져오기
      const listItem = this.simulationList.find(item => item.uuid === uuid);
      this.glbCount = listItem?.json_count || 0;

      console.log(`[SimulationStore] Selected simulation: uuid=${uuid}, json_count=${this.glbCount}`);

      // 취약시설 정보 로드
      await this.loadVulnerableFacilities(uuid);
    } catch (error) {
      console.error(`[SimulationStore] Failed to load simulation detail (${uuid}):`, error);
      this.detailError = error instanceof Error ? error.message : 'Unknown error occurred';
      this.simulationDetail = null;
    } finally {
      this.isLoadingDetail = false;
    }
  }

  /**
   * 시뮬레이션 결과 요약 조회 (취약시설)
   * GET /api/v1/simulation/{uuid}/vulnerable-facilities
   */
  async loadVulnerableFacilities(uuid: string): Promise<void> {
    this.isLoadingVulnerableFacilities = true;
    this.vulnerableFacilitiesError = null;

    try {
      const data = await getVulnerableFacilities(uuid);
      runInAction(() => {
        this.vulnerableFacilities = data;
      });
    } catch (error) {
      console.error(`[SimulationStore] Failed to load vulnerable facilities (${uuid}):`, error);
      runInAction(() => {
        this.vulnerableFacilitiesError = error instanceof Error ? error.message : 'Unknown error occurred';
        this.vulnerableFacilities = null;
      });
    } finally {
      runInAction(() => {
        this.isLoadingVulnerableFacilities = false;
      });
    }
  }

  /**
   * 시뮬레이션 GLB 개수 조회
   * GET /api/v1/simulation/{uuid}/glb/count
   */
  async loadGlbCount(uuid: string): Promise<void> {
    this.isLoadingGlbCount = true;

    try {
      //const count = await getSimulationGlbCount(uuid);
      const count = 100;
      runInAction(() => {
        this.glbCount = count;
      });
    } catch (error) {
      console.error(`[SimulationStore] Failed to load GLB count (${uuid}):`, error);
      runInAction(() => {
        this.glbCount = null;
      });
    } finally {
      runInAction(() => {
        this.isLoadingGlbCount = false;
      });
    }
  }

  /**
   * 현재 GLB 프레임 설정 (SimulationProgressIndicator에서 호출)
   */
  setCurrentGlbFrame(frame: number) {
    this.currentGlbFrame = frame;
  }

  /**
   * GLB 프레임 초기화
   */
  resetGlbFrame() {
    this.currentGlbFrame = 0;
  }

  /**
   * 선택 해제 및 상세 패널 닫기
   */
  closeSimulationDetail() {
    this.selectedSimulationUuid = null;
    this.simulationDetail = null;
    this.detailError = null;
    this.vulnerableFacilities = null;
    this.vulnerableFacilitiesError = null;
    this.glbCount = null;
  }

  /**
   * 상세 정보가 열려있는지 확인
   */
  get isDetailPanelOpen(): boolean {
    return this.selectedSimulationUuid !== null;
  }

  // ============================================================================
  // 삭제 관련 Actions
  // ============================================================================

  get isAllSelectedOnPage(): boolean {
    if (this.simulationList.length === 0) return false;
    return this.simulationList.every(sim => this.itemsToDelete.has(sim.uuid));
  }

  /**
   * 삭제 모드 활성화/비활성화
   */
  toggleDeleteMode() {
    runInAction(() => {
      this.isDeleteMode = !this.isDeleteMode;
      // 삭제 모드 종료 시 선택 항목 초기화
      if(!this.isDeleteMode) {
        this.itemsToDelete.clear()
      }
    });
  }

  /**
   * 개별 아이템 선택 토글
   */
  toggleItemForDelete(uuid: string) {
    if (this.itemsToDelete.has(uuid)) {
      this.itemsToDelete.delete(uuid);
    } else {
      this.itemsToDelete.add(uuid);
    }
  }

  /**
   * 현재 페이지 전체 선택/해제
   */
  toggleSelectAllOnPage() {
    if (this.isAllSelectedOnPage) {
      // 모든 항목이 선택된 경우 -> 현재 페이지 항목 모두 선택 해제
      this.simulationList.forEach(sim => this.itemsToDelete.delete(sim.uuid));
    } else {
      // 모든 항목이 선택되지 않은 경우 -> 현재 페이지 항목 모두 선택
      this.simulationList.forEach(sim => this.itemsToDelete.add(sim.uuid));
    }
  }

  /**
   * 선택된 시뮬레이션 삭제 API 호출
   */
  async deleteSelectedSimulations() {
    if (this.itemsToDelete.size === 0) {
      // 선택된 항목이 없으면 삭제 모드만 토글
      this.toggleDeleteMode();
      return;
    }

    const uuidsToDelete = Array.from(this.itemsToDelete).filter(uuid => {
      const sim = this.simulationList.find(s => s.uuid === uuid);
      return sim && sim.status !== '진행중';
    });

    // "진행중"인 항목만 선택한 경우
    if (uuidsToDelete.length === 0) {
         console.warn("삭제할 수 있는 항목이 없습니다. (모두 '진행중' 상태)");
         runInAction(() => {
            this.isDeleteMode = false;
            this.itemsToDelete.clear();
         });
         return;
    }
    
    // "진행중" 항목이 섞여있는 경우
    if (uuidsToDelete.length < this.itemsToDelete.size) {
        console.warn("'진행중' 상태인 항목을 제외하고 삭제를 시도합니다.");
        // (사용자에게 알림 팝업 띄우는 것 고려)
    }

    // user_id 가져오기
    const userId = userStore.currentUser;
    if (!userId) {
        console.error("Delete failed: User ID is missing.");
        return; 
    }

    try {
      // TODO: (API) 'api.ts'에 deleteSimulations(uuids: string[]) 함수 구현 필요
      await deleteSimulationsAPI(userId, uuidsToDelete); 
      
      runInAction(() => {
        this.itemsToDelete.clear();
        this.isDeleteMode = false;
      });
      // --- 목록 새로고침 ---
      await this.loadSimulationList(this.currentPage); 

    } catch (error) {
      console.error("Failed to delete simulations", error);
    }
  }

  // ============================================================================
  //confirm
  // ============================================================================
  /**
   * '상세설정' 데이터 임시 저장 
   */
  setPendingData(data: SimulationRequest) {
    this.pendingSimulationData = data;
    this.selectedStartSimulation = null; // 다른 컨텍스트 데이터 초기화
  }

  /**
   * '실행목록' 항목 선택 저장 
   */
  setSelectedStartSimulation(item: SimulationListItem) {
    this.selectedStartSimulation = item;
    this.pendingSimulationData = null; // 다른 컨텍스트 데이터 초기화
  }

  /** 
   * Confirm 모달에 표시할 데이터 반환 
   */
  get dataForConfirm(): SimulationRequest | SimulationListItem | null{
    if (this.currentView === 'detailConfig') {
      return this.pendingSimulationData;
    } else {
      return this.selectedStartSimulation;
    }
  }
  
  /**
   * 빠른실행 분석시작시 객체 저장
   */
  setSelectedSimulationQuick(item: SimulationQuckData) {
    this.selectedsimulationQuick = null;
    this.selectedsimulationQuick = item;

    // json_count를 glbCount에 설정 (API에서 json 파일 개수 반환)
    this.glbCount = item.json_count || 0;

    console.log(`[SimulationStore] Selected quick simulation: uuid=${item.uuid}, json_count=${item.json_count}`);
  }
  /**
   * 모달 열기
   */
  openModal(type: SimulationConfirmType): Promise<string> {
    if (this.modalResolve) {
      this.modalResolve('cancel');
      this.modalResolve = undefined;
    }

    this.isModalConfirmType = type;
    this.isModalOpen = true;

    return new Promise<string>((resolve) => {
      this.modalResolve = resolve;
    });
  }
  
  /**
   * 모달 확인버튼 콜백
   */
  confirmModal() {
    this.isModalOpen = false;
    this.isModalConfirmType = null;
    const r = this.modalResolve;
    this.modalResolve = undefined;
    r?.('confirm');
  }

  /**
   * 모달 취소버튼 콜백
   */
  cancelModal() {
    this.isModalOpen = false;
    this.isModalConfirmType = null;
    const r = this.modalResolve;
    this.modalResolve = undefined;
    r?.('cancel');
  }

  /**
   * 모달 닫기
   */
  closeModal = () => {
    //모달 닫기
    this.isModalOpen = false
    //데이터 클리어
    this.pendingSimulationData = null;
    this.selectedStartSimulation = null;
    this.isModalConfirmType = null;
  }

  // ============================================================================
  // 팝업 관리
  // ============================================================================

  /**
   * 설정 정보 팝업 열기
   */
  openConfigPopup = () => {
    this.isConfigPopupOpen = true;
    this.isConfigPopupMinimized = false; // 팝업 열 때 최소화 해제
  }

  /**
   * 설정 정보 팝업 닫기
   */
  closeConfigPopup = () => {
    this.isConfigPopupOpen = false;
    this.isConfigPopupMinimized = false; // 팝업 닫을 때 최소화 상태 초기화
  }

  /**
   * 설정 정보 팝업 최소화/최대화 토글
   */
  toggleConfigPopupMinimize = () => {
    this.isConfigPopupMinimized = !this.isConfigPopupMinimized;
  }

  /**
   * 결과 요약 팝업 열기
   */
  openResultPopup = () => {
    this.isResultPopupOpen = true;
    this.isResultPopupMinimized = false; // 팝업 열 때 최소화 해제
  }

  /**
   * 결과 요약 팝업 닫기
   */
  closeResultPopup = () => {
    this.isResultPopupOpen = false;
    this.isResultPopupMinimized = false; // 팝업 닫을 때 최소화 상태 초기화
  }

  /**
   * 결과 요약 팝업 최소화/최대화 토글
   */
  toggleResultPopupMinimize = () => {
    this.isResultPopupMinimized = !this.isResultPopupMinimized;
  }

}

export const simulationStore = new SimulationStore();