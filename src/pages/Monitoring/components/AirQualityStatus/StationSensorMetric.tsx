/**
 * Tab Content Renderers for StationDetail
 *
 * Separated for better readability and maintainability
 */

// 오늘 탭 콘텐츠 렌더링
export const renderTodayContent = () => {
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
      {/* TODO: 오늘(24시간) 데이터 시각화 추가 */}
      {/* - 시간별 트렌드 차트 */}
      {/* - 최고/최저값 표시 */}
      {/* - 평균값 비교 */}
    </div>
  )
}

// 최근 7일 탭 콘텐츠 렌더링
export const renderWeekContent = () => {
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
      {/* TODO: 최근 7일 데이터 시각화 추가 */}
      {/* - 일별 평균 트렌드 */}
      {/* - 요일별 패턴 분석 */}
      {/* - 주간 통계 요약 */}
    </div>
  )
}

// 최근 1개월 탭 콘텐츠 렌더링
export const renderMonthContent = () => {
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
      {/* TODO: 최근 1개월 데이터 시각화 추가 */}
      {/* - 일별 평균 트렌드 */}
      {/* - 월간 통계 요약 */}
      {/* - 공기질 등급 분포 */}
    </div>
  )
}
