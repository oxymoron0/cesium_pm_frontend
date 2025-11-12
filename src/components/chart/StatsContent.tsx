import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import SubTitle from '@/components/basic/SubTitle'
import TabNavigation from '@/components/basic/TabNavigation'
import HourlyDistributionChart from './HourlyDistributionChart'
import ConcentrationRankings, { type ConcentrationRankingItem } from './ConcentrationRankings'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'
import type { HourlyDataPoint } from '@/utils/api/types'

interface StatsContentProps {
  pmType?: 'PM10' | 'PM25'
  onPMTypeChange?: (type: 'PM10' | 'PM25') => void
  hourlyData?: HourlyDataPoint[]
}

/**
 * Stats Content Component
 *
 * Displays hourly distribution chart and TOP3 rankings
 * - SubTitle changes based on PM/VOCs mode
 * - TabNavigation hidden in VOCs mode
 * - Uses real hourly sensor data from API
 */
const StatsContent = observer(function StatsContent({
  pmType = 'PM10',
  onPMTypeChange,
  hourlyData = []
}: StatsContentProps) {
  const isVOCsMode = sensorSelectionStore.isVOCsSelected

  // Transform hourly data for distribution chart
  const hourlyDistributionData = useMemo(() => {
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
  }, [hourlyData, isVOCsMode, pmType])

  // Calculate high concentration rankings (TOP3)
  const highConcentrationData: ConcentrationRankingItem[] = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return []

    const sensorType = isVOCsMode ? 'vocs' : (pmType === 'PM10' ? 'pm10' : 'pm25')
    const thresholds = {
      pm10: 80,   // Bad threshold for PM10
      pm25: 35,   // Bad threshold for PM25
      vocs: 500   // Assumed threshold for VOCs
    }

    const threshold = thresholds[sensorType]

    // Extract values and filter by threshold
    const dataPoints = hourlyData
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

        return { hour: `${hour}:00`, value }
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

    const sensorType = isVOCsMode ? 'vocs' : (pmType === 'PM10' ? 'pm10' : 'pm25')
    const thresholds = {
      pm10: 30,   // Good threshold for PM10
      pm25: 15,   // Good threshold for PM25
      vocs: 200   // Assumed threshold for VOCs
    }

    const threshold = thresholds[sensorType]

    // Extract values and filter by threshold
    const dataPoints = hourlyData
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

        return { hour: `${hour}:00`, value }
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

  const title = isVOCsMode
    ? '시간대별 VOCs 농도 분포'
    : `시간대별 ${pmType === 'PM10' ? '미세먼지' : '초미세먼지'} 농도 분포`

  const activeTab = pmType === 'PM10' ? 0 : 1

  return (
    <div
      style={{
        display: 'flex',
        width: '256px',
        padding: '0 6px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px',
        alignSelf: 'stretch'
      }}
    >
      {/* SubTitle */}
      <SubTitle>{title}</SubTitle>

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

      {/* Hourly Distribution Chart */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'stretch'
        }}
      >
        <HourlyDistributionChart data={hourlyDistributionData} />
      </div>

      {/* High Concentration Rankings */}
      <ConcentrationRankings type="high" data={highConcentrationData} />

      {/* Low Concentration Rankings */}
      <ConcentrationRankings type="low" data={lowConcentrationData} />
    </div>
  )
})

export default StatsContent
