import React from 'react';
import type { AirQualitySensorProps } from '@/utils/api/types';
import { getAirQualityLevel } from '@/utils/airQuality';

/**
 * 공기질 센서 컴포넌트
 */
const AirQualitySensor: React.FC<AirQualitySensorProps> = ({ data, title }) => {
  const { color: backgroundColor, textColor } = getAirQualityLevel(data.type, data.value);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    minWidth: '64px',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  };

  const titleStyle: React.CSSProperties = {
    color: '#FFF',
    textAlign: 'center',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontSize: '14px',
    fontStyle: 'normal',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.6px',
    whiteSpace: 'nowrap'
  };

  const circleStyle: React.CSSProperties = {
    display: 'flex',
    width: '56px',
    height: '56px',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '36px',
    background: backgroundColor
  };

  const valueStyle: React.CSSProperties = {
    color: textColor,
    textAlign: 'center',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontSize: '20px',
    fontStyle: 'normal',
    fontWeight: 600,
    lineHeight: 1,
    marginBottom: '2px'
  };

  const levelStyle: React.CSSProperties = {
    color: textColor,
    textAlign: 'center',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontSize: '10px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: 1
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        {title}
      </div>
      <div style={circleStyle}>
        <div style={valueStyle}>
          {data.value}
        </div>
        <div style={levelStyle}>
          {data.levelText}
        </div>
      </div>
    </div>
  );
};

export default AirQualitySensor;