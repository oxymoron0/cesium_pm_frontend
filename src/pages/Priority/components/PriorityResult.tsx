import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import DongDropdown from './DongDropdown';
import NearbyStationList from './NearbyStationList';
import { renderNearbyStations, clearNearStations } from '@/utils/cesium/nearbyStationRenderer';
import { flyToFacility } from '@/utils/cesium/cameraUtils';
import { renderVulnerableFacilities, clearVulnerableFacilities, showFacilityHtmlTags, hideFacilityHtmlTags } from '@/utils/cesium/nearbyFacilitiesRenderer';
import { renderNearbyRoadsForFacility, clearNearbyRoadsForFacility, clearAllNearbyRoads } from '@/utils/cesium/nearbyRoadRenderer';
import { renderNearbyBuildingFacilitiesForFacility, clearNearbyBuildingFacilitiesForFacility, clearAllNearbyBuildingFacilities } from '@/utils/cesium/nearbyBuildingFacilitiesRenderer';
import { preloadSingleJsonFrame } from '@/utils/cesium/jsonPreloader';
import { renderJsonFrame, clearJsonPrimitives } from '@/utils/cesium/jsonRenderer';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';
import type { PriorityConfig, VulnerableFacility } from '../types';
import Info from '@/components/basic/Info';
import { API_PATHS } from '@/utils/api/config';

const basePath = import.meta.env.VITE_BASE_PATH || '/';

interface PriorityResultProps {
  config: PriorityConfig;
  onBack: () => void;
  onClose?: () => void;
}

// 등급별 스타일
const getLevelStyle = (level: VulnerableFacility['predictedLevel']) => {
  switch (level) {
    case 'very-bad':
      return { bg: '#D32F2D', textColor: '#FFFFFF', text: '매우나쁨' };
    case 'bad':
      return { bg: '#FEE046', textColor: '#000000', text: '나쁨' };
    case 'normal':
      return { bg: '#18A274', textColor: '#000000', text: '보통' };
    case 'good':
      return { bg: '#1C67D7', textColor: '#FFFFFF', text: '좋음' };
  }
};

