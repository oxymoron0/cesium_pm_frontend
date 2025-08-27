interface SubTitleProps {
  children: React.ReactNode;
}

export default function SubTitle({ children }: SubTitleProps) {
  return (
    <div
      className="flex items-center self-stretch font-pretendard-h2"
      style={{
        height: '42px',
        padding: '10px 0'
      }}
    >
      {children}
    </div>
  );
}