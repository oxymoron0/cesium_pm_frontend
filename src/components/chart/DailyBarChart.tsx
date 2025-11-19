import { observer } from 'mobx-react-lite'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'

interface DailyBarDataPoint {
  date: string      // ISO date string
  dateLabel: string // MM.DD format
  dayOfWeek: string // 요일
  value: number
}

interface DailyBarChartProps {
  data: DailyBarDataPoint[]
}

/**
 * Daily Bar Chart Component
 *
 * Bar chart showing daily concentration distribution
 * - Fixed dimensions: 244px × 122px
 * - X-axis shows date (MM.DD) with day of week
 * - Y-axis adapts to data values
 * - Bar colors based on min/max values: Max=#FFD040, Min=#FFF, Others=#555
 */
const DailyBarChart = observer(function DailyBarChart({
  data
}: DailyBarChartProps) {
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
      return Array.from({ length: Math.ceil(max / 10) + 1 }, (_, i) => i * 10)
    } else if (max <= 100) {
      return Array.from({ length: Math.ceil(max / 20) + 1 }, (_, i) => i * 20)
    } else if (max <= 200) {
      return Array.from({ length: Math.ceil(max / 50) + 1 }, (_, i) => i * 50)
    } else {
      return Array.from({ length: Math.ceil(max / 100) + 1 }, (_, i) => i * 100)
    }
  }

  const ticks = generateTicks(yMax)

  // Determine bar color based on min/max values in dataset
  const getBarColor = (value: number): string => {
    const values = data.map(d => d.value)
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)

    if (value === maxValue) return '#FFD040' // Max - yellow
    if (value === minValue) return '#FFF'    // Min - white
    return '#555555'                         // Others - gray
  }

  // Custom X-axis tick component with date + day of week
  const CustomXAxisTick = (props: { x?: number; y?: number; payload?: { value: string } }) => {
    const { x, y, payload } = props
    const dataPoint = data.find(d => d.dateLabel === payload?.value)
    if (!dataPoint) return null

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={8}
          textAnchor="middle"
          fill="#A6A6A6"
          fontFamily="Pretendard"
          fontSize={8}
          letterSpacing="-0.15px"
        >
          {dataPoint.dateLabel}
        </text>
        <text
          x={0}
          y={0}
          dy={18}
          textAnchor="middle"
          fill="#A6A6A6"
          fontFamily="Pretendard"
          fontSize={8}
          letterSpacing="-0.15px"
        >
          ({dataPoint.dayOfWeek})
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width={244} height={122}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 0, left: 0, bottom: 25 }}
        barCategoryGap="20%"
      >
        {/* Grid */}
        <CartesianGrid strokeDasharray="3 3" stroke="#555" strokeOpacity={0.3} />

        {/* X Axis - Date labels with day of week */}
        <XAxis
          dataKey="dateLabel"
          tick={<CustomXAxisTick />}
          stroke="#666"
          tickLine={false}
          interval={0}
        />

        {/* Y Axis - Dynamic scale based on data */}
        <YAxis
          domain={[0, yMax]}
          ticks={ticks}
          tick={{
            fill: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontSize: 8,
            letterSpacing: '-0.15px'
          }}
          stroke="#666"
          tickLine={false}
          width={20}
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
          labelFormatter={(dateLabel: string) => {
            const dataPoint = data.find(d => d.dateLabel === dateLabel)
            return dataPoint ? `${dateLabel} (${dataPoint.dayOfWeek})` : dateLabel
          }}
        />

        {/* Bar - Dynamic colors based on air quality */}
        <Bar
          dataKey="value"
          radius={[10, 10, 0, 0]}
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})

export default DailyBarChart
