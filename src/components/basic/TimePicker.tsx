import { useEffect, useRef } from 'react';

interface TimePickerProps {
  value: string; // "HH시 ~ HH시" 형식
  onChange: (time: string) => void;
  onClose: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // 현재 선택된 시간 추출
  const getCurrentHour = () => {
    const match = value.match(/(\d+)시/);
    return match ? parseInt(match[1]) : 0;
  };

  const currentHour = getCurrentHour();

  // 시간 리스트 (04시 ~ 23시)
  const hours = Array.from({ length: 20 }, (_, i) => i + 4);

  const handleHourClick = (hour: number) => {
    const nextHour = (hour + 1) % 24;
    const timeStr = `${String(hour).padStart(2, '0')}시 ~ ${String(nextHour).padStart(2, '0')}시`;
    onChange(timeStr);
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 mt-1 bg-[rgba(0,0,0,0.8)] rounded border border-[#C4C6C6]"
      style={{ width: '168px', zIndex: 9999 }}
    >
      {/* 시간 리스트 */}
      <div
        className="flex flex-col overflow-y-auto custom-scrollbar"
        style={{
          maxHeight: '240px'
        }}
      >
        {hours.map((hour) => {
          const nextHour = (hour + 1) % 24;
          const timeStr = `${String(hour).padStart(2, '0')}시 ~ ${String(nextHour).padStart(2, '0')}시`;
          const isSelected = hour === currentHour;

          return (
            <button
              key={hour}
              onClick={() => handleHourClick(hour)}
              className={`flex items-center justify-center px-3 py-2 cursor-pointer ${
                isSelected
                  ? 'bg-[rgba(255,208,64,0.2)]'
                  : 'hover:bg-[rgba(255,255,255,0.1)]'
              }`}
              style={{ minHeight: '36px' }}
            >
              <p
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: isSelected ? '700' : '400',
                  lineHeight: 'normal',
                  color: '#FFFFFF'
                }}
              >
                {timeStr}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
