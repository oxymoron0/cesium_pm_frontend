import { makeAutoObservable, action } from 'mobx';
import { stationStore } from './StationStore';
import { routeStore } from './RouteStore';

/**
 * 센서 데이터 타입
 */
export interface SensorData {
  pm10: number;
  pm25: number;
  vocs: number;
}

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

  constructor() {
    makeAutoObservable(this);
    // 초기 모의 데이터 설정
    this.initializeMockData();
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
  // 센서 데이터 관리
  // ============================================================================

  /**
   * 특정 정류장의 센서 데이터 설정
   */
  setSensorData = action((stationId: string, data: SensorData) => {
    this.sensorDataMap.set(stationId, data);
  });

  /**
   * 특정 정류장의 센서 데이터 조회
   */
  getSensorData(stationId: string): SensorData | undefined {
    return this.sensorDataMap.get(stationId);
  }

  /**
   * 모의 데이터 초기화 (실제 API 연동 전까지 사용)
   */
  private initializeMockData() {
    // 생성자에서 호출되므로 StationStore가 아직 로드되지 않았을 수 있음
    // updateMockDataFromStationStore에서 실제 데이터 생성
  }

  /**
   * StationStore 데이터가 로드된 후 모의 데이터 업데이트
   */
  updateMockDataFromStationStore = action(() => {
    const generateMockData = (): SensorData => ({
      pm10: Math.floor(Math.random() * 100) + 20,  // 20-120
      pm25: Math.floor(Math.random() * 50) + 10,   // 10-60
      vocs: Math.floor(Math.random() * 300) + 100  // 100-400
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
  // 상태 조회 메서드
  // ============================================================================

  /**
   * 특정 정류장의 센서 표시 여부 확인
   */
  isStationVisible(stationId: string): boolean {
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