import { observer } from 'mobx-react-lite';
import Item from '@/components/basic/Item';
import { getBasePath, isCivil } from '@/utils/env';

interface StationCardProps {
  stationId?: string;
  name: string;
  description?: string;
  isBookmarked?: boolean;
  isSelected?: boolean;
  onBookmarkToggle?: () => void;
  onSelect?: (stationId: string, stationName: string) => void;
  onDetailClick?: (stationId: string, stationName: string) => void;
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
  const basePath = getBasePath();

  const handleCardClick = () => {
    if (stationId && onSelect) {
      onSelect(stationId, name);
    }
  };

  return (
    <Item
      size="compact"
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-[#FFD040] bg-[#2A2A2A]' : 'hover:bg-[#1A1A1A]'
      }`}
      onClick={handleCardClick}
    >
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div
          className="truncate"
          style={{
            color: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: '18px',
            fontStyle: 'normal',
            fontWeight: '700',
            lineHeight: '24px'
          }}
        >
          {name}
        </div>
        {description && (
          <div
            className="truncate flex-shrink-0"
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
        )}
      </div>
      {!isCivil() && (
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
      )}
    </Item>
  );
}

const ObservedStationCard = observer(StationCard);
export default ObservedStationCard;