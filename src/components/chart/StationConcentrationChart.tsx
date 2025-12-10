import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { StationConcentrationData } from '@/types/statistics'
import StationConcentrationTooltip from './StationConcentrationTooltip'
import type { TimePeriod } from '@/stores/PriorityStatisticsStore'

interface StationConcentrationChartProps {
  data: StationConcentrationData[]
  period: TimePeriod
}

interface CustomXAxisTickProps {
  x: number
  y: number
  payload: { value: string }
}

const CustomXAxisTick = (props: CustomXAxisTickProps) => {
  const { x, y, payload } = props
  const text = payload?.value

  if (!text) return null

  console.log('XAxis Tick:', text)

  // "부전역(05730)" 형태를 파싱하여 역 이름과 코드 분리
  const match = text.match(/^(.+?)(\(.+\))$/)

  if (match) {
    const [, stationName, stationCode] = match

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} textAnchor="middle" fill="#FFFFFF">
          <tspan x={0} dy="15" fontSize={15}>{stationName}</tspan>
          <tspan x={0} dy="20" fontSize={12}>{stationCode}</tspan>
        </text>
      </g>
    )
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#FFFFFF" fontSize={15}>
        {text}
      </text>
    </g>
  )
}

const StationConcentrationChart = function StationConcentrationChart({ data, period }: StationConcentrationChartProps) {
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

  // 최소 100px 간격 유지를 위한 동적 너비 계산
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
      {period !== 'realtime' && (
        <div>
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
      )}
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
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#FFD040 transparent",
        }}
      >
        <div style={{ width: calculatedWidth, height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="stationName"
                stroke="#999"
                tick={<CustomXAxisTick x={0} y={0} payload={{ value: '' }} />}
                height={100}
                interval={0}
              />
              <YAxis
                stroke="#999"
                tick={{ fill: '#999', fontSize: 12 }}
              />
              <Tooltip content={<StationConcentrationTooltip  period={period}/>} />
              <Bar
                dataKey="maxConcentration"
                fill="#FFD040"
                barSize={50}
                name="최고농도"
                radius={[20, 20, 0, 0]}
              />
              {period !== 'realtime' && (
                <Line
                  type="linear"
                  dataKey="avgConcentration"
                  stroke="#D32F2F"
                  strokeWidth={2}
                  name="평균농도"
                  dot={{ fill: '#D32F2F', r: 7, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default StationConcentrationChart
