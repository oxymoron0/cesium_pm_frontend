import { useState, useEffect } from 'react'
import LineChartContainer from '@/components/chart/LineChartContainer'
import StatsSummaryContainer from '@/components/chart/StatsSummaryContainer'
import StatsContent from '@/components/chart/StatsContent'
import ChartHeader from '@/components/chart/ChartHeader'
import ChartController from '@/components/chart/ChartController'
import SensorLineChart from '@/components/chart/SensorLineChart'
import {
  transformHourlyData,
  transformDailyData,
  transformLatestDataToChartPoint,
  mergeHourlyWithLatest,
  type ChartDataPoint
} from '@/utils/chart/sensorDataTransform'
import type { HourlyDataPoint, DailyDataPoint, StationSensorApiData } from '@/utils/api/types'

/**
 * Tab Content Components for StationDetail
 *
 * Uses cached data passed from parent to avoid redundant API calls on tab switches
 */

interface TodayContentProps {
  cachedData: {
    hourlyData: HourlyDataPoint[]
    latestData: StationSensorApiData | null
  } | null
}

// 오늘 탭 콘텐츠 컴포넌트
export function TodayContent({ cachedData }: TodayContentProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPMType, setSelectedPMType] = useState<'PM10' | 'PM25'>('PM10')

  // Get current date in MM/DD format
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const currentDate = `${month}/${day}`

  useEffect(() => {
    if (!cachedData) {
      console.log('[TodayContent] 캐시 데이터 대기 중...')
      setIsLoading(true)
      return
    }

    console.log('[TodayContent] 캐시 데이터 사용:', {
      hourlyCount: cachedData.hourlyData.length,
      hasLatest: !!cachedData.latestData
    })

    setIsLoading(false)

    // Store raw hourly data for StatsContent
    setHourlyData(cachedData.hourlyData)

    // Transform hourly data for chart
    const hourlyTransformed = transformHourlyData(cachedData.hourlyData)

    // Merge latest data point if available
    if (cachedData.latestData) {
      const latestPoint = transformLatestDataToChartPoint(cachedData.latestData)
      const mergedData = mergeHourlyWithLatest(hourlyTransformed, latestPoint)
      setChartData(mergedData)
    } else {
      setChartData(hourlyTransformed)
    }
  }, [cachedData])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        flex: '1 0 0',
        alignSelf: 'stretch'
      }}
    >
      <LineChartContainer>
        <ChartHeader period="today" currentDate={currentDate} />
        <ChartController />
        <div style={{ flex: '1 0 0', alignSelf: 'stretch', minHeight: 0 }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontFamily: 'Pretendard',
              fontSize: '14px'
            }}>
              데이터 로딩 중...
            </div>
          ) : (
            <SensorLineChart data={chartData} />
          )}
        </div>
      </LineChartContainer>
      <StatsSummaryContainer>
        <StatsContent
          pmType={selectedPMType}
          onPMTypeChange={setSelectedPMType}
          hourlyData={hourlyData}
        />
      </StatsSummaryContainer>
    </div>
  )
}

interface WeekContentProps {
  cachedData: {
    dailyData: DailyDataPoint[]
    hourlyData: HourlyDataPoint[]
  } | null
}

// 최근 7일 탭 콘텐츠 컴포넌트
export function WeekContent({ cachedData }: WeekContentProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPMType, setSelectedPMType] = useState<'PM10' | 'PM25'>('PM10')

  useEffect(() => {
    if (!cachedData) {
      console.log('[WeekContent] 캐시 데이터 대기 중...')
      setIsLoading(true)
      return
    }

    console.log('[WeekContent] 캐시 데이터 사용:', {
      dailyCount: cachedData.dailyData.length,
      hourlyCount: cachedData.hourlyData.length
    })

    setIsLoading(false)
    setDailyData(cachedData.dailyData)
    setHourlyData(cachedData.hourlyData)

    const transformed = transformDailyData(cachedData.dailyData)
    setChartData(transformed)
  }, [cachedData])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        flex: '1 0 0',
        alignSelf: 'stretch'
      }}
    >
      <LineChartContainer>
        <ChartHeader period="week" />
        <ChartController />
        <div style={{ flex: '1 0 0', alignSelf: 'stretch', minHeight: 0 }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontFamily: 'Pretendard',
              fontSize: '14px'
            }}>
              데이터 로딩 중...
            </div>
          ) : (
            <SensorLineChart data={chartData} />
          )}
        </div>
      </LineChartContainer>
      <StatsSummaryContainer>
        <StatsContent
          pmType={selectedPMType}
          onPMTypeChange={setSelectedPMType}
          hourlyData={hourlyData}
          dailyData={dailyData}
          period="week"
        />
      </StatsSummaryContainer>
    </div>
  )
}

interface MonthContentProps {
  cachedData: {
    dailyData: DailyDataPoint[]
    hourlyData: HourlyDataPoint[]
  } | null
}

// 최근 1개월 탭 콘텐츠 컴포넌트
export function MonthContent({ cachedData }: MonthContentProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPMType, setSelectedPMType] = useState<'PM10' | 'PM25'>('PM10')

  useEffect(() => {
    if (!cachedData) {
      console.log('[MonthContent] 캐시 데이터 대기 중...')
      setIsLoading(true)
      return
    }

    console.log('[MonthContent] 캐시 데이터 사용:', {
      dailyCount: cachedData.dailyData.length,
      hourlyCount: cachedData.hourlyData.length
    })

    setIsLoading(false)
    setDailyData(cachedData.dailyData)
    setHourlyData(cachedData.hourlyData)

    const transformed = transformDailyData(cachedData.dailyData)
    setChartData(transformed)
  }, [cachedData])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        flex: '1 0 0',
        alignSelf: 'stretch'
      }}
    >
      <LineChartContainer>
        <ChartHeader period="month" />
        <ChartController />
        <div style={{ flex: '1 0 0', alignSelf: 'stretch', minHeight: 0 }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontFamily: 'Pretendard',
              fontSize: '14px'
            }}>
              데이터 로딩 중...
            </div>
          ) : (
            <SensorLineChart data={chartData} />
          )}
        </div>
      </LineChartContainer>
      <StatsSummaryContainer>
        <StatsContent
          pmType={selectedPMType}
          onPMTypeChange={setSelectedPMType}
          hourlyData={hourlyData}
          dailyData={dailyData}
          period="month"
        />
      </StatsSummaryContainer>
    </div>
  )
}
