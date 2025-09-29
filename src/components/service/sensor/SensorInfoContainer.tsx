import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import { getSensorInfo, getAirQualityLevel, getCircularBarAngle, type SensorType } from '@/utils/airQuality'
import Icon from '@/components/basic/Icon'

interface SensorInfoContainerProps {
  sensorType: SensorType
  value: number
  stationId?: string
  unit?: string
}

// 스타일 상수
const STYLES = {
  CONTAINER_SIZE: '98px',
  BORDER_WIDTH: '8px',
  SENSOR_VALUE_FONT_SIZE: '24px',
  SENSOR_UNIT_FONT_SIZE: '12px',
  SENSOR_NAME_FONT_SIZE: '14px',
  TREND_FONT_SIZE: '12px',
  STATE_TEXT_FONT_SIZE: '14px',
  TREND_BORDER_RADIUS: '20px',
  ICON_SIZE: '48px'
} as const

const SensorInfoContainer = observer(function SensorInfoContainer({
  sensorType,
  value,
  stationId,
  unit
}: SensorInfoContainerProps) {
  // 기본 정보 계산 (메모이제이션)
  const sensorInfo = useMemo(() => getSensorInfo(sensorType), [sensorType])
  const airQualityResult = useMemo(() => getAirQualityLevel(sensorType, value), [sensorType, value])
  const displayUnit = unit || sensorInfo.unit

  // 센서 특성 정의
  const sensorFeatures = useMemo(() => ({
    showProgressBar: sensorType !== 'vocs',
    showStateIcon: sensorType !== 'vocs',
    borderColor: sensorType === 'vocs' ? '#999' : '#FFF'
  }), [sensorType])

  // 원형 진행 바 각도 계산
  const progressAngle = useMemo(() =>
    getCircularBarAngle(sensorType, value), [sensorType, value]
  )

  // 변화량 추이 임시 데이터 (향후 API에서 이전 값과 비교)
  const trendData = useMemo(() => {
    // TODO: stationId 기반 실제 API 호출로 이전 값 비교
    const mockPreviousValue = value * 0.9 // 임시로 10% 낮은 값으로 설정
    const diff = value - mockPreviousValue
    const changeAmount = Math.abs(diff).toFixed(1)

    if (diff > 0.5) {
      return { icon: '↑', text: `1시간 전보다 ${changeAmount} 증가` }
    } else if (diff < -0.5) {
      return { icon: '↓', text: `1시간 전보다 ${changeAmount} 감소` }
    } else {
      return { icon: '–', text: '변화 없음' }
    }
  }, [value])

  // 상태별 아이콘 이름 결정
  const stateIconName = useMemo(() => {
    const iconMap = {
      good: 'state_good',
      normal: 'state_normal',
      bad: 'state_bad',
      very_bad: 'state_very_bad'
    } as const
    return iconMap[airQualityResult.level] || 'state_normal'
  }, [airQualityResult.level])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        alignSelf: 'stretch'
      }}
    >
      {/* 좌측 원형 그래픽 */}
      <div
        style={{
          position: 'relative',
          width: STYLES.CONTAINER_SIZE,
          height: STYLES.CONTAINER_SIZE,
          flexShrink: 0
        }}
      >
        {/* 기본 원형 테두리 */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: STYLES.CONTAINER_SIZE,
            height: STYLES.CONTAINER_SIZE,
            borderRadius: '49px',
            border: `${STYLES.BORDER_WIDTH} solid ${sensorFeatures.borderColor}`,
            boxSizing: 'border-box'
          }}
        />

        {/* PM10/PM25 진행 바 */}
        {sensorFeatures.showProgressBar && progressAngle > 0 && (
          <svg
            width={STYLES.CONTAINER_SIZE}
            height={STYLES.CONTAINER_SIZE}
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              transform: 'rotate(-90deg)'
            }}
          >
            <circle
              cx="49"
              cy="49"
              r="45"
              fill="none"
              stroke={airQualityResult.color}
              strokeWidth={STYLES.BORDER_WIDTH}
              strokeDasharray={`${(progressAngle / 360) * (2 * Math.PI * 45)} ${2 * Math.PI * 45}`}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* 중앙 텍스트 컨테이너 */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: STYLES.CONTAINER_SIZE,
            height: STYLES.CONTAINER_SIZE,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* 센서 값 (수치) */}
          <div
            style={{
              color: '#FFF',
              textAlign: 'center',
              fontVariantNumeric: 'lining-nums tabular-nums',
              fontFamily: 'Pretendard',
              fontSize: STYLES.SENSOR_VALUE_FONT_SIZE,
              fontStyle: 'normal',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            {value}
          </div>

          {/* 단위 */}
          <div
            style={{
              color: '#FFF',
              fontVariantNumeric: 'lining-nums tabular-nums',
              fontFamily: 'Pretendard',
              fontSize: STYLES.SENSOR_UNIT_FONT_SIZE,
              fontStyle: 'normal',
              fontWeight: '400',
              lineHeight: 'normal'
            }}
          >
            {displayUnit}
          </div>
        </div>
      </div>

      {/* 우측 센서 정보 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
          flex: '1 0 0'
        }}
      >
        {/* 1. 센서 이름 */}
        <div
          style={{
            color: '#FFFFFF',
            fontFamily: 'Pretendard',
            fontSize: STYLES.SENSOR_NAME_FONT_SIZE,
            fontWeight: '600',
            lineHeight: 'normal'
          }}
        >
          {sensorInfo.name} ({sensorInfo.shortName})
        </div>

        {/* 2. 변화량 추이 확인 UI */}
        <div
          style={{
            display: 'flex',
            padding: '4px 8px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: STYLES.TREND_BORDER_RADIUS,
            background: 'rgba(255, 255, 255, 0.20)'
          }}
        >
          <span
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: STYLES.TREND_FONT_SIZE,
              fontStyle: 'normal',
              fontWeight: '400',
              lineHeight: 'normal'
            }}
          >
            {trendData.icon} {trendData.text}
          </span>
        </div>

        {/* 3. Icon + 텍스트 (VOCs 제외) */}
        {sensorFeatures.showStateIcon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name={stateIconName} className={`w-[${STYLES.ICON_SIZE}] h-[${STYLES.ICON_SIZE}]`} />
            <span
              style={{
                color: '#FFFFFF',
                fontFamily: 'Pretendard',
                textAlign: 'center',
                fontSize: STYLES.STATE_TEXT_FONT_SIZE,
                fontWeight: '700',
                lineHeight: '18px'
              }}
            >
              {airQualityResult.levelText}
            </span>
          </div>
        )}
      </div>
    </div>
  )
})

export default SensorInfoContainer