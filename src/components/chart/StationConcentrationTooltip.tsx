import type { TimePeriod } from '@/stores/PriorityStatisticsStore'
import type { StationConcentrationData } from '@/types/statistics'
import { AIR_QUALITY_COLORS, AIR_QUALITY_STANDARDS } from '@/utils/airQuality'

interface StationConcentrationTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: StationConcentrationData
  }>
  period?: TimePeriod
}

// PM10 기준 농도 레벨 판단 (프로젝트 중앙화된 기준 사용)
function getAirQualityLevel(value: number): { label: string; color: string; textColor: string } {
  const standards = AIR_QUALITY_STANDARDS.pm10

  if (value <= standards.good.max) {
    return { label: '좋음', color: AIR_QUALITY_COLORS.good, textColor: '#FFFFFF' }
  }
  if (value <= standards.normal.max) {
    return { label: '보통', color: AIR_QUALITY_COLORS.normal, textColor: '#FFFFFF' }
  }
  if (value <= standards.bad.max) {
    return { label: '나쁨', color: AIR_QUALITY_COLORS.bad, textColor: '#000000' }
  }
  return { label: '매우나쁨', color: AIR_QUALITY_COLORS.very_bad, textColor: '#FFFFFF' }
}

/**
 * Custom Tooltip for Station Concentration Chart
 *
 * Displays station name, max concentration, and average concentration
 * with air quality level indicators
 */
export default function StationConcentrationTooltip({ active, payload, period }: StationConcentrationTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const stationName = payload[0]?.payload?.stationName || ''
  const maxConcentration = payload[0]?.payload?.maxConcentration || 0
  const avgConcentration = payload[0]?.payload?.avgConcentration || 0

  const maxLevel = getAirQualityLevel(maxConcentration)
  const avgLevel = getAirQualityLevel(avgConcentration)

  return (
    <div style={{
      backgroundColor: '#000000',
      border: '1px solid #666',
      borderRadius: '8px',
      padding: '12px 16px',
      minWidth: '200px'
    }}>
      {/* 타이틀 */}
      <div style={{
        color: '#FFFFFF',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: 'Pretendard',
        marginBottom: '4px'
      }}>
        {stationName}
      </div>

      {/* 최고농도 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '12px'
      }}>
        <span style={{
          color: '#999',
          fontSize: '14px',
          fontFamily: 'Pretendard',
          minWidth: '60px'
        }}>최고 농도</span>
        <div style={{
          backgroundColor: maxLevel.color,
          color: maxLevel.textColor,
          fontSize: '12px',
          fontWeight: '600',
          fontFamily: 'Pretendard',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {maxLevel.label}
        </div>
        <span style={{
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '600',
          fontFamily: 'Pretendard'
        }}>
          {maxConcentration} μg/m³
        </span>
      </div>
      {/* 평균농도 */}
      {period !== 'realtime' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px'
        }}>
          <span style={{
            color: '#999',
            fontSize: '14px',
            fontFamily: 'Pretendard',
            minWidth: '60px'
          }}>평균</span>
          <div style={{
            backgroundColor: avgLevel.color,
            color: avgLevel.textColor,
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'Pretendard',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {avgLevel.label}
          </div>
          <span style={{
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'Pretendard'
          }}>
            {avgConcentration} μg/m³
          </span>
        </div>
      )}
    </div>
  )
}
