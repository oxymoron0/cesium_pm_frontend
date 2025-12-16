import { makeAutoObservable, action } from 'mobx';
import { getStationSensorData } from '@/utils/api';
import type { StationSensorApiData } from '@/utils/api/types';
import { stationStore } from './StationStore';
import { routeStore } from './RouteStore';
import { getCurrentSelectedSearchStationId } from '@/utils/cesium/searchStationRenderer';

/**
 * 센서 데이터 타입
 */
export interface SensorData {
  pm10: number;
  pm25: number;
  vocs: number;
}

// 자동 업데이트 주기 (밀리초)
const AUTO_UPDATE_INTERVAL_MS = 60 * 1000; // 1분

/**
 * StationSensorStore - 정류장 센서 표시 관리
 * 간단한 리스트 기반 접근 방식으로 어떤 정류장에 센서를 표시할지 관리
 */
class StationSensorStore {
  // 센서를 표시할 정류장 ID 목록
  visibleStationIds: Set<string> = new Set();

  // 센서 데이터 저장 (실제 API 연동 전까지 모의 데이터 사용)
  sensorDataMap: Map<string, SensorData> = new Map();

  // 사용자가 센서 표시를 원하는지 여부 (기본값: true)
  userWantsSensorDisplay: boolean = true;

  // 센서 데이터 로딩 상태
  isLoading: boolean = false;
  loadError: string | null = null;

  // 호버 상태 관리
  hoveredStationId: string | null = null;

  // 자동 업데이트 타이머 ID
  private autoUpdateIntervalId: ReturnType<typeof setInterval> | null = null;

  // 마지막 업데이트 시각
  lastUpdatedAt: Date | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // ============================================================================
  // 표시 상태 관리
  // ============================================================================

  /**
   * 모든 센서 표시 제거 (사용자 설정 변경)
   */
  clearAll = action(() => {
    this.visibleStationIds.clear();
    this.userWantsSensorDisplay = false;
  });

  /**
   * 센서만 숨김 (사용자 설정 유지)
   */
  clearVisibleStations = action(() => {
    this.visibleStationIds.clear();
  });

  /**
   * 현재 선택된 노선의 모든 정류장에 센서 표시
   */
  showSelectedRoute = action(() => {
    this.visibleStationIds.clear();
    this.userWantsSensorDisplay = true;

    const selectedRouteName = routeStore.selectedRouteName;
    const selectedDirection = stationStore.selectedDirection;

    if (!selectedRouteName) return;

    // 선택된 방향이 있으면 해당 방향만, 없으면 양방향 모두 표시
    const directions = selectedDirection ? [selectedDirection] : ['inbound', 'outbound'];

    directions.forEach(direction => {
      const stationData = stationStore.getStationData(selectedRouteName, direction as 'inbound' | 'outbound');
      if (stationData) {
        stationData.features.forEach(feature => {
          this.visibleStationIds.add(feature.properties.station_id);
        });
      }
    });
  });

  // ============================================================================
  // 호버 상태 관리
  // ============================================================================

  /**
   * 정류장에 마우스 호버 시작
   */
  setHoveredStation = action((stationId: string | null) => {
    this.hoveredStationId = stationId;
  });

  /**
   * 마우스 호버 종료
   */
  clearHoveredStation = action(() => {
    this.hoveredStationId = null;
  });

  // ============================================================================
  // 센서 데이터 관리
  // ============================================================================

  /**
   * 특정 정류장의 센서 데이터 설정
   */
  setSensorData = action((stationId: string, data: SensorData) => {
    this.sensorDataMap.set(stationId, data);
  });

  /**
   * 검색 결과 정류장에 대한 센서 데이터 생성
   * @param stationIds - 검색 결과 정류장 ID 배열
   */
  generateSensorDataForSearchStations = action((stationIds: string[]) => {
    const generateMockData = (): SensorData => ({
      pm10: Math.round((Math.random() * 100 + 20) * 10) / 10,  // 20-120
      pm25: Math.round((Math.random() * 50 + 10) * 10) / 10,   // 10-60
      vocs: Math.round((Math.random() * 300 + 100) * 10) / 10  // 100-400
    });

    stationIds.forEach(stationId => {
      if (!this.sensorDataMap.has(stationId)) {
        this.sensorDataMap.set(stationId, generateMockData());
      }
    });
  });

  /**
   * 특정 정류장의 센서 데이터 조회
   */
  getSensorData(stationId: string): SensorData | undefined {
    return this.sensorDataMap.get(stationId);
  }

