import Info from './Info';

interface SubTitleProps {
  children: React.ReactNode;
  info?: React.ReactNode;
  infoTitle?: React.ReactNode;
  tooltipAlign?: 'left' | 'right'; // 툴팁 정렬 방향
}

export default function SubTitle({ children, info, infoTitle, tooltipAlign }: SubTitleProps) {
  return (
    <div
      className="flex items-center self-stretch font-pretendard-h2 gap-2"
      style={{
        height: '42px',
        padding: '10px 0'
      }}
    >
      {children}
      {info && <Info infoTitle={infoTitle} tooltipAlign={tooltipAlign}>{info}</Info>}
    </div>
  );
}