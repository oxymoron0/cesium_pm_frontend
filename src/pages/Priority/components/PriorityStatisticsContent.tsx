import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { toJS } from 'mobx'
import PriorityChartContainer from '@/components/chart/PriorityChartContainer'
import StationConcentrationChart from '@/components/chart/StationConcentrationChart'
import FacilitySimulationChart from '@/components/chart/FacilitySimulationChart'
import { priorityStatisticsStore } from '@/stores/PriorityStatisticsStore'
import type { TimePeriod } from '@/stores/PriorityStatisticsStore'

/**
 * Tab Content Components for PriorityStatistics
 *
 * Uses PriorityStatisticsStore for state management
 */

/**
 * Base statistics content component
 * Shared by all time period tabs
 */
const StatisticsContent = observer(function StatisticsContent({ period }: { period: TimePeriod }) {
  const isLoading = priorityStatisticsStore.isLoading(period)
  const stationData = priorityStatisticsStore.getStationData(period)
  const facilityData = priorityStatisticsStore.getFacilityData(period)
  const facilityType = priorityStatisticsStore.facilityType

  useEffect(() => {
    // Load data on mount if not already loaded
    if (!priorityStatisticsStore.hasData(period) && !isLoading) {
      priorityStatisticsStore.loadPeriodData(period)
    }
  }, [period, isLoading])

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
      {/* 왼쪽: 정류장 실측 농도 */}
      <PriorityChartContainer>
        <div
          style={{
            display: 'flex',
            paddingBottom: '12px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            alignSelf: 'stretch',
            borderBottom: '1px solid #C4C6C6',
            padding: '12px 12px 12px 12px'
          }}
        >
          <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '600' }}>
            정류장 실측 농도
          </div>
        </div>
        <div style={{
          flex: '1 0 0',
          alignSelf: 'stretch',
          minHeight: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(196, 198, 198, 0.2)',
          borderRadius: '8px'
        }}>
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
            <StationConcentrationChart data={toJS(stationData)} />
          )}
        </div>
      </PriorityChartContainer>

      {/* 오른쪽: 취약시설별 시뮬레이션 */}
      <PriorityChartContainer>
        <div
          style={{
            display: 'flex',
            paddingBottom: '12px',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            alignSelf: 'stretch',
            borderBottom: '1px solid #C4C6C6',
            padding: '12px 12px 12px 12px'
          }}
        >
          <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '600' }}>
            취약시설별 시뮬레이션 매우나쁨, 나쁨 횟수
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => priorityStatisticsStore.setFacilityType('bad')}
              style={{
                backgroundColor: facilityType === 'bad' ? '#FFD040' : '#666',
                color: facilityType === 'bad' ? '#000' : '#FFF',
                border: 'none',
                borderRadius: '16px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'Pretendard',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              나쁨
            </button>
            <button
              onClick={() => priorityStatisticsStore.setFacilityType('veryBad')}
              style={{
                backgroundColor: facilityType === 'veryBad' ? '#FFD040' : '#666',
                color: facilityType === 'veryBad' ? '#000' : '#FFF',
                border: 'none',
                borderRadius: '16px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'Pretendard',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              매우나쁨
            </button>
          </div>
        </div>
        <div style={{
          flex: '1 0 0',
          alignSelf: 'stretch',
          minHeight: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(196, 198, 198, 0.2)',
          borderRadius: '8px'
        }}>
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
            <FacilitySimulationChart data={toJS(facilityData)} selectedType={facilityType} />
          )}
        </div>
      </PriorityChartContainer>
    </div>
  )
})

// 실시간 탭 콘텐츠 컴포넌트
export function RealtimeContent() {
  return <StatisticsContent period="realtime" />
}

// 오늘 탭 콘텐츠 컴포넌트
export function TodayContent() {
  return <StatisticsContent period="today" />
}

// 최근 7일 탭 콘텐츠 컴포넌트
export function WeekContent() {
  return <StatisticsContent period="week" />
}

// 최근 1개월 탭 콘텐츠 컴포넌트
export function MonthContent() {
  return <StatisticsContent period="month" />
}
