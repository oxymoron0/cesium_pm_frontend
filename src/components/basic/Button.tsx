import { type ReactNode } from "react";
import Icon from "./Icon";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'solid' | 'outline' | 'dark';
  showIcon?: boolean;
  iconName?: string | null;
  iconPos?: 'left' | 'right';
}

export default function Button({
  children,
  onClick,
  className = "",
  variant = 'solid',
  showIcon = true,
  iconName = '',
  iconPos = 'left'
}: ButtonProps) {
  const variantStyles = {
    solid: "bg-[#CFFF40] text-black",
    outline: "bg-transparent border border-[#CFFF40] text-[#CFFF40]",
    dark: "bg-black border border-[#696A6A] text-white"
  };

  return (
    <div
      className={`flex h-10 px-4 py-2.5 justify-center items-center gap-2 self-stretch rounded cursor-pointer ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {showIcon && iconPos === 'left' && <Icon name={iconName ? iconName : "saas"} />}
      <div
        className="text-base font-bold leading-normal text-center"
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
      {showIcon && iconPos === 'right' && <Icon name={iconName ? iconName : "saas"} />}
    </div>
  );
}