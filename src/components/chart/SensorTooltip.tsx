import type { TooltipProps } from 'recharts'
import { getAirQualityLevel } from '@/utils/airQuality'

interface SensorTooltipProps extends TooltipProps<number, string> {
  showPM10?: boolean
  showPM25?: boolean
  showVOCs?: boolean
}

/**
 * Custom Tooltip for Sensor Line Chart
 *
 * Displays sensor values with air quality level indicators
 * Styled to match design system (Pretendard, dark theme)
 */
export default function SensorTooltip({ active, payload, label, showPM10 = true, showPM25 = true, showVOCs = false }: SensorTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  // Find PM10, PM25, and VOC data from payload
  const pm10Data = payload.find(p => p.dataKey === 'pm10')
  const pm25Data = payload.find(p => p.dataKey === 'pm25')
  const vocData = payload.find(p => p.dataKey === 'voc')

  const pm10Value = pm10Data?.value as number | undefined
  const pm25Value = pm25Data?.value as number | undefined
  const vocValue = vocData?.value as number | undefined

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid #C4C6C6',
        borderRadius: '4px',
        padding: '12px',
        minWidth: '180px'
      }}
    >
      {/* Timestamp */}
      <div
        style={{
          color: '#FFF',
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '8px',
          paddingBottom: '8px',
          borderBottom: '1px solid #333'
        }}
      >
        {label}
      </div>

      {/* PM10 */}
      {showPM10 && pm10Value !== undefined && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#CFFF40'
              }}
            />
            <span
              style={{
                color: '#FFF',
                fontFamily: 'Pretendard',
                fontSize: '13px',
                fontWeight: 400
              }}
            >
              PM10
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                color: '#CFFF40',
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {pm10Value.toFixed(1)}
            </span>
            <span
              style={{
                color: '#A6A6A6',
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: 400
              }}
            >
              μg/m³
            </span>
          </div>
        </div>
      )}

      {/* PM10 Air Quality Level */}
      {showPM10 && pm10Value !== undefined && (
        <div
          style={{
            marginLeft: '14px',
            marginBottom: '8px',
            padding: '2px 6px',
            borderRadius: '3px',
            background: getAirQualityLevel('pm10', pm10Value).color + '20',
            display: 'inline-block'
          }}
        >
          <span
            style={{
              color: getAirQualityLevel('pm10', pm10Value).color,
              fontFamily: 'Pretendard',
              fontSize: '11px',
              fontWeight: 500
            }}
          >
            {getAirQualityLevel('pm10', pm10Value).levelText}
          </span>
        </div>
      )}

      {/* PM25 */}
      {showPM25 && pm25Value !== undefined && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#FFD040'
              }}
            />
            <span
              style={{
                color: '#FFF',
                fontFamily: 'Pretendard',
                fontSize: '13px',
                fontWeight: 400
              }}
            >
              PM2.5
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                color: '#FFD040',
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {pm25Value.toFixed(1)}
            </span>
            <span
              style={{
                color: '#A6A6A6',
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: 400
              }}
            >
              μg/m³
            </span>
          </div>
        </div>
      )}

      {/* PM25 Air Quality Level */}
      {showPM25 && pm25Value !== undefined && (
        <div
          style={{
            marginLeft: '14px',
            padding: '2px 6px',
            borderRadius: '3px',
            background: getAirQualityLevel('pm25', pm25Value).color + '20',
            display: 'inline-block'
          }}
        >
          <span
            style={{
              color: getAirQualityLevel('pm25', pm25Value).color,
              fontFamily: 'Pretendard',
              fontSize: '11px',
              fontWeight: 500
            }}
          >
            {getAirQualityLevel('pm25', pm25Value).levelText}
          </span>
        </div>
      )}

      {/* VOCs */}
      {showVOCs && vocValue !== undefined && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#C8C8C8'
              }}
            />
            <span
              style={{
                color: '#FFF',
                fontFamily: 'Pretendard',
                fontSize: '13px',
                fontWeight: 400
              }}
            >
              VOCs
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                color: '#C8C8C8',
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {vocValue.toFixed(1)}
            </span>
            <span
              style={{
                color: '#A6A6A6',
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: 400
              }}
            >
              ppb
            </span>
          </div>
        </div>
      )}

      {/* VOCs Air Quality Level */}
      {showVOCs && vocValue !== undefined && (
        <div
          style={{
            marginLeft: '14px',
            padding: '2px 6px',
            borderRadius: '3px',
            background: getAirQualityLevel('vocs', vocValue).color + '20',
            display: 'inline-block'
          }}
        >
          <span
            style={{
              color: getAirQualityLevel('vocs', vocValue).color,
              fontFamily: 'Pretendard',
              fontSize: '11px',
              fontWeight: 500
            }}
          >
            {getAirQualityLevel('vocs', vocValue).levelText}
          </span>
        </div>
      )}
    </div>
  )
}
