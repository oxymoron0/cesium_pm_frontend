import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import DongDropdown from './DongDropdown';
import NearbyStationList from './NearbyStationList';
import { renderNearbyStations } from '@/utils/cesium/nearbyStationRenderer';
import { renderVulnerableFacilities, clearVulnerableFacilities } from '@/utils/cesium/nearbyFacilitiesRenderer';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';
import { stationStore } from '@/stores/StationStore';
import { routeStore } from '@/stores/RouteStore';
import type { PriorityConfig, VulnerableFacility, NearbyStation, StationMeasurement } from '../types';
import type { RouteStationFeature } from '@/utils/api/types';

interface PriorityResultProps {
  config: PriorityConfig;
  onBack: () => void;
  onClose?: () => void;
}

interface PriorityResultProps {
  config: PriorityConfig;
  onBack: () => void;
  onClose?: () => void;
}

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

  // priorityStore에서 API로 조회한 취약시설 데이터 사용
  const facilities = priorityStore.vulnerableFacilities;



  useEffect(() => {
    return () => {
      clearVulnerableFacilities();
    };
  }, []);

  // Store에 config 설정
  useEffect(() => {
    const initialize = async () => {
      priorityStore.setConfig(config);

      // 행정구역 데이터 초기화
      if (administrativeStore.provinces.length === 0) {
        await administrativeStore.loadProvinces();
      }
      if (!administrativeStore.selectedProvinceCode) {
        await administrativeStore.selectProvince('26');
      }
      if (!administrativeStore.selectedDistrictCode) {
        await administrativeStore.selectDistrict('230');
      }

      // config.dong 값이 없으면 "전체"로 설정
      if (!config.dong) {
        priorityStore.updateDong('전체');
      }

      // RouteStore와 StationStore 초기화 (주변 정류장 검색을 위해 필요)
      if (routeStore.routeInfoList.length === 0) {
        console.log('[PriorityResult] Initializing RouteStore and StationStore');
        await routeStore.initializeRouteData();

        // 모든 노선에 대해 정류장 데이터 로드
        const routeNames = Array.from(routeStore.routeGeomMap.keys());
        if (routeNames.length > 0) {
          console.log(`[PriorityResult] Loading station data for ${routeNames.length} routes`);
          const stationLoadPromises = routeNames.flatMap(routeName => [
            stationStore.loadStations(routeName, 'inbound'),
            stationStore.loadStations(routeName, 'outbound')
          ]);
          await Promise.all(stationLoadPromises);
          console.log('[PriorityResult] StationStore initialization completed');
        }
      }
    };

    initialize();

    return () => {
      priorityStore.closeDropdown();
      clearAdministrativeBoundary();
      clearVulnerableFacilities();
    };
  }, [config]);

  // 읍면동 드롭다운 선택에 따라 경계 렌더링
  useEffect(() => {
    const renderBoundary = async () => {
      const selectedDong = priorityStore.selectedDong;

      // Clear existing boundary
      clearAdministrativeBoundary();

      if (!administrativeStore.selectedDistrictCode) {
        return;
      }

      // "전체" 선택 시 부산진구 경계 표시
      if (selectedDong === '전체') {
        try {
          const response = await administrativeStore.loadGeometry({
            province_code: '26',
            district_code: '230'
          });

          if (isGeometrySuccess(response)) {
            renderAdministrativeBoundary(response.geom, response.full_name);
          }
        } catch (error) {
          console.error('[PriorityResult] Failed to render district boundary:', error);
        }
      } else {
        // 특정 읍면동 선택 시 해당 경계 표시
        const neighborhood = administrativeStore.neighborhoods.find(n => n.name === selectedDong);
        if (neighborhood) {
          try {
            const response = await administrativeStore.loadGeometry({
              province_code: '26',
              district_code: '230',
              neighborhood_code: neighborhood.code.substring(5)
            });

            if (isGeometrySuccess(response)) {
              renderAdministrativeBoundary(response.geom, response.full_name);
            }
          } catch (error) {
            console.error('[PriorityResult] Failed to render neighborhood boundary:', error);
          }
        }
      }
    };

    renderBoundary();
    // renderVulnerableFacilities(mockFacilities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityStore.selectedDong]);

  // 동이 변경되면 체크박스 선택 상태 초기화
  useEffect(() => {
    setSelectedFacilities(new Set());
    priorityStore.clearFacilitySelection();
  }, [priorityStore.selectedDong]);

  // 필터링된 시설들을 Cesium에 렌더링
  useEffect(() => {
    if (facilities.length > 0) {
      renderVulnerableFacilities(facilities);
    } else {
      clearVulnerableFacilities();
    }
  }, [facilities]);

  // 두 좌표 간 거리 계산 (Haversine formula, 단위: km)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 시설 주변 정류장 데이터 로드
  const loadStationsForFacility = async (facility: VulnerableFacility) => {
    try {
      // 이미 캐시에 있으면 스킵
      if (priorityStore.getNearbyStations(facility.id).length > 0) {
        return;
      }

      const [facilityLng, facilityLat] = facility.geometry.coordinates;

      // StationStore에서 모든 정류장 가져오기
      const allStations: Array<RouteStationFeature & { distance: number }> = [];

      stationStore.stationDataMap.forEach((stationData) => {
        stationData.features.forEach((feature) => {
          const [stationLng, stationLat] = feature.geometry.coordinates;
          const distance = calculateDistance(facilityLat, facilityLng, stationLat, stationLng);

          allStations.push({
            ...feature,
            distance
          });
        });
      });

      // 중복 제거 (같은 station_id)
      const uniqueStations = allStations.reduce((acc, station) => {
        const existing = acc.find(s => s.properties.station_id === station.properties.station_id);
        if (!existing) {
          acc.push(station);
        }
        return acc;
      }, [] as Array<RouteStationFeature & { distance: number }>);

      // 거리 필터링: 3km 이내 정류장만 선택
      const MAX_DISTANCE_KM = 3.0;
      const MAX_STATIONS = 10;

      const nearbyStations = uniqueStations
        .filter(station => station.distance <= MAX_DISTANCE_KM)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_STATIONS);

      if (nearbyStations.length === 0) {
        console.log(`[loadStationsForFacility] No stations found within ${MAX_DISTANCE_KM}km for facility ${facility.id}`);
        return;
      }

      console.log(`[loadStationsForFacility] Found ${nearbyStations.length} stations within ${MAX_DISTANCE_KM}km for facility ${facility.id}`);


      // 각 정류장에 대해 랜덤 센서 데이터 생성
      const stationPromises = nearbyStations.map(async (feature) => {
        return {
          id: `${facility.id}_${feature.properties.station_id}`,
          stationName: feature.properties.station_name,
          stationId: feature.properties.station_id,
          measurements: generateRandomMeasurements(4), // 4개의 랜덤 측정값 생성
          geometry: feature.geometry
        } as NearbyStation;
      });

      const stations = await Promise.all(stationPromises);
      priorityStore.setNearbyStations(facility.id, stations);

    } catch (error) {
      console.error(`[loadStationsForFacility] Failed to load stations for facility ${facility.id}:`, error);
    }
  };

  // PM10 농도에 따른 등급 계산
  const getPM10Level = (concentration: number): 'good' | 'normal' | 'bad' | 'very-bad' => {
    if (concentration <= 30) return 'good';
    if (concentration <= 80) return 'normal';
    if (concentration <= 150) return 'bad';
    return 'very-bad';
  };

  // 랜덤 StationMeasurement 생성
  const generateRandomMeasurements = (count: number = 4): StationMeasurement[] => {
    const measurements: StationMeasurement[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      // 현재 시간에서 i시간 전
      const measurementTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hours = measurementTime.getHours().toString().padStart(2, '0');
      const minutes = measurementTime.getMinutes().toString().padStart(2, '0');

      // 랜덤 농도 생성 (0-200 μg/m³)
      const concentration = Math.floor(Math.random() * 200);
      const level = getPM10Level(concentration);

      measurements.push({
        time: `${hours}:${minutes}`,
        concentration,
        level
      });
    }

    return measurements;
  };

  const toggleFacility = async (id: string) => {
    const newSet = new Set(selectedFacilities);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);

      // 선택된 시설의 주변 정류장 데이터 로드
      const facility = facilities.find(f => f.id === id);
      if (facility) {
        await loadStationsForFacility(facility);
      }
    }
    setSelectedFacilities(newSet);

    // Store의 선택 상태도 업데이트 (주변 정류장 표시용)
    priorityStore.toggleFacilitySelection(id);
    renderNearbyStations(priorityStore.selectedStations);
  };

  const toggleAll = async () => {
    if (selectedFacilities.size === facilities.length) {
      setSelectedFacilities(new Set());
      priorityStore.clearFacilitySelection();
      renderNearbyStations([]);
    } else {
      const allIds = facilities.map(f => f.id);
      setSelectedFacilities(new Set(allIds));

      // 모든 시설에 대해 정류장 데이터 로드 (병렬 처리)
      const loadPromises = facilities.map(facility => loadStationsForFacility(facility));
      await Promise.all(loadPromises);

      // Store에도 반영
      allIds.forEach(id => {
        if (!priorityStore.isFacilitySelected(id)) {
          priorityStore.toggleFacilitySelection(id);
        }
      });

      renderNearbyStations(priorityStore.selectedStations);
    }
  };

  // 읍면동 드롭다운 옵션 생성
  const getDongOptions = () => {
    const options = [{ value: '전체', label: '전체' }];

    if (administrativeStore.neighborhoods.length > 0) {
      const dongOptions = administrativeStore.neighborhoods.map(n => ({
        value: n.name,
        label: n.name
      }));
      options.push(...dongOptions);
    }

    return options;
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
            options={getDongOptions()}
            isOpen={priorityStore.isDropdownOpen}
            onToggle={() => priorityStore.toggleDropdown()}
            onSelect={async (value) => {
              // Store의 selectedDong 업데이트
              priorityStore.updateDong(value);

              // neighborhood_code 결정
              let neighborhoodCode: string | null = null;
              if (value !== '전체') {
                const neighborhood = administrativeStore.neighborhoods.find(n => n.name === value);
                if (neighborhood) {
                  neighborhoodCode = neighborhood.code.substring(5); // Full code to short code
                }
              }

              // API 재호출하여 취약시설 데이터 갱신
              await priorityStore.searchPriorityFacilities(
                administrativeStore.selectedProvinceCode || '26',
                administrativeStore.selectedDistrictCode || '230',
                neighborhoodCode
              );
            }}
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
                  checked={(facilities && selectedFacilities.size === facilities.length)}
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
              {/* <div
                className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
                style={{ width: '72px', height: '54px', flexShrink: 0 }}
              >
                예측 농도
              </div> */}
              <div
                className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
                style={{ width: '80px', height: '54px', flexShrink: 0 }}
              >
                예측 등급
              </div>
            </div>

            {/* 테이블 데이터 */}
            {facilities.map((facility) => {
              const levelStyle = getLevelStyle(facility.predictedLevel);
              const isSelected = selectedFacilities.has(facility.id);

              return (
                <div
                  key={facility.id}
                  className={`flex items-center self-stretch border-b border-[#696A6A] ${
                    isSelected ? 'bg-[rgba(255,208,64,0.2)]' : ''
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ width: '40px', height: '40px', flexShrink: 0 }}
                  >
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={isSelected}
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
                  {/* <div
                    className="flex items-center justify-center text-white font-pretendard text-[14px] text-center"
                    style={{ width: '72px', height: '40px', flexShrink: 0 }}
                  >
                    {facility.predictedConcentration} ㎍/㎥
                  </div> */}
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
