import type { AirQualityLevel } from '@/utils/api/types'

export type SensorType = 'pm10' | 'pm25' | 'vocs'

export interface AirQualityResult {
  level: AirQualityLevel
  levelText: string
  color: string
  textColor: string
}

/**
 * 센서 타입별 공기질 기준 정의
 */
export const AIR_QUALITY_STANDARDS = {
  pm10: {
    good: { max: 30, text: '좋음' },
    normal: { max: 80, text: '보통' },
    bad: { max: 150, text: '나쁨' },
    very_bad: { max: Infinity, text: '매우 나쁨' }
  },
  pm25: {
    good: { max: 15, text: '좋음' },
    normal: { max: 35, text: '보통' },
    bad: { max: 75, text: '나쁨' },
    very_bad: { max: Infinity, text: '매우 나쁨' }
  },
  vocs: {
    // VOCs는 현재 항상 보통으로 처리 (향후 기준 추가 가능)
    normal: { max: Infinity, text: '보통' }
  }
} as const

/**
 * 공기질 등급별 색상 정의
 */
const AIR_QUALITY_COLORS = {
  good: '#18A274',
  normal: '#FFD040',
  bad: '#F70',
  very_bad: '#D32F2D',
  vocs_default: '#C8C8C8'
} as const

/**
 * 배경색에 따른 텍스트 색상 결정
 */
function getTextColor(backgroundColor: string): string {
  // 빨강, 주황 배경: 흰색 텍스트
  if (backgroundColor === '#D32F2D' || backgroundColor === '#F70') {
    return '#FFF'
  }
  // 노랑, 초록, 회색 배경: 검정 텍스트
  return '#000'
}

/**
 * 센서 값에 따른 공기질 등급 결정
 */
export function getAirQualityLevel(sensorType: SensorType, value: number): AirQualityResult {
  // VOCs는 별도 처리
  if (sensorType === 'vocs') {
    const color = AIR_QUALITY_COLORS.vocs_default
    return {
      level: 'normal',
      levelText: '보통',
      color,
      textColor: getTextColor(color)
    }
  }

  const standards = AIR_QUALITY_STANDARDS[sensorType]
  let level: AirQualityLevel = 'good'
  let levelText = '좋음'

  // 기준에 따라 등급 결정
  if (value <= standards.good.max) {
    level = 'good'
    levelText = standards.good.text
  } else if (value <= standards.normal.max) {
    level = 'normal'
    levelText = standards.normal.text
  } else if (value <= standards.bad.max) {
    level = 'bad'
    levelText = standards.bad.text
  } else {
    level = 'very_bad'
    levelText = standards.very_bad.text
  }

  const color = AIR_QUALITY_COLORS[level]

  return {
    level,
    levelText,
    color,
    textColor: getTextColor(color)
  }
}

/**
 * 센서별 원형 진행 바 최대값 계산
 * 매우나쁨 기준의 150%로 설정 (나쁨 기준의 50% 추가)
 */
export function getCircularBarMaxValue(sensorType: SensorType): number {
  switch (sensorType) {
    case 'pm10':
      return AIR_QUALITY_STANDARDS.pm10.bad.max + (AIR_QUALITY_STANDARDS.pm10.bad.max * 0.5) // 150 + 75 = 225
    case 'pm25':
      return AIR_QUALITY_STANDARDS.pm25.bad.max + (AIR_QUALITY_STANDARDS.pm25.bad.max * 0.5) // 75 + 37.5 = 112.5
    case 'vocs':
      return 0 // VOCs는 진행 바 없음
    default:
      return 0
  }
}

/**
 * 센서 값에 따른 원형 진행 바 각도 계산 (0-360도)
 */
export function getCircularBarAngle(sensorType: SensorType, value: number): number {
  if (sensorType === 'vocs') return 0

  const maxValue = getCircularBarMaxValue(sensorType)
  const standards = AIR_QUALITY_STANDARDS[sensorType]

  // 각 범위별 각도 (90도씩 균등 분할)
  const anglePerRange = 90 // 360도 / 4범위

  if (value <= standards.good.max) {
    // 좋음: 0-90도
    const ratio = value / standards.good.max
    return ratio * anglePerRange
  } else if (value <= standards.normal.max) {
    // 보통: 90-180도
    const ratio = (value - standards.good.max) / (standards.normal.max - standards.good.max)
    return anglePerRange + (ratio * anglePerRange)
  } else if (value <= standards.bad.max) {
    // 나쁨: 180-270도
    const ratio = (value - standards.normal.max) / (standards.bad.max - standards.normal.max)
    return anglePerRange * 2 + (ratio * anglePerRange)
  } else {
    // 매우나쁨: 270-360도
    const veryBadStart = standards.bad.max
    const veryBadMax = maxValue
    const ratio = Math.min((value - veryBadStart) / (veryBadMax - veryBadStart), 1)
    return anglePerRange * 3 + (ratio * anglePerRange)
  }
}

/**
 * 센서 타입별 기본 정보 반환
 */
export function getSensorInfo(sensorType: SensorType) {
  switch (sensorType) {
    case 'pm10':
      return {
        name: '미세먼지',
        shortName: 'PM-10',
        unit: 'μg/m³'
      }
    case 'pm25':
      return {
        name: '초미세먼지',
        shortName: 'PM-2.5',
        unit: 'μg/m³'
      }
    case 'vocs':
      return {
        name: '휘발성 유기 화합물',
        shortName: 'VOCs',
        unit: 'ppb'
      }
    default:
      return {
        name: '센서',
        shortName: 'SENSOR',
        unit: ''
      }
  }
}