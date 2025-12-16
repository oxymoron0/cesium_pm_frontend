import { observer } from 'mobx-react-lite'
import { useState, useEffect, useMemo } from 'react'
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
import { AIR_QUALITY_STANDARDS, AIR_QUALITY_COLORS } from '@/utils/airQuality'
import { isCivil } from '@/utils/env'
import type { ChartDataPoint } from '@/utils/chart/sensorDataTransform'

interface SensorLineChartProps {
  data: ChartDataPoint[]
}

// 배경색 투명도
const ZONE_FILL_OPACITY = 0.3

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

  // Civil 모드 여부
  const civilMode = isCivil()

  // 컬러맵이 켜져 있는지 확인
  // Civil 모드: 항상 활성화 (PM10 기준)
  // 일반 모드: PM10 또는 PM25가 명시적으로 선택된 경우에만
  const isColorMapOn = civilMode || sensorSelectionStore.selectedPMType !== null

  // Y축 최대값과 배경 영역을 공기질 기준에 맞춰 계산
  const { yAxisMax, zones, civilYAxisConfig } = useMemo(() => {
    if (!data || data.length === 0) {
      return { yAxisMax: 100, zones: [], civilYAxisConfig: null }
    }

    // 1. 데이터 최대값 계산
    let maxValue = 0
    data.forEach(point => {
      if (showPM10 && point.pm10 != null && point.pm10 > maxValue) maxValue = point.pm10
      if (showPM25 && point.pm25 != null && point.pm25 > maxValue) maxValue = point.pm25
      if (showVOCs && point.voc != null && point.voc > maxValue) maxValue = point.voc
    })

    // 컬러맵이 꺼져 있거나 VOCs 모드면 배경색 없이 Y축은 max * 1.2
    if (!isColorMapOn || (showVOCs && !showPM10 && !showPM25)) {
      return { yAxisMax: Math.ceil(maxValue * 1.2) || 100, zones: [], civilYAxisConfig: null }
    }

    // 2. 적용할 기준 선택 (PM10 우선)
    const standards = showPM10 ? AIR_QUALITY_STANDARDS.pm10 : AIR_QUALITY_STANDARDS.pm25
    const thresholds = [standards.good.max, standards.normal.max, standards.bad.max]

    // 3. Y축 최대값: 데이터가 포함되는 기준 임계값으로 설정
    let yMax: number
    if (maxValue <= thresholds[0]) {
      yMax = thresholds[0]
    } else if (maxValue <= thresholds[1]) {
      yMax = thresholds[1]
    } else if (maxValue <= thresholds[2]) {
      yMax = thresholds[2]
    } else {
      // 매우나쁨 범위: 50 단위로 올림
      yMax = Math.ceil(maxValue / 50) * 50
    }

    // 4. 배경 영역 생성 (Y축 최대값까지만)
    const zoneList: { y1: number; y2: number; fill: string }[] = []

    // Good
    zoneList.push({
      y1: 0,
      y2: Math.min(thresholds[0], yMax),
      fill: AIR_QUALITY_COLORS.good
    })

    // Normal
    if (yMax > thresholds[0]) {
      zoneList.push({
        y1: thresholds[0],
        y2: Math.min(thresholds[1], yMax),
        fill: AIR_QUALITY_COLORS.normal
      })
    }

    // Bad
    if (yMax > thresholds[1]) {
      zoneList.push({
        y1: thresholds[1],
        y2: Math.min(thresholds[2], yMax),
        fill: AIR_QUALITY_COLORS.bad
      })
    }

    // Very Bad
    if (yMax > thresholds[2]) {
      zoneList.push({
        y1: thresholds[2],
        y2: yMax,
        fill: AIR_QUALITY_COLORS.very_bad
      })
    }

    // 5. Civil 모드용 Y축 설정 (등급 텍스트 표시)
    const civilConfig = civilMode ? {
      ticks: zoneList.map(zone => (zone.y1 + zone.y2) / 2), // 각 존의 중앙값
      tickLabels: zoneList.map((_zone, index) => {
        if (index === 0) return '좋음'
        if (index === 1) return '보통'
        if (index === 2) return '나쁨'
        return '매우나쁨'
      })
    } : null

    return { yAxisMax: yMax, zones: zoneList, civilYAxisConfig: civilConfig }
  }, [data, showPM10, showPM25, showVOCs, isColorMapOn, civilMode])

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
          domain={[0, yAxisMax]}
          ticks={civilYAxisConfig?.ticks}
          tickFormatter={civilYAxisConfig ? (value: number) => {
            const index = civilYAxisConfig.ticks.indexOf(value)
            return index >= 0 ? civilYAxisConfig.tickLabels[index] : ''
          } : undefined}
          tick={{
            fill: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: 12
          }}
          stroke="#666"
          width={civilYAxisConfig ? 60 : 40}
          label={civilYAxisConfig ? undefined : {
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

        {/* Air Quality Threshold Zones - Y축과 동기화 */}
        {zones.map((zone, index) => (
          <ReferenceArea
            key={`zone-${index}`}
            y1={zone.y1}
            y2={zone.y2}
            fill={zone.fill}
            fillOpacity={ZONE_FILL_OPACITY}
          />
        ))}

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
