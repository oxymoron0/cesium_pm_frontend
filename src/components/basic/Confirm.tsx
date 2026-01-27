import { type ReactNode } from 'react'

interface ConfirmProps {
  children: ReactNode
  className?: string
  allowOverflow?: boolean
}

function Confirm({
  children,
  className = "",
  allowOverflow = false
}: ConfirmProps) {


  return (
    <div
      className={`
        fixed z-[1200] flex flex-col justify-start items-start
        ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} rounded-[10px] border-t-[1.25px] border-t-yellow-400
        pb-[32px] px-[20px] pt-[32px] text-white text-sm
        ${className}
      `}
      style={{
        width: "100%",
        height: "100%",
        top: "0px",
        backgroundColor: 'rgba(0, 0, 0, 0.54)',
      }}
    >
        <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
        }}>
            <div style={{
                backgroundColor: "rgba(0, 0, 0, 0.65)",
                borderRadius: "8px"
            }} >
            {children}
            </div>
        </div>
    </div>
  )
}

export default Confirm