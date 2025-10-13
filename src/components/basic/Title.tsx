import Icon from './Icon';
import Divider from './Divider';
import Info from './Info';

interface TitleProps {
  children: React.ReactNode;
  info?: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  onBack?: () => void;
  dividerColor?: string;
}

export default function Title({ children, info, onClose, onMinimize, onBack, dividerColor = "bg-[#FFD040]" }: TitleProps) {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center self-stretch justify-between mb-2 font-pretendard-h1">
        {/* 왼쪽: Back button + Children + Info 아이콘 */}
        <div className="flex items-center gap-2">
          {onBack && (
            <Icon
              name="chevron-left"
              className="w-3 h-5 cursor-pointer"
              onClick={onBack}
            />
          )}
          {children}
          {info && <Info>{info}</Info>}
        </div>

        {/* 오른쪽: Minimize + Close 아이콘 */}
        <div className="flex items-center gap-2">
          {onMinimize && <Icon name="minimize" onClick={onMinimize} />}
          <Icon name="close" onClick={onClose} />
        </div>
      </div>
      
      {/* 하단 Divider */}
      <Divider height="h-px" color={dividerColor} />
    </div>
  );
}