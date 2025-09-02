import { observer } from 'mobx-react-lite';
import Item from '@/components/basic/Item';
import { routeStore } from '@/stores/RouteStore';

interface RouteCardProps {
  routeNumber: string;
  description: string;
  isExpress?: boolean;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
  onSelect?: (routeNumber: string) => void;
}

export default observer(function RouteCard({
  routeNumber,
  description,
  isExpress = false,
  isBookmarked = false,
  onBookmarkToggle,
  onSelect
}: RouteCardProps) {
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  const isSelected = routeStore.isSelected(routeNumber);

  const handleCardClick = () => {
    routeStore.setSelectedRoute(routeNumber);
    onSelect?.(routeNumber);
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
          className="flex items-center gap-2"
          style={{
            color: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: '24px',
            fontStyle: 'normal',
            fontWeight: '700',
            lineHeight: '24px'
          }}
        >
          <img
            src={`${basePath}icon/${isExpress ? 'express' : 'normal'}.svg`}
            alt={isExpress ? 'express' : 'normal'}
            className="w-9 h-6"
          />
          {routeNumber}
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
});