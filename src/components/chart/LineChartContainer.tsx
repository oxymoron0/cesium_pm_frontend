import type { ReactNode } from 'react'

interface LineChartContainerProps {
  children?: ReactNode
}

/**
 * Line Chart Visualization Container
 *
 * 꺾은선 그래프를 표시하는 정보 시각화 컴포넌트
 * 레이아웃과 스타일을 제공하며, 내부 차트 구현은 children으로 받음
 */
export default function LineChartContainer({ children }: LineChartContainerProps) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '16px',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        flex: '1 0 0',
        alignSelf: 'stretch',
        borderRadius: '8px',
        background: '#000'
      }}
    >
      {children || (
        <div style={{ color: '#999', fontSize: '14px' }}>
          {/* TODO: 차트 구현 예정 */}
        </div>
      )}
    </div>
  )
}