  /**
   * API에서 센서 데이터를 로드하여 저장
   * 애플리케이션 초기화 시 호출
   */
  loadSensorData = action(async (): Promise<void> => {
    if (this.isLoading) return; // 이미 로딩 중이면 중복 요청 방지

    this.isLoading = true;
    this.loadError = null;

    try {
      console.log('[StationSensorStore] 센서 데이터 로딩 시작...');
      const response = await getStationSensorData();

      // API 데이터를 UI 포맷으로 변환하여 저장
      const transformedData = new Map<string, SensorData>();

      response.data.forEach((apiData: StationSensorApiData) => {
        transformedData.set(apiData.station_id, {
          pm10: Math.round(apiData.sensor_data.pm * 10) / 10,      // pm → pm10
          pm25: Math.round(apiData.sensor_data.fpm * 10) / 10,     // fpm → pm25
          vocs: Math.round(apiData.sensor_data.voc * 10) / 10      // voc → vocs
        });
      });

      this.sensorDataMap = transformedData;
      this.lastUpdatedAt = new Date();
      console.log('[StationSensorStore] 센서 데이터 로딩 완료:', {
        totalStations: this.sensorDataMap.size,
        updatedAt: this.lastUpdatedAt.toLocaleTimeString(),
        sampleData: Array.from(this.sensorDataMap.entries()).slice(0, 3)
      });

    } catch (error) {
      this.loadError = error instanceof Error ? error.message : '센서 데이터 로드 실패';
      console.error('[StationSensorStore] 센서 데이터 로딩 실패:', error);

      // 실패 시 모의 데이터로 대체
      console.log('[StationSensorStore] 모의 데이터로 대체합니다.');
      this.generateFallbackData();
    } finally {
      this.isLoading = false;
    }
  });

  /**
   * API 로딩 실패 시 모의 데이터 생성
   */
  private generateFallbackData = action(() => {
    const generateMockData = (): SensorData => ({
      pm10: Math.round((Math.random() * 100 + 20) * 10) / 10,  // 20-120
      pm25: Math.round((Math.random() * 50 + 10) * 10) / 10,   // 10-60
      vocs: Math.round((Math.random() * 300 + 100) * 10) / 10  // 100-400
    });

    // StationStore의 모든 정류장에 대해 센서 데이터 생성
    stationStore.stationDataMap.forEach((stationData) => {
      stationData.features.forEach((feature) => {
        if (!this.sensorDataMap.has(feature.properties.station_id)) {
          this.sensorDataMap.set(feature.properties.station_id, generateMockData());
        }
      });
    });
  });

  // ============================================================================
  // 자동 업데이트 관리
  // ============================================================================

  /**
   * 1분 주기 자동 업데이트 시작
   * 최초 호출 시 즉시 데이터를 로드하고, 이후 1분마다 자동 갱신
   */
  startAutoUpdate = action(() => {
    // 이미 실행 중이면 중복 시작 방지
    if (this.autoUpdateIntervalId !== null) {
      console.log('[StationSensorStore] 자동 업데이트가 이미 실행 중입니다.');
      return;
    }

    console.log('[StationSensorStore] 자동 업데이트 시작 (주기: 1분)');

    // 최초 데이터 로드
    this.loadSensorData();

    // 1분 주기 업데이트 설정
    this.autoUpdateIntervalId = setInterval(() => {
      console.log('[StationSensorStore] 자동 업데이트 실행...');
      this.loadSensorData();
    }, AUTO_UPDATE_INTERVAL_MS);
  });

  /**
   * 자동 업데이트 중지
   */
  stopAutoUpdate = action(() => {
    if (this.autoUpdateIntervalId !== null) {
      clearInterval(this.autoUpdateIntervalId);
      this.autoUpdateIntervalId = null;
      console.log('[StationSensorStore] 자동 업데이트 중지됨');
    }
  });

  /**
   * 자동 업데이트 실행 상태 확인
   */
  get isAutoUpdateRunning(): boolean {
    return this.autoUpdateIntervalId !== null;
  }

  // ============================================================================
  // 상태 조회 메서드
  // ============================================================================

  /**
   * 특정 정류장의 센서 표시 여부 확인
   * 선택된 정류장, 호버 상태, 또는 명시적으로 표시 설정된 정류장을 표시
   */
  isStationVisible(stationId: string): boolean {
    // 선택된 정류장은 항상 표시 (기존 정류장 + 검색 정류장)
    const isSelectedInStationStore = stationStore.isStationSelected(stationId);
    const isSelectedSearchStation = getCurrentSelectedSearchStationId() === stationId;

    if (isSelectedInStationStore || isSelectedSearchStation) {
      return true;
    }

    // 호버된 정류장은 항상 표시
    if (this.hoveredStationId === stationId) {
      return true;
    }

    // 사용자가 센서 표시를 비활성화한 경우 선택/호버 외에는 표시하지 않음
    if (!this.userWantsSensorDisplay) {
      return false;
    }

    // 명시적으로 표시 설정된 정류장 확인
    return this.visibleStationIds.has(stationId);
  }

  /**
   * 표시 중인 정류장 개수
   */
  get visibleCount(): number {
    return this.visibleStationIds.size;
  }

  /**
   * 표시 중인 정류장 ID 배열
   */
  get visibleStationIdArray(): string[] {
    return Array.from(this.visibleStationIds);
  }
}

export const stationSensorStore = new StationSensorStore();