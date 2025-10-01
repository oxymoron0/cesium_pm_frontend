import LineChartContainer from '@/components/chart/LineChartContainer'
import StatsSummaryContainer from '@/components/chart/StatsSummaryContainer'
import ChartHeader from '@/components/chart/ChartHeader'
import ChartController from '@/components/chart/ChartController'

/**
 * Tab Content Components for StationDetail
 *
 * Separated for better readability and maintainability
 */

// 오늘 탭 콘텐츠 컴포넌트
export function TodayContent() {
  // Get current date in MM/DD format
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const currentDate = `${month}/${day}`

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
