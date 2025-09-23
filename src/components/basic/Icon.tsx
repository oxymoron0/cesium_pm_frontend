interface IconProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

export default function Icon({ name, className = "", onClick }: IconProps) {
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  const iconElement = (
    <img
      src={`${basePath}icon/${name}.svg`}
      alt={name}
      className={`w-4 h-4 ${className}`}
    />
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="cursor-pointer hover:opacity-70 transition-opacity"
        type="button"
      >
        {iconElement}
      </button>
    );
  }

  return iconElement;
}