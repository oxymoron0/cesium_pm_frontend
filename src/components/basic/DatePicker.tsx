import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from './Icon';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
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

  // 년도 옵션 (현재 년도 기준 ±5년)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // 월 옵션
  const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 달력 날짜 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const firstDayOfWeek = firstDay.getDay(); // 0 (일) ~ 6 (토)
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();

    const days: Array<{ date: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }> = [];

    // 이전 달의 날짜들
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    // 현재 달의 날짜들
    const today = new Date();
    for (let date = 1; date <= daysInMonth; date++) {
      const isToday = year === today.getFullYear() && month === today.getMonth() && date === today.getDate();
      const isSelected = year === value.getFullYear() && month === value.getMonth() && date === value.getDate();
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected
      });
    }

    // 다음 달의 날짜들 (6주 채우기)
    const remainingDays = 42 - days.length; // 6주 * 7일
    for (let date = 1; date <= remainingDays; date++) {
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    return days;
  }, [year, month, value]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleDateClick = (date: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;

    const newDate = new Date(year, month, date);
    onChange(newDate);
    onClose();
  };

  // 달력을 6주로 분할
  const weeks: typeof calendarDays[] = [];
  for (let i = 0; i < 6; i++) {
    weeks.push(calendarDays.slice(i * 7, (i + 1) * 7));
  }

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 mt-1 bg-[rgba(0,0,0,0.8)] rounded border border-[#C4C6C6]"
      style={{ width: '264px', zIndex: 9999 }}
    >
      {/* 헤더 */}
      <div className="flex items-center px-3 pt-4 pb-2">
        {/* 이전 달 버튼 */}
        <button
          onClick={handlePrevMonth}
          className="p-[5px] rounded-full hover:bg-[rgba(255,255,255,0.1)] cursor-pointer"
        >
          <Icon name="chevron-left" className="w-4 h-4" />
        </button>

        {/* 년/월 선택 */}
        <div className="flex flex-1 gap-2 items-center">
          {/* 년도 선택 */}
          <div className="flex-1 relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full h-8 px-2 py-[6px] bg-black rounded border border-[#696A6A] text-white text-[13px] outline-none cursor-pointer appearance-none"
              style={{ fontFamily: 'Pretendard', fontWeight: '400', lineHeight: 'normal' }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-white text-xs">
              ▼
            </div>
          </div>

          {/* 월 선택 */}
          <div className="relative" style={{ width: '56px' }}>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full h-8 px-2 py-[6px] bg-black rounded border border-[#696A6A] text-white text-[13px] outline-none cursor-pointer appearance-none"
              style={{ fontFamily: 'Pretendard', fontWeight: '400', lineHeight: 'normal' }}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m - 1}>{m}월</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-white text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* 다음 달 버튼 */}
        <button
          onClick={handleNextMonth}
          className="p-[5px] rounded-full hover:bg-[rgba(255,255,255,0.1)] cursor-pointer"
        >
          <Icon name="chevron-right" className="w-4 h-4" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="flex gap-[2px] justify-center w-full">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div
            key={idx}
            className="flex items-center justify-center"
            style={{ width: '36px', height: '36px' }}
          >
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#A6A6A6',
                textAlign: 'center'
              }}
            >
              {day}
            </p>
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="flex flex-col gap-[2px] py-3">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex gap-[2px] justify-center w-full">
            {week.map((day, dayIdx) => {
              const isWeekend = dayIdx === 0 || dayIdx === 6;
              const textColor = !day.isCurrentMonth
                ? '#696A6A'
                : isWeekend && !day.isSelected
                ? '#A6A6A6'
                : '#FFFFFF';

              return (
                <button
                  key={`${weekIdx}-${dayIdx}`}
                  onClick={() => handleDateClick(day.date, day.isCurrentMonth)}
                  className={`flex items-center justify-center rounded cursor-pointer ${
                    day.isSelected
                      ? 'bg-[rgba(255,208,64,0.2)]'
                      : 'hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                  style={{ width: '36px', height: '36px' }}
                  disabled={!day.isCurrentMonth}
                >
                  <p
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: '400',
                      lineHeight: 'normal',
                      color: textColor,
                      textAlign: 'center'
                    }}
                  >
                    {day.date}
                  </p>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
