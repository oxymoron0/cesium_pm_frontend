import { useState } from 'react'
import LineChartContainer from '@/components/chart/LineChartContainer'
import StatsSummaryContainer from '@/components/chart/StatsSummaryContainer'
import ChartHeader from '@/components/chart/ChartHeader'

/**
 * Tab Content Components for StationDetail
 *
 * Separated for better readability and maintainability
 */

// 오늘 탭 콘텐츠 컴포넌트
export function TodayContent() {
  const [selectedSensorType, setSelectedSensorType] = useState<'PM' | 'VOCs'>('PM')

  // Get current date in MM/DD format
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit'
  })

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
          period="today"
          currentDate={currentDate}
          selectedSensorType={selectedSensorType}
          onSensorTypeChange={setSelectedSensorType}
        />
        {/* TODO: 오늘(24시간) 데이터 시각화 추가 */}
        {/* - 최고/최저값 표시 */}
        {/* - 평균값 비교 */}
      </LineChartContainer>
      <StatsSummaryContainer>
        {/* TODO: 오늘 통계 요약 */}
      </StatsSummaryContainer>
    </div>
  )
}

// 최근 7일 탭 콘텐츠 컴포넌트
export function WeekContent() {
  const [selectedSensorType, setSelectedSensorType] = useState<'PM' | 'VOCs'>('PM')

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
          period="week"
          selectedSensorType={selectedSensorType}
          onSensorTypeChange={setSelectedSensorType}
        />
        {/* TODO: 최근 7일 데이터 시각화 추가 */}
        {/* - 요일별 패턴 분석 */}
        {/* - 주간 통계 요약 */}
      </LineChartContainer>
      <StatsSummaryContainer>
        {/* TODO: 최근 7일 통계 요약 */}
      </StatsSummaryContainer>
    </div>
  )
}

// 최근 1개월 탭 콘텐츠 컴포넌트
export function MonthContent() {
  const [selectedSensorType, setSelectedSensorType] = useState<'PM' | 'VOCs'>('PM')

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
          period="month"
          selectedSensorType={selectedSensorType}
          onSensorTypeChange={setSelectedSensorType}
        />
        {/* TODO: 최근 1개월 데이터 시각화 추가 */}
        {/* - 월간 통계 요약 */}
        {/* - 공기질 등급 분포 */}
      </LineChartContainer>
      <StatsSummaryContainer>
        {/* TODO: 최근 1개월 통계 요약 */}
      </StatsSummaryContainer>
    </div>
  )
}
