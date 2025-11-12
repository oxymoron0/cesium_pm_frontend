import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import SubTitle from '@/components/basic/SubTitle'
import TabNavigation from '@/components/basic/TabNavigation'
import HourlyDistributionChart from './HourlyDistributionChart'
import ConcentrationRankings, { type ConcentrationRankingItem } from './ConcentrationRankings'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'

interface StatsContentProps {
  pmType?: 'PM10' | 'PM25'
  onPMTypeChange?: (type: 'PM10' | 'PM25') => void
}

/**
 * Stats Content Component
 *
 * Displays hourly distribution chart and TOP3 rankings
 * - SubTitle changes based on PM/VOCs mode
 * - TabNavigation hidden in VOCs mode
 * - Mock data for initial implementation
 */
const StatsContent = observer(function StatsContent({
  pmType = 'PM10',
  onPMTypeChange
}: StatsContentProps) {
  const isVOCsMode = sensorSelectionStore.isVOCsSelected

  // Mock hourly distribution data (0-23 hours)
  const hourlyDistributionData = useMemo(() => {
    const baseValues = [45, 38, 52, 48, 55, 62, 58, 75, 85, 92, 90, 88,
                        95, 82, 68, 72, 78, 85, 80, 70, 65, 58, 50, 48]

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      value: isVOCsMode
        ? baseValues[i] * 3.5  // VOCs scale (ppb)
        : pmType === 'PM10'
          ? baseValues[i]       // PM10 (μg/m³)
          : baseValues[i] * 0.6 // PM25 (μg/m³)
    }))
  }, [isVOCsMode, pmType])

  // Mock high concentration rankings
  const highConcentrationData: ConcentrationRankingItem[] = useMemo(() => {
    if (isVOCsMode) {
      return [
        { rank: 1, hour: '11:00', value: 322 },
        { rank: 2, hour: '8:00', value: 298 },
        { rank: 3, hour: '5:00', value: 284 }
      ]
    }

    if (pmType === 'PM10') {
      return [
        { rank: 1, hour: '11:00', value: 92 },
        { rank: 2, hour: '8:00', value: 85 },
        { rank: 3, hour: '5:00', value: 81 }
      ]
    }

    return [
      { rank: 1, hour: '11:00', value: 55 },
      { rank: 2, hour: '8:00', value: 51 },
      { rank: 3, hour: '5:00', value: 49 }
    ]
  }, [isVOCsMode, pmType])

  // Mock low concentration rankings
  const lowConcentrationData: ConcentrationRankingItem[] = useMemo(() => {
    if (isVOCsMode) {
      return [
        { rank: 1, hour: '4:00', value: 133 },
        { rank: 2, hour: '1:00', value: 158 },
        { rank: 3, hour: '23:00', value: 168 }
      ]
    }

    if (pmType === 'PM10') {
      return [
        { rank: 1, hour: '4:00', value: 38 },
        { rank: 2, hour: '1:00', value: 45 },
        { rank: 3, hour: '23:00', value: 48 }
      ]
    }

    return [
      { rank: 1, hour: '4:00', value: 23 },
      { rank: 2, hour: '1:00', value: 27 },
      { rank: 3, hour: '23:00', value: 29 }
    ]
  }, [isVOCsMode, pmType])

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
