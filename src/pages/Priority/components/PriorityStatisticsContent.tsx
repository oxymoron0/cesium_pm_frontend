import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { toJS } from 'mobx'
import PriorityChartContainer from '@/components/chart/PriorityChartContainer'
import StationConcentrationChart from '@/components/chart/StationConcentrationChart'
import FacilitySimulationChart from '@/components/chart/FacilitySimulationChart'
import Button from '@/components/basic/Button'
import { priorityStatisticsStore } from '@/stores/PriorityStatisticsStore'
import { API_PATHS } from '@/utils/api/config'
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
    // Load data on mount if not already attempted
    if (!priorityStatisticsStore.hasAttemptedLoad(period)) {
      priorityStatisticsStore.loadPeriodData(period)
    }
  }, [period])

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
            <StationConcentrationChart data={toJS(stationData)} period={period} />
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
            <div
              onClick={() => priorityStatisticsStore.setFacilityType('bad')}
              style={{
                backgroundColor: facilityType === 'bad' ? '#FFD040' : '#666',
                color: facilityType === 'bad' ? '#000' : '#FFF',
                borderRadius: '16px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'Pretendard',
                cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none'
              }}
            >
              나쁨
            </div>
            <div
              onClick={() => priorityStatisticsStore.setFacilityType('veryBad')}
              style={{
                backgroundColor: facilityType === 'veryBad' ? '#FFD040' : '#666',
                color: facilityType === 'veryBad' ? '#000' : '#FFF',
                borderRadius: '16px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'Pretendard',
                cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none'
              }}
            >
              매우나쁨
            </div>
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
            <FacilitySimulationChart data={toJS(facilityData)} selectedType={facilityType} period={period} />
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

// 최근 1년 탭 콘텐츠 컴포넌트
export const YearContent = observer(function YearContent() {
  const [isDownloadingReport, setIsDownloadingReport] = useState(false)

  const handleDownloadReport = async () => {
    if (isDownloadingReport) {
      return
    }

    setIsDownloadingReport(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30초 타임아웃

      const url = API_PATHS.SIMULATION_VULNERABLE_FACILITIES_BY_UUID_TO_EXCEL('year')
      const response = await fetch(url, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      // Blob으로 받아서 파일 다운로드
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // 파일명: 통계_최근1년_날짜.xlsx
      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      link.download = `통계_최근1년_${dateStr}.xlsx`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      console.log('[YearContent] Report downloaded successfully')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[YearContent] Download timeout (30s)')
        alert('리포트 다운로드 시간이 초과되었습니다. 다시 시도해주세요.')
      } else {
        console.error('[YearContent] Download failed:', error)
        alert('리포트 다운로드에 실패했습니다.')
      }
    } finally {
      setIsDownloadingReport(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', alignSelf: 'stretch' }}>
      <StatisticsContent period="year" />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '200px' }}>
          <Button
            variant="solid"
            showIcon={true}
            onClick={handleDownloadReport}
          >
            {isDownloadingReport ? '다운로드 중...' : '리포트 다운로드'}
          </Button>
        </div>
      </div>
    </div>
  )
})

// 최근 1개월 탭 콘텐츠 컴포넌트
export function MonthContent() {
  return <StatisticsContent period="month" />
}
