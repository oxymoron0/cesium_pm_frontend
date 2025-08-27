interface TitleProps {
  children: React.ReactNode;
}

export default function Title({ children }: TitleProps) {
  return (
    <div 
      className="text-2xl"
      style={{
        fontFamily: 'Pretendard, sans-serif',
        color: 'var(--White, #FFF)',
        fontVariantNumeric: 'lining-nums tabular-nums',
        fontStyle: 'normal',
        lineHeight: 'normal'
      }}
    >
      {children}
    </div>
  );
}