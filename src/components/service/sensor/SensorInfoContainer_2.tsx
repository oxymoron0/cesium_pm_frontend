import { observer } from 'mobx-react-lite'
import { getSensorInfo, getAirQualityLevel, type SensorType } from '@/utils/airQuality'

interface SensorInfoContainerProps {
  sensorType: SensorType
  value: number
  unit?: string
}

const SensorInfoContainer = observer(function SensorInfoContainer({
  sensorType,
  value,
  unit
}: SensorInfoContainerProps) {
  const sensorInfo = getSensorInfo(sensorType)
  const airQualityResult = getAirQualityLevel(sensorType, value)
  const displayUnit = unit || sensorInfo.unit

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
          display: 'flex',
          width: '98px',
          height: '98px',
          padding: '37px 7px',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          borderRadius: '49.5px',
          border: '8px solid #FFF',
          background: airQualityResult.color
        }}
      >
        {/* 센서 값 (수치) */}
        <div
          style={{
            color: airQualityResult.textColor,
            textAlign: 'center',
            fontVariantNumeric: 'lining-nums tabular-nums',
            fontFamily: 'Pretendard',
            fontSize: '24px',
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
            color: airQualityResult.textColor,
            fontVariantNumeric: 'lining-nums tabular-nums',
            fontFamily: 'Pretendard',
            fontSize: '12px',
            fontStyle: 'normal',
            fontWeight: '400',
            lineHeight: 'normal'
          }}
        >
          {displayUnit}
        </div>
      </div>

      {/* 우측 센서 정보 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1
        }}
      >
        <div
          style={{
            color: '#FFFFFF',
            fontFamily: 'Pretendard',
            fontSize: '16px',
            fontWeight: '600',
            lineHeight: 'normal'
          }}
        >
          {sensorInfo.name} ({sensorInfo.shortName})
        </div>
        <div
          style={{
            color: '#C4C6C6',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: 'normal'
          }}
        >
          현재 상태: {airQualityResult.levelText}
        </div>
      </div>
    </div>
  )
})

export default SensorInfoContainer