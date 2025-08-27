interface TitleProps {
  children: React.ReactNode;
}

export default function Title({ children }: TitleProps) {
  return (
    <div className="text-2xl font-pretendard-title">
      {children}
    </div>
  );
}