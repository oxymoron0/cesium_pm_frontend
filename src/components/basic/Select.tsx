interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  className?: string;
  hideLabel?: boolean;
  disabled?: boolean;
}

export default function Select({
  label,
  value,
  options,
  onChange,
  className = "",
  hideLabel = false,
  disabled = false
}: SelectProps) {
  return (
    <div
      className={`flex items-center gap-[7px] h-8 ${className}`}
      style={{
        fontFamily: 'Pretendard'
      }}
    >
      {/* Label */}
      {!hideLabel && label && (
        <div
          style={{
            color: '#FFF',
            fontSize: '13px',
            fontWeight: '400',
            lineHeight: 'normal',
            width: '48px',
            flexShrink: 0
          }}
        >
          {label}
        </div>
      )}

      {/* Select Container */}
      <div className="flex-1 relative">
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] text-white text-sm outline-none cursor-pointer appearance-none"
          style={{
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: 'normal'
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* 드롭다운 화살표 (선택사항) */}
        <div className="absolute right-3 top-2 transform -translate-y-1/2 pointer-events-none text-white text-xs">
          ▼
        </div>
      </div>
    </div>
  );
}
