import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import SubTitle from '@/components/basic/SubTitle';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import InputField from '@/components/basic/InputField';
import Select from '@/components/basic/Select';
import Info from '@/components/basic/Info';
import Divider from '@/components/basic/Divider';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import type { PriorityConfig as PriorityConfigData } from '../types';

interface PriorityConfigProps {
  onClose?: () => void;
  onCustomConfig?: () => void;
  onSearch?: (config: PriorityConfigData) => void;
}

const PriorityConfig = observer(function PriorityConfig({ onClose, onCustomConfig, onSearch }: PriorityConfigProps) {
  // 현재 날짜와 시간
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}시 ~ ${String(now.getHours() + 1).padStart(2, '0')}시`;
  const currentTimeText = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 상태 관리 - 부산광역시(26) 기본 선택
  const [provinceCode, setProvinceCode] = useState('26');
  const [districtCode, setDistrictCode] = useState('');
  const [neighborhoodCode, setNeighborhoodCode] = useState('');

  // Load provinces on mount
  useEffect(() => {
    if (administrativeStore.provinces.length === 0) {
      administrativeStore.loadProvinces();
    }
  }, []);

  // Auto-select Busan (26) when provinces loaded
  useEffect(() => {
    if (administrativeStore.provinces.length > 0 && !administrativeStore.selectedProvinceCode) {
      administrativeStore.selectProvince('26');
    }
  }, [administrativeStore.provinces.length]);

  // Auto-select first district when loaded
  useEffect(() => {
    if (administrativeStore.districts.length > 0 && !districtCode && provinceCode) {
      const firstDistrict = administrativeStore.districts[0];
      const shortCode = firstDistrict.code.substring(2);
      setDistrictCode(shortCode);
      administrativeStore.selectDistrict(shortCode);
    }
  }, [administrativeStore.districts.length, districtCode, provinceCode]);

  // Auto-select '전체' for neighborhoods
  useEffect(() => {
    if (administrativeStore.neighborhoods.length > 0 && !neighborhoodCode && districtCode) {
      setNeighborhoodCode('all');
    }
  }, [administrativeStore.neighborhoods.length, neighborhoodCode, districtCode]);

  // 옵션 데이터 (Administrative API 기반)
  const cityOptions = administrativeStore.provinces.map(p => ({
    value: p.code,
    label: p.name
  }));

  const districtOptions = administrativeStore.districts.map(d => ({
    value: d.code.substring(2), // Full code to short code (e.g., "26440" → "440")
    label: d.name
  }));

  const dongOptions = [
    { value: 'all', label: '전체' },
    ...administrativeStore.neighborhoods.map(n => ({
      value: n.code.substring(5), // Full code to short code (e.g., "26440101" → "101")
      label: n.name
    }))
  ];

  // Helper functions to get names from codes
  const getProvinceName = (code: string) => {
    const province = administrativeStore.provinces.find(p => p.code === code);
    return province?.name || '';
  };

  const getDistrictName = (shortCode: string) => {
    const district = administrativeStore.districts.find(d => d.code.substring(2) === shortCode);
    return district?.name || '';
  };

  const getNeighborhoodName = (shortCode: string) => {
    if (shortCode === 'all') return '전체';
    const neighborhood = administrativeStore.neighborhoods.find(n => n.code.substring(5) === shortCode);
    return neighborhood?.name || '';
  };

  return (
    <>
      <Title
        info="• 현재 시간 기준, 부산진구 전체의 취약시설 및 살수차 투입 우선순위를 조회할 수 있습니다. 원하는 조건으로 변경하려면 [맞춤설정 조회] 버튼을 눌러주세요."
        onClose={onClose}
      >
        우선순위
      </Title>

      <Spacer height={16} />
      <SubTitle>기본 설정</SubTitle>
      <Divider />

      <Spacer height={16} />

      {/* 현재 시간 */}
      <div
        className="self-stretch"
        style={{
          color: '#A6A6A6',
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: 'normal',
          opacity: 0.8
        }}
      >
        * 현재 시간 : {currentTimeText}
      </div>

      <Spacer height={16} />

      {/* 관찰일시 섹션 */}
      <div className="flex flex-col gap-3 pb-4 border-b border-[#696A6A] self-stretch">
        {/* 관찰일시 제목 */}
        <div className="flex items-center gap-[5px] self-stretch">
          <div
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            관찰일시
          </div>
          <Info>
            시뮬레이션을 실행할 시점을 선택합니다.
            날짜와 시간대를 지정하여 해당 시점의 대기질 상태를 시뮬레이션할 수 있습니다.
          </Info>
        </div>

        {/* 날짜와 시간 입력 */}
        <div className="flex w-full gap-4">
          <InputField
            label="날짜"
            value={dateStr}
            icon="calendar"
            readOnly
            onClick={() => console.log('날짜 선택')}
            className="flex-1"
          />
          <InputField
            label="시간"
            value={timeStr}
            icon="time"
            readOnly
            onClick={() => console.log('시간 선택')}
            className="flex-1"
          />
        </div>
      </div>

      <Spacer height={16} />

      {/* 행정구역 섹션 */}
      <div className="flex flex-col self-stretch gap-4">
        {/* 행정구역 제목 */}
        <div className="flex items-center gap-[5px] self-stretch">
          <div
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            행정구역
          </div>
          <Info>
            <SubTitle>행정구역</SubTitle>
            <Divider height='h-[2px]' />
            우선순위를 조회할 행정구역을 선택합니다.
            시/도, 군/구, 읍/면/동 단위로 지역을 지정할 수 있습니다.
          </Info>
        </div>

        {/* 시/도, 군/구 */}
        <div className="flex w-full gap-4">
          <Select
            label="시/도"
            value={provinceCode}
            options={cityOptions}
            onChange={(code) => {
              setProvinceCode(code);
              setDistrictCode('');
              setNeighborhoodCode('');
              administrativeStore.selectProvince(code);
            }}
            className="flex-1"
            disabled={true}
          />
          <Select
            label="군/구"
            value={districtCode}
            options={districtOptions}
            onChange={(code) => {
              setDistrictCode(code);
              setNeighborhoodCode('');
              administrativeStore.selectDistrict(code);
            }}
            className="flex-1"
            disabled={!provinceCode}
          />
        </div>

        {/* 읍/면/동 */}
        <div className="flex w-full gap-4">
          <Select
            label="읍/면/동"
            value={neighborhoodCode}
            options={dongOptions}
            onChange={(code) => {
              setNeighborhoodCode(code);
              if (code !== 'all') {
                administrativeStore.selectNeighborhood(code);
              }
            }}
            className="flex-1"
            disabled={!districtCode}
          />
          {/* 빈 공간 (레이아웃 정렬을 위한 placeholder) */}
          <div className="flex-1" />
        </div>
      </div>

      <Spacer height={36} />

      {/* 버튼 영역 */}
      <div className="flex flex-col gap-4 pt-9 border-t border-[#696A6A] self-stretch">
        <Button
          variant="outline"
          showIcon={false}
          onClick={() => {
            // Store에 현재 설정 저장 후 맞춤설정 화면으로 이동
            priorityStore.setConfig({
              date: dateStr,
              time: timeStr,
              city: getProvinceName(provinceCode),
              district: getDistrictName(districtCode),
              dong: getNeighborhoodName(neighborhoodCode)
            });
            if (onCustomConfig) {
              onCustomConfig();
            }
          }}
        >
          맞춤설정으로 조회
        </Button>
        <Button
          variant="solid"
          showIcon={false}
          onClick={() => {
            if (onSearch) {
              onSearch({
                date: dateStr,
                time: timeStr,
                city: getProvinceName(provinceCode),
                district: getDistrictName(districtCode),
                dong: getNeighborhoodName(neighborhoodCode)
              });
            }
          }}
        >
          우선순위 조회
        </Button>
      </div>
    </>
  );
});

export default PriorityConfig;
