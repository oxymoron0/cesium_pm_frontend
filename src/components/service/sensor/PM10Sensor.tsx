import React from 'react';
import AirQualitySensor from './AirQualitySensor';
import type { AirQualitySensorData } from '@/utils/api/types';
import { getAirQualityLevel } from '@/utils/airQuality';

interface PM10SensorProps {
  value: number;
}

/**
 * 미세먼지(PM10) 센서 컴포넌트
 */
const PM10Sensor: React.FC<PM10SensorProps> = ({ value }) => {
  const { level, levelText } = getAirQualityLevel('pm10', value);

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