import { makeAutoObservable, action } from 'mobx';
import type { RouteStationsResponse, RouteStation, RouteStationFeature, RouteStationProperties } from '../utils/api/types';
import { getRouteStations } from '../utils/api/routeApi';
import { routeStore } from './RouteStore';

type RouteDirection = 'inbound' | 'outbound';

interface StationLoadingState {
  stationLoading: boolean;
  stationError: string | null;
}

/**
 * StationStore - 노선별 정류장 데이터 관리 (GeoJSON FeatureCollection 지원)
 * RouteStore와 독립적으로 운영되는 정류장 전용 상태 관리
 *
 * API 응답: GeoJSON FeatureCollection 형태
 * - features[].geometry: Point 좌표
 * - features[].properties: 정류장 메타데이터
 */
class StationStore {
  // 정류장 데이터 저장: routeName-direction 조합을 키로 사용
  stationDataMap: Map<string, RouteStationsResponse> = new Map();
  
  // 사용자 선택 상태 (EntireBus 컴포넌트에서 관리)
  // selectedRouteName은 RouteStore에서 관리 (Single Source of Truth)
  selectedDirection: RouteDirection | null = null;
  selectedStationId: string | null = null;
  
  // 로딩 상태
  loadingState: StationLoadingState = {
    stationLoading: false,
    stationError: null,
  };
  
  constructor() {
    makeAutoObservable(this);
  }
  
  // ============================================================================
  // 키 생성 유틸리티
  // ============================================================================
  
  private createStationKey(routeName: string, direction: RouteDirection): string {
    return `${routeName}-${direction}`;
  }
  
  // ============================================================================
  // API 데이터 관리
  // ============================================================================
  
  setStationData = action((routeName: string, direction: RouteDirection, data: RouteStationsResponse) => {
    const key = this.createStationKey(routeName, direction);
    this.stationDataMap.set(key, data);
  });
  
  getStationData(routeName: string, direction: RouteDirection): RouteStationsResponse | undefined {
    const key = this.createStationKey(routeName, direction);
    return this.stationDataMap.get(key);
  }
  
  hasStationData(routeName: string, direction: RouteDirection): boolean {
    const key = this.createStationKey(routeName, direction);
    return this.stationDataMap.has(key);
  }
  
  // ============================================================================
  // 사용자 선택 상태 관리
  // ============================================================================
  
  setSelectedRoute = action((routeName: string) => {
    // selectedRouteName은 RouteStore에서 관리 - RouteStore.setSelectedRoute 호출
    routeStore.setSelectedRoute(routeName);
    // 노선 변경 시 정류장 선택 초기화, 방향은 상행선으로 기본 설정
    this.selectedDirection = 'inbound';
    this.selectedStationId = null;
  });
  
  setSelectedDirection = action((direction: RouteDirection) => {
    this.selectedDirection = direction;
    // 방향 변경 시 정류장 선택 초기화
    this.selectedStationId = null;
  });
  
  setSelectedStation = action((stationId: string) => {
    this.selectedStationId = stationId;
  });
  
  clearSelection = action(() => {
    // selectedRouteName은 RouteStore에서 관리 - RouteStore.clearSelection 호출
    routeStore.clearSelection();
    this.selectedDirection = null;
    this.selectedStationId = null;
  });
  
  clearDirectionSelection = action(() => {
    this.selectedDirection = null;
    this.selectedStationId = null;
  });
  
  clearStationSelection = action(() => {
    this.selectedStationId = null;
  });
  
  // ============================================================================
  // GeoJSON 데이터 접근 메서드
  // ============================================================================

  /**
   * 현재 선택된 정류장의 GeoJSON Feature 반환
   */
  get selectedStationFeature(): RouteStationFeature | undefined {
    if (!this.selectedStationId) return undefined;
    return this.currentStationFeatures.find(feature =>
      feature.properties.station_id === this.selectedStationId
    );
  }

  /**
   * 현재 선택된 정류장의 좌표 반환 [lng, lat]
   */
  get selectedStationCoordinates(): [number, number] | undefined {
    const feature = this.selectedStationFeature;
    return feature?.geometry.coordinates;
  }

  /**
   * 현재 선택된 정류장의 properties 반환
   */
  get selectedStationProperties(): RouteStationProperties | undefined {
    return this.selectedStationFeature?.properties;
  }

  // ============================================================================
  // 상태 조회 메서드
  // ============================================================================
  
