import { useState } from 'react';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search...',
  onClear
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.('');
    onClear?.();
  };

  return (
    <div
      className="flex items-start self-stretch justify-between"
      style={{
        height: '48px',
        padding: '12px 16px',
        borderRadius: '6px',
        border: '1px solid #FFF'
      }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none"
        style={{
          color: '#FFF',
          fontVariantNumeric: 'lining-nums tabular-nums',
          fontFamily: 'Pretendard',
          fontSize: '16px',
          fontStyle: 'normal',
          fontWeight: '400',
          lineHeight: '24px'
        }}
      />

      {inputValue && (
        <button
          onClick={handleClear}
          className="flex items-center p-0 ml-2 bg-transparent border-none cursor-pointer"
        >
          <img
            src={`${basePath}icon/clear.svg`}
            alt="clear"
            className="w-6 h-6"
          />
        </button>
      )}
    </div>
  );
}