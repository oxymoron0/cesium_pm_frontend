import React from 'react';
import { type Simulation } from '@/pages/Simulation/components/SimulationRunningList';

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-4">
    <div style={{ 
      fontFamily: 'Pretendard',
      fontSize: '14px', 
      fontWeight: '400', 
      color: '#A6A6A6',
      lineHeight: 'normal', 
      width: '90px', 
      flexShrink: 0 }}>
        {label}
    </div>
    <div style={{ 
      fontFamily: 'Pretendard',
      lineHeight: 'normal', 
      fontSize: '14px', 
      fontWeight: '400', 
      color: '#FFFFFF' 
      }} 
      className="flex-1">
        {children}
    </div>
  </div>
);

/**
 * 시뮬레이션 상세 정보 패널
 */
const SimulationDetailRow: React.FC<{ sim: Simulation }> = ({ sim }) => {

  // --- 3. formatPollutant 유틸리티 함수 ---
  const formatPollutant = (pm_type: 'pm10' | 'pm25' | 'vocs') => {
    if (pm_type === 'pm10') return '미세먼지(PM-10)';
    if (pm_type === 'pm25') return '초미세먼지(PM-2.5)';
    if (pm_type === 'vocs') return 'VOCs';
    return pm_type;
  };

  return (
    <div className="self-stretch px-6 py-4 rounded-[4px] border border-[#A6A6A6] bg-black">
      <div className="flex flex-col gap-3">
        <DetailItem label="시뮬레이션 제목">
          {sim.simulation_name}
        </DetailItem>
        
        <DetailItem label="오염 물질/농도">
          {formatPollutant(sim.pm_type)} / {sim.concentration ?? 'N/A'}µg/m³
        </DetailItem>
        
        <DetailItem label="발생 고도">
          {sim.height ?? 'N/A'}m
        </DetailItem>
        
        <DetailItem label="발생 위치">
          <div className="flex flex-col">
            <span>(도로명) {sim.road_name ?? 'N/A'}</span>
            <span>(지번) {sim.lot ?? 'N/A'}</span>
          </div>
        </DetailItem>
        
        <DetailItem label="기상 조건">
          (풍향) {sim.weather?.wind_direction_10m ?? 'N/A'}° (풍속) {sim.weather?.wind_speed_10m ?? 'N/A'} m/s
        </DetailItem>
        
        <DetailItem label="공개 설정">
          <div className="flex items-center gap-2">
            <span>{sim.is_private ? '비공개' : '공개'}</span>
            <span className="flex items-center justify-center w-auto h-6 cursor-pointer py-1 px-3 rounded-[4px] text-[#FFD040] border border-[#FFD040] bg-black"
              onClick={() => console.log('수정하기')}>
              수정하기
            </span>
          </div>
        </DetailItem>
      </div>
    </div>
  );
};

export default SimulationDetailRow;