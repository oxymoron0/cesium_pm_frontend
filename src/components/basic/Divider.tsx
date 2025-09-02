interface DividerProps {
  className?: string;
  height?: string;
  color?: string;
}

export default function Divider({ 
  className = "",
  height = "h-px",
  color = "bg-[#696A6A]"
}: DividerProps) {
  return (
    <div
      className={`${height} self-stretch ${color} ${className}`}
    />
  );
}