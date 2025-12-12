import type { FacilityData } from '@/types/statistics'
import { AIR_QUALITY_COLORS } from '@/utils/airQuality'

interface FacilitySimulationTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: FacilityData
  }>
}

/**
 * Custom Tooltip for Facility Simulation Chart
 *
 * Displays facility name, very bad count, bad count, and total count
 */
export default function FacilitySimulationTooltip({ active, payload }: FacilitySimulationTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const facilityName = payload[0]?.payload?.facilityName || ''
  const veryBadCount = payload[0]?.payload?.veryBadCount || 0
  const badCount = payload[0]?.payload?.badCount || 0
  const totalCount = veryBadCount + badCount

  return (
    <div style={{
      backgroundColor: '#000000',
      border: '1px solid #666',
      borderRadius: '8px',
      padding: '12px 16px',
      minWidth: '180px'
    }}>
      {/* 타이틀 */}
      <div style={{
        color: '#FFFFFF',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: 'Pretendard',
        marginBottom: '4px'
      }}>
        {facilityName}
      </div>
      <div style={{
        color: '#FFFFFF',
        fontSize: '14px',
        fontFamily: 'Pretendard',
        marginBottom: '8px'
      }}>
        총합 <span style={{ color: '#CFFF40' }}>{totalCount}</span>회
      </div>

      {/* 매우나쁨 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px'
      }}>
        <div style={{
          backgroundColor: AIR_QUALITY_COLORS.very_bad,
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: '600',
          fontFamily: 'Pretendard',
          padding: '2px 8px',
          borderRadius: '4px',
          minWidth: '60px',
          textAlign: 'center'
        }}>
          매우나쁨
        </div>
        <span style={{
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '600',
          fontFamily: 'Pretendard'
        }}>
          {veryBadCount}회
        </span>
      </div>

      {/* 나쁨 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '6px'
      }}>
        <div style={{
          backgroundColor: AIR_QUALITY_COLORS.bad,
          color: '#000000',
          fontSize: '12px',
          fontWeight: '600',
          fontFamily: 'Pretendard',
          padding: '2px 8px',
          borderRadius: '4px',
          minWidth: '60px',
          textAlign: 'center'
        }}>
          나쁨
        </div>
        <span style={{
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '600',
          fontFamily: 'Pretendard'
        }}>
          {badCount}회
        </span>
      </div>
    </div>
  )
}
