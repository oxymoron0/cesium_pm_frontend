import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import SubTitle from '@/components/basic/SubTitle'
import TabNavigation from '@/components/basic/TabNavigation'
import HourlyDistributionChart from './HourlyDistributionChart'
import DailyBarChart from './DailyBarChart'
import ConcentrationRankings, { type ConcentrationRankingItem } from './ConcentrationRankings'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'
import { isCivil } from '@/utils/env'
import type { HourlyDataPoint, DailyDataPoint } from '@/utils/api/types'
import { transformDailyDataToBarChart } from '@/utils/chart/sensorDataTransform'

interface StatsContentProps {
  pmType?: 'PM10' | 'PM25'
  onPMTypeChange?: (type: 'PM10' | 'PM25') => void
  hourlyData?: HourlyDataPoint[]
  dailyData?: DailyDataPoint[]
  period?: 'today' | 'week' | 'month'
}

/**
 * Stats Content Component
 *
 * Displays distribution chart and TOP3 rankings
 * - SubTitle changes based on PM/VOCs mode
 * - TabNavigation hidden in VOCs mode
 * - Supports both hourly (today) and daily (week/month) data
 * - Chart uses appropriate data based on period
 * - Rankings always use hourly data for time-based TOP3
 */
const StatsContent = observer(function StatsContent({
  pmType = 'PM10',
  onPMTypeChange,
  hourlyData = [],
  dailyData = [],
  period = 'today'
}: StatsContentProps) {
  const isVOCsMode = sensorSelectionStore.isVOCsSelected

  // Transform data for distribution chart based on period
  const distributionData = useMemo(() => {
    if (period === 'today') {
      // Use hourly data for today
      if (!hourlyData || hourlyData.length === 0) return []

      return hourlyData.map((point) => {
        const date = new Date(point.hour)
        const hour = date.getHours()

        let value = 0
        if (isVOCsMode) {
          value = point.average_readings.voc
        } else if (pmType === 'PM10') {
          value = point.average_readings.pm
        } else {
          value = point.average_readings.fpm
        }

        return { hour, value }
      })
    }
    return []
  }, [hourlyData, period, isVOCsMode, pmType])

  // Transform daily data for bar chart (week/month periods)
  const dailyBarData = useMemo(() => {
    if (period === 'today' || !dailyData || dailyData.length === 0) return []

    const sensorType = isVOCsMode ? 'voc' : (pmType === 'PM10' ? 'pm' : 'fpm')
    return transformDailyDataToBarChart(dailyData, sensorType)
  }, [dailyData, period, isVOCsMode, pmType])

  // Calculate high concentration rankings (TOP3)
  const highConcentrationData: ConcentrationRankingItem[] = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return []

    // Get today's date (Korea time, start of day)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const sensorType = isVOCsMode ? 'vocs' : (pmType === 'PM10' ? 'pm10' : 'pm25')
    const thresholds = {
      pm10: 80,   // Bad threshold for PM10
      pm25: 35,   // Bad threshold for PM25
      vocs: 500   // Assumed threshold for VOCs
    }

    const threshold = thresholds[sensorType]

    // Filter by today's data only, then extract values and filter by threshold
    const dataPoints = hourlyData
      .filter((point) => {
        const date = new Date(point.hour)
        return date >= todayStart && date <= todayEnd
      })
      .map((point) => {
        const date = new Date(point.hour)
        const hour = date.getHours()
        let value = 0

        if (isVOCsMode) {
          value = point.average_readings.voc
        } else if (pmType === 'PM10') {
          value = point.average_readings.pm
        } else {
          value = point.average_readings.fpm
        }

        return { hour: `${hour}:00`, value, timestamp: date }
      })
      .filter(point => point.value >= threshold)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)

    return dataPoints.map((point, index) => ({
      rank: index + 1,
      hour: point.hour,
      value: point.value
    }))
  }, [hourlyData, isVOCsMode, pmType])

  // Calculate low concentration rankings (TOP3)
  const lowConcentrationData: ConcentrationRankingItem[] = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return []

    // Get today's date (Korea time, start of day)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const sensorType = isVOCsMode ? 'vocs' : (pmType === 'PM10' ? 'pm10' : 'pm25')
    const thresholds = {
      pm10: 30,   // Good threshold for PM10
      pm25: 15,   // Good threshold for PM25
      vocs: 200   // Assumed threshold for VOCs
    }

    const threshold = thresholds[sensorType]

    // Filter by today's data only, then extract values and filter by threshold
    const dataPoints = hourlyData
      .filter((point) => {
        const date = new Date(point.hour)
        return date >= todayStart && date <= todayEnd
      })
      .map((point) => {
        const date = new Date(point.hour)
        const hour = date.getHours()
        let value = 0

        if (isVOCsMode) {
          value = point.average_readings.voc
        } else if (pmType === 'PM10') {
          value = point.average_readings.pm
        } else {
          value = point.average_readings.fpm
        }

        return { hour: `${hour}:00`, value, timestamp: date }
      })
      .filter(point => point.value <= threshold)
      .sort((a, b) => a.value - b.value)
      .slice(0, 3)

    return dataPoints.map((point, index) => ({
      rank: index + 1,
      hour: point.hour,
      value: point.value
    }))
  }, [hourlyData, isVOCsMode, pmType])

  // Title and info text based on period and sensor type
  const getTitleAndInfo = () => {
    const civilMode = isCivil()

    // Civil 모드: 간소화된 제목
    if (civilMode) {
      const periodPrefix = period === 'today' ? '일간별' : (period === 'week' ? '주간별' : '월간별')
      const title = `${periodPrefix} 미세먼지 상태 현황`
      return { title, info: undefined }
    }

    // 일반 모드
    if (period === 'today') {
      const title = isVOCsMode
        ? '시간대별 VOCs 농도 분포'
        : `시간대별 ${pmType === 'PM10' ? '미세먼지' : '초미세먼지'} 농도 분포`
      return { title, info: undefined }
    }

    // Week or Month period
    const baseTitle = isVOCsMode
      ? '일자별 VOCs 농도 분포'
      : `일자별 ${pmType === 'PM10' ? '미세먼지' : '초미세먼지'} 농도 분포`

    const periodText = period === 'week' ? '최근 1주일간' : '최근 1개월간'
    const sensorText = isVOCsMode ? 'VOCs' : (pmType === 'PM10' ? '미세먼지' : '초미세먼지')
    const info = `${periodText}의 ${sensorText} 평균 농도 변화를 비교 분석해, 시기별 공기질 추이 정보를 제공합니다.`

    return { title: baseTitle, info }
  }

  const { title, info } = getTitleAndInfo()
  const activeTab = pmType === 'PM10' ? 0 : 1

  return (
    <div
      style={{
        display: 'flex',
        padding: '0 6px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px',
        alignSelf: 'stretch'
      }}
    >
      {/* SubTitle */}
      <SubTitle info={info}>{title}</SubTitle>

      {/* Tab Navigation (hidden in VOCs mode) */}
      {!isVOCsMode && (
        <TabNavigation
          tabs={['미세먼지', '초미세먼지']}
          activeTab={activeTab}
          onTabChange={(index) => {
            if (onPMTypeChange) {
              onPMTypeChange(index === 0 ? 'PM10' : 'PM25')
            }
          }}
        />
      )}

      {/* Distribution Chart - Civil 모드에서는 숨김 */}
      {!isCivil() && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch'
          }}
        >
          {period === 'today' ? (
            <HourlyDistributionChart data={distributionData} />
          ) : (
            <DailyBarChart data={dailyBarData} />
          )}
        </div>
      )}

      {/* High Concentration Rankings */}
      <ConcentrationRankings type="high" data={highConcentrationData} pmType={pmType} />

      {/* Low Concentration Rankings */}
      <ConcentrationRankings type="low" data={lowConcentrationData} pmType={pmType} />
    </div>
  )
})

export default StatsContent
