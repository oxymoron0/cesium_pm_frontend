import Item from '../basic/Item';

interface StationProps {
  name: string;
  description: string;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
}

export default function Station({
  name,
  description,
  isBookmarked = false,
  onBookmarkToggle
}: StationProps) {
  const basePath = import.meta.env.DEV ? (import.meta.env.VITE_BASE_PATH || '/') : '/';

  return (
    <Item>
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
        onClick={onBookmarkToggle}
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