import React from 'react';
import AirQualitySensor from './AirQualitySensor';
import type { AirQualitySensorData } from '@/utils/api/types';

interface VOCSensorProps {
  value: number;
}

/**
 * VOCs 센서 컴포넌트
 * VOCs는 항상 회색으로 표시됩니다.
 */
const VOCSensor: React.FC<VOCSensorProps> = ({ value }) => {
  const sensorData: AirQualitySensorData = {
    type: 'vocs',
    value,
    level: 'normal', // VOCs는 고정값
    levelText: '보통'
  };

  return (
    <AirQualitySensor
      data={sensorData}
      title="VOCs"
    />
  );
};

export default VOCSensor;