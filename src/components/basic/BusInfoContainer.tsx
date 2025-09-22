import React from 'react';
import Icon from './Icon';

interface BusInfoContainerProps {
  routeName: string;
}

/**
 * 버스 정보 컨테이너 컴포넌트
 * 버스 아이콘과 노선명을 표시하는 작은 컨테이너
 */
const BusInfoContainer: React.FC<BusInfoContainerProps> = ({ routeName }) => {
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    padding: '8px 12px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '34.935px',
    border: '1px solid #C4C6C6',
    background: 'rgba(0, 0, 0, 0.65)'
  };

  const textStyle: React.CSSProperties = {
    color: '#FEFEFE', // 완벽한 흰색이 아닌 미세하게 옅은 흰색
    textAlign: 'center',
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontFamily: 'Pretendard',
    fontSize: '12px',
    fontStyle: 'normal',
    fontWeight: 700,
    lineHeight: 'normal'
  };

  return (
    <div style={containerStyle}>
      <Icon name="bus" className="w-3 h-3" />
      <span style={textStyle}>{routeName}</span>
    </div>
  );
};

export default BusInfoContainer;