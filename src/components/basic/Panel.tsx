import { type ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
  position?: 'left' | 'right' | 'center'
  offset?: number
  width?: string
  maxHeight?: string
  height?: string
  marginHorizontal?: number
  marginVertical?: number
  allowOverflow?: boolean
}

function Panel({
  children,
  className = "",
  position = 'left',
  offset = 20,
  width = '400px',
  maxHeight,
  height,
  marginHorizontal = 70,
  marginVertical = 72,
  allowOverflow = false
}: PanelProps) {
  const getPositionStyle = () => {
    switch (position) {
      case 'left':
        return { left: `${offset}px` }
      case 'right':
        return { right: `${offset}px` }
      case 'center':
        return {
          left: '50%',
          transform: 'translateX(-50%)'
        }
      default:
        return { left: `${offset}px` }
    }
  }

  return (
    <div
      className={`
        fixed z-[1002] flex flex-col justify-start items-start
        ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} rounded-[10px] border-t-[1.25px] border-t-yellow-400
        pb-[32px] px-[20px] pt-[32px] text-white text-sm
        ${className}
      `}
      style={{
        width: position === 'center' ? `calc(100vw - ${marginHorizontal * 2}px)` : width,
        height: position === 'center' ? `calc(100vh - ${marginVertical * 2}px)` : height,
        maxHeight,
        top: position === 'center' ? `${marginVertical}px` : '32px',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        ...getPositionStyle()
      }}
    >
      {children}
    </div>
  )
}

export default Panel