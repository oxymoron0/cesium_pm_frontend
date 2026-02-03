import type { TooltipProps } from 'recharts'
import { getAirQualityLevel } from '@/utils/airQuality'
import { isCivil } from '@/utils/env'

interface ChartDataPoint {
  pm10: number | null
  pm25: number | null
  voc: number | null
  pm10Normalized?: number | null
  pm25Normalized?: number | null
}

interface PayloadItem {
  dataKey?: string
  value?: number
  payload?: ChartDataPoint
}

interface SensorTooltipProps extends TooltipProps<number, string> {
  showPM10?: boolean
  showPM25?: boolean
  showVOCs?: boolean
  active?: boolean
  payload?: PayloadItem[]
  label?: string
}

/**
 * Custom Tooltip for Sensor Line Chart
 *
 * Displays sensor values with air quality level indicators
 * Styled to match design system (Pretendard, dark theme)
 */
export default function SensorTooltip({ active, payload, label, showPM10 = true, showPM25 = true, showVOCs = false }: SensorTooltipProps) {
  const civilMode = isCivil()

  if (!active || !payload || payload.length === 0) {
    return null
  }

  // Find PM10, PM25, and VOC data from payload
  // dataKey가 정규화된 값(pm10Normalized, pm25Normalized)일 수 있으므로 둘 다 확인
  const pm10Data = payload.find((p: PayloadItem) =>
    p.dataKey === 'pm10' || p.dataKey === 'pm10Normalized'
  )
  const pm25Data = payload.find((p: PayloadItem) =>
    p.dataKey === 'pm25' || p.dataKey === 'pm25Normalized'
  )
  const vocData = payload.find((p: PayloadItem) => p.dataKey === 'voc')

  // 항상 원본(raw) 값 사용 - payload.payload에서 접근
  const pm10Value = pm10Data?.payload?.pm10 ?? undefined
  const pm25Value = pm25Data?.payload?.pm25 ?? undefined
  const vocValue = vocData?.payload?.voc ?? undefined

  // Civil 모드: 간소화된 툴팁 (상태만 표시)
  if (civilMode) {
    return (
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
          border: '1px solid #C4C6C6',
          borderRadius: '4px',
          padding: '12px',
          minWidth: '140px'
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

        {/* PM10 - Civil */}
        {showPM10 && pm10Value !== undefined && (() => {
          const pm10Quality = getAirQualityLevel('pm10', pm10Value)
          return (
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
                  미세먼지
                </span>
              </div>
              <div
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: pm10Quality.color
                }}
              >
                <span
                  style={{
                    color: pm10Quality.textColor,
                    fontFamily: 'Pretendard',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {pm10Quality.levelText}
                </span>
              </div>
            </div>
          )
        })()}

        {/* PM25 - Civil */}
        {showPM25 && pm25Value !== undefined && (() => {
          const pm25Quality = getAirQualityLevel('pm25', pm25Value)
          return (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
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
                  초미세먼지
                </span>
              </div>
              <div
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: pm25Quality.color
                }}
              >
                <span
                  style={{
                    color: pm25Quality.textColor,
                    fontFamily: 'Pretendard',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {pm25Quality.levelText}
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // 일반 모드: 기존 상세 툴팁
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

      {/* VOCs는 공식 등급 기준이 없으므로 등급 표시하지 않음 */}
    </div>
  )
}
