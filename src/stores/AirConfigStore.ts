import { makeAutoObservable } from 'mobx';

export type SensorType = 'pm10' | 'pm25' | 'vocs';

/**
 * AirConfigStore
 * 대기 설정 패널의 상태를 관리하는 Store
 * - 센서 항목 표시 여부 (PM10, PM2.5, VOCs)
 * - 등급 필터 설정
 */
class AirConfigStore {
  // 센서 항목별 표시 여부 (기본: 모두 활성화)
  sensorVisibility: Record<SensorType, boolean> = {
    pm10: true,
    pm25: true,
    vocs: true,
  };

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * 특정 센서의 표시 여부를 토글
   */
  toggleSensor(sensor: SensorType) {
    this.sensorVisibility[sensor] = !this.sensorVisibility[sensor];
  }

  /**
   * 특정 센서의 표시 여부 설정
   */
  setSensorVisibility(sensor: SensorType, visible: boolean) {
    this.sensorVisibility[sensor] = visible;
  }

  /**
   * 특정 센서가 표시 중인지 확인
   */
  isSensorVisible(sensor: SensorType): boolean {
    return this.sensorVisibility[sensor];
  }

  /**
   * 모든 센서 활성화
   */
  enableAllSensors() {
    this.sensorVisibility = {
      pm10: true,
      pm25: true,
      vocs: true,
    };
  }

  /**
   * 모든 센서 비활성화
   */
  disableAllSensors() {
    this.sensorVisibility = {
      pm10: false,
      pm25: false,
      vocs: false,
    };
  }
}

export const airConfigStore = new AirConfigStore();
