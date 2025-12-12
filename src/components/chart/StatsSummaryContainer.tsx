import type { ReactNode, CSSProperties } from 'react'

interface StatsSummaryContainerProps {
  children?: ReactNode
  style?: CSSProperties
}

/**
 * Statistics Summary Container
 *
 * 통계 요약 정보를 표시하는 컨테이너 컴포넌트
 * 우측에 배치되어 수치 데이터나 요약 정보를 표시
 */
export default function StatsSummaryContainer({ children, style }: StatsSummaryContainerProps) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '16px 12px',
        flexDirection: 'column',
        alignItems: 'center',
        alignSelf: 'stretch',
        borderRadius: '8px',
        background: '#000',
        ...style
      }}
    >
      {children || (
        <div style={{ color: '#999', fontSize: '14px' }}>
          {/* TODO: 통계 요약 구현 예정 */}
        </div>
      )}
    </div>
  )
}
