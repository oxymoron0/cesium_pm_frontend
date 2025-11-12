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

  // Calculate Y-axis domain dynamically based on data
  const values = data.map(d => d.value)
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)

  // Add 10% padding to max for better visualization
  const padding = (maxValue - minValue) * 0.1
  const yMax = Math.ceil(maxValue + padding)

  // Generate dynamic ticks based on data range
  const generateTicks = (max: number): number[] => {
    if (max <= 50) {
      // Small values: 0, 10, 20, 30, 40, 50
      return Array.from({ length: Math.ceil(max / 10) + 1 }, (_, i) => i * 10)
    } else if (max <= 100) {
      // Medium values: 0, 20, 40, 60, 80, 100
      return Array.from({ length: Math.ceil(max / 20) + 1 }, (_, i) => i * 20)
    } else if (max <= 200) {
      // Large values: 0, 50, 100, 150, 200
      return Array.from({ length: Math.ceil(max / 50) + 1 }, (_, i) => i * 50)
    } else {
      // Very large values: 0, 100, 200, 300...
      return Array.from({ length: Math.ceil(max / 100) + 1 }, (_, i) => i * 100)
    }
  }

  const ticks = generateTicks(yMax)

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

        {/* Y Axis - Dynamic scale based on data */}
        <YAxis
          domain={[0, yMax]}
          ticks={ticks}
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
