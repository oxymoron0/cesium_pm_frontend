import { makeAutoObservable } from 'mobx';
import type { AirQualityLevel } from '@/utils/api/types';

export type SensorType = 'pm10' | 'pm25' | 'vocs';

// PM10 등급 기준 (μg/m³)
const PM10_THRESHOLDS = {
  good: 30,      // ≤30: 좋음
  normal: 80,    // ≤80: 보통
  bad: 150,      // ≤150: 나쁨
  // >150: 매우 나쁨
};

// PM2.5 등급 기준 (μg/m³)
const PM25_THRESHOLDS = {
  good: 15,      // ≤15: 좋음
  normal: 35,    // ≤35: 보통
  bad: 75,       // ≤75: 나쁨
  // >75: 매우 나쁨
};

/**
 * 센서 값으로부터 등급 계산
 */
export function getGradeFromValue(sensorType: 'pm10' | 'pm25', value: number): AirQualityLevel {
  const thresholds = sensorType === 'pm10' ? PM10_THRESHOLDS : PM25_THRESHOLDS;

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.normal) return 'normal';
  if (value <= thresholds.bad) return 'bad';
  return 'very_bad';
}

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

  // 등급별 표시 여부 (기본: 모두 활성화)
  gradeVisibility: Record<AirQualityLevel, boolean> = {
    good: true,
    normal: true,
    bad: true,
    very_bad: true,
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
   * 특정 등급의 표시 여부를 토글
   */
  toggleGrade(grade: AirQualityLevel) {
    this.gradeVisibility[grade] = !this.gradeVisibility[grade];
  }

  /**
   * 특정 등급의 표시 여부 설정
   */
  setGradeVisibility(grade: AirQualityLevel, visible: boolean) {
    this.gradeVisibility[grade] = visible;
  }

  /**
   * 특정 등급이 표시 중인지 확인
   */
  isGradeVisible(grade: AirQualityLevel): boolean {
    return this.gradeVisibility[grade];
  }

  /**
   * 센서 값이 현재 등급 필터를 통과하는지 확인
   * PM10, PM2.5 값 중 하나라도 선택된 등급에 해당하면 true 반환
   */
  shouldShowByGrade(pm10Value: number, pm25Value: number): boolean {
    const pm10Grade = getGradeFromValue('pm10', pm10Value);
    const pm25Grade = getGradeFromValue('pm25', pm25Value);

    // PM10 또는 PM2.5 중 하나라도 선택된 등급에 해당하면 표시
    return this.gradeVisibility[pm10Grade] || this.gradeVisibility[pm25Grade];
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

  /**
   * 모든 등급 활성화
   */
  enableAllGrades() {
    this.gradeVisibility = {
      good: true,
      normal: true,
      bad: true,
      very_bad: true,
    };
  }

  /**
   * 모든 등급 비활성화
   */
  disableAllGrades() {
    this.gradeVisibility = {
      good: false,
      normal: false,
      bad: false,
      very_bad: false,
    };
  }
}

export const airConfigStore = new AirConfigStore();
