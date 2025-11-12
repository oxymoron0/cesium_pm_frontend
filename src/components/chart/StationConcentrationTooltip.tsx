import type { StationConcentrationData } from '@/types/statistics'

interface StationConcentrationTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: StationConcentrationData
  }>
}

// 농도 기준 레벨 판단
// function getAirQualityLevel(value: number): { label: string; color: string } {
//   if (value > 150) return { label: '매우나쁨', color: '#D32F2F' }
//   if (value > 80) return { label: '나쁨', color: '#FF6B00' }
//   if (value > 30) return { label: '보통', color: '#FFD040' }
//   return { label: '좋음', color: '#4CAF50' }
// }

// 농도 기준 레벨 판단
function getAirQualityLevel(value: number): { label: '매우나쁨' | '나쁨'; color: string } {
  if (value > 150) return { label: '매우나쁨', color: '#D32F2F' };
  return { label: '나쁨', color: '#FF6B00' };
}

/**
 * Custom Tooltip for Station Concentration Chart
 *
 * Displays station name, max concentration, and average concentration
 * with air quality level indicators
 */
export default function StationConcentrationTooltip({ active, payload }: StationConcentrationTooltipProps) {
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
          color: '#FFFFFF',
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
          color: '#FFFFFF',
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
    </div>
  )
}
