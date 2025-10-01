import { useState, useEffect } from 'react'
import LineChartContainer from '@/components/chart/LineChartContainer'
import StatsSummaryContainer from '@/components/chart/StatsSummaryContainer'
import ChartHeader from '@/components/chart/ChartHeader'
import ChartController from '@/components/chart/ChartController'
import SensorLineChart from '@/components/chart/SensorLineChart'
import { getHourlySensorData, getDailySensorData } from '@/utils/api'
import { transformHourlyData, transformDailyData, type ChartDataPoint } from '@/utils/chart/sensorDataTransform'
import { stationDetailStore } from '@/stores/StationDetailStore'

/**
 * Tab Content Components for StationDetail
 *
 * Separated for better readability and maintainability
 */

// 오늘 탭 콘텐츠 컴포넌트
export function TodayContent() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
        const response = await getHourlySensorData(stationId, 24)
        if (response.status === 'success' && response.data) {
          const transformed = transformHourlyData(response.data.hourly_data)
          setChartData(transformed)
        }
      } catch (error) {
        console.error('[TodayContent] Failed to fetch hourly data:', error)
        setChartData([])
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
        {/* TODO: 오늘 통계 요약 */}
      </StatsSummaryContainer>
    </div>
  )
}

// 최근 7일 탭 콘텐츠 컴포넌트
export function WeekContent() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const stationId = stationDetailStore.selectedStationId
      if (!stationId) return

      setIsLoading(true)
      try {
        const response = await getHourlySensorData(stationId, 168) // 7 days = 168 hours
        if (response.status === 'success' && response.data) {
          const transformed = transformHourlyData(response.data.hourly_data)
          setChartData(transformed)
        }
      } catch (error) {
        console.error('[WeekContent] Failed to fetch weekly data:', error)
        setChartData([])
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
        {/* TODO: 최근 7일 통계 요약 */}
      </StatsSummaryContainer>
    </div>
  )
}

// 최근 1개월 탭 콘텐츠 컴포넌트
export function MonthContent() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const stationId = stationDetailStore.selectedStationId
      if (!stationId) return

      setIsLoading(true)
      try {
        const response = await getDailySensorData(stationId)
        if (response.status === 'success' && response.data) {
          const transformed = transformDailyData(response.data.daily_data)
          setChartData(transformed)
        }
      } catch (error) {
        console.error('[MonthContent] Failed to fetch monthly data:', error)
        setChartData([])
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
        {/* TODO: 최근 1개월 통계 요약 */}
      </StatsSummaryContainer>
    </div>
  )
}
