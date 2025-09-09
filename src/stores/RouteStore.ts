import { makeAutoObservable } from 'mobx';
import type { RouteInfo, RouteGeom } from '../utils/api/types';
import { getRouteInfo, getRouteGeometry } from '../utils/api/routeApi';

type RouteDirection = 'inbound' | 'outbound';

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
  }

  toggleSelectedRoute(routeName: string) {
    if (this.selectedRouteName === routeName) {
      // 이미 선택된 노선을 클릭하면 선택 해제
      this.clearSelection();
    } else {
      // 다른 노선을 클릭하면 선택
      this.setSelectedRoute(routeName);
    }
  }

  setSelectedDirection(direction: RouteDirection) {
    this.selectedDirection = direction;
  }

  clearSelection() {
    this.selectedRouteName = null;
    this.selectedDirection = null;
  }

  clearDirectionSelection() {
    this.selectedDirection = null;
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
      
      console.log('[RouteStore] 초기 데이터 로딩 완료');
    } catch (error) {
      console.error('[RouteStore] 초기 데이터 로딩 실패:', error);
    }
  }

  /**
   * route_info API 호출 및 저장
   */
  async loadRouteInfo(): Promise<void> {
    this.setRouteInfoLoading(true);
    
    try {
      const response = await getRouteInfo();
      console.log('[RouteStore] API 응답 전체:', response);
      console.log('[RouteStore] API 응답 데이터:', response.data);
      
      // 실제 API 응답 구조에 맞게 수정
      if (response && response.routes && Array.isArray(response.routes)) {
        this.setRouteInfoList(response.routes);
        console.log(`[RouteStore] route_info 로딩 완료: ${response.routes.length}개 노선 (총 ${response.total}개)`);
      } else {
        console.error('[RouteStore] API 응답 구조가 예상과 다름:', response);
        this.setRouteInfoError('API 응답 구조 오류');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'route_info 로딩 실패';
      this.setRouteInfoError(errorMessage);
      console.error('[RouteStore] route_info 로딩 실패:', error);
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
          console.log(`[RouteStore] route_geom 로딩 완료: ${routeName}`);
        } catch (error) {
          results.failed++;
          console.error(`[RouteStore] route_geom 로딩 실패: ${routeName}`, error);
        }
      }
      
      console.log(`[RouteStore] route_geom 전체 로딩 완료: 성공 ${results.success}개, 실패 ${results.failed}개`);
      
      if (results.failed > 0 && results.success === 0) {
        this.setRouteGeomError('모든 노선 geometry 로딩 실패');
      } else if (results.failed > 0) {
        console.warn(`[RouteStore] ${results.failed}개 노선 geometry 로딩 실패`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'route_geom 로딩 실패';
      this.setRouteGeomError(errorMessage);
      console.error('[RouteStore] route_geom 로딩 실패:', error);
    } finally {
      this.setRouteGeomLoading(false);
    }
  }

  /**
   * 특정 노선의 route_geom만 개별 로딩 (필요시 사용)
   */
  async loadSingleRouteGeometry(routeName: string): Promise<boolean> {
    try {
      const response = await getRouteGeometry(routeName);
      // response 자체가 RouteGeom 구조 (data wrapper 없음)
      this.setRouteGeom(routeName, response);
      console.log(`[RouteStore] route_geom 개별 로딩 완료: ${routeName}`);
      return true;
    } catch (error) {
      console.error(`[RouteStore] route_geom 개별 로딩 실패: ${routeName}`, error);
      return false;
    }
  }
}

export const routeStore = new RouteStore();