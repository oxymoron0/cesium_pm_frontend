interface IconProps {
  name: 'info' | 'minimize' | 'close';
  className?: string;
}

export default function Icon({ name, className = "" }: IconProps) {
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  const iconPath = `${basePath}icon/${name}.svg`;
  
  console.log('Icon loading path:', iconPath);
  
  return (
    <img 
      src={iconPath}
      alt={name}
      className={`w-4 h-4 ${className}`}
    />
  );
}