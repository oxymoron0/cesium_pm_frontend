import Info from './Info';

interface SubTitleProps {
  children: React.ReactNode;
  info?: React.ReactNode;
}

export default function SubTitle({ children, info }: SubTitleProps) {
  return (
    <div
      className="flex items-center self-stretch font-pretendard-h2 gap-2"
      style={{
        height: '42px',
        padding: '10px 0'
      }}
    >
      {children}
      {info && <Info>{info}</Info>}
    </div>
  );
}