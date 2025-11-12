/**
 * 시뮬레이션 히트맵용 목업 농도 데이터 생성 유틸리티
 *
 * 실제 API 데이터의 concentration 값이 좁은 범위(0~20)로 고만고만할 때
 * 히트맵 시각화를 위해 더 넓은 범위의 값으로 변환
 */

import type { SimulationQuckData } from '@/types/simulation_request_types';

/**
 * PM10 농도 범위 설정
 */
const PM10_RANGE = {
  MIN: 10,
  MAX: 120,
} as const;

/**
 * PM2.5 농도 범위 설정
 */
const PM25_RANGE = {
  MIN: 3,
  MAX: 75,
} as const;

/**
 * 정류장별로 고정된 랜덤 시드 생성
 * 같은 정류장은 항상 같은 랜덤 값을 갖도록 함
 */
function getSeededRandom(stationName: string, index: number): number {
  // 정류장 이름과 인덱스로 시드 생성
  const seed = stationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x); // 0~1 사이 값
}

/**
 * 지정된 범위 내에서 랜덤 농도 값 생성
 */
function generateRandomConcentration(min: number, max: number, seed: number): number {
  const range = max - min;
  const randomValue = min + seed * range;
  // 소수점 2자리로 반올림
  return Math.round(randomValue * 100) / 100;
}

/**
 * 시뮬레이션 데이터의 concentration 값을 히트맵용으로 랜덤화
 *
 * @param data - 원본 시뮬레이션 데이터
 * @returns concentration 값이 랜덤화된 시뮬레이션 데이터 (깊은 복사)
 */
export function randomizeSimulationConcentration(data: SimulationQuckData): SimulationQuckData {
  if (!data.station_data || data.station_data.length === 0) {
    return data;
  }

  // PM 타입에 따른 범위 선택
  const range = data.pm_type === 'pm25' ? PM25_RANGE : PM10_RANGE;

  // 깊은 복사 후 concentration 값 변환
  return {
    ...data,
    station_data: data.station_data.map((station) => {
      // 정류장별로 고정된 랜덤 시드
      const seed = getSeededRandom(station.station_name, station.index);

      // 랜덤 농도 생성
      const randomConcentration = generateRandomConcentration(range.MIN, range.MAX, seed);

      return {
        ...station,
        concentration: randomConcentration,
      };
    }),
  };
}

/**
 * 시뮬레이션 목록 전체의 concentration 값을 랜덤화
 *
 * @param dataList - 시뮬레이션 데이터 목록
 * @returns concentration 값이 랜덤화된 시뮬레이션 데이터 목록
 */
export function randomizeSimulationListConcentration(
  dataList: SimulationQuckData[]
): SimulationQuckData[] {
  return dataList.map((data) => randomizeSimulationConcentration(data));
}

/**
 * 목업 모드 활성화 여부
 * 환경 변수로 제어 가능
 */
export const ENABLE_MOCK_CONCENTRATION =
  import.meta.env.VITE_ENABLE_MOCK_CONCENTRATION === 'true' ||
  import.meta.env.DEV; // 개발 모드에서는 기본 활성화
