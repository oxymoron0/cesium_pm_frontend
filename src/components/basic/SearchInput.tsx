import Icon from './Icon';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  value = '',
  onChange,
  placeholder = '버스 정류장을 입력하세요.',
  className = ''
}: SearchInputProps) {
  return (
    <div
      className={`flex h-12 px-4 py-3 justify-between items-start self-stretch rounded-md border border-[#C4C6C6] ${className}`}
      style={{
        alignItems: 'flex-start'
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-white placeholder-[#A6A6A6]"
        style={{
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '24px'
        }}
      />
      <Icon name="search" className="w-6 h-6" />
    </div>
  );
}