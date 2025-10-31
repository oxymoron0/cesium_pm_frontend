import type { ReactNode } from 'react'

interface PriorityChartContainerProps {
  children?: ReactNode
}

/**
 * Priority Chart Container
 *
 * 우선순위 통계 페이지 전용 차트 컨테이너
 * Bar, Line 등 모든 차트 타입에 사용 가능
 */
export default function PriorityChartContainer({ children }: PriorityChartContainerProps) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '16px',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        flex: '1 0 0',
        alignSelf: 'stretch',
        borderRadius: '8px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #696A6A'
      }}
    >
      {children}
    </div>
  )
}
