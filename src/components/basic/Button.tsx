import { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  basePath?: string;
}

export default function Button({ children, onClick, className = "", basePath = "" }: ButtonProps) {
  return (
    <div
      className={`flex h-10 px-4 py-2.5 justify-center items-center gap-2 self-stretch rounded bg-[#CFFF40] cursor-pointer ${className}`}
      onClick={onClick}
    >
      <img 
        src={`${basePath}icon/saas.svg`}
        alt="saas icon"
        width="17" 
        height="16"
      />
      <div 
        className="text-base font-bold leading-normal text-center text-black"
        style={{
          fontVariantNumeric: 'lining-nums tabular-nums',
          fontFamily: 'Pretendard',
          fontSize: '16px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: 'normal'
        }}
      >
        {children}
      </div>
    </div>
  );
}