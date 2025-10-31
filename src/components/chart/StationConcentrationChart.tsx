import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { StationConcentrationData } from '@/types/statistics'
import StationConcentrationTooltip from './StationConcentrationTooltip'

interface StationConcentrationChartProps {
  data: StationConcentrationData[]
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

      {/* 스크롤 영역 */}
      <div
        className="custom-scrollbar"
        style={{
          position: 'absolute',
          top: '50px',
          left: 0,
          right: 0,
          bottom: 0,
          overflowX: 'auto',
          overflowY: 'hidden'
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
                tick={{ fill: '#999', fontSize: 11 }}
                height={80}
              />
              <YAxis
                stroke="#999"
                tick={{ fill: '#999', fontSize: 12 }}
              />
              <Tooltip content={<StationConcentrationTooltip />} />
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
      </div>
    </div>
  )
}

export default StationConcentrationChart
