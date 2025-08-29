interface SpacerProps {
  height?: number;
}

export default function Spacer({ height = 8 }: SpacerProps) {
  return <div style={{ height: `${height}px`, flexShrink: 0 }} />;
}