const PriorityResult = observer(function PriorityResult({ config, onBack, onClose }: PriorityResultProps) {
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(new Set());
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [isLoadingSimulation, setIsLoadingSimulation] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  // 중복 제거된 facilities (이제 PriorityStore에서 가져옴)
  const facilities = priorityStore.uniqueVulnerableFacilities;

  // 초기화
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);

      try {
        priorityStore.setConfig(config);

        // 행정구역 초기화
        if (administrativeStore.provinces.length === 0) {
          await administrativeStore.loadProvinces();
        }
        if (!administrativeStore.selectedProvinceCode) {
          await administrativeStore.selectProvince('26');
        }
        if (!administrativeStore.selectedDistrictCode) {
          await administrativeStore.selectDistrict('230');
        }

        // 읍면동 초기값 설정
        const sel = administrativeStore.selectedNeighborhoodCode;
        if (sel === "all") {
          setSelectedNeighborhood("전체");
        } else {
          const found = administrativeStore.neighborhoods.find(n => n.code.slice(-3) === sel);
          if (found) setSelectedNeighborhood(found.name);
        }

        // 취약시설 검색
        const neighborhoodCode = administrativeStore.selectedNeighborhoodCode === 'all'
          ? null
          : administrativeStore.selectedNeighborhoodCode;

        await priorityStore.searchPriorityFacilities(
          administrativeStore.selectedProvinceCode || '26',
          administrativeStore.selectedDistrictCode || '230',
          neighborhoodCode
        );

        // 통합 초기화 (주변 정류장은 취약시설 선택 시 실시간 API로 개별 로드)
        await priorityStore.initializePriorityResultData();

        // 시뮬레이션 결과 렌더링 (초기화 중이므로 별도 로딩 표시 안함)
        if (priorityStore.simulationUuid && priorityStore.simulationGlbCount > 0) {
          await renderSimulationLastFrame(false);
        }
      } catch (error) {
        console.error('[PriorityResult] Initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();

    // Cleanup
    return () => {
      priorityStore.closeDropdown();
      clearAdministrativeBoundary();
      clearVulnerableFacilities();
      clearAllNearbyRoads();
      clearAllNearbyBuildingFacilities();
      clearNearStations();
      hideFacilityHtmlTags();
      clearJsonPrimitives();
    };
  }, [config]);

  // 취약시설 렌더링 (데이터 변경 시)
  useEffect(() => {
    const render = async () => {
      // facilities가 있고, vulnerableFacilitiesApiData가 있을 때만 렌더링 시도
      if (facilities.length > 0 && priorityStore.vulnerableFacilitiesApiData) {
        await clearVulnerableFacilities();
        await renderVulnerableFacilities(facilities, priorityStore.vulnerableFacilitiesApiData);
        showFacilityHtmlTags(facilities);
      } else if (facilities.length > 0 && !priorityStore.vulnerableFacilitiesApiData) {
          // 시설은 있지만 건물 API 데이터가 없을 경우 (빨간 폴리곤, 건물 미표시)
          // HTML 태그만 보여주고 Cesium 렌더링은 대기
          console.warn('[PriorityResult] Facilities data available, but building API data is not yet loaded for Cesium rendering.');
          await clearVulnerableFacilities(); // 기존 Cesium 렌더링 정리
          showFacilityHtmlTags(facilities);
      } else {
        // facilities.length === 0 인 경우
        await clearVulnerableFacilities(); // 기존 Cesium 렌더링 정리
        hideFacilityHtmlTags(); // HTML 태그도 숨김
      }
    };
    render();

    return () => { // Cleanup on unmount or re-run
      hideFacilityHtmlTags(); // Hide HTML tags during cleanup
      clearVulnerableFacilities(); // Cesium 렌더링 정리
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities, priorityStore.vulnerableFacilitiesApiData]);

  // 읍면동 변경 시 경계 렌더링
  useEffect(() => {
    const renderBoundary = async () => {
      clearAdministrativeBoundary();

      if (!administrativeStore.selectedDistrictCode) return;

      try {
        if (selectedNeighborhood === '전체') {
          const response = await administrativeStore.loadGeometry({
            province_code: '26',
            district_code: '230'
          });
          if (isGeometrySuccess(response)) {
            renderAdministrativeBoundary(response.geom, response.full_name);
          }
        } else {
          const neighborhood = administrativeStore.neighborhoods.find(n => n.name === selectedNeighborhood);
          if (neighborhood) {
            const response = await administrativeStore.loadGeometry({
              province_code: '26',
              district_code: '230',
              neighborhood_code: neighborhood.code.substring(5)
            });
            if (isGeometrySuccess(response)) {
              renderAdministrativeBoundary(response.geom, response.full_name);
            }
          }
        }
      } catch (error) {
        console.error('[PriorityResult] Failed to render boundary:', error);
      }
    };

    if (selectedNeighborhood) {
      renderBoundary();
    }
  }, [selectedNeighborhood]);

  // 시뮬레이션 마지막 프레임 렌더링
  const renderSimulationLastFrame = async (showLoading = true) => {
    if (!priorityStore.simulationUuid || priorityStore.simulationGlbCount === 0) {
      return;
    }

    if (showLoading) {
      setIsLoadingSimulation(true);
    }
    try {
      const uuid = priorityStore.simulationUuid;
      const totalFrames = priorityStore.simulationGlbCount;
      const lastFrameIndex = totalFrames - 1;

      await preloadSingleJsonFrame(uuid, lastFrameIndex);
      renderJsonFrame(uuid, lastFrameIndex);
    } catch (error) {
      console.error('[PriorityResult] Failed to render simulation:', error);
    } finally {
      if (showLoading) {
        setIsLoadingSimulation(false);
      }
    }
  };

  // 시설 토글 (id + type으로 unique하게 식별)
  const toggleFacility = async (facilityKey: string) => {
    console.log('[toggleFacility] START - Facility Key:', facilityKey);
    const facility = facilities.find(f => `${f.id}_${f.type}` === facilityKey);
    console.log('[toggleFacility] Facility data:', facility ? { id: facility.id, type: facility.type, name: facility.name, rank: facility.rank } : 'NOT FOUND');

    if (!facility) {
      console.error('[toggleFacility] Facility not found:', facilityKey);
      return;
    }

    const newSet = new Set(selectedFacilities);
    const isDeselecting = newSet.has(facilityKey);

    if (isDeselecting) {
      console.log('[toggleFacility] Deselecting facility:', facilityKey);
      newSet.delete(facilityKey);
      clearNearbyRoadsForFacility(facilityKey);
      clearNearbyBuildingFacilitiesForFacility(facilityKey);
    } else {
      console.log('[toggleFacility] Selecting facility:', facilityKey);
      newSet.add(facilityKey);

      // 선택한 시설로 카메라 이동 (줌인 + 중앙 배치)
      const [longitude, latitude] = facility.geometry.coordinates;
      flyToFacility(longitude, latitude, 300, 1);
    }

    // UI 즉시 업데이트
    setSelectedFacilities(newSet);
    priorityStore.toggleFacilitySelection(facilityKey);

    // 선택 해제 시 조기 종료
    if (isDeselecting) {
      renderNearbyStations(priorityStore.selectedStations);
      console.log('[toggleFacility] END (deselect)');
      return;
    }

    // 도로 데이터 로드 (lazy loading)
    let roadData = priorityStore.getRoadData(facilityKey);
    if (!roadData) {
      const [longitude, latitude] = facility.geometry.coordinates;
      console.log('[toggleFacility] Loading road data for facility:', facilityKey);
      roadData = await priorityStore.loadNearbyRoadsForFacility(facilityKey, longitude, latitude);
    }

    console.log('[toggleFacility] Road data:', roadData ? `${roadData.total} roads` : 'null');
    if (roadData) {
      await renderNearbyRoadsForFacility(facilityKey, roadData);
      const roadNames = new Set<string>();
      roadData.features.forEach(feature => roadNames.add(feature.properties.rn));
      priorityStore.setNearbyRoadNames(facilityKey, roadNames);
      console.log('[toggleFacility] Road names:', Array.from(roadNames));
    }

    // 건물 데이터 로드 (lazy loading)
    let buildingData = priorityStore.getBuildingFacilitiesData(facilityKey);
    if (!buildingData) {
      console.log('[toggleFacility] Loading building data for facility:', facilityKey, facility?.name);
      buildingData = await priorityStore.loadBuildingFacilitiesForFacility(facilityKey);
    }

    console.log('[toggleFacility] Building data:', buildingData ? `${buildingData.total} buildings` : 'null');

    if (buildingData) {
      console.log('[toggleFacility] Rendering buildings for facility:', { key: facilityKey, name: facility?.name, buildingCount: buildingData.total });
      await renderNearbyBuildingFacilitiesForFacility(facilityKey, buildingData);
    }

    // 주변 정류장 데이터 로드 (실시간 API 사용)
    console.log('[toggleFacility] Loading nearby stations for facility:', facilityKey);
    await priorityStore.loadNearbyStationsForFacility(facility);

    console.log('[toggleFacility] Store selected facilities:', priorityStore.selectedFacilityIds.size);
    console.log('[toggleFacility] Selected stations count:', priorityStore.selectedStations.length);

    renderNearbyStations(priorityStore.selectedStations);
    console.log('[toggleFacility] END');
  };

  // 전체 토글
  const toggleAll = async () => {
    if (selectedFacilities.size === facilities.length) {
      setSelectedFacilities(new Set());
      priorityStore.clearFacilitySelection();
      renderNearbyStations([]);
      clearAllNearbyRoads();
      clearAllNearbyBuildingFacilities();
    } else {
      const allKeys = facilities.map(f => `${f.id}_${f.type}`);
      setSelectedFacilities(new Set(allKeys));

      // 순차 처리로 rate limiting 방지
      for (const facility of facilities) {
        const facilityKey = `${facility.id}_${facility.type}`;

        // 도로 데이터 로드 (lazy loading)
        let roadData = priorityStore.getRoadData(facilityKey);
        if (!roadData) {
          const [longitude, latitude] = facility.geometry.coordinates;
          roadData = await priorityStore.loadNearbyRoadsForFacility(facilityKey, longitude, latitude);
        }

        if (roadData) {
          await renderNearbyRoadsForFacility(facilityKey, roadData);
          const roadNames = new Set<string>();
          roadData.features.forEach(feature => roadNames.add(feature.properties.rn));
          priorityStore.setNearbyRoadNames(facilityKey, roadNames);
        }

        // 건물 데이터 로드 (lazy loading)
        let buildingData = priorityStore.getBuildingFacilitiesData(facilityKey);
        if (!buildingData) {
          buildingData = await priorityStore.loadBuildingFacilitiesForFacility(facilityKey);
        }

        if (buildingData) {
          await renderNearbyBuildingFacilitiesForFacility(facilityKey, buildingData);
        }

        // 주변 정류장 데이터 로드 (실시간 API 사용)
        await priorityStore.loadNearbyStationsForFacility(facility);
      }

      facilities.forEach(facility => {
        const facilityKey = `${facility.id}_${facility.type}`;
        if (!priorityStore.isFacilitySelected(facilityKey)) {
          priorityStore.toggleFacilitySelection(facilityKey);
        }
      });

      renderNearbyStations(priorityStore.selectedStations);
    }
  };

  // 리포트 다운로드
  const handleDownloadReport = async () => {
    if (isDownloadingReport || !priorityStore.simulationUuid) {
      return;
    }

    setIsDownloadingReport(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃

      const url = API_PATHS.SIMULATION_VULNERABLE_FACILITIES_BY_UUID_TO_CSV(priorityStore.simulationUuid);
      const response = await fetch(url, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Blob으로 받아서 파일 다운로드
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // 파일명: 우선순위_날짜_시간.csv
      const dateStr = config.date.replace(/\./g, '');
      const timeStr = config.time.split('시')[0].trim().padStart(2, '0');
      link.download = `우선순위_${dateStr}_${timeStr}시.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log('[handleDownloadReport] Report downloaded successfully');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[handleDownloadReport] Download timeout (15s)');
        alert('리포트 다운로드 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        console.error('[handleDownloadReport] Download failed:', error);
        alert('리포트 다운로드에 실패했습니다.');
      }
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // 드롭다운 옵션
  const getDongOptions = () => {
    const options = [{ value: 'all', label: '전체' }];
    if (administrativeStore.neighborhoods.length > 0) {
      const dongOptions = administrativeStore.neighborhoods.map(n => ({
        value: n.code,
        label: n.name
      }));
      options.push(...dongOptions);
    }
    return options;
  };

  // 드롭다운 변경
  const handleDongChange = async (value: string) => {
    clearAllNearbyRoads();
    clearAllNearbyBuildingFacilities();
    clearNearStations();
    hideFacilityHtmlTags();
    clearJsonPrimitives();
    await clearVulnerableFacilities();

    setSelectedFacilities(new Set());
    priorityStore.clearFacilitySelection();

    let neighborhoodCode: string | null = null;
    let selectedName: string = value;

    if (value === "all") {
      neighborhoodCode = null;
      selectedName = "전체";
    } else {
      const neighborhood = administrativeStore.neighborhoods.find((n) => n.code === value);
      if (neighborhood) {
        neighborhoodCode = neighborhood.code.substring(5);
        selectedName = neighborhood.name;
      }
    }

    await priorityStore.searchPriorityFacilities(
      administrativeStore.selectedProvinceCode || '26',
      administrativeStore.selectedDistrictCode || '230',
      neighborhoodCode
    );

    setSelectedNeighborhood(selectedName);

    if (priorityStore.simulationUuid && priorityStore.simulationGlbCount > 0) {
      await renderSimulationLastFrame();
    }
  };

  return (
    <>
      <Title onBack={onBack} onClose={onClose} onMinimize={() => priorityStore.toggleMinimize()}>
        우선순위 조회
      </Title>

      <div style={{ display: priorityStore.isMinimized ? 'none' : 'contents' }}>
        <Spacer height={16} />

        {/* 관찰 일시 */}
        <div className="flex items-start self-stretch h-8 gap-2">
          <div className="flex flex-1 gap-[7px] items-center">
            <p className="text-white font-pretendard text-[14px] font-bold" style={{ marginBottom: '0px'}}>
              관찰 일시
            </p>
          </div>
          <div className="flex gap-4 w-[360px]">
            <div className="flex flex-1 gap-[7px] items-center">
              <p className="text-white font-pretendard text-[14px] font-bold w-[48px]" style={{ marginBottom: '0px' }}>
                날짜
              </p>
              <div className="flex-1 h-8 bg-black rounded border border-[#696A6A] flex items-center px-3 py-1">
                <p className="text-[#A6A6A6] font-pretendard text-[14px]" style={{ marginBottom: '0px' }}>
                  {config.date}
                </p>
              </div>
            </div>
            <div className="flex flex-1 gap-[7px] items-center">
              <p className="text-white font-pretendard text-[14px] font-bold w-[48px]" style={{ marginBottom: '0px' }}>
                시간
              </p>
              <div className="flex-1 h-8 bg-black rounded border border-[#696A6A] flex items-center px-3 py-1">
                <p className="text-[#A6A6A6] font-pretendard text-[14px]" style={{ marginBottom: '0px' }}>
                  {config.time}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Spacer height={8} />

        {/* 행정 구역 */}
        <div className="flex items-center self-stretch h-8">
          <div className="flex flex-1 gap-[10px] items-center">
            <p className="text-white font-pretendard text-[14px] font-bold" style={{ marginBottom: '0px' }}>
              행정 구역
            </p>
          </div>
          <div className="flex gap-2 w-[360px]">
            <div className="flex-1 h-8 bg-black rounded border border-[#696A6A] flex items-center px-3 py-1">
              <p className="text-[#999999] font-pretendard text-[14px]" style={{ marginBottom: '0px' }}>
                {config.city} {config.district}
              </p>
            </div>
            <DongDropdown
              selectedValue={selectedNeighborhood}
              options={getDongOptions()}
              isOpen={priorityStore.isDropdownOpen}
              onToggle={() => priorityStore.toggleDropdown()}
              onChange={handleDongChange}
            />
          </div>
        </div>

        {/* 초기화 로딩 */}
        {isInitializing && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50">
            <div className="px-8 py-6 bg-black/90 text-white rounded-lg border border-[#696A6A] min-w-[320px]">
              <div className="text-lg font-bold mb-4 text-center">데이터 로딩 중...</div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FDF106] to-[#FFD040] animate-pulse"
                     style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        )}

        {/* 시뮬레이션 로딩 */}
        {isLoadingSimulation && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50">
            <div className="px-8 py-6 bg-black/90 text-white rounded-lg border border-[#696A6A] min-w-[320px]">
              <div className="text-lg font-bold mb-4 text-center">시뮬레이션 결과 로딩 중...</div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FDF106] to-[#FFD040] animate-pulse"
                     style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        )}

        <Spacer height={16} />

        {/* 취약시설 섹션 */}
        <div className="flex flex-col items-start self-stretch">
          <div className="flex h-[42px] py-[10px] items-center gap-2 self-stretch border-b border-[#C3C3C3]">
            <p className="text-white font-pretendard text-[18px] font-bold">취약시설</p>
          </div>

          <div className="flex items-start self-stretch gap-2">
            <div className="flex-1 custom-scrollbar" style={{ maxHeight: '268px', overflowY: 'auto', overflowX: 'hidden' }}>
              {/* 테이블 헤더 */}
              <div className="flex h-[54px] items-center self-stretch border-b border-white">
                <div className="flex items-center justify-center" style={{ width: '40px', height: '54px', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={facilities.length > 0 && selectedFacilities.size === facilities.length}
                    onChange={toggleAll}
                  />
                </div>
                <div className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center" style={{ width: '40px', height: '54px', flexShrink: 0 }}>
                  우선<br />순위
                </div>
                <div className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center" style={{ width: '100px', height: '54px', flexShrink: 0 }}>
                  취약시설명
                </div>
                <div className="flex flex-1 items-center justify-center text-white font-pretendard text-[14px] font-bold text-center" style={{ height: '54px' }}>
                  주소
                </div>
                <div className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center" style={{ width: '80px', height: '54px', flexShrink: 0 }}>
                  예측 등급
                </div>
                <Info infoTitle="범례" width="480px">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center w-full">
                      <p className="text-[#A6A6A6] text-[12px] whitespace-nowrap">기준: 매시 정각 업데이트(1시간 단위)</p>
                      <p className="text-[#A6A6A6] text-[12px] whitespace-nowrap">환경부 한국환경공단</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <img src={`${basePath}icon/pm10icon.svg`} alt="PM10" style={{ width: '24px', height: '24px' }} />
                        <p className="text-white text-[16px] font-bold">미세먼지 (PM-10)</p>
                      </div>
                      <p className="text-white text-[14px] leading-relaxed">
                        PM10은 1000분의 10mm보다 작은 먼지이며, 공기 중 고체상태와 액체상태의 입자의 혼합물로 배출됩니다.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex w-full text-[#A6A6A6] text-[12px]">
                        <span className="flex-1">~30</span>
                        <span className="flex-1">~80</span>
                        <span className="flex-1">~150</span>
                        <span className="flex-1">151~</span>
                      </div>
                      <div className="flex w-full h-1 rounded overflow-hidden">
                        <div className="flex-1" style={{ backgroundColor: '#1C67D7' }}></div>
                        <div className="flex-1" style={{ backgroundColor: '#18A274' }}></div>
                        <div className="flex-1" style={{ backgroundColor: '#FEE046' }}></div>
                        <div className="flex-1" style={{ backgroundColor: '#D32F2F' }}></div>
                      </div>
                      <div className="flex w-full text-white text-[12px]">
                        <span className="flex-1 text-center">좋음</span>
                        <span className="flex-1 text-center">보통</span>
                        <span className="flex-1 text-center">나쁨</span>
                        <span className="flex-1 text-center">매우나쁨</span>
                      </div>
                      <p className="text-[#A6A6A6] text-[12px] mt-4 mb-5">
                        실시간 관측치로는, 환경에 따라 오차가 있을 수 있습니다. (단위: μg/m³)
                      </p>
                    </div>
                  </div>
                </Info>
              </div>

              {/* 테이블 데이터 */}
              {facilities.map((facility) => {
                const levelStyle = getLevelStyle(facility.predictedLevel);
                const facilityKey = `${facility.id}_${facility.type}`;
                const isSelected = selectedFacilities.has(facilityKey);

                return (
                  <div
                    key={facilityKey}
                    className={`flex items-center self-stretch border-b border-[#696A6A] ${isSelected ? 'bg-[rgba(255,208,64,0.2)]' : ''}`}
                    style={{ minHeight: '40px' }}
                  >
                    <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                      <input type="checkbox" className="custom-checkbox" checked={isSelected} onChange={() => toggleFacility(facilityKey)} />
                    </div>
                    <div className="flex items-center justify-center text-white font-pretendard text-[16px] text-center" style={{ width: '40px', flexShrink: 0 }}>
                      {facility.rank}
                    </div>
                    <div className="flex items-center justify-center text-white font-pretendard text-[14px] text-center px-2 py-[10px]" style={{ width: '100px', flexShrink: 0 }}>
                      {facility.name}
                    </div>
                    <div className="flex flex-1 items-center justify-center text-white font-pretendard text-[14px] text-center px-2 py-[10px]" style={{ wordBreak: 'keep-all' }}>
                      {facility.address}
                    </div>
                    <div className="flex items-center justify-center" style={{ width: '80px', height: '40px', flexShrink: 0 }}>
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

        {/* 주변 정류장 */}
        <NearbyStationList stations={priorityStore.selectedStations} />

        <Spacer height={36} />

        {/* 리포트 다운로드 */}
        <div className="self-stretch">
          <Button
            variant="solid"
            showIcon={true}
            onClick={handleDownloadReport}
          >
            {isDownloadingReport ? '다운로드 중...' : '리포트 다운로드'}
          </Button>
        </div>

        {/* 다운로드 로딩 바 */}
        {isDownloadingReport && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50">
            <div className="px-8 py-6 bg-black/90 text-white rounded-lg border border-[#696A6A] min-w-[320px]">
              <div className="text-lg font-bold mb-4 text-center">리포트 다운로드 중...</div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FDF106] to-[#FFD040] animate-pulse"
                     style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export default PriorityResult;
