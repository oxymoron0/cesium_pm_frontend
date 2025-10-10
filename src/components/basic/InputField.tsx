import Icon from './Icon';

interface InputFieldProps {
  label: string;
  value: string;
  icon?: string;
  readOnly?: boolean;
  onClick?: () => void;
  onChange?: (value: string) => void;
  className?: string;
}

export default function InputField({
  label,
  value,
  icon,
  readOnly = true,
  onClick,
  onChange,
  className = ""
}: InputFieldProps) {
  return (
    <div
      className={`flex items-center gap-[7px] h-8 ${className}`}
      style={{
        fontFamily: 'Pretendard'
      }}
    >
      {/* Label */}
      <div
        style={{
          color: '#FFF',
          fontSize: '14px',
          fontWeight: '700',
          lineHeight: 'normal',
          width: '48px',
          flexShrink: 0
        }}
      >
        {label}
      </div>

      {/* Input Container */}
      <div
        className="flex-1 flex items-center gap-2 px-3 py-1 bg-black rounded border border-[#696A6A] cursor-pointer"
        onClick={onClick}
        style={{
          height: '32px'
        }}
      >
        {icon && <Icon name={icon} className="w-4 h-4" />}
        {readOnly ? (
          <div
            style={{
              color: '#FFF',
              fontSize: '14px',
              fontWeight: '400',
              lineHeight: 'normal'
            }}
          >
            {value}
          </div>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm outline-none"
            style={{
              fontFamily: 'Pretendard',
              fontSize: '14px',
              fontWeight: '400',
              lineHeight: 'normal'
            }}
          />
        )}
      </div>
    </div>
  );
}
