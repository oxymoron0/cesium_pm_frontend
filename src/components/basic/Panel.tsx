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
        p-0 pb-1.5 px-5 pt-5 text-white text-sm
        ${className}
      `}
      style={{
        width: '580px',
        height: '480px',
        top: '40px',
        left: '40px',
        backgroundColor: 'rgba(0, 0, 0, 0.65)'
      }}
    >
      {children}
    </div>
  )
}

export default Panel