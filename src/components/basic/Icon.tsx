interface IconProps {
  name: 'info' | 'minimize' | 'close';
  className?: string;
}

export default function Icon({ name, className = "" }: IconProps) {
  const basePath = import.meta.env.DEV ? (import.meta.env.VITE_BASE_PATH || '/') : '/';
  
  return (
    <img 
      src={`${basePath}icon/${name}.svg`}
      alt={name}
      className={`w-4 h-4 ${className}`}
    />
  );
}