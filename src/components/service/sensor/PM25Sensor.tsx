import React from 'react';
import AirQualitySensor from './AirQualitySensor';
import type { AirQualitySensorData } from '@/utils/api/types';
import { getAirQualityLevel } from '@/utils/airQuality';

interface PM25SensorProps {
  value: number;
}

/**
 * 초미세먼지(PM2.5) 센서 컴포넌트
 */
const PM25Sensor: React.FC<PM25SensorProps> = ({ value }) => {
  const { level, levelText } = getAirQualityLevel('pm25', value);

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