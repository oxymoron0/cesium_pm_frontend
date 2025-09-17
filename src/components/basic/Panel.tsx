import { type ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
  position?: 'left' | 'right'
  offset?: number
  width?: string
  maxHeight?: string
}

function Panel({
  children,
  className = "",
  position = 'left',
  offset = 20,
  width = '400px',
  maxHeight
}: PanelProps) {
  const positionStyle = position === 'left' 
    ? { left: `${offset}px` }
    : { right: `${offset}px` }

  return (
    <div
      className={`
        fixed z-[1002] flex flex-col justify-start items-start
        overflow-hidden rounded-[10px] border-t-[1.25px] border-t-yellow-400
        pb-[32px] px-[20px] pt-[32px] text-white text-sm
        ${className}
      `}
      style={{
        width,
        maxHeight,
        top: '32px',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        ...positionStyle
      }}
    >
      {children}
    </div>
  )
}

export default Panel