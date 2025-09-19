import React from 'react';
import SensorContainer from '../../basic/SensorContainer';
import PM10Sensor from './PM10Sensor';
import PM25Sensor from './PM25Sensor';
import VOCSensor from './VOCSensor';

interface AirQualityDisplayProps {
  pm10Value: number;
  pm25Value: number;
  vocsValue: number;
}

/**
 * 공기질 센서 표시 컴포넌트
 * 미세먼지, 초미세먼지, VOCs 값을 외부에서 전달받아 표시
 */
const AirQualityDisplay: React.FC<AirQualityDisplayProps> = ({
  pm10Value,
  pm25Value,
  vocsValue
}) => {
  return (
    <SensorContainer>
      <PM10Sensor value={pm10Value} />
      <PM25Sensor value={pm25Value} />
      <VOCSensor value={vocsValue} />
    </SensorContainer>
  );
};

export default AirQualityDisplay;