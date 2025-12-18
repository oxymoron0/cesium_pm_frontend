import { type ReactNode } from 'react';
import Icon from './Icon';

interface InfoProps {
  children: ReactNode;
  infoTitle?: ReactNode; // ✅ infoTitle 전달 받을 prop 추가
  width?: string; // 커스텀 너비
  tooltipAlign?: 'left' | 'right'; // 툴팁 정렬 방향 (left: 아이콘 좌측 정렬, right: 아이콘 우측 정렬)
}

export default function Info({ children, infoTitle, width = '340px', tooltipAlign = 'left' }: InfoProps) {
  // 툴팁 위치 스타일 계산
  const getTooltipPositionStyle = () => {
    if (tooltipAlign === 'right') {
      // 툴팁이 아이콘의 우측 끝에 맞춰 정렬 (좌측으로 펼쳐짐)
      return {
        right: '0',
        transform: 'translateY(8px)'
      };
    }
    // 기본: 툴팁이 아이콘의 좌측 끝에서 시작 (우측으로 펼쳐짐)
    return {
      left: '0',
      transform: 'translateY(8px)'
    };
  };

  return (
    <div className="relative group">
      <Icon name="info" />
      <div
        className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm whitespace-pre-line text-left font-light"
        style={{
          position: 'absolute',
          display: 'flex',
          width: width,
          padding: '16px',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '10px',
          borderRadius: '8px',
          border: '1px solid #C4C6C6',
          background: 'rgba(0, 0, 0, 0.80)',
          zIndex: 9999,
          pointerEvents: 'none',
          ...getTooltipPositionStyle()
        }}
      >
        {infoTitle && (
          <div className="w-full font-bold text-lg text-white border-b border-b-[rgba(196,198,198,1)] pb-[5px]">
            {infoTitle}
          </div>
        )}
        <div className="w-full font-normal text-sm text-[#A6A6A6]">
          {children}
        </div>
      </div>
    </div>
  );
}