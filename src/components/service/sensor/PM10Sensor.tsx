import React from 'react';
import AirQualitySensor from './AirQualitySensor';
import type { AirQualitySensorData, AirQualityLevel } from '@/utils/api/types';

interface PM10SensorProps {
  value: number;
}

/**
 * PM10 값에 따른 공기질 등급 결정
 * 미세먼지(PM10) 기준:
 * - 좋음: 0-30 ㎍/㎥
 * - 보통: 31-80 ㎍/㎥
 * - 나쁨: 81-150 ㎍/㎥
 * - 매우 나쁨: 151 ㎍/㎥ 이상
 */
function getPM10Level(value: number): { level: AirQualityLevel; levelText: string } {
  if (value <= 30) {
    return { level: 'good', levelText: '좋음' };
  } else if (value <= 80) {
    return { level: 'normal', levelText: '보통' };
  } else if (value <= 150) {
    return { level: 'bad', levelText: '나쁨' };
  } else {
    return { level: 'very_bad', levelText: '매우 나쁨' };
  }
}

/**
 * 미세먼지(PM10) 센서 컴포넌트
 */
const PM10Sensor: React.FC<PM10SensorProps> = ({ value }) => {
  const { level, levelText } = getPM10Level(value);

  const sensorData: AirQualitySensorData = {
    type: 'pm10',
    value,
    level,
    levelText
  };

  return (
    <AirQualitySensor
      data={sensorData}
      title="미세먼지"
    />
  );
};

export default PM10Sensor;