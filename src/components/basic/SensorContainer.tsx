import React from 'react';

interface SensorContainerProps {
  children: React.ReactNode;
}

/**
 * 센서 데이터들을 담는 컨테이너 컴포넌트
 */
const SensorContainer: React.FC<SensorContainerProps> = ({ children }) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    padding: '12px',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    alignSelf: 'stretch',
    borderRadius: '8px',
    border: '1px solid #C4C6C6',
    background: 'rgba(0, 0, 0, 0.80)'
  };

  return (
    <div style={containerStyle}>
      {children}
    </div>
  );
};

export default SensorContainer;