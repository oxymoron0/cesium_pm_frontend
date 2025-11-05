import { type ReactNode } from 'react';
import Icon from './Icon';

interface InfoProps {
  children: ReactNode;
  infoTitle?: ReactNode; // ✅ infoTitle 전달 받을 prop 추가
}

export default function Info({ children, infoTitle }: InfoProps) {
  return (
    <div className="relative group">
      <Icon name="info" />
      <div
        className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm whitespace-pre-line text-left font-light"
        style={{
          position: 'fixed',
          display: 'flex',
          width: '340px',
          padding: '16px',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '10px',
          borderRadius: '8px',
          border: '1px solid #C4C6C6',
          background: 'rgba(0, 0, 0, 0.80)',
          zIndex: 9999,
          transform: 'translateY(8px)',
          pointerEvents: 'none'
        }}
      >
        {infoTitle && (
          <div className="w-full font-bold text-lg text-white border-b border-b-[rgba(196,198,198,1)] pb-[5px]">
            {infoTitle}
          </div>
        )}
        <div className="font-normal text-sm text-[#A6A6A6]">
          {children}
        </div>
      </div>
    </div>
  );
}