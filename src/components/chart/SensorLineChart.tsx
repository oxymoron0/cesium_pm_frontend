import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea
} from 'recharts'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'
import SensorTooltip from './SensorTooltip'
import type { ChartDataPoint } from '@/utils/chart/sensorDataTransform'

interface SensorLineChartProps {
  data: ChartDataPoint[]
}

/**
 * Sensor Line Chart Component
 *
 * Time-series visualization for PM10/PM25 sensor data using Recharts
 * - Responsive container
 * - Conditional line rendering based on SensorSelectionStore
 * - Air quality threshold zones with ReferenceArea
 * - Custom tooltip with air quality levels
 */
const SensorLineChart = observer(function SensorLineChart({
  data
}: SensorLineChartProps) {
  // Track initial mount for animation
  const [isInitialMount, setIsInitialMount] = useState(true)

  useEffect(() => {
    if (isInitialMount && data.length > 0) {
      // Disable animation after initial load (increased duration for smoother finish)
      const timer = setTimeout(() => {
        setIsInitialMount(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [data.length, isInitialMount])

  // Determine which lines to show based on store
  const isPMMode = sensorSelectionStore.isPMSelected
  const isVOCsMode = sensorSelectionStore.isVOCsSelected

  const showPM10 = isPMMode && (sensorSelectionStore.selectedPMType === null || sensorSelectionStore.isPM10Selected)
  const showPM25 = isPMMode && (sensorSelectionStore.selectedPMType === null || sensorSelectionStore.isPM25Selected)
  const showVOCs = isVOCsMode

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#999',
          fontFamily: 'Pretendard',
          fontSize: '14px'
        }}
      >
        데이터가 없습니다
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
        style={{ outline: 'none' }}
      >
        {/* Grid */}
        <CartesianGrid strokeDasharray="3 3" stroke="#555" strokeOpacity={0.5} />

        {/* X Axis */}
        <XAxis
          dataKey="time"
          tick={{
            fill: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: 12
          }}
          stroke="#666"
        />

        {/* Y Axis */}
        <YAxis
          tick={{
            fill: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: 12
          }}
          stroke="#666"
          label={{
            value: isVOCsMode ? 'ppb' : 'μg/m³',
            angle: -90,
            position: 'insideLeft',
            style: {
              fill: '#A6A6A6',
              fontFamily: 'Pretendard',
              fontSize: 12
            }
          }}
        />

        {/* Tooltip */}
        <Tooltip
          content={<SensorTooltip showPM10={showPM10} showPM25={showPM25} showVOCs={showVOCs} />}
          cursor={{ stroke: '#FFD040', strokeWidth: 1, strokeDasharray: '5 5' }}
        />

        {/* Air Quality Threshold Zones (PM10-based for now) */}
        {showPM10 && (
          <>
            {/* Good: 0-30 */}
            <ReferenceArea
              y1={0}
              y2={30}
              fill="#1C67D7"
              fillOpacity={0.05}
            />
            {/* Normal: 30-80 */}
            <ReferenceArea
              y1={30}
              y2={80}
              fill="#18A274"
              fillOpacity={0.05}
            />
            {/* Bad: 80-150 */}
            <ReferenceArea
              y1={80}
              y2={150}
              fill="#FEE046"
              fillOpacity={0.05}
            />
            {/* Very Bad: 150+ */}
            <ReferenceArea
              y1={150}
              y2={250}
              fill="#D32F2D"
              fillOpacity={0.05}
            />
          </>
        )}

        {/* PM25 Threshold Zones (when only PM25 selected) */}
        {!showPM10 && showPM25 && (
          <>
            {/* Good: 0-15 */}
            <ReferenceArea
              y1={0}
              y2={15}
              fill="#1C67D7"
              fillOpacity={0.05}
            />
            {/* Normal: 15-35 */}
            <ReferenceArea
              y1={15}
              y2={35}
              fill="#18A274"
              fillOpacity={0.05}
            />
            {/* Bad: 35-75 */}
            <ReferenceArea
              y1={35}
              y2={75}
              fill="#FEE046"
              fillOpacity={0.05}
            />
            {/* Very Bad: 75+ */}
            <ReferenceArea
              y1={75}
              y2={150}
              fill="#D32F2D"
              fillOpacity={0.05}
            />
          </>
        )}

        {/* PM10 Line */}
        <Line
          type="monotone"
          dataKey="pm10"
          stroke="#CFFF40"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#CFFF40' }}
          connectNulls
          hide={!showPM10}
          isAnimationActive={isInitialMount}
          animationDuration={1500}
          animationEasing="ease-in-out"
        />

        {/* PM25 Line */}
        <Line
          type="monotone"
          dataKey="pm25"
          stroke="#FFD040"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#FFD040' }}
          connectNulls
          hide={!showPM25}
          isAnimationActive={isInitialMount}
          animationDuration={1500}
          animationEasing="ease-in-out"
        />

        {/* VOCs Line */}
        <Line
          type="monotone"
          dataKey="voc"
          stroke="#C8C8C8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#C8C8C8' }}
          connectNulls
          hide={!showVOCs}
          isAnimationActive={isInitialMount}
          animationDuration={1500}
          animationEasing="ease-in-out"
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

export default SensorLineChart
