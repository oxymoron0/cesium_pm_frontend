import { type ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
}

function Panel({
  children,
  className = ""
}: PanelProps) {
  return (
    <div
      className={`
        fixed z-[1002] flex flex-col justify-start items-start
        overflow-hidden rounded-[10px] border-t-[1.25px] border-t-yellow-400
        pb-[32px] px-[20px] pt-[32px] text-white text-sm
        ${className}
      `}
      style={{
        width: '598px',
        top: '32px',
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.65)'
      }}
    >
      {children}
    </div>
  )
}

export default Panel