  isRouteSelected(routeName: string): boolean {
    return routeStore.selectedRouteName === routeName;
  }
  
  isDirectionSelected(direction: RouteDirection): boolean {
    return this.selectedDirection === direction;
  }
  
  isStationSelected(stationId: string): boolean {
    return this.selectedStationId === stationId;
  }
  
  get hasSelectedRoute(): boolean {
    return routeStore.selectedRouteName !== null;
  }
  
  get hasSelectedDirection(): boolean {
    return this.selectedDirection !== null;
  }
  
  get hasSelectedStation(): boolean {
    return this.selectedStationId !== null;
  }
  
  get currentStationData(): RouteStationsResponse | undefined {
    if (!routeStore.selectedRouteName || !this.selectedDirection) return undefined;
    return this.getStationData(routeStore.selectedRouteName, this.selectedDirection);
  }
  
  get currentStations(): RouteStation[] {
    // GeoJSON Feature를 기존 RouteStation 형태로 변환 (하위 호환성)
    const stationData = this.currentStationData;
    if (!stationData?.features) return [];

    return stationData.features.map(feature => ({
      ...feature.properties,
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1]
    }));
  }

  get currentStationFeatures(): RouteStationFeature[] {
    return this.currentStationData?.features || [];
  }

  // selectedRouteName getter - RouteStore 참조
  get selectedRouteName(): string | null {
    return routeStore.selectedRouteName;
  }
  
  get currentDirectionName(): string | undefined {
    return this.currentStationData?.direction_name;
  }
  
  get selectedStation(): RouteStation | undefined {
    if (!this.selectedStationId) return undefined;
    return this.currentStations.find(station => station.station_id === this.selectedStationId);
  }

  /**
   * 현재 선택된 정류장 (새로운 GeoJSON Feature 방식)
   * @preferred 새로운 코드에서는 selectedStationFeature 사용 권장
   */
  get selectedStationGeoJSON(): RouteStationFeature | undefined {
    return this.selectedStationFeature;
  }
  
  // ============================================================================
  // 로딩 상태 관리
  // ============================================================================
  
  setStationLoading = action((loading: boolean) => {
    this.loadingState.stationLoading = loading;
    if (loading) {
      this.loadingState.stationError = null;
    }
  });
  
  setStationError = action((error: string | null) => {
    this.loadingState.stationError = error;
    this.loadingState.stationLoading = false;
  });
  
  get isLoading(): boolean {
    return this.loadingState.stationLoading;
  }
  
  get hasError(): boolean {
    return !!this.loadingState.stationError;
  }
  
  // ============================================================================
  // API 호출 메서드
  // ============================================================================
  
  /**
   * 특정 노선의 방향별 정류장 데이터 로딩
   */
  async loadStations(routeName: string, direction: RouteDirection): Promise<void> {
    // 이미 로드된 데이터가 있으면 API 호출 생략
    if (this.hasStationData(routeName, direction)) {
      console.log(`[StationStore] 캐시된 데이터 사용: ${routeName}-${direction}`);
      return;
    }
    
    console.log(`[StationStore] 정류장 데이터 로딩 시작: ${routeName}-${direction}`);
    this.setStationLoading(true);
    
    try {
      const data = await getRouteStations(routeName, direction);
      this.setStationData(routeName, direction, data);
      console.log(`[StationStore] 정류장 데이터 로딩 완료: ${routeName}-${direction} (${data.features.length}개 정류장)`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Station 데이터 로딩 실패';
      console.error(`[StationStore] 정류장 데이터 로딩 실패: ${routeName}-${direction} - ${errorMessage}`);
      this.setStationError(errorMessage);
    } finally {
      this.setStationLoading(false);
    }
  }
  
  /**
   * 현재 선택된 노선의 양방향 정류장 데이터 모두 로딩
   */
  async loadAllDirections(routeName: string): Promise<void> {
    console.log(`[StationStore] 양방향 정류장 데이터 로딩 시작: ${routeName}`);
    const directions: RouteDirection[] = ['inbound', 'outbound'];
    
    try {
      await Promise.all(
        directions.map(direction => this.loadStations(routeName, direction))
      );
      console.log(`[StationStore] 양방향 정류장 데이터 로딩 완료: ${routeName}`);
    } catch (error) {
      console.error(`[StationStore] 양방향 정류장 데이터 로딩 실패: ${routeName}:`, error);
    }
  }
  
}

export const stationStore = new StationStore();