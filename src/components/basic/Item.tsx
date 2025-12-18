interface ItemProps {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'compact';
  onClick?: () => void;
}

export default function Item({ children, className = "", size = 'default', onClick }: ItemProps) {
  const sizeClasses = size === 'compact'
    ? 'h-[48px] px-3 py-2 items-center'
    : 'h-[88px] px-5 py-4 items-start';

  return (
    <div
      className={`flex self-stretch gap-[10px] rounded-lg border border-[#696A6A] bg-black ${sizeClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
