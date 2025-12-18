import { getBasePath } from '@/utils/env';

interface IconProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

export default function Icon({ name, className = "", onClick }: IconProps) {
  const basePath = getBasePath();

  const iconElement = (
    <img
      src={`${basePath}icon/${name}.svg`}
      alt={name}
      className={`w-4 h-4 ${className}`}
    />
  );

  if (onClick) {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer hover:opacity-70 transition-opacity"
        style={{ userSelect: 'none' }}
      >
        {iconElement}
      </div>
    );
  }

  return iconElement;
}