import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import DongDropdown from './DongDropdown';
import NearbyStationList from './NearbyStationList';
import { priorityStore } from '@/stores/PriorityStore';
import type { PriorityConfig, VulnerableFacility } from '../types';

interface PriorityResultProps {
  config: PriorityConfig;
  onBack: () => void;
  onClose?: () => void;
}

// MockUp 데이터
const mockFacilities: VulnerableFacility[] = [
  {
    id: '1',
    rank: 1,
    name: '백병원',
    address: '부산 부산진구 복지로 75',
    predictedConcentration: 160,
    predictedLevel: 'very-bad'
  },
  {
    id: '2',
    rank: 2,
    name: '당감초등학교',
    address: '부산 부산진구 당감로 22-5',
    predictedConcentration: 135,
    predictedLevel: 'bad'
  },
  {
    id: '3',
    rank: 3,
    name: '초읍초등학교',
    address: '부산 부산진구 성지로 104번길 26',
    predictedConcentration: 58,
    predictedLevel: 'normal'
  },
  {
    id: '4',
    rank: 4,
    name: '부전역',
    address: '부산 부산진구 부전로 181',
    predictedConcentration: 55,
    predictedLevel: 'normal'
  },
  {
    id: '5',
    rank: 5,
    name: '범내골역',
    address: '부산 부산진구 중앙대로 612',
    predictedConcentration: 48,
    predictedLevel: 'normal'
  }
];

// 등급별 스타일
const getLevelStyle = (level: VulnerableFacility['predictedLevel']) => {
  switch (level) {
    case 'very-bad':
      return {
        bg: '#D32F2D',
        textColor: '#FFFFFF',
        text: '매우나쁨'
      };
    case 'bad':
      return {
        bg: '#FF7700',
        textColor: '#FFFFFF',
        text: '나쁨'
      };
    case 'normal':
      return {
        bg: '#FFD040',
        textColor: '#000000',
        text: '보통'
      };
    case 'good':
      return {
        bg: '#00C851',
        textColor: '#FFFFFF',
        text: '좋음'
      };
  }
};

