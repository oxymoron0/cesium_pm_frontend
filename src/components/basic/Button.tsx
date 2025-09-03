import { type ReactNode } from "react";
import Icon from "./Icon";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function Button({ children, onClick, className = "" }: ButtonProps) {
  return (
    <div
      className={`flex h-10 px-4 py-2.5 justify-center items-center gap-2 self-stretch rounded bg-[#CFFF40] cursor-pointer ${className}`}
      onClick={onClick}
    >
      <Icon name="saas" />
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