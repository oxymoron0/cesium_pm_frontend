import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TooltipProps } from 'recharts'
import type { StationConcentrationData } from '@/utils/mockData/priorityStatisticsMock'

interface StationConcentrationChartProps {
  data: StationConcentrationData[]
}

// 농도 기준 레벨 판단
function getAirQualityLevel(value: number): { label: string; color: string } {
  if (value > 150) return { label: '매우나쁨', color: '#D32F2F' }
  if (value > 80) return { label: '나쁨', color: '#FF6B00' }
  if (value > 30) return { label: '보통', color: '#FFD040' }
  return { label: '좋음', color: '#4CAF50' }
}

// 커스텀 Tooltip
function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
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

const StationConcentrationChart = function StationConcentrationChart({ data }: StationConcentrationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#999',
        fontFamily: 'Pretendard',
        fontSize: '14px'
      }}>
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Bar 범례 - 왼쪽 상단 */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10
      }}>
        <div style={{
          width: '14px',
          height: '14px',
          backgroundColor: '#FFD040',
          borderRadius: '2px'
        }} />
        <span style={{
          color: '#999',
          fontSize: '12px',
          fontFamily: 'Pretendard'
        }}>최고농도</span>
      </div>

      {/* Line 범례 - 오른쪽 상단 */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10
      }}>
        <div style={{
          width: '14px',
          height: '2px',
          backgroundColor: '#D32F2F'
        }} />
        <span style={{
          color: '#999',
          fontSize: '12px',
          fontFamily: 'Pretendard'
        }}>평균농도</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 40, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="stationName"
            stroke="#999"
            tick={{ fill: '#999', fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#999"
            tick={{ fill: '#999', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="maxConcentration"
            fill="#FFD040"
            barSize={50}
            name="최고농도"
            radius={[20, 20, 0, 0]}
          />
          <Line
            type="linear"
            dataKey="avgConcentration"
            stroke="#D32F2F"
            strokeWidth={2}
            name="평균농도"
            dot={{ fill: '#D32F2F', r: 7, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default StationConcentrationChart
