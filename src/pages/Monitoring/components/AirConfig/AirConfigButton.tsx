import { memo } from 'react';
import { getBasePath } from '@/utils/env';

interface AirConfigButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const basePath = getBasePath();

/**
 * AirConfigButton Component
 * 대기 설정 버튼 컴포넌트
 * 선택 시 배경색 #FFD040, 텍스트/아이콘 #000000으로 변경
 */
const AirConfigButton = memo(function AirConfigButton({
  icon,
  label,
  isActive,
  onClick
}: AirConfigButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1
        w-[72px] h-[72px] rounded-lg
        border-2 border-white
        transition-[background-color] duration-200 ease-out
        ${isActive ? 'bg-[#FFD040]' : 'bg-[#1A1A1A]'}
      `}
    >
      <img
        src={`${basePath}icon/${icon}`}
        alt={label}
        className={`
          w-10 h-10
          transition-[filter] duration-200 ease-out
          ${isActive ? 'invert' : 'invert-0'}
        `}
        style={{ willChange: 'filter' }}
      />
      <span
        className={`
          text-xs font-medium whitespace-nowrap
          transition-[color] duration-200 ease-out
          ${isActive ? 'text-black' : 'text-white'}
        `}
      >
        {label}
      </span>
    </button>
  );
});

export default AirConfigButton;
