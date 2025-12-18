import type { FacilityData } from '@/types/statistics'
import type { TimePeriod } from '@/stores/PriorityStatisticsStore'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import FacilitySimulationTooltip from './FacilitySimulationTooltip'

interface FacilitySimulationChartProps {
  data: FacilityData[]
  selectedType: 'bad' | 'veryBad'
  period: TimePeriod
}

// 줄바꿈을 지원하는 커스텀 X축 tick
interface CustomTickProps {
  x: number
  y: number
  payload: { value: string }
}

function CustomXAxisTick({ x, y, payload }: CustomTickProps) {
  const text = payload.value || ''
  // \n으로 먼저 분할, 그 후 긴 줄은 추가 분할
  const maxCharsPerLine = 9
  const lines: string[] = []

  text.split('\n').forEach(segment => {
    if (segment.length <= maxCharsPerLine) {
      lines.push(segment)
    } else {
      for (let i = 0; i < segment.length; i += maxCharsPerLine) {
        lines.push(segment.slice(i, i + maxCharsPerLine))
      }
    }
  })

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={index * 18}
          dy={14}
          textAnchor="middle"
          fill="#999"
          fontSize={14}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

const getEmptyMessage = (period: TimePeriod): string => {
  switch (period) {
    case 'realtime':
      return '실시간 나쁨 이상 농도가 없습니다'
    case 'today':
      return '오늘 나쁨 이상 농도가 없습니다'
    case 'week':
      return '최근 7일간 나쁨 이상 농도가 없습니다'
    case 'month':
      return '최근 1개월간 나쁨 이상 농도가 없습니다'
    default:
      return '데이터가 없습니다'
  }
}

const FacilitySimulationChart = function FacilitySimulationChart({ data, selectedType, period }: FacilitySimulationChartProps) {
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
        {getEmptyMessage(period)}
      </div>
    )
  }

  // 최소 150px 간격 유지를 위한 동적 너비 계산
  const minBarSpacing = 150
  const calculatedWidth = Math.max(600, data.length * minBarSpacing)

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
        }}>{selectedType === 'bad' ? '나쁨 횟수' : '매우나쁨 횟수'}</span>
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
        }}>합계 횟수</span>
      </div>

      {/* 스크롤 영역 */}
      <div
        className="custom-scrollbar"
        style={{
          position: 'absolute',
          top: '50px',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "calc(-50px + 100vh)",
          overflowX: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#FFD040 transparent",
        }}
      >
        <div style={{ width: calculatedWidth, height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 0, right: 50, left: 50, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="facilityName"
                stroke="#999"
                tick={<CustomXAxisTick x={0} y={0} payload={{ value: '' }} />}
                height={80}
                interval={0}
              />
              <YAxis
                yAxisId="left"
                stroke="#999"
                tick={{ fill: '#999', fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#999"
                tick={{ fill: '#999', fontSize: 12 }}
              />
              <Tooltip content={<FacilitySimulationTooltip />} />
              <Bar
                yAxisId="left"
                dataKey={selectedType === 'bad' ? 'badCount' : 'veryBadCount'}
                fill="#FFD040"
                barSize={50}
                name={selectedType === 'bad' ? '나쁨 횟수' : '매우나쁨 횟수'}
                radius={[20, 20, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="linear"
                dataKey="totalCount"
                stroke="#D32F2F"
                strokeWidth={2}
                name="합계 횟수"
                dot={{ fill: '#D32F2F', r: 7, stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default FacilitySimulationChart
