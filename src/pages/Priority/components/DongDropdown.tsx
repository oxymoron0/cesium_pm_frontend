import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { DongOption } from '@/stores/PriorityStore';

interface DongDropdownProps {
  selectedValue: string;
  options: DongOption[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}

const DongDropdown = observer(function DongDropdown({
  selectedValue,
  options,
  isOpen,
  onToggle,
  onChange
}: DongDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const handleSelect = (value: string) => {
    onChange(value);
    onToggle();
  };

  return (
    <div ref={dropdownRef} className="flex-1 h-8 relative">
      {/* 선택된 값 표시 */}
      <div
        className="h-full bg-black rounded border border-[#696A6A] flex items-center px-3 py-1 cursor-pointer"
        onClick={onToggle}
      >
        <p className="text-white font-pretendard text-[14px] flex-1">
          {selectedValue}
        </p>
        {/* 드롭다운 화살표 */}
        <svg
          width="9"
          height="8"
          viewBox="0 0 9 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            d="M4.5 8L0.602886 0.5L8.39711 0.5L4.5 8Z"
            fill="white"
          />
        </svg>
      </div>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-black border border-[#696A6A] rounded z-50 max-h-[200px] overflow-y-auto"
          style={{
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.4)'
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                option.value === selectedValue
                  ? 'bg-[#696A6A] text-white'
                  : 'text-white hover:bg-[#333333]'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <p className="text-[14px] font-pretendard">
                {option.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default DongDropdown;
