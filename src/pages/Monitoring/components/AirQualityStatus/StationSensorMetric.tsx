import { useState, useEffect } from 'react'
import LineChartContainer from '@/components/chart/LineChartContainer'
import StatsSummaryContainer from '@/components/chart/StatsSummaryContainer'
import StatsContent from '@/components/chart/StatsContent'
import ChartHeader from '@/components/chart/ChartHeader'
import ChartController from '@/components/chart/ChartController'
import SensorLineChart from '@/components/chart/SensorLineChart'
import { getHourlySensorData, getDailySensorData, getLatestSensorData } from '@/utils/api'
import {
  transformHourlyData,
  transformDailyData,
  transformLatestDataToChartPoint,
  mergeHourlyWithLatest,
  type ChartDataPoint
} from '@/utils/chart/sensorDataTransform'
import { stationDetailStore } from '@/stores/StationDetailStore'

/**
 * Tab Content Components for StationDetail
 *
 * Separated for better readability and maintainability
 */

// 오늘 탭 콘텐츠 컴포넌트
export function TodayContent() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [hourlyData, setHourlyData] = useState<import('@/utils/api/types').HourlyDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPMType, setSelectedPMType] = useState<'PM10' | 'PM25'>('PM10')

  // Get current date in MM/DD format
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const currentDate = `${month}/${day}`

  useEffect(() => {
    const fetchData = async () => {
      const stationId = stationDetailStore.selectedStationId
      if (!stationId) return

      setIsLoading(true)
      try {
        // Parallel fetch: Hourly + Latest sensor data
        const [hourlyResponse, latestResponse] = await Promise.all([
          getHourlySensorData(stationId, 24),
          getLatestSensorData()
        ])

        if (hourlyResponse.status === 'success' && hourlyResponse.data) {
          // Store raw hourly data for StatsContent
          setHourlyData(hourlyResponse.data.hourly_data)

          // Transform hourly data for chart
          const hourlyTransformed = transformHourlyData(hourlyResponse.data.hourly_data)

          // Find latest data for this station
          const stationLatestData = latestResponse?.data?.find(data => data.station_id === stationId)

          // Merge latest data point if available
          if (stationLatestData) {
            const latestPoint = transformLatestDataToChartPoint(stationLatestData)
            const mergedData = mergeHourlyWithLatest(hourlyTransformed, latestPoint)
            setChartData(mergedData)

            console.log('[TodayContent] Chart data merged:', {
              hourlyPoints: hourlyTransformed.length,
              latestTimestamp: latestPoint.timestamp,
              totalPoints: mergedData.length
            })
          } else {
            // No latest data available, use hourly only
            setChartData(hourlyTransformed)
            console.log('[TodayContent] Using hourly data only (no latest data found)')
          }
        }
      } catch (error) {
        console.error('[TodayContent] Failed to fetch sensor data:', error)
        setChartData([])
        setHourlyData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

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

// 최근 7일 탭 콘텐츠 컴포넌트
export function WeekContent() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dailyData, setDailyData] = useState<import('@/utils/api/types').DailyDataPoint[]>([])
  const [hourlyData, setHourlyData] = useState<import('@/utils/api/types').HourlyDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPMType, setSelectedPMType] = useState<'PM10' | 'PM25'>('PM10')

  useEffect(() => {
    const fetchData = async () => {
      const stationId = stationDetailStore.selectedStationId
      if (!stationId) return

      setIsLoading(true)
      try {
        // Fetch both daily and hourly data in parallel
        const [dailyResponse, hourlyResponse] = await Promise.all([
          getDailySensorData(stationId, 7),
          getHourlySensorData(stationId, 24 * 7) // 7 days of hourly data
        ])

        if (dailyResponse.status === 'success' && dailyResponse.data) {
          setDailyData(dailyResponse.data.daily_data)
          const transformed = transformDailyData(dailyResponse.data.daily_data)
          setChartData(transformed)
        }

        if (hourlyResponse.status === 'success' && hourlyResponse.data) {
          setHourlyData(hourlyResponse.data.hourly_data)
        }
      } catch (error) {
        console.error('[WeekContent] Failed to fetch weekly data:', error)
        setChartData([])
        setDailyData([])
        setHourlyData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

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

// 최근 1개월 탭 콘텐츠 컴포넌트
export function MonthContent() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dailyData, setDailyData] = useState<import('@/utils/api/types').DailyDataPoint[]>([])
  const [hourlyData, setHourlyData] = useState<import('@/utils/api/types').HourlyDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPMType, setSelectedPMType] = useState<'PM10' | 'PM25'>('PM10')

  useEffect(() => {
    const fetchData = async () => {
      const stationId = stationDetailStore.selectedStationId
      if (!stationId) return

      setIsLoading(true)
      try {
        // Fetch both daily and hourly data in parallel
        const [dailyResponse, hourlyResponse] = await Promise.all([
          getDailySensorData(stationId),
          getHourlySensorData(stationId, 24 * 30) // 30 days of hourly data
        ])

        if (dailyResponse.status === 'success' && dailyResponse.data) {
          setDailyData(dailyResponse.data.daily_data)
          const transformed = transformDailyData(dailyResponse.data.daily_data)
          setChartData(transformed)
        }

        if (hourlyResponse.status === 'success' && hourlyResponse.data) {
          setHourlyData(hourlyResponse.data.hourly_data)
        }
      } catch (error) {
        console.error('[MonthContent] Failed to fetch monthly data:', error)
        setChartData([])
        setDailyData([])
        setHourlyData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

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
