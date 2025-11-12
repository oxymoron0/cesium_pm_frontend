import { observer } from 'mobx-react-lite'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'

interface HourlyDistributionDataPoint {
  hour: number
  value: number
}

interface HourlyDistributionChartProps {
  data: HourlyDistributionDataPoint[]
}

/**
 * Hourly Distribution Chart Component
 *
 * Area chart showing concentration distribution by hour
 * - Fixed dimensions: 244px × 122px
 * - Yellow fill area
 * - Y-axis adapts to data values
 * - X-axis shows hourly labels (1-24 or 0-23)
 */
const HourlyDistributionChart = observer(function HourlyDistributionChart({
  data
}: HourlyDistributionChartProps) {
  const isVOCsMode = sensorSelectionStore.isVOCsSelected

  // Calculate Y-axis domain
  const maxValue = Math.max(...data.map(d => d.value), 100)
  const yMax = Math.ceil(maxValue / 10) * 10

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '244px',
          height: '122px',
          color: '#999',
          fontFamily: 'Pretendard',
          fontSize: '12px'
        }}
      >
        데이터가 없습니다
      </div>
    )
  }

  return (
    <ResponsiveContainer width={244} height={122}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
      >
        {/* Grid */}
        <CartesianGrid strokeDasharray="3 3" stroke="#555" strokeOpacity={0.3} />

        {/* X Axis - Hourly labels */}
        <XAxis
          dataKey="hour"
          tick={{
            fill: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: 9
          }}
          stroke="#666"
          tickLine={false}
        />

        {/* Y Axis - Adaptive scale */}
        <YAxis
          domain={[0, yMax]}
          ticks={[0, 10, 20, 50, 100].filter(t => t <= yMax)}
          tick={{
            fill: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: 9
          }}
          stroke="#666"
          tickLine={false}
          width={25}
        />

        {/* Tooltip */}
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #FFD040',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            fontFamily: 'Pretendard'
          }}
          labelStyle={{ color: '#FFF' }}
          itemStyle={{ color: '#FFD040' }}
          formatter={(value: number) => [
            `${value.toFixed(1)} ${isVOCsMode ? 'ppb' : 'μg/m³'}`,
            '농도'
          ]}
          labelFormatter={(hour: number) => `${hour}시`}
        />

        {/* Area - Yellow fill */}
        <Area
          type="monotone"
          dataKey="value"
          stroke="#FFD040"
          strokeWidth={2}
          fill="#FFD040"
          fillOpacity={0.6}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
})

export default HourlyDistributionChart
