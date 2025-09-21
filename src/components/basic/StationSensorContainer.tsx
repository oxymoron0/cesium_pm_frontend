import React from 'react';
import SensorItem from './SensorItem';

interface StationSensorContainerProps {
  pm10Value: number;
  pm25Value: number;
  vocsValue: number;
}

/**
 * 정류장 센서 데이터들을 담는 컨테이너 컴포넌트
 * 3개 센서(미세먼지, 초미세먼지, VOCs)를 가로로 배치
 */
const StationSensorContainer: React.FC<StationSensorContainerProps> = ({
  pm10Value,
  pm25Value,
  vocsValue
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    padding: '8px',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '4px',
    background: 'rgba(30, 30, 30, 0.90)' // 완전한 검은색이 아닌 어두운 회색
  };

  return (
    <div style={containerStyle}>
      <SensorItem
        type="pm10"
        value={pm10Value}
        title="미세먼지"
      />
      <SensorItem
        type="pm25"
        value={pm25Value}
        title="초미세먼지"
      />
      <SensorItem
        type="vocs"
        value={vocsValue}
        title="VOCs"
      />
    </div>
  );
};

export default StationSensorContainer;