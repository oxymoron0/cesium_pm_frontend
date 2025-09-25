import Icon from './Icon';
import Divider from './Divider';
import Info from './Info';

interface TitleProps {
  children: React.ReactNode;
  info?: React.ReactNode;
  onClose?: () => void;
  dividerColor?: string;
}

export default function Title({ children, info, onClose, dividerColor = "bg-[#FFD040]" }: TitleProps) {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center self-stretch justify-between font-pretendard-h1 mb-2">
        {/* 왼쪽: Children + Info 아이콘 */}
        <div className="flex items-center gap-2">
          {children}
          {info && <Info>{info}</Info>}
        </div>

        {/* 오른쪽: Minimize + Close 아이콘 */}
        <div className="flex items-center gap-2">
          <Icon name="minimize" />
          <Icon name="close" onClick={onClose} />
        </div>
      </div>
      
      {/* 하단 Divider */}
      <Divider height="h-px" color={dividerColor} />
    </div>
  );
}