const PriorityResult = observer(function PriorityResult({ config, onBack, onClose }: PriorityResultProps) {
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(new Set());

  // Store에 config 설정
  useEffect(() => {
    priorityStore.setConfig(config);

    return () => {
      priorityStore.closeDropdown();
    };
  }, [config]);

  const toggleFacility = (id: string) => {
    const newSet = new Set(selectedFacilities);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFacilities(newSet);

    // Store의 선택 상태도 업데이트 (주변 정류장 표시용)
    priorityStore.toggleFacilitySelection(id);
  };

  const toggleAll = () => {
    if (selectedFacilities.size === mockFacilities.length) {
      setSelectedFacilities(new Set());
      priorityStore.clearFacilitySelection();
    } else {
      const allIds = mockFacilities.map(f => f.id);
      setSelectedFacilities(new Set(allIds));
      // Store에도 반영
      allIds.forEach(id => {
        if (!priorityStore.isFacilitySelected(id)) {
          priorityStore.toggleFacilitySelection(id);
        }
      });
    }
  };

  return (
    <>
      <Title onBack={onBack} onClose={onClose}>
        우선순위 조회
      </Title>

      <Spacer height={16} />

      {/* 관찰 일시 */}
      <div className="flex gap-2 h-8 items-start self-stretch">
        <div className="flex flex-1 gap-[7px] items-center">
          <p className="text-white font-pretendard text-[14px] font-bold">
            관찰 일시
          </p>
        </div>
        <div className="flex gap-4 w-[360px]">
          {/* 날짜 */}
          <div className="flex flex-1 gap-[7px] items-center">
            <p className="text-white font-pretendard text-[14px] font-bold w-[48px]">
              날짜
            </p>
            <div className="flex-1 h-8 bg-black rounded border border-[#696A6A] flex items-center px-3 py-1">
              <p className="text-[#A6A6A6] font-pretendard text-[14px]">
                {config.date}
              </p>
            </div>
          </div>
          {/* 시간 */}
          <div className="flex flex-1 gap-[7px] items-center">
            <p className="text-white font-pretendard text-[14px] font-bold w-[48px]">
              시간
            </p>
            <div className="flex-1 h-8 bg-black rounded border border-[#696A6A] flex items-center px-3 py-1">
              <p className="text-[#A6A6A6] font-pretendard text-[14px]">
                {config.time}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Spacer height={8} />

      {/* 행정 구역 */}
      <div className="flex h-8 items-center self-stretch">
        <div className="flex flex-1 gap-[10px] items-center">
          <p className="text-white font-pretendard text-[14px] font-bold">
            행정 구역
          </p>
        </div>
        <div className="flex gap-2 w-[360px]">
          {/* 시/구 */}
          <div className="flex-1 h-8 bg-black rounded border border-[#696A6A] flex items-center px-3 py-1">
            <p className="text-[#999999] font-pretendard text-[14px]">
              {config.city} {config.district}
            </p>
          </div>
          {/* 동 드롭다운 */}
          <DongDropdown
            selectedValue={priorityStore.selectedDong}
            options={priorityStore.getDongOptions()}
            isOpen={priorityStore.isDropdownOpen}
            onToggle={() => priorityStore.toggleDropdown()}
            onSelect={(value) => priorityStore.updateDong(value)}
          />
        </div>
      </div>

      <Spacer height={16} />

      {/* 취약시설 섹션 */}
      <div className="flex flex-col items-start self-stretch">
        {/* 제목 */}
        <div className="flex h-[42px] py-[10px] items-center gap-2 self-stretch border-b border-[#C3C3C3]">
          <p className="text-white font-pretendard text-[18px] font-bold">취약시설</p>
        </div>

        {/* 테이블 컨테이너 */}
        <div className="flex gap-2 items-start self-stretch">
          {/* 테이블 */}
          <div
            className="flex-1 custom-scrollbar"
            style={{
              maxHeight: '268px',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            {/* 테이블 헤더 */}
            <div className="flex h-[54px] items-center self-stretch border-b border-white">
              <div className="flex items-center justify-center" style={{ width: '40px', height: '54px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={selectedFacilities.size === mockFacilities.length}
                  onChange={toggleAll}
                />
              </div>
              <div
                className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
                style={{ width: '40px', height: '54px', flexShrink: 0 }}
              >
                우선
                <br />
                순위
              </div>
              <div
                className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
                style={{ width: '100px', height: '54px', flexShrink: 0 }}
              >
                취약시설명
              </div>
              <div
                className="flex flex-1 items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
                style={{ height: '54px' }}
              >
                주소
              </div>
              <div
                className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
                style={{ width: '72px', height: '54px', flexShrink: 0 }}
              >
                예측 농도
              </div>
              <div
                className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
                style={{ width: '80px', height: '54px', flexShrink: 0 }}
              >
                예측 등급
              </div>
            </div>

            {/* 테이블 데이터 */}
            {mockFacilities.map((facility) => {
              const levelStyle = getLevelStyle(facility.predictedLevel);
              return (
                <div
                  key={facility.id}
                  className="flex items-center self-stretch border-b border-[#696A6A]"
                  style={{ minHeight: '40px' }}
                >
                  <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={selectedFacilities.has(facility.id)}
                      onChange={() => toggleFacility(facility.id)}
                    />
                  </div>
                  <div
                    className="flex items-center justify-center text-white font-pretendard text-[16px] text-center"
                    style={{ width: '40px', flexShrink: 0 }}
                  >
                    {facility.rank}
                  </div>
                  <div
                    className="flex items-center justify-center text-white font-pretendard text-[14px] text-center px-2 py-[10px]"
                    style={{ width: '100px', flexShrink: 0 }}
                  >
                    {facility.name}
                  </div>
                  <div
                    className="flex flex-1 items-center justify-center text-white font-pretendard text-[14px] text-center px-2 py-[10px]"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {facility.address}
                  </div>
                  <div
                    className="flex items-center justify-center text-white font-pretendard text-[14px] text-center"
                    style={{ width: '72px', height: '40px', flexShrink: 0 }}
                  >
                    {facility.predictedConcentration} ㎍/㎥
                  </div>
                  <div
                    className="flex items-center justify-center"
                    style={{ width: '80px', height: '40px', flexShrink: 0 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xl font-pretendard text-[12px]"
                      style={{
                        backgroundColor: levelStyle.bg,
                        color: levelStyle.textColor,
                        width: '64px',
                        height: '24px'
                      }}
                    >
                      {levelStyle.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Spacer height={16} />

      {/* 주변 정류장 섹션 */}
      <NearbyStationList stations={priorityStore.selectedStations} />

      <Spacer height={36} />

      {/* 리포트 다운로드 버튼 */}
      <div className="self-stretch">
        <Button
          variant="solid"
          showIcon={true}
          onClick={() => console.log('리포트 다운로드')}
        >
          리포트 다운로드
        </Button>
      </div>
    </>
  );
});

export default PriorityResult;
