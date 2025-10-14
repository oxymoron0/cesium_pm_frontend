interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export default function Checkbox({ checked, onChange, label, className = '' }: CheckboxProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex items-center justify-center cursor-pointer"
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: '1px solid #ADADAD',
          background: checked ? '#CFFF40' : 'transparent'
        }}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="#000"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && (
        <div
          style={{
            fontFamily: 'SUIT',
            fontSize: '12px',
            fontWeight: '400',
            lineHeight: 'normal',
            color: '#A6A6A6'
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
