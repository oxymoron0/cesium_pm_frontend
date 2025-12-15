import { makeAutoObservable } from 'mobx';
import type { RouteInfo, RouteGeom } from '../utils/api/types';
import { getRouteInfo, getRouteGeometry } from '../utils/api/routeApi';
import { createFocusedRoute, removeFocusedRoute } from '../utils/cesium/routeColors';
import { showOnlyStationsForRoute, hideAllStations, sampleTerrainForRoute } from '../utils/cesium/stationRenderer';

type RouteDirection = 'inbound' | 'outbound';
type UIVersion = 'v1' | 'v2';
type MonitoringTab = 'bus' | 'station';

interface RouteLoadingState {
  routeInfoLoading: boolean;
  routeGeomLoading: boolean;
  routeInfoError: string | null;
  routeGeomError: string | null;
}

class RouteStore {
  // API 데이터 저장 (DB 구조와 동일)
  routeInfoList: RouteInfo[] = [];
  routeGeomMap: Map<string, RouteGeom> = new Map(); // route_name을 키로 사용

  // 사용자 선택 상태
  selectedRouteName: string | null = null;
  selectedDirection: RouteDirection | null = null;

  // UI 버전 상태
  uiVersion: UIVersion = 'v1';

  // 모니터링 탭 상태 (버스번호 | 정류장)
  monitoringTab: MonitoringTab = 'bus';

  // API 로딩 상태
  loadingState: RouteLoadingState = {
    routeInfoLoading: false,
    routeGeomLoading: false,
    routeInfoError: null,
    routeGeomError: null,
  };

  constructor() {
    makeAutoObservable(this);
  }

  // ============================================================================
  // API 데이터 관리
  // ============================================================================

  setRouteInfoList(routeInfoList: RouteInfo[]) {
    this.routeInfoList = routeInfoList;
  }

  setRouteGeom(routeName: string, routeGeom: RouteGeom) {
    this.routeGeomMap.set(routeName, routeGeom);
  }

  getRouteInfo(routeName: string): RouteInfo | undefined {
    return this.routeInfoList.find(info => info.route_name === routeName);
  }

  getRouteGeom(routeName: string): RouteGeom | undefined {
    return this.routeGeomMap.get(routeName);
  }

  // ============================================================================
  // 사용자 선택 상태 관리
  // ============================================================================

  setSelectedRoute(routeName: string) {
    this.selectedRouteName = routeName;
    // 노선 변경 시 방향 선택 초기화
    this.selectedDirection = null;

    // 선택된 노선의 geometry를 가져와서 focused route 생성
    const routeGeom = this.getRouteGeom(routeName);
    if (routeGeom) {
      createFocusedRoute(routeGeom);
    }

    // 선택된 노선의 정류장만 표시
    showOnlyStationsForRoute(routeName);

    // 선택된 노선의 정류장들에 대해 terrain 높이 샘플링 실행
    this.sampleTerrainForSelectedRoute(routeName);
  }

  toggleSelectedRoute(routeName: string) {
    if (this.selectedRouteName === routeName) {
      // 이미 선택된 노선을 클릭하면 선택 해제
      this.clearSelection();
      removeFocusedRoute();
      // 모든 정류장 숨김
      hideAllStations();
    } else {
      // 새로운 노선 선택
      this.setSelectedRoute(routeName);

      // 선택된 노선의 geometry를 가져와서 focused route 생성
      const routeGeom = this.getRouteGeom(routeName);
      if (routeGeom) {
        createFocusedRoute(routeGeom);
      } else {
        console.warn(`[toggleSelectedRoute] RouteGeom not found for ${routeName}`);
      }

      // 선택된 노선의 정류장만 표시
      showOnlyStationsForRoute(routeName);

      // 선택된 노선의 정류장들에 대해 terrain 높이 샘플링 실행
      this.sampleTerrainForSelectedRoute(routeName);
    }
  }

  setSelectedDirection(direction: RouteDirection) {
    this.selectedDirection = direction;
  }

  clearSelection() {
    this.selectedRouteName = null;
    this.selectedDirection = null;
    // focused route도 함께 제거
    removeFocusedRoute();
    // 모든 정류장 숨김
    hideAllStations();
  }

  clearDirectionSelection() {
    this.selectedDirection = null;
  }

  /**
   * 선택된 노선의 양방향 정류장에 대해 terrain 높이 샘플링
   * @param routeName - 노선 번호
   */
  private async sampleTerrainForSelectedRoute(routeName: string): Promise<void> {
    try {
      // 양방향 병렬 처리로 terrain 샘플링
      const samplingPromises = [
        sampleTerrainForRoute(routeName, 'inbound'),
        sampleTerrainForRoute(routeName, 'outbound')
      ];

      await Promise.all(samplingPromises);

    } catch (error) {
      console.error(`[sampleTerrainForSelectedRoute] Terrain sampling failed for route ${routeName}:`, error);
    }
  }

