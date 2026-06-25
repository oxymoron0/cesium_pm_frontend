import { type ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

interface InfoProps {
  children: ReactNode;
  infoTitle?: ReactNode;
  width?: string;
  tooltipAlign?: 'left' | 'right';
}

export default function Info({ children, infoTitle, width = '340px', tooltipAlign = 'left' }: InfoProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const widthNum = parseInt(width, 10) || 340;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let left: number;
    if (tooltipAlign === 'right') {
      left = rect.right - widthNum;
    } else {
      left = rect.left;
    }

    // 뷰포트 우측 경계 보정
    if (left + widthNum > window.innerWidth - 8) {
      left = window.innerWidth - widthNum - 8;
    }
    // 뷰포트 좌측 경계 보정
    if (left < 8) {
      left = 8;
    }

    setPosition({
      top: rect.bottom + 8,
      left,
    });
  }, [tooltipAlign, widthNum]);

  const handleMouseEnter = useCallback(() => {
    updatePosition();
    setVisible(true);
  }, [updatePosition]);

  const handleMouseLeave = useCallback(() => {
    setVisible(false);
  }, []);

  // 스크롤/리사이즈 시 위치 갱신
  useEffect(() => {
    if (!visible) return;

    const onReposition = () => updatePosition();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);

    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [visible, updatePosition]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <Icon name="info" />
      {visible && createPortal(
        <div className="pm-frontend-scope">
          <div
            className="text-white text-sm whitespace-pre-line text-left font-light"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
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
        </div>,
        document.body
      )}
    </div>
  );
}
