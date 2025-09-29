import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import type { HourlyDataPoint } from '@/utils/api/types'

interface ChartDataPoint {
  hour: string
  time: Date
  pm: number   // PM10
  fpm: number  // PM2.5
  displayTime: string
}

interface HourlyPMChartProps {
  data: HourlyDataPoint[]
  stationName?: string
}

const HourlyPMChart = observer(function HourlyPMChart({ data, stationName }: HourlyPMChartProps) {

  // 차트 데이터 전처리 및 시간 필터링
  const chartData = useMemo(() => {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3일 전으로 확장

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
      .filter(point => point.time >= threeDaysAgo && point.time <= now) // 3일 범위로 확장
      .sort((a, b) => a.time.getTime() - b.time.getTime())

    return processedData
  }, [data])

  // Y축 범위 계산
  const { maxValue, yAxisTicks } = useMemo(() => {
    if (chartData.length === 0) {
      return { maxValue: 100, yAxisTicks: [0, 20, 40, 60, 80, 100] }
    }

    const allValues = chartData.flatMap(d => [d.pm, d.fpm])
    const dataMax = Math.max(...allValues)
    const maxValue = Math.max(dataMax + 20, 100) // 최소 100, 최대값 + 20

    // Y축 틱을 5개 구간으로 나누기
    const tickCount = 6
    const tickInterval = maxValue / (tickCount - 1)
    const yAxisTicks = Array.from({ length: tickCount }, (_, i) => Math.round(i * tickInterval))

    return { maxValue, yAxisTicks }
  }, [chartData])

  // SVG 차트 설정
  const chartConfig = {
    width: 600,
    height: 300,
    margin: { top: 20, right: 40, bottom: 60, left: 60 }
  }

  const plotWidth = chartConfig.width - chartConfig.margin.left - chartConfig.margin.right
  const plotHeight = chartConfig.height - chartConfig.margin.top - chartConfig.margin.bottom

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
      <div className="flex items-center justify-center h-64 border border-gray-700 rounded-lg bg-gray-800/50">
        <div className="text-center">
          <div className="mb-2 text-gray-400">📊</div>
          <div className="text-sm text-gray-400">최근 3일 내 데이터가 없습니다</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/50">
      {/* 차트 제목 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {stationName ? `${stationName} 시간별 공기질 변화` : '시간별 공기질 변화'}
          </h3>
          <p className="text-sm text-gray-400">최근 3일 내 미세먼지 농도 ({chartData.length}개 데이터 포인트)</p>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-400"></div>
          <span className="text-sm text-gray-300">미세먼지(PM-10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-yellow-400"></div>
          <span className="text-sm text-gray-300">초미세먼지(PM-2.5)</span>
        </div>
      </div>

      {/* SVG 차트 */}
      <div className="relative">
        <svg
          width={chartConfig.width}
          height={chartConfig.height}
          className="rounded bg-gray-800/30"
          style={{ display: 'block' }}
        >
          {/* 배경 그리드 */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#374151" strokeWidth="0.5"/>
            </pattern>
          </defs>

          <g transform={`translate(${chartConfig.margin.left}, ${chartConfig.margin.top})`}>
            {/* 그리드 */}
            <rect width={plotWidth} height={plotHeight} fill="url(#grid)" />

            {/* Y축 선 및 라벨 */}
            <line x1="0" y1="0" x2="0" y2={plotHeight} stroke="#6B7280" strokeWidth="1"/>
            {yAxisTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1="-5"
                  y1={getY(tick)}
                  x2="0"
                  y2={getY(tick)}
                  stroke="#6B7280"
                  strokeWidth="1"
                />
                <text
                  x="-10"
                  y={getY(tick)}
                  dy="0.35em"
                  textAnchor="end"
                  fontSize="12"
                  fill="#9CA3AF"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* X축 선 및 라벨 */}
            <line x1="0" y1={plotHeight} x2={plotWidth} y2={plotHeight} stroke="#6B7280" strokeWidth="1"/>
            {chartData.map((d, i) => {
              const x = getX(i)
              // 라벨을 너무 많이 표시하지 않도록 간격 조정
              const showLabel = i === 0 || i === chartData.length - 1 || i % Math.max(1, Math.floor(chartData.length / 6)) === 0

              return showLabel ? (
                <g key={i}>
                  <line
                    x1={x}
                    y1={plotHeight}
                    x2={x}
                    y2={plotHeight + 5}
                    stroke="#6B7280"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={plotHeight + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#9CA3AF"
                  >
                    {new Date(d.hour).toLocaleDateString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric'
                    })} {d.displayTime.slice(0, -3)}
                  </text>
                </g>
              ) : null
            })}

            {/* PM10 선 (녹색) */}
            <path
              d={pmPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* PM2.5 선 (노란색) */}
            <path
              d={fpmPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
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
                    fill="#10B981"
                    stroke="#1F2937"
                    strokeWidth="2"
                  />
                  {/* PM2.5 포인트 */}
                  <circle
                    cx={x}
                    cy={fpmY}
                    r="4"
                    fill="#F59E0B"
                    stroke="#1F2937"
                    strokeWidth="2"
                  />
                </g>
              )
            })}
          </g>

          {/* Y축 단위 라벨 */}
          <text
            x="15"
            y="15"
            fontSize="12"
            fill="#9CA3AF"
            textAnchor="middle"
          >
            μg/m³
          </text>
        </svg>

        {/* 데이터 포인트 정보 (우하단) */}
        {chartData.length > 0 && (
          <div className="absolute px-3 py-2 border border-gray-600 rounded-lg bottom-2 right-2 bg-gray-800/90">
            <div className="mb-1 text-xs text-gray-300">
              최신 데이터 ({chartData[chartData.length - 1]?.displayTime})
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-white">{chartData[chartData.length - 1]?.pm.toFixed(1)} μg/m³</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-white">{chartData[chartData.length - 1]?.fpm.toFixed(1)} μg/m³</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default HourlyPMChart