import { useState, useMemo, memo } from 'react'
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
 * Unified Station Sensor Metric Chart
 *
 * Optimized for tab switching performance by maintaining single component instance.
 * Only data changes on tab switch, avoiding full component remount/unmount cycle.
 */

interface UnifiedStationSensorMetricProps {
  activeTab: 0 | 1 | 2
  cachedTodayData: {
    hourlyData: HourlyDataPoint[]
    latestData: StationSensorApiData | null
  } | null
  cachedWeekData: {
    dailyData: DailyDataPoint[]
    hourlyData: HourlyDataPoint[]
  } | null
  cachedMonthData: {
    dailyData: DailyDataPoint[]
    hourlyData: HourlyDataPoint[]
  } | null
}

interface ProcessedTabData {
  chartData: ChartDataPoint[]
  hourlyData: HourlyDataPoint[]
  dailyData: DailyDataPoint[]
  period: 'today' | 'week' | 'month'
  currentDate?: string
  isLoading: boolean
}

const UnifiedStationSensorMetric = memo(function UnifiedStationSensorMetric({
  activeTab,
  cachedTodayData,
  cachedWeekData,
  cachedMonthData
}: UnifiedStationSensorMetricProps) {
  const [selectedPMType, setSelectedPMType] = useState<'PM10' | 'PM25'>('PM10')

  // Process data based on active tab
  const processedData: ProcessedTabData = useMemo(() => {
    console.log('[UnifiedChart] Processing data for tab:', activeTab)

    // Get current date for today tab
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const currentDate = `${month}/${day}`

    switch (activeTab) {
      case 0: {
        // Today tab
        if (!cachedTodayData) {
          return {
            chartData: [],
            hourlyData: [],
            dailyData: [],
            period: 'today',
            currentDate,
            isLoading: true
          }
        }

        const hourlyTransformed = transformHourlyData(cachedTodayData.hourlyData)
        let chartData: ChartDataPoint[]

        if (cachedTodayData.latestData) {
          const latestPoint = transformLatestDataToChartPoint(cachedTodayData.latestData)
          chartData = mergeHourlyWithLatest(hourlyTransformed, latestPoint)
        } else {
          chartData = hourlyTransformed
        }

        return {
          chartData,
          hourlyData: cachedTodayData.hourlyData,
          dailyData: [],
          period: 'today',
          currentDate,
          isLoading: false
        }
      }

      case 1: {
        // Week tab
        if (!cachedWeekData) {
          return {
            chartData: [],
            hourlyData: [],
            dailyData: [],
            period: 'week',
            isLoading: true
          }
        }

        const chartData = transformDailyData(cachedWeekData.dailyData)

        return {
          chartData,
          hourlyData: cachedWeekData.hourlyData,
          dailyData: cachedWeekData.dailyData,
          period: 'week',
          isLoading: false
        }
      }

      case 2: {
        // Month tab
        if (!cachedMonthData) {
          return {
            chartData: [],
            hourlyData: [],
            dailyData: [],
            period: 'month',
            isLoading: true
          }
        }

        const chartData = transformDailyData(cachedMonthData.dailyData)

        return {
          chartData,
          hourlyData: cachedMonthData.hourlyData,
          dailyData: cachedMonthData.dailyData,
          period: 'month',
          isLoading: false
        }
      }

      default:
        return {
          chartData: [],
          hourlyData: [],
          dailyData: [],
          period: 'today',
          currentDate,
          isLoading: true
        }
    }
  }, [activeTab, cachedTodayData, cachedWeekData, cachedMonthData])

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
        <ChartHeader
          period={processedData.period}
          currentDate={processedData.currentDate}
        />
        <ChartController />
        <div style={{ flex: '1 0 0', alignSelf: 'stretch', minHeight: 0 }}>
          {processedData.isLoading ? (
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
            <SensorLineChart data={processedData.chartData} />
          )}
        </div>
      </LineChartContainer>
      <StatsSummaryContainer>
        <StatsContent
          pmType={selectedPMType}
          onPMTypeChange={setSelectedPMType}
          hourlyData={processedData.hourlyData}
          dailyData={processedData.dailyData}
          period={processedData.period}
        />
      </StatsSummaryContainer>
    </div>
  )
})

export default UnifiedStationSensorMetric

// Legacy exports for backward compatibility (not used anymore)
export function TodayContent() { return null }
export function WeekContent() { return null }
export function MonthContent() { return null }
