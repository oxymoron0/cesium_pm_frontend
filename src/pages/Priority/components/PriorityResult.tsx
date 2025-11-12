import { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import DongDropdown from './DongDropdown';
import NearbyStationList from './NearbyStationList';
import { renderNearbyStations } from '@/utils/cesium/nearbyStationRenderer';
import { renderVulnerableFacilities, clearVulnerableFacilities } from '@/utils/cesium/nearbyFacilitiesRenderer';
import { renderPriorityConcentration, clearPriorityConcentration } from '@/utils/cesium/priorityConcentrationRenderer';
import { renderNearbyRoadsForFacility, clearNearbyRoadsForFacility, clearAllNearbyRoads } from '@/utils/cesium/nearbyRoadRenderer';
import { searchNearbyRoads } from '../api/roadSearch';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';
import { stationStore } from '@/stores/StationStore';
import { routeStore } from '@/stores/RouteStore';
import type { PriorityConfig, VulnerableFacility, NearbyStation, StationMeasurement, StationStatisticsResponse } from '../types';
import type { RouteStationFeature } from '@/utils/api/types';
import { API_PATHS } from '@/utils/api/config';

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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('전체');
  const [stationStatisticsData, setStationStatisticsData] = useState<StationStatisticsResponse | null>(null);

  // API에서 가져온 취약시설 데이터 사용 (very-bad, bad 등급만 필터링)
  // observer 컴포넌트는 MobX가 자동으로 추적하므로 useMemo 불필요
  const facilities = priorityStore.vulnerableFacilities.filter(
    facility => facility.predictedLevel === 'very-bad' || facility.predictedLevel === 'bad'
  );

  // facilities의 변경을 안정적으로 추적하기 위한 키
  const facilitiesKey = `${facilities.length}-${facilities.map(f => f.id).join(',')}`;

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

      // 정류장 통계 API 호출 (한 번만 호출하고 캐시)
      try {
        const endDate = new Date(config.date);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7); // 7일 전

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const queryParams = new URLSearchParams({
          start_date: startDateStr,
          end_date: endDateStr,
          limit: '100',
          sort_by: 'pm10'
        });

        console.log('[PriorityResult] Fetching station statistics API...');
        const response = await fetch(`${API_PATHS.STATION_STATISTICS}?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const apiData: StationStatisticsResponse = await response.json();
        setStationStatisticsData(apiData);
        console.log(`[PriorityResult] Station statistics API loaded: ${apiData.stations.length} stations`);
      } catch (error) {
        console.error('[PriorityResult] Failed to load station statistics:', error);
      }
    };

    initialize();

    return () => {
      priorityStore.closeDropdown();
      clearAdministrativeBoundary();
      clearVulnerableFacilities();
      clearPriorityConcentration();
      clearAllNearbyRoads();
    };
  }, [config]);

  // 읍면동 드롭다운 선택에 따라 경계 렌더링
  useEffect(() => {
    const renderBoundary = async () => {
      // Clear existing boundary
      clearAdministrativeBoundary();

      if (!administrativeStore.selectedDistrictCode) {
        return;
      }

      // "전체" 선택 시 부산진구 경계 표시
      if (selectedNeighborhood === '전체') {
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
        const neighborhood = administrativeStore.neighborhoods.find(n => n.name === selectedNeighborhood);
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
  }, [selectedNeighborhood]);

  // 시설 데이터가 변경되면 체크박스 선택 상태 초기화
  useEffect(() => {
    setSelectedFacilities(new Set());
    priorityStore.clearFacilitySelection();
  }, [facilitiesKey]);

  // 필터링된 시설들을 Cesium에 렌더링
  useEffect(() => {
    if (facilities.length > 0) {
      renderVulnerableFacilities(facilities);
    }
    // cleanup은 컴포넌트 unmount 시에만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilitiesKey, selectedNeighborhood]);

  // 농도 분포 heatmap 렌더링
  useEffect(() => {
    if (facilities.length > 0) {
      const concentrationPoints = facilities.map(facility => ({
        longitude: facility.geometry.coordinates[0],
        latitude: facility.geometry.coordinates[1],
        concentration: facility.predictedConcentration
      }));
      renderPriorityConcentration(concentrationPoints);
    }
    // cleanup은 컴포넌트 unmount 시에만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilitiesKey]);

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
  const loadStationsForFacility = useCallback(async (facility: VulnerableFacility) => {
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

      // 캐시된 API 데이터가 없으면 리턴
      if (!stationStatisticsData) {
        console.log('[loadStationsForFacility] Station statistics data not loaded yet');
        return;
      }

      // nearbyStations에 있는 station_id만 필터링
      const nearbyStationIds = new Set(nearbyStations.map(s => s.properties.station_id));
      const filteredApiStations = stationStatisticsData.stations.filter(apiStation =>
        nearbyStationIds.has(apiStation.station_id)
      );

      console.log(`[loadStationsForFacility] Filtered to ${filteredApiStations.length} nearby stations with data`);

      // 각 정류장에 대해 API 데이터 사용하여 NearbyStation 생성
      // max_pm10 값이 있고, 등급이 bad 또는 very-bad인 것만 필터링
      const validStations = nearbyStations
        .map((feature) => {
          const apiStation = filteredApiStations.find(s => s.station_id === feature.properties.station_id);

          // API 데이터가 없거나 max_pm10 값이 없으면 제외
          if (!apiStation || !apiStation.max_pm10) {
            console.log(`[loadStationsForFacility] No max_pm10 data for station ${feature.properties.station_id}`);
            return null;
          }

          const level = getPM10Level(apiStation.max_pm10);

          // 등급이 bad 또는 very-bad가 아니면 제외
          if (level !== 'bad' && level !== 'very-bad') {
            console.log(`[loadStationsForFacility] Station ${feature.properties.station_id} has level ${level}, excluding`);
            return null;
          }

          const recordedTime = new Date(apiStation.max_pm10_recorded_at);
          const hours = recordedTime.getHours().toString().padStart(2, '0');
          const minutes = recordedTime.getMinutes().toString().padStart(2, '0');

          const measurements: StationMeasurement[] = [{
            time: `${hours}:${minutes}`,
            concentration: Math.round(apiStation.max_pm10),
            level
          }];

          return {
            id: `${feature.properties.station_id}`,
            stationName: feature.properties.station_name,
            stationId: feature.properties.station_id,
            measurements,
            geometry: feature.geometry
          } as NearbyStation;
        })
        .filter((station): station is NearbyStation => station !== null);

      console.log(`[loadStationsForFacility] Final stations with bad/very-bad levels: ${validStations.length}`);
      priorityStore.setNearbyStations(facility.id, validStations);

    } catch (error) {
      console.error(`[loadStationsForFacility] Failed to load stations for facility ${facility.id}:`, error);
    }
  }, [
      priorityStore,
      stationStore,
      calculateDistance,
      stationStatisticsData
  ]);

  // PM10 농도에 따른 등급 계산
  const getPM10Level = (concentration: number): 'good' | 'normal' | 'bad' | 'very-bad' => {
    if (concentration <= 30) return 'good';
    if (concentration <= 80) return 'normal';
    if (concentration <= 150) return 'bad';
    return 'very-bad';
  };

  const toggleFacility = async (id: string) => {
    const newSet = new Set(selectedFacilities);
    const facility = facilities.find(f => f.id === id);

    if (newSet.has(id)) {
      // 선택 해제
      newSet.delete(id);

      // 해당 시설의 도로 렌더링 제거
      clearNearbyRoadsForFacility(id);
    } else {
      // 선택 추가
      newSet.add(id);

      if (facility) {
        // 선택된 시설의 주변 정류장 데이터 로드
        await loadStationsForFacility(facility);

        // 선택된 시설의 주변 도로 검색 및 렌더링
        try {
          const [longitude, latitude] = facility.geometry.coordinates;
          console.log(`[toggleFacility] Searching roads near facility ${id} at (${longitude}, ${latitude})`);

          const roadData = await searchNearbyRoads(longitude, latitude);
          await renderNearbyRoadsForFacility(id, roadData);

          console.log(`[toggleFacility] Rendered ${roadData.total} road segments for facility ${id}`);
        } catch (error) {
          console.error(`[toggleFacility] Failed to search/render roads for facility ${id}:`, error);
        }
      }
    }
    setSelectedFacilities(newSet);

    // Store의 선택 상태도 업데이트 (주변 정류장 표시용)
    priorityStore.toggleFacilitySelection(id);
    renderNearbyStations(priorityStore.selectedStations);
  };

  const toggleAll = async () => {
    if (selectedFacilities.size === facilities.length) {
      // 전체 해제
      setSelectedFacilities(new Set());
      priorityStore.clearFacilitySelection();
      renderNearbyStations([]);
      clearAllNearbyRoads();
    } else {
      // 전체 선택
      const allIds = facilities.map(f => f.id);
      setSelectedFacilities(new Set(allIds));

      // 모든 시설에 대해 정류장 데이터 로드 (병렬 처리)
      const stationLoadPromises = facilities.map(facility => loadStationsForFacility(facility));
      await Promise.all(stationLoadPromises);

      // 모든 시설에 대해 도로 검색 및 렌더링 (병렬 처리)
      const roadSearchPromises = facilities.map(async (facility) => {
        try {
          const [longitude, latitude] = facility.geometry.coordinates;
          const roadData = await searchNearbyRoads(longitude, latitude);
          await renderNearbyRoadsForFacility(facility.id, roadData);
          console.log(`[toggleAll] Rendered ${roadData.total} roads for facility ${facility.id}`);
        } catch (error) {
          console.error(`[toggleAll] Failed to search/render roads for facility ${facility.id}:`, error);
        }
      });
      await Promise.all(roadSearchPromises);

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
            selectedValue={selectedNeighborhood}
            options={getDongOptions()}
            isOpen={priorityStore.isDropdownOpen}
            onToggle={() => priorityStore.toggleDropdown()}
            onSelect={async (value) => {
              // 기존 렌더링 클리어
              clearVulnerableFacilities();
              clearPriorityConcentration();
              clearAllNearbyRoads();
              renderNearbyStations([]);

              // 선택 상태 초기화
              setSelectedFacilities(new Set());
              priorityStore.clearFacilitySelection();

              // 로컬 상태 업데이트
              setSelectedNeighborhood(value);

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
