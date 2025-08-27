import Icon from './Icon';

interface TitleProps {
  children: React.ReactNode;
}

export default function Title({ children }: TitleProps) {
  return (
    <div className="flex items-center self-stretch justify-between font-pretendard-h1">
      {/* 왼쪽: Children + Info 아이콘 */}
      <div className="flex items-center gap-2">
        {children}
        <Icon name="info" />
      </div>

      {/* 오른쪽: Minimize + Close 아이콘 */}
      <div className="flex items-center gap-2">
        <Icon name="minimize" />
        <Icon name="close" />
      </div>
    </div>
  );
}