  // ============================================================================
  // 상태 조회 메서드
  // ============================================================================

  isRouteSelected(routeName: string): boolean {
    return this.selectedRouteName === routeName;
  }

  isDirectionSelected(direction: RouteDirection): boolean {
    return this.selectedDirection === direction;
  }

  get hasSelectedRoute(): boolean {
    return this.selectedRouteName !== null;
  }

  get hasSelectedDirection(): boolean {
    return this.selectedDirection !== null;
  }

  get selectedRouteInfo(): RouteInfo | undefined {
    if (!this.selectedRouteName) return undefined;
    return this.getRouteInfo(this.selectedRouteName);
  }

  get selectedRouteGeom(): RouteGeom | undefined {
    if (!this.selectedRouteName) return undefined;
    return this.getRouteGeom(this.selectedRouteName);
  }

  // ============================================================================
  // UI 버전 관리
  // ============================================================================

  setUIVersion(version: UIVersion) {
    this.uiVersion = version;
  }

  toggleUIVersion() {
    this.uiVersion = this.uiVersion === 'v1' ? 'v2' : 'v1';
  }

  get isV1(): boolean {
    return this.uiVersion === 'v1';
  }

  get isV2(): boolean {
    return this.uiVersion === 'v2';
  }

  // ============================================================================
  // 모니터링 탭 관리
  // ============================================================================

  setMonitoringTab(tab: MonitoringTab) {
    this.monitoringTab = tab;
  }

  // ============================================================================
  // 로딩 상태 관리
  // ============================================================================

  setRouteInfoLoading(loading: boolean) {
    this.loadingState.routeInfoLoading = loading;
    if (loading) {
      this.loadingState.routeInfoError = null;
    }
  }

  setRouteGeomLoading(loading: boolean) {
    this.loadingState.routeGeomLoading = loading;
    if (loading) {
      this.loadingState.routeGeomError = null;
    }
  }

  setRouteInfoError(error: string | null) {
    this.loadingState.routeInfoError = error;
    this.loadingState.routeInfoLoading = false;
  }

  setRouteGeomError(error: string | null) {
    this.loadingState.routeGeomError = error;
    this.loadingState.routeGeomLoading = false;
  }

  get isLoading(): boolean {
    return this.loadingState.routeInfoLoading || this.loadingState.routeGeomLoading;
  }

  get hasError(): boolean {
    return !!(this.loadingState.routeInfoError || this.loadingState.routeGeomError);
  }

  // ============================================================================
  // 자동 로딩 메서드 (앱 시작시 호출)
  // ============================================================================

  /**
   * 앱 시작시 호출: route_info -> route_geom 순차 로딩
   */
  async initializeRouteData(): Promise<void> {
    try {
      // 1단계: route_info 로딩
      await this.loadRouteInfo();
      
      // 2단계: 각 route_name별로 route_geom 로딩
      if (this.routeInfoList.length > 0) {
        await this.loadAllRouteGeometries();
      }
      
    } catch (error) {
      console.error('[RouteStore] Route data initialization failed:', error);
    }
  }

  /**
   * route_info API 호출 및 저장
   */
  async loadRouteInfo(): Promise<void> {
    this.setRouteInfoLoading(true);
    
    try {
      const response = await getRouteInfo();
      
      // 실제 API 응답 구조에 맞게 수정
      if (response && response.routes && Array.isArray(response.routes)) {
        this.setRouteInfoList(response.routes);
      } else {
        this.setRouteInfoError('API 응답 구조 오류');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'route_info 로딩 실패';
      this.setRouteInfoError(errorMessage);
    } finally {
      this.setRouteInfoLoading(false);
    }
  }

  /**
   * 모든 노선의 route_geom API 순차 호출 및 저장
   */
  async loadAllRouteGeometries(): Promise<void> {
    this.setRouteGeomLoading(true);
    
    const routeNames = this.routeInfoList.map(info => info.route_name);
    const results = { success: 0, failed: 0 };
    
    try {
      // 각 route_name별로 순차 처리
      for (const routeName of routeNames) {
        try {
          const response = await getRouteGeometry(routeName);
          // response 자체가 RouteGeom 구조 (data wrapper 없음)
          this.setRouteGeom(routeName, response);
          
          results.success++;
        } catch (error) {
          console.error(`[RouteStore] Failed to load geometry for route ${routeName}:`, error);
          results.failed++;
        }
      }
      
      
      if (results.failed > 0 && results.success === 0) {
        this.setRouteGeomError('모든 노선 geometry 로딩 실패');
      } else if (results.failed > 0) {
        console.warn(`[RouteStore] Partial failure: ${results.failed} out of ${routeNames.length} routes failed to load`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'route_geom 로딩 실패';
      this.setRouteGeomError(errorMessage);
    } finally {
      this.setRouteGeomLoading(false);
    }
  }

}

export const routeStore = new RouteStore();