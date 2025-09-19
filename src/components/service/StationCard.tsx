import { observer } from 'mobx-react-lite';
import Item from '@/components/basic/Item';
import { testStore } from '@/stores/TestStore';

interface StationCardProps {
  name: string;
  description: string;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
  onSelect?: (stationName: string) => void;
}

function StationCard({
  name,
  description,
  isBookmarked = false,
  onBookmarkToggle,
  onSelect
}: StationCardProps) {
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  const isSelected = testStore.isSelected(name);

  const handleCardClick = () => {
    testStore.setSelectedStation(name);
    onSelect?.(name);
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
            fontSize: '24px',
            fontStyle: 'normal',
            fontWeight: '700',
            lineHeight: '24px'
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