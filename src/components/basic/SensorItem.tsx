import React from 'react';

type SensorType = 'pm10' | 'pm25' | 'vocs';

interface SensorItemProps {
  type: SensorType;
  value: number;
  title: string;
}

/**
 * 센서 값에 따른 색상 결정
 */
function getSensorColor(type: SensorType, value: number): string {
  // VOCs는 항상 회색
  if (type === 'vocs') {
    return '#999';
  }

  // PM10 기준
  if (type === 'pm10') {
    if (value <= 30) return '#18A274';      // 좋음
    if (value <= 80) return '#FFD040';      // 보통
    if (value <= 150) return '#F70';        // 나쁨
    return '#D32F2D';                       // 매우 나쁨
  }

  // PM2.5 기준
  if (type === 'pm25') {
    if (value <= 15) return '#18A274';      // 좋음
    if (value <= 35) return '#FFD040';      // 보통
    if (value <= 75) return '#F70';         // 나쁨
    return '#D32F2D';                       // 매우 나쁨
  }

  return '#999';
}

/**
 * StationSensorContainer 내부에 들어갈 센서 아이템 컴포넌트
 */
const SensorItem: React.FC<SensorItemProps> = ({ type, value, title }) => {
  const color = getSensorColor(type, value);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '60px',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  };

  const titleStyle: React.CSSProperties = {
    color: '#FFF',
    textAlign: 'center',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontSize: '10px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: 'normal'
  };

  const valueStyle: React.CSSProperties = {
    color: color,
    textAlign: 'center',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontSize: '24px',
    fontStyle: 'normal',
    fontWeight: 800,
    lineHeight: 'normal',
    letterSpacing: '-0.8px'
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        {title}
      </div>
      <div style={valueStyle}>
        {value}
      </div>
    </div>
  );
};

export default SensorItem;