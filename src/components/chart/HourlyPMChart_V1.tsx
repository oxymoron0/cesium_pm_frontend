import { observer } from 'mobx-react-lite'
import { useMemo, useState, useRef, useEffect } from 'react'
import type { HourlyDataPoint } from '../../utils/api/types'

interface ChartDataPoint {
  hour: string
  time: Date
  pm: number   // PM10
  fpm: number  // PM2.5
  displayTime: string
}

interface HourlyPMChartV1Props {
  data: HourlyDataPoint[]
  stationName?: string
}

const HourlyPMChart_V1 = observer(function HourlyPMChart_V1({ data }: HourlyPMChartV1Props) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: rect.width,
          height: rect.height
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // 차트 데이터 전처리 - 하루 데이터만 표시 (24시간)
  const chartData = useMemo(() => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const processedData: ChartDataPoint[] = data
      .map(point => {
        const time = new Date(point.hour)
        return {
          hour: point.hour,
          time,
          pm: point.average_readings.pm,
          fpm: point.average_readings.fpm,
          displayTime: time.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        }
      })
      .filter(point => point.time >= oneDayAgo && point.time <= now)
      .sort((a, b) => a.time.getTime() - b.time.getTime())

    return processedData
  }, [data])

  // 최댓값 찾기 (라벨 표시용)
  const findPeaks = useMemo(() => {
    if (chartData.length === 0) return { pmPeak: -1, fpmPeak: -1 }

    let pmPeak = 0
    let fpmPeak = 0

    chartData.forEach((d, i) => {
      if (d.pm > chartData[pmPeak].pm) pmPeak = i
      if (d.fpm > chartData[fpmPeak].fpm) fpmPeak = i
    })

    return { pmPeak, fpmPeak }
  }, [chartData])


  // 현재 날짜 가져오기 (MM/DD 형식)
  const getCurrentDateString = () => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${month}/${day}`
  }

  // SVG 차트 설정 - 화면에 맞춤
  const chartConfig = {
    width: dimensions.width,
    height: dimensions.height,
    margin: { top: 40, right: 40, bottom: 40, left: 60 }
  }

  const plotWidth = chartConfig.width - chartConfig.margin.left - chartConfig.margin.right
  const plotHeight = chartConfig.height - chartConfig.margin.top - chartConfig.margin.bottom

  // Y축 동적 계산 - 기존의 좋은 로직 복원
  const { maxValue, yAxisTicks } = useMemo(() => {
    if (chartData.length === 0) {
      return { maxValue: 10, yAxisTicks: [0, 2, 4, 6, 8, 10] }
    }

    const allValues = chartData.flatMap(d => [d.pm, d.fpm])
    const dataMax = Math.max(...allValues)

    // 동적 Y축 최댓값 계산 (기존 로직 복원)
    const calculateYAxisMax = (max: number): number => {
      if (max <= 5) return 10
      if (max <= 10) return 15
      if (max <= 15) return 20
      if (max <= 20) return 25
      if (max <= 25) return 30
      if (max <= 30) return 40
      if (max <= 40) return 50
      if (max <= 50) return 60
      if (max <= 60) return 80
      if (max <= 80) return 100
      if (max <= 100) return 120
      if (max <= 120) return 150
      if (max <= 150) return 200
      return Math.ceil(max / 50) * 50 + 50
    }

    const maxValue = calculateYAxisMax(dataMax)

    // Y축 틱 생성 (기존 로직 복원)
    const generateTicks = (max: number): number[] => {
      if (max <= 10) return [0, 2, 4, 6, 8, 10]
      if (max <= 20) return [0, 4, 8, 12, 16, 20]
      if (max <= 30) return [0, 5, 10, 15, 20, 25, 30]
      if (max <= 50) return [0, 10, 20, 30, 40, 50]
      if (max <= 100) return [0, 20, 40, 60, 80, 100]
      if (max <= 200) return [0, 40, 80, 120, 160, 200]

      const interval = max / 10
      return Array.from({ length: 11 }, (_, i) => Math.round(i * interval))
    }

    const yAxisTicks = generateTicks(maxValue)

    return { maxValue, yAxisTicks }
  }, [chartData])

  // 좌표 변환 함수
  const getX = (index: number) => {
    if (chartData.length <= 1) return 0
    return (index / (chartData.length - 1)) * plotWidth
  }

  const getY = (value: number) => {
    return plotHeight - (value / maxValue) * plotHeight
  }

  // 선 경로 생성
  const createPath = (getValue: (d: ChartDataPoint) => number) => {
    if (chartData.length === 0) return ''

    return chartData
      .map((d, i) => {
        const x = getX(i)
        const y = getY(getValue(d))
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  const pmPath = createPath(d => d.pm)
  const fpmPath = createPath(d => d.fpm)

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center bg-black rounded-lg h-96">
        <div className="text-center">
          <div className="mb-2 text-gray-400">📊</div>
          <div className="text-sm text-gray-400">데이터가 없습니다</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black rounded-lg">
      {/* 우상단 색상 범례 */}
      <div className="absolute z-10 flex items-center gap-6 top-20 right-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-1.5" style={{ backgroundColor: '#00D4AA' }}></div>
          <span className="text-sm font-medium text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>미세먼지(PM-10)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-1.5" style={{ backgroundColor: '#FFB800' }}></div>
          <span className="text-sm font-medium text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>초미세먼지(PM-2.5)</span>
        </div>
      </div>

      {/* SVG 차트 */}
      <div className="relative w-full">
        <svg
          width={chartConfig.width}
          height={chartConfig.height}
          className="bg-black"
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          {/* 차트 제목 - 좌상단 */}
          <text
            x="40"
            y="40"
            fontSize="20"
            fill="#ffffff"
            fontWeight="600"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {getCurrentDateString()} 공기질 농도 변화
          </text>

          <g transform={`translate(${chartConfig.margin.left}, ${chartConfig.margin.top})`}>
            {/* 그리드 */}
            {yAxisTicks.map((tick) => (
              <line
                key={tick}
                x1="0"
                y1={getY(tick)}
                x2={plotWidth}
                y2={getY(tick)}
                stroke="#333333"
                strokeWidth="1"
                opacity="0.8"
              />
            ))}

            {/* 세로 그리드 */}
            {chartData.map((_, i) => {
              const x = getX(i)
              return (
                <line
                  key={i}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2={plotHeight}
                  stroke="#333333"
                  strokeWidth="1"
                  opacity="0.8"
                />
              )
            })}

            {/* Y축 라벨 */}
            {yAxisTicks.map((tick) => (
              <text
                key={tick}
                x="-25"
                y={getY(tick)}
                dy="0.35em"
                textAnchor="end"
                fontSize="14"
                fill="#999999"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {tick}
              </text>
            ))}

            {/* X축 라벨 */}
            {chartData.map((d, i) => {
              const x = getX(i)
              const time = new Date(d.hour)
              const hour = time.getHours()

              return (
                <text
                  key={i}
                  x={x}
                  y={plotHeight + 35}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#999999"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {hour}시
                </text>
              )
            })}

            {/* PM10 선 (녹색) */}
            <path
              d={pmPath}
              fill="none"
              stroke="#00D4AA"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* PM2.5 선 (노란색) */}
            <path
              d={fpmPath}
              fill="none"
              stroke="#FFB800"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* 데이터 포인트 */}
            {chartData.map((d, i) => {
              const x = getX(i)
              const pmY = getY(d.pm)
              const fpmY = getY(d.fpm)

              return (
                <g key={i}>
                  {/* PM10 포인트 */}
                  <circle
                    cx={x}
                    cy={pmY}
                    r="4"
                    fill="#00D4AA"
                    stroke="#000000"
                    strokeWidth="1.5"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* PM2.5 포인트 */}
                  <circle
                    cx={x}
                    cy={fpmY}
                    r="4"
                    fill="#FFB800"
                    stroke="#000000"
                    strokeWidth="1.5"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  />

                  {/* 최댓값 라벨 */}
                  {i === findPeaks.pmPeak && (
                    <g>
                      <rect
                        x={x - 22}
                        y={pmY - 28}
                        width="44"
                        height="16"
                        fill="#FBB040"
                        rx="8"
                      />
                      <text
                        x={x}
                        y={pmY - 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#000000"
                        fontWeight="bold"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {Math.round(d.pm)}μg/m³
                      </text>
                    </g>
                  )}

                  {i === findPeaks.fpmPeak && (
                    <g>
                      <rect
                        x={x - 22}
                        y={fpmY - 28}
                        width="44"
                        height="16"
                        fill="#FBB040"
                        rx="8"
                      />
                      <text
                        x={x}
                        y={fpmY - 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#000000"
                        fontWeight="bold"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {Math.round(d.fpm)}μg/m³
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* 모든 데이터 포인트 hover 정보 */}
        {hoveredPoint !== null && chartData.length > 0 && (
          <div
            className="absolute z-20 px-3 py-2 bg-black border border-gray-500 rounded-md shadow-lg pointer-events-none"
            style={{
              left: chartConfig.margin.left + getX(hoveredPoint) + 15,
              top: chartConfig.margin.top + getY(Math.max(chartData[hoveredPoint].pm, chartData[hoveredPoint].fpm)) - 90,
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            <div className="mb-1 font-medium text-white">
              {new Date(chartData[hoveredPoint].hour).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric'
              })} {chartData[hoveredPoint].displayTime}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00D4AA' }}></div>
                <span className="text-white">미세먼지</span>
                <span className="font-semibold text-white">{Math.round(chartData[hoveredPoint].pm)} μg/m³</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FFB800' }}></div>
                <span className="text-white">초미세먼지</span>
                <span className="font-semibold text-white">{Math.round(chartData[hoveredPoint].fpm)} μg/m³</span>
                <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">좋음</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default HourlyPMChart_V1