import type { FacilityData } from '@/types/statistics'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import FacilitySimulationTooltip from './FacilitySimulationTooltip'

interface FacilitySimulationChartProps {
  data: FacilityData[]
  selectedType: 'bad' | 'veryBad'
}

interface CustomXAxisTickProps {
  x: number
  y: number
  payload: { value: string }
}

const CustomXAxisTick = (props: CustomXAxisTickProps) => {
  const { x, y, payload } = props
  const text = payload.value

  if (!text) return null

  // "시설명(코드)" 형태를 파싱하여 시설명과 코드 분리
  const match = text.match(/^(.+?)(\(.+\))$/)

  if (match) {
    const [, facilityName, facilityCode] = match
    // 텍스트 길이에 따른 폰트 크기 조정
    const fontSize = facilityName.length > 8 ? 12 : 15

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} textAnchor="middle" fill="#FFF" fontSize={fontSize}>
          <tspan x={0} dy="10">{facilityName}</tspan>
          <tspan x={0} dy="20" fontSize={13}>{facilityCode}</tspan>
        </text>
      </g>
    )
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#FFF" fontSize={15}>
        {text}
      </text>
    </g>
  )
}

const FacilitySimulationChart = function FacilitySimulationChart({ data, selectedType }: FacilitySimulationChartProps) {
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

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 50, right: 50, left: 50, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="facilityName"
            stroke="#999"
            tick={<CustomXAxisTick x={0} y={0} payload={{ value: '' }} />}
            height={80}
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
  )
}

export default FacilitySimulationChart
