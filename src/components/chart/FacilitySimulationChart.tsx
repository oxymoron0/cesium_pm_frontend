import type { FacilityData } from '@/types/statistics'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import FacilitySimulationTooltip from './FacilitySimulationTooltip'

interface FacilitySimulationChartProps {
  data: FacilityData[]
  selectedType: 'bad' | 'veryBad'
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
            tick={{ fill: '#999', fontSize: 11 }}
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
