import React from 'react';
import type { AirQualitySensorProps, AirQualityLevel, AirQualityColor } from '@/utils/api/types';

/**
 * 공기질 센서 값에 따른 색상 반환
 */
function getAirQualityColor(level: AirQualityLevel, sensorType: string): AirQualityColor {
  // VOCs는 항상 회색
  if (sensorType === 'vocs') {
    return '#C8C8C8';
  }

  // 미세먼지, 초미세먼지는 level에 따라 색상 변경
  switch (level) {
    case 'good':
      return '#18A274';
    case 'normal':
      return '#FFD040';
    case 'bad':
      return '#F70';
    case 'very_bad':
      return '#D32F2D';
    default:
      return '#C8C8C8';
  }
}

/**
 * 색상에 따른 텍스트 색상 반환
 */
function getTextColor(backgroundColor: AirQualityColor): string {
  // 빨강, 주황 배경: 흰색 텍스트
  if (backgroundColor === '#D32F2D' || backgroundColor === '#F70') {
    return '#FFF';
  }
  // 노랑, 초록, 회색 배경: 검정 텍스트
  return '#000';
}

/**
 * 공기질 센서 컴포넌트
 */
const AirQualitySensor: React.FC<AirQualitySensorProps> = ({ data, title }) => {
  const backgroundColor = getAirQualityColor(data.level, data.type);
  const textColor = getTextColor(backgroundColor);

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