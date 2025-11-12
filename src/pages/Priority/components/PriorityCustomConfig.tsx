import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import Title from '@/components/basic/Title';
import SubTitle from '@/components/basic/SubTitle';
import Spacer from '@/components/basic/Spacer';
import Select from '@/components/basic/Select';
import Icon from '@/components/basic/Icon';
import Info from '@/components/basic/Info';
import Divider from '@/components/basic/Divider';
import DatePicker from '@/components/basic/DatePicker';
import TimePicker from '@/components/basic/TimePicker';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary, renderMultipleAdministrativeBoundaries, setupAdministrativeBoundaryClickHandler, removeAdministrativeBoundaryClickHandler } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';
import { Cartesian3 } from 'cesium';

interface PriorityCustomConfigProps {
  onBack: () => void;
  onSearch: (config: { date: string; time: string; city: string; district: string }) => void;
  locationMode: 'address' | 'point';
  setLocationMode: (mode: 'address' | 'point') => void;
}

const PriorityCustomConfig = observer(function PriorityCustomConfig({ onBack, onSearch, locationMode, setLocationMode }: PriorityCustomConfigProps) {
  const config = priorityStore.config;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Ensure administrative data is loaded
  useEffect(() => {
    const initAdministrativeData = async () => {
      console.log('[PriorityCustomConfig] Checking administrative data...', {
        provinces: administrativeStore.provinces.length,
        selectedProvince: administrativeStore.selectedProvinceCode,
        selectedDistrict: administrativeStore.selectedDistrictCode,
        neighborhoods: administrativeStore.neighborhoods.length
      });

      // Load provinces if not loaded
      if (administrativeStore.provinces.length === 0) {
        console.log('[PriorityCustomConfig] Loading provinces...');
        await administrativeStore.loadProvinces();
      }

      // Select Busan if not selected
      if (!administrativeStore.selectedProvinceCode) {
        console.log('[PriorityCustomConfig] Selecting Busan...');
        await administrativeStore.selectProvince('26');
      }

      // Select Busanjin-gu if not selected
      if (administrativeStore.selectedProvinceCode && !administrativeStore.selectedDistrictCode && administrativeStore.districts.length > 0) {
        console.log('[PriorityCustomConfig] Selecting Busanjin-gu...');
        await administrativeStore.selectDistrict('230');
      }
    };

    initAdministrativeData();
  }, []);

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
    priorityStore.updateDate(dateStr);
  };

  const handleTimeChange = (time: string) => {
    priorityStore.updateTime(time);
  };

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
      value: n.code.substring(5),
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

  // Render administrative boundary when district or neighborhood changes (주소 조회 모드)
  useEffect(() => {
    // Skip if in point mode
    if (locationMode === 'point') {
      console.log('[PriorityCustomConfig] Skipping address mode rendering (point mode active)');
      return;
    }

    const renderBoundary = async () => {
      console.log('[PriorityCustomConfig] Address mode: rendering boundary');

      // Clear all existing boundaries first (including multiple boundaries from point mode)
      clearAdministrativeBoundary();

      const districtCode = administrativeStore.selectedDistrictCode;
      const neighborhoodCode = administrativeStore.selectedNeighborhoodCode;

      // Skip if no district selected
      if (!districtCode) {
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
          console.error('[PriorityCustomConfig] Failed to render district boundary:', error);
        }
      } else if (neighborhoodCode && neighborhoodCode !== 'all') {
        // Render neighborhood boundary
        try {
          const response = await administrativeStore.loadGeometry(params);
          if (isGeometrySuccess(response)) {
            renderAdministrativeBoundary(response.geom, response.full_name);
          }
        } catch (error) {
          console.error('[PriorityCustomConfig] Failed to render neighborhood boundary:', error);
        }
      }
    };

    renderBoundary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [administrativeStore.selectedDistrictCode, administrativeStore.selectedNeighborhoodCode, locationMode]);


  // Handle click events in point mode
  useEffect(() => {
    if (locationMode !== 'point') {
      // Remove click handler when exiting point mode
      removeAdministrativeBoundaryClickHandler();
      return;
    }

    // Clear selected neighborhood code when entering point mode
    administrativeStore.selectedNeighborhoodCode = null;

    console.log("포인트 선택!!")
    const viewer = window.cviewer;
    if (!viewer) return;

    const renderAllNeighborhoods = async () => {
      // Clear existing boundaries from address mode first
      clearAdministrativeBoundary();

      // 부산진구의 모든 읍면동 경계 표시
      const neighborhoods = administrativeStore.neighborhoods;

      if (neighborhoods.length === 0) {
        console.warn('[PriorityCustomConfig] No neighborhoods loaded, attempting to load...');
        // Try to load neighborhoods if not loaded
        if (administrativeStore.selectedDistrictCode) {
          console.log('[PriorityCustomConfig] Loading neighborhoods for district:', administrativeStore.selectedDistrictCode);
          return; // Will re-trigger when neighborhoods are loaded
        }
        return;
      }

      console.log('[PriorityCustomConfig] Rendering neighborhoods:', neighborhoods.length);

      const boundaries = [];

      // Load geometry for each neighborhood
      for (const neighborhood of neighborhoods) {
        try {
          const response = await administrativeStore.loadGeometry({
            province_code: '26',
            district_code: '230',
            neighborhood_code: neighborhood.code.substring(5)
          });

          if (isGeometrySuccess(response)) {
            boundaries.push({
              geometry: response.geom,
              fullName: neighborhood.name, // 읍면동 이름만 표시
              neighborhoodCode: neighborhood.code.substring(5)
            });
          }
        } catch (error) {
          console.error(`[PriorityCustomConfig] Failed to load ${neighborhood.name}:`, error);
        }
      }

      // Render all boundaries with labels
      if (boundaries.length > 0) {
        renderMultipleAdministrativeBoundaries(boundaries);
        // Setup click handler after rendering
        setupAdministrativeBoundaryClickHandler();
      }

      // Move camera to show entire Busanjin-gu
      try {
        const districtResponse = await administrativeStore.loadGeometry({
          province_code: '26',
          district_code: '230'
        });

        if (isGeometrySuccess(districtResponse)) {
          // Calculate center and fly to it
          const viewer = window.cviewer;
          if (viewer && viewer.camera) {
            const [lng, lat] = calculateCenter(districtResponse.geom);
            const destination = Cartesian3.fromDegrees(lng, lat, 8000); // 8km height for district view
            viewer.camera.flyTo({
              destination: destination,
              duration: 0
            });
          }
        }
      } catch (error) {
        console.error('[PriorityCustomConfig] Failed to move camera:', error);
      }
    };

    renderAllNeighborhoods();

    // Cleanup: remove click handler on unmount or mode change
    return () => {
      removeAdministrativeBoundaryClickHandler();
    };
  }, [locationMode]);

  // Helper to calculate center of MultiPolygon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculateCenter = (geometry: any) => {
    let totalLng = 0;
    let totalLat = 0;
    let totalPoints = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry.coordinates.forEach((polygon: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      polygon[0].forEach((coord: any) => {
        totalLng += coord[0];
        totalLat += coord[1];
        totalPoints++;
      });
    });

    return [totalLng / totalPoints, totalLat / totalPoints];
  };

  return (
    <>
      <Title onBack={onBack}>
        맞춤설정으로 조회
      </Title>

      <Spacer height={16} />

      {/* 캡션 */}
      <div className="self-stretch">
        <p
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: 'normal',
            opacity: 0.8
          }}
        >
          * 원하는 날짜, 시간, 행정구역을 직접 선택하여 취약시설 중심의 살수차 우선 투입 순위를 확인해 보세요.
        </p>
      </div>

      <Spacer height={16} />
      <SubTitle>조건 설정</SubTitle>
      <Divider />

      <Spacer height={16} />

      {/* 관찰일시 섹션 */}
      <div className="flex flex-col gap-3 pb-4 border-b border-[#696A6A] self-stretch" style={{ overflow: 'visible' }}>
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
          <Info infoTitle="관찰일시">
            ※ 관찰일시는 오늘까지의 날짜와 현재 시각 기준 1시간 단위 구간까지만 선택 가능합니다.
            버스 운행시간인 첫차~막차 시간으로 한정됩니다.
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
                    color: config?.date ? '#FFFFFF' : '#A6A6A6'
                  }}
                >
                  {config?.date || '날짜 선택'}
                </p>
              </div>
              {showDatePicker && (
                <DatePicker
                  value={parseDate(config?.date || '')}
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
                    color: config?.time ? '#FFFFFF' : '#A6A6A6'
                  }}
                >
                  {config?.time || '시간 선택'}
                </p>
              </div>
              {showTimePicker && (
                <TimePicker
                  value={config?.time || '00시 ~ 01시'}
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
          <Info infoTitle="행정구역">
            ※ 시범구역 기간동안 부산진구로 한정됩니다. <br />
            주소 조회 : 동 목록 중 선택할 수 있습니다. <br />
            위치 지정 : 지도에서 원하는 동을 직접 선택할 수 있습니다. <br />
          </Info>
        </div>

        {/* 주소 조회 / 위치 지정 토글 버튼 */}
        <div className="flex gap-3 h-10 self-stretch">
          <button
            className={`flex-1 rounded-[19px] flex items-center justify-center px-4 py-[10px] cursor-pointer ${
              locationMode === 'address'
                ? 'bg-gradient-to-b from-[#FDF106] to-[#FFD040]'
                : 'bg-[#696A6A]'
            }`}
            onClick={() => setLocationMode('address')}
          >
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: locationMode === 'address' ? '700' : '400',
                lineHeight: 'normal',
                color: '#000000'
              }}
            >
              주소 조회
            </p>
          </button>
          <button
            className={`flex-1 rounded-[19px] flex items-center justify-center px-4 py-[10px] cursor-pointer ${
              locationMode === 'point'
                ? 'bg-gradient-to-b from-[#FDF106] to-[#FFD040]'
                : 'bg-[#696A6A]'
            }`}
            onClick={() => setLocationMode('point')}
          >
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: locationMode === 'point' ? '700' : '400',
                lineHeight: 'normal',
                color: '#000000'
              }}
            >
              위치 지정
            </p>
          </button>
        </div>

        {/* 행정구역 Select - 주소 조회 모드일 때만 표시 */}
        {locationMode === 'address' && (
        <div className="flex gap-3 items-center self-stretch">
          <div className="flex flex-1 gap-2 h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#FFFFFF'
              }}
            >
              시/도
            </p>
            <Select
              value={administrativeStore.selectedProvinceCode || '26'}
              options={cityOptions}
              onChange={(code) => {
                administrativeStore.selectProvince(code);
                priorityStore.updateCity(getProvinceName());
              }}
              className="flex-1"
              hideLabel
              disabled={true}
            />
          </div>
          <div className="flex flex-1 gap-[7px] h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#FFFFFF'
              }}
            >
              군/구
            </p>
            <Select
              value={administrativeStore.selectedDistrictCode || '230'}
              options={districtOptions}
              onChange={(code) => {
                administrativeStore.selectDistrict(code);
                priorityStore.updateDistrict(getDistrictName());
              }}
              className="flex-1"
              hideLabel
              disabled={true}
            />
          </div>
          <div className="flex gap-[7px] h-8 items-center" style={{ width: '170px' }}>
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#FFFFFF'
              }}
            >
              읍/면/동
            </p>
            <Select
              value={administrativeStore.selectedNeighborhoodCode || 'all'}
              options={dongOptions}
              onChange={(code) => {
                if (code === 'all') {
                  runInAction(() => {
                    administrativeStore.selectedNeighborhoodCode = 'all';
                  });
                } else {
                  administrativeStore.selectNeighborhood(code);
                }
                priorityStore.updateDong(getNeighborhoodName(code));
              }}
              className="flex-1"
              hideLabel
            />
          </div>
        </div>
        )}
      </div>

      <Spacer height={36} />

      {locationMode === 'point' && (
        <div className="font-pretendard font-normal text-[14px] text-[rgba(166,166,166,1)]">
          ※ 우선순위를 조회할 부산진구 동을 지도에서 선택해 주세요.
        </div>
      )}

      {/* 로딩 표시 - 위치 지정 모드에서만 임시사용 */}
      {locationMode === 'point' && administrativeStore.loading && (
        <div className="flex items-center justify-center p-4 bg-[#1A1A1A] rounded-lg">
          <div className="animate-pulse text-white text-sm">
            읍면동 경계를 불러오는 중...
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="flex flex-col pt-9 border-t border-[#696A6A] self-stretch">
        <button
          className={`h-10 rounded flex items-center justify-center px-4 py-[10px] w-full transition-colors ${
            locationMode === 'address' || (locationMode === 'point' && administrativeStore.selectedNeighborhoodCode)
              ? 'bg-[#CFFF40] cursor-pointer'
              : 'bg-[#696A6A] cursor-not-allowed'
          }`}
          disabled={locationMode === 'point' && !administrativeStore.selectedNeighborhoodCode}
          onClick={() => {
            if (!config) return;

            // config 데이터 전달
            onSearch({
              date: config.date,
              time: config.time,
              city: config.city,
              district: config.district
            });
          }}
        >
          <p
            style={{
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal',
              color: '#000000'
            }}
          >
            우선순위 조회
          </p>
        </button>
      </div>
    </>
  );
});

export default PriorityCustomConfig;
