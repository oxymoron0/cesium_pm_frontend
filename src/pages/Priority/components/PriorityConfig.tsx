import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import DatePicker from '@/components/basic/DatePicker';
import TimePicker from '@/components/basic/TimePicker';
import Icon from '@/components/basic/Icon';
import Title from '@/components/basic/Title';
import SubTitle from '@/components/basic/SubTitle';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import Select from '@/components/basic/Select';
import Info from '@/components/basic/Info';
import Divider from '@/components/basic/Divider';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';
import type { PriorityConfig as PriorityConfigData } from '../types';

interface PriorityConfigProps {
  onClose?: () => void;
  onCustomConfig?: () => void;
  onSearch?: (config: PriorityConfigData) => void;
}

const PriorityConfig = observer(function PriorityConfig({ onClose, onCustomConfig, onSearch }: PriorityConfigProps) {
  // 현재 날짜와 시간
  const now = new Date();
  const [dateStr, setDateStr] = useState(
    `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  );
  const [timeStr, setTimeStr] = useState(
    `${String(now.getHours()).padStart(2, '0')}시 ~ ${String(now.getHours() + 1).padStart(2, '0')}시`
  );
  const currentTimeText = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // 행정구역 상태는 administrativeStore에서 관리 (PriorityCustomConfig와 공유)
  const provinceCode = administrativeStore.selectedProvinceCode || '26';
  const districtCode = administrativeStore.selectedDistrictCode || '';
  const neighborhoodCode = administrativeStore.selectedNeighborhoodCode || '';

  // Load provinces on mount and cleanup on unmount
  useEffect(() => {
    if (administrativeStore.provinces.length === 0) {
      administrativeStore.loadProvinces();
    }

    // Cleanup: clear boundary when component unmounts
    return () => {
      clearAdministrativeBoundary();
    };
  }, []);

  // Auto-select Busan (26) when provinces loaded and select Busanjin-gu (230)
  useEffect(() => {
    if (administrativeStore.provinces.length > 0 && !administrativeStore.selectedProvinceCode) {
      administrativeStore.selectProvince('26');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [administrativeStore.provinces.length]);

  // Auto-select Busanjin-gu (230) when districts loaded
  useEffect(() => {
    if (administrativeStore.districts.length > 0 && !districtCode && provinceCode) {
      // 부산진구 코드: 230
      administrativeStore.selectDistrict('230');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [administrativeStore.districts.length, districtCode, provinceCode]);

  // Auto-select '전체' for neighborhoods
  useEffect(() => {
    if (administrativeStore.neighborhoods.length > 0 && !neighborhoodCode && districtCode) {
      runInAction(() => {
        administrativeStore.selectedNeighborhoodCode = 'all';
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [administrativeStore.neighborhoods.length, neighborhoodCode, districtCode]);

  // Render administrative boundary when district or neighborhood changes
  useEffect(() => {
    const renderBoundary = async () => {
      // Skip if no district selected
      if (!districtCode) {
        clearAdministrativeBoundary();
        return;
      }

      const params = administrativeStore.currentGeometryParams;
      if (!params) return;

      // If '전체' is selected, render district boundary only
      if (neighborhoodCode === 'all') {
        // Remove neighborhood code from params for district-level rendering
        const districtParams = {
          province_code: params.province_code,
          district_code: params.district_code
        };

        try {
          const response = await administrativeStore.loadGeometry(districtParams);
          if (isGeometrySuccess(response)) {
            renderAdministrativeBoundary(response.geom, response.full_name);
          }
        } catch (error) {
          console.error('[PriorityConfig] Failed to render district boundary:', error);
        }
      } else if (neighborhoodCode && neighborhoodCode !== 'all') {
        // Render neighborhood boundary
        try {
          const response = await administrativeStore.loadGeometry(params);
          if (isGeometrySuccess(response)) {
            renderAdministrativeBoundary(response.geom, response.full_name);
          }
        } catch (error) {
          console.error('[PriorityConfig] Failed to render neighborhood boundary:', error);
        }
      }
    };

    renderBoundary();
  }, [districtCode, neighborhoodCode]);

  // 옵션 데이터 (Administrative API 기반)
  // 시/도는 부산광역시로 고정
  const cityOptions = [
    { value: '26', label: '부산광역시' }
  ];

  // 시군구는 부산진구로 고정
  const districtOptions = [
    { value: '230', label: '부산진구' }
  ];

  const dongOptions = [
    { value: 'all', label: '전체' },
    ...administrativeStore.neighborhoods.map(n => ({
      value: n.code.substring(5), // Full code to short code (e.g., "26440101" → "101")
      label: n.name
    }))
  ];

  // Helper functions to get names from codes
  const getProvinceName = () => {
    return '부산광역시'; // 부산광역시로 고정
  };

  const getDistrictName = () => {
    return '부산진구'; // 부산진구로 고정
  };

  const getNeighborhoodName = (shortCode: string) => {
    if (shortCode === 'all') return '전체';
    const neighborhood = administrativeStore.neighborhoods.find(n => n.code.substring(5) === shortCode);
    return neighborhood?.name || '';
  };

    // config.date 문자열을 Date 객체로 변환
  const parseDate = (dateStr: string): Date => {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  };

  const handleDateChange = (date: Date) => {
    const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    setDateStr(dateStr);
    priorityStore.updateDate(dateStr);
  };

  const handleTimeChange = (time: string) => {
    setTimeStr(time);
    priorityStore.updateTime(time);
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
        <div className="flex w-full gap-3" style={{ overflow: 'visible' }}>
          <div className="flex flex-1 gap-[7px] h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFFFFF',
                width: '48px',
                flexShrink: 0
              }}
            >
              날짜
            </p>
            <div className="flex-1 relative">
              <div
                className="flex items-center gap-1 px-3 py-1 bg-black rounded border border-[#696A6A] cursor-pointer"
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{ height: '32px' }}
              >
                <Icon name="calendar" className="w-4 h-4" />
                <p
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: dateStr ? '#FFFFFF' : '#A6A6A6'
                  }}
                >
                  {dateStr || '날짜 선택'}
                </p>
              </div>
              {showDatePicker && (
                <DatePicker
                  value={parseDate(dateStr || '')}
                  onChange={handleDateChange}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>
          </div>
          <div className="flex flex-1 gap-[7px] h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '13px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFFFFF',
                width: '48px',
                flexShrink: 0
              }}
            >
              시간
            </p>
            <div className="flex-1 relative">
              <div
                className="flex items-center gap-1 px-3 py-1 bg-black rounded border border-[#696A6A] cursor-pointer"
                onClick={() => setShowTimePicker(!showTimePicker)}
                style={{ height: '32px' }}
              >
                <Icon name="time" className="w-4 h-4" />
                <p
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: timeStr ? '#FFFFFF' : '#A6A6A6'
                  }}
                >
                  {timeStr || '시간 선택'}
                </p>
              </div>
              {showTimePicker && (
                <TimePicker
                  value={timeStr || '00시 ~ 01시'}
                  onChange={handleTimeChange}
                  onClose={() => setShowTimePicker(false)}
                />
              )}
            </div>
          </div>
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
              administrativeStore.selectDistrict(code);
            }}
            className="flex-1"
            disabled={true}
          />
        </div>

        {/* 읍/면/동 */}
        <div className="flex w-full gap-4">
          <Select
            label="읍/면/동"
            value={neighborhoodCode}
            options={dongOptions}
            onChange={(code) => {
              if (code === 'all') {
                runInAction(() => {
                  administrativeStore.selectedNeighborhoodCode = 'all';
                });
              } else {
                administrativeStore.selectNeighborhood(code);
              }
            }}
            className="flex-1"
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
              city: getProvinceName(),
              district: getDistrictName(),
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
                city: getProvinceName(),
                district: getDistrictName(),
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
