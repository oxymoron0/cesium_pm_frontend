import React from 'react';
import AirQualitySensor from './AirQualitySensor';
import type { AirQualitySensorData } from '@/utils/api/types';
import { getAirQualityLevel } from '@/utils/airQuality';

interface VOCSensorProps {
  value: number;
}

/**
 * VOCs 센서 컴포넌트
 */
const VOCSensor: React.FC<VOCSensorProps> = ({ value }) => {
  const { level, levelText } = getAirQualityLevel('vocs', value);

  const sensorData: AirQualitySensorData = {
    type: 'vocs',
    value,
    level,
    levelText
  };

  return (
    <AirQualitySensor
      data={sensorData}
      title="VOCs"
    />
  );
};

export default VOCSensor;