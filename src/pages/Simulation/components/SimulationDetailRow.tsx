import React, { useEffect, useState } from 'react';
import type { SimulationListItem, PMType } from '@/types/simulation_request_types';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import { userStore } from '@/stores/UserStore';

/**
 * 상세 정보 항목 렌더링 컴포넌트
 */ 
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
const SimulationDetailRow: React.FC<{ sim: SimulationListItem }> = ({ sim }) => {
  const [isPrivateSelected, setIsPrivateSelected] = useState<boolean>(sim.is_private);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setIsPrivateSelected(sim.is_private);
  }, [sim.is_private]);

  // formatPollutant 유틸리티 함수
  const formatPollutant = (pm_type: PMType) => {
    if (pm_type === 'pm10') return '미세먼지(PM-10)';
    if (pm_type === 'pm25') return '초미세먼지(PM-2.5)';
    return pm_type;
  };

  // Select 값 변경 핸들러
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setIsPrivateSelected(event.target.value === 'true');
  };

  // 저장 버튼 핸들러
  const handleSavePrivacy = async () => {
    // 이미 저장 중이면 중복 실행 방지
    if (isSaving) return; 
    // 값 동일하면 실행 방지
    if (isPrivateSelected === sim.is_private) return;

    setIsSaving(true);
    try {
      // 스토어 액션 호출
      await simulationStore.updateSimulationPrivacy(sim.uuid, isPrivateSelected);
      console.log(`[DetailRow] Privacy updated for ${sim.uuid}`);
    } catch (error) {
      console.error("Failed to save privacy setting", error);
      // 실패 시 private 상태 복구
      setIsPrivateSelected(sim.is_private); 
    } finally {
      setIsSaving(false);
    }
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
          {sim.user_id === userStore.currentUser ? (
            <div className="flex items-center gap-2">
              <select
                value={String(isPrivateSelected)}
                onChange={handleSelectChange}
                className="h-7 pl-3 pr-6 bg-black rounded border border-[#696A6A] appearance-none cursor-pointer"
                style={{
                  fontFamily: 'Pretendard',
                  lineHeight: 'normal',
                  fontSize: '14px',
                  fontWeight: '400',
                  color: '#FFFFFF',
                }}
              >
                <option value="false">공개</option>
                <option value="true">비공개</option>
              </select>
              <div className="absolute left-51">
                <Icon name="dropmenubtn" className="w-4 h-4" />
              </div>
              <span className="flex items-center justify-center w-auto h-7 cursor-pointer py-1 px-3 rounded-[4px] border border-[#FFD040] font-bold"
                style={isPrivateSelected === sim.is_private ? {backgroundColor:'black', color:'#FFD040'} : {backgroundColor:'#FFD040', color:'black'}}
                onClick={handleSavePrivacy}>
                저장하기
              </span>
            </div>
          ) : (
            <span>{sim.is_private ? '비공개' : '공개'}</span>
          )}
        </DetailItem>
      </div>
    </div>
  );
};

export default SimulationDetailRow;