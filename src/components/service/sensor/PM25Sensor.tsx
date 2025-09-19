import React from 'react';
import AirQualitySensor from './AirQualitySensor';
import type { AirQualitySensorData, AirQualityLevel } from '@/utils/api/types';

interface PM25SensorProps {
  value: number;
}

/**
 * PM2.5 값에 따른 공기질 등급 결정
 * 초미세먼지(PM2.5) 기준:
 * - 좋음: 0-15 ㎍/㎥
 * - 보통: 16-35 ㎍/㎥
 * - 나쁨: 36-75 ㎍/㎥
 * - 매우 나쁨: 76 ㎍/㎥ 이상
 */
function getPM25Level(value: number): { level: AirQualityLevel; levelText: string } {
  if (value <= 15) {
    return { level: 'good', levelText: '좋음' };
  } else if (value <= 35) {
    return { level: 'normal', levelText: '보통' };
  } else if (value <= 75) {
    return { level: 'bad', levelText: '나쁨' };
  } else {
    return { level: 'very_bad', levelText: '매우 나쁨' };
  }
}

/**
 * 초미세먼지(PM2.5) 센서 컴포넌트
 */
const PM25Sensor: React.FC<PM25SensorProps> = ({ value }) => {
  const { level, levelText } = getPM25Level(value);

  const sensorData: AirQualitySensorData = {
    type: 'pm25',
    value,
    level,
    levelText
  };

  return (
    <AirQualitySensor
      data={sensorData}
      title="초미세먼지"
    />
  );
};

export default PM25Sensor;