import { observer } from 'mobx-react-lite';
import Item from '@/components/basic/Item';

interface StationCardProps {
  stationId?: string;
  name: string;
  description: string;
  isBookmarked?: boolean;
  isSelected?: boolean;
  onBookmarkToggle?: () => void;
  onSelect?: (stationId: string, stationName: string) => void;
}

function StationCard({
  stationId,
  name,
  description,
  isBookmarked = false,
  isSelected = false,
  onBookmarkToggle,
  onSelect
}: StationCardProps) {
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  const handleCardClick = () => {
    if (stationId && onSelect) {
      onSelect(stationId, name);
    }
  };

  // 텍스트 길이에 따른 동적 폰트 크기 계산
  const getNameFontSize = (text: string) => {
    const length = text.length;
    if (length > 15) return '18px';      // 매우 긴 텍스트
    if (length > 12) return '20px';      // 긴 텍스트
    if (length > 8) return '22px';       // 중간 텍스트
    return '24px';                       // 기본 크기
  };

  const getNameLineHeight = (text: string) => {
    const length = text.length;
    if (length > 15) return '20px';      // 매우 긴 텍스트
    if (length > 12) return '22px';      // 긴 텍스트
    if (length > 8) return '24px';       // 중간 텍스트
    return '24px';                       // 기본 크기
  };

  return (
    <Item 
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-[#FFD040] bg-[#2A2A2A]' : 'hover:bg-[#1A1A1A]'
      }`}
      onClick={handleCardClick}
    >
      <div className="flex flex-col flex-1 gap-2">
        <div
          style={{
            color: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: getNameFontSize(name),
            fontStyle: 'normal',
            fontWeight: '700',
            lineHeight: getNameLineHeight(name),
            wordBreak: 'keep-all',
            overflowWrap: 'break-word'
          }}
        >
          {name}
        </div>
        <div
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: '400',
            lineHeight: '24px'
          }}
        >
          {description}
        </div>
      </div>
      <div
        className="flex items-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onBookmarkToggle?.();
        }}
      >
        <img
          src={`${basePath}icon/bookmark_${isBookmarked ? 'on' : 'off'}.svg`}
          alt={isBookmarked ? 'bookmarked' : 'not bookmarked'}
          className="w-7 h-7"
        />
      </div>
    </Item>
  );
}

const ObservedStationCard = observer(StationCard);
export default ObservedStationCard;