import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import DongDropdown from './DongDropdown';
import NearbyStationList from './NearbyStationList';
import { renderNearbyStations, clearNearStations } from '@/utils/cesium/nearbyStationRenderer';
import { renderVulnerableFacilities, clearVulnerableFacilities, showFacilityHtmlTags, hideFacilityHtmlTags } from '@/utils/cesium/nearbyFacilitiesRenderer';
// import { renderPriorityConcentration, clearPriorityConcentration } from '@/utils/cesium/priorityConcentrationRenderer';
import { renderNearbyRoadsForFacility, clearNearbyRoadsForFacility, clearAllNearbyRoads } from '@/utils/cesium/nearbyRoadRenderer';
import { renderNearbyBuildingFacilitiesForFacility, clearNearbyBuildingFacilitiesForFacility, clearAllNearbyBuildingFacilities } from '@/utils/cesium/nearbyBuildingFacilitiesRenderer';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';
import { stationStore } from '@/stores/StationStore';
import { routeStore } from '@/stores/RouteStore';
import type { PriorityConfig, VulnerableFacility } from '../types';
import type { RouteStationFeature } from '@/utils/api/types';
import { Matrix4, Model } from 'cesium';

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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [selectDropdownValue, setSelectDropdownValue] = useState<string>('');
  const [isRenderingFacilities, setIsRenderingFacilities] = useState(false);

  // ------------------------------glb 테스트 로직 ------------------------
  let glbModel: Model | null = null;
  const glbTest = async () => {
    const viewer = window.cviewer;
    const url = 'results/aabc67b9-1ff3-40b1-92c4-1a32676565eb/Finedust_0001.glb';

    // 이미 켜져 있으면 → 제거 후 종료
    if (glbModel) {
      viewer!.scene.primitives.remove(glbModel);
      console.log("[GLB] 제거됨");
      glbModel = null;
      return;
    }

    // 축 재조립 행렬
    const axisSwapMatrix = new Matrix4(
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1
    );

    // 생성
    const model = await Model.fromGltfAsync({
      url,
      modelMatrix: axisSwapMatrix,
    });

    viewer!.scene.primitives.add(model);
    glbModel = model;

    console.log("[GLB] 생성됨 / 토글 ON");
  };
  // ------------------------------glb 테스트 로직 ------------------------

  // API에서 가져온 취약시설 데이터 사용 (very-bad, bad 등급만 필터링)
  // observer 컴포넌트는 MobX가 자동으로 추적하므로 useMemo 불필요
  const facilities = priorityStore.vulnerableFacilities.filter(
    facility => facility.predictedLevel === 'very-bad' || facility.predictedLevel === 'bad'
  );

  // facilities의 변경을 안정적으로 추적하기 위한 키
  const facilitiesKey = `${facilities.length}-${facilities.map(f => f.id).join(',')}`;

  console.log('[PriorityResult] Render - facilities count:', facilities.length);

  // 최초 마운트시 행정구역 읍/면/동 설정값 세팅
  useEffect(() => {
    const sel = administrativeStore.selectedNeighborhoodCode;

    if (sel === "all") {
      setSelectedNeighborhood("전체");
      return;
    }

    const found = administrativeStore.neighborhoods.find(n => 
      n.code.slice(-3) === sel
    );

    if (found) {
      setSelectedNeighborhood(found.name);
    } else {
      setSelectedNeighborhood('');
    }
  }, []);

  // Store에 config 설정 및 모든 데이터 초기화
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

      // 모든 정류장 데이터 가져오기
      const allStations: RouteStationFeature[] = [];
      stationStore.stationDataMap.forEach((stationData) => {
        allStations.push(...stationData.features);
      });

      // 날짜 계산 (7일 전 ~ 현재)
      const endDate = new Date(config.date);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // 취약시설 데이터 로드
      await priorityStore.searchPriorityFacilities(
        administrativeStore.selectedProvinceCode || '26',
        administrativeStore.selectedDistrictCode || '230',
        null // 초기에는 전체 조회
      );

      // PriorityStore의 통합 초기화 메서드 호출
      await priorityStore.initializePriorityResultData(
        allStations,
        startDateStr,
        endDateStr
      );

      await renderVulnerableFacilities(facilities, priorityStore.vulnerableFacilitiesApiData ?? undefined);
      setIsRenderingFacilities(true);
    };

    initialize();

    return () => {
      priorityStore.closeDropdown();
      clearAdministrativeBoundary();
      clearVulnerableFacilities();
      // clearPriorityConcentration();
      clearAllNearbyRoads();
      clearAllNearbyBuildingFacilities();
      clearNearStations();
      hideFacilityHtmlTags();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setSelectDropdownValue('all');
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
          setSelectDropdownValue(neighborhood.code);
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

  // facilities 변경 시 렌더링
  useEffect(() => {
    const render = async () => {
      setSelectedFacilities(new Set());
      priorityStore.clearFacilitySelection();
      if (facilities.length > 0) {
        await renderVulnerableFacilities(facilities, priorityStore.vulnerableFacilitiesApiData ?? undefined);
      } else {
        console.log('[PriorityResult] No facilities to render');
      }
      // renderPriorityConcentration(concentrationPoints);
    };
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilitiesKey]);


  const toggleFacility = async (id: string) => {
    const newSet = new Set(selectedFacilities);

    if (newSet.has(id)) {
      // 선택 해제
      newSet.delete(id);

      // 해당 시설의 렌더링 제거
      clearNearbyRoadsForFacility(id);
      clearNearbyBuildingFacilitiesForFacility(id);
    } else {
      // 선택 추가
      newSet.add(id);

      // Store에서 캐시된 도로 데이터 가져와서 렌더링
      const roadData = priorityStore.getRoadData(id);
      if (roadData) {
        await renderNearbyRoadsForFacility(id, roadData);
        console.log(`[toggleFacility] Rendered ${roadData.total} road segments for facility ${id}`);
        try {
          // 도로명 추출 및 Store에 저장
          const roadNames = new Set<string>();
          roadData.features.forEach(feature => {
            roadNames.add(feature.properties.rn);
          });
          priorityStore.setNearbyRoadNames(id, roadNames);

          console.log(`[toggleFacility] Rendered ${roadData.total} road segments (${roadNames.size} unique roads) for facility ${id}`);
        } catch (error) {
          console.error(`[toggleFacility] Failed to search/render roads for facility ${id}:`, error);
        }
      }

      // Store에서 캐시된 건물 데이터 가져와서 렌더링
      const buildingData = priorityStore.getBuildingFacilitiesData(id);
      if (buildingData) {
        console.log(`sdfasdfas`, buildingData);
        await renderNearbyBuildingFacilitiesForFacility(id, buildingData);
        console.log(`[toggleFacility] Rendered ${buildingData.total} building facilities for facility ${id}`);
      }
    }

    setSelectedFacilities(newSet);

    // Store의 선택 상태도 업데이트 (주변 정류장 표시용)
    priorityStore.toggleFacilitySelection(id);
    renderNearbyStations(priorityStore.selectedStations);

    // 선택된 시설들의 HTML 태그 표시/숨김
    if (newSet.size > 0) {
      const selectedFacilityObjects = facilities.filter(f => newSet.has(f.id));
      showFacilityHtmlTags(selectedFacilityObjects);
    } else {
      hideFacilityHtmlTags();
    }

    renderVulnerableFacilities(facilities, priorityStore.vulnerableFacilitiesApiData ?? undefined);
  };

  const toggleAll = async () => {
    if (selectedFacilities.size === facilities.length) {
      // 전체 해제
      setSelectedFacilities(new Set());
      priorityStore.clearFacilitySelection();
      renderNearbyStations([]);
      clearAllNearbyRoads();
      clearAllNearbyBuildingFacilities();
      hideFacilityHtmlTags();
    } else {
      // 전체 선택
      const allIds = facilities.map(f => f.id);
      setSelectedFacilities(new Set(allIds));

      // 모든 시설에 대해 도로 렌더링 (병렬 처리)
      const roadRenderPromises = facilities.map(async (facility) => {
        const roadData = priorityStore.getRoadData(facility.id);
        if (roadData) {
          await renderNearbyRoadsForFacility(facility.id, roadData);
          
          // 도로명 추출 및 Store에 저장
          const roadNames = new Set<string>();
          roadData.features.forEach(feature => {
            roadNames.add(feature.properties.rn);
          });
          priorityStore.setNearbyRoadNames(facility.id, roadNames);

          console.log(`[toggleAll] Rendered ${roadData.total} roads (${roadNames.size} unique) for facility ${facility.id}`);
        }
      });
      await Promise.all(roadRenderPromises);

      // 모든 시설에 대해 건물 시설물 렌더링 (병렬 처리)
      const buildingRenderPromises = facilities.map(async (facility) => {
        const buildingData = priorityStore.getBuildingFacilitiesData(facility.id);
        if (buildingData) {
          await renderNearbyBuildingFacilitiesForFacility(facility.id, buildingData);
          console.log(`[toggleAll] Rendered ${buildingData.total} building facilities for facility ${facility.id}`);
        }
      });
      await Promise.all(buildingRenderPromises);

      // Store에도 반영
      allIds.forEach(id => {
        if (!priorityStore.isFacilitySelected(id)) {
          priorityStore.toggleFacilitySelection(id);
        }
      });

      renderNearbyStations(priorityStore.selectedStations);
      showFacilityHtmlTags(facilities);
    }
  };

  // 읍면동 드롭다운 옵션 생성
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
            onChange={async (value) => {
              //같은 드롭다운 중복 클릭시 방어
              //ex 가야동 -> 가야동
              if (selectDropdownValue == value) return;

              // 기존 렌더링 클리어 (비동기 작업 완료 대기)
              await clearVulnerableFacilities();
              // clearPriorityConcentration();
              clearAllNearbyRoads();
              clearAllNearbyBuildingFacilities();
              hideFacilityHtmlTags();

              // 선택 상태 초기화
              setSelectedFacilities(new Set());
              priorityStore.clearFacilitySelection();

              // neighborhood_code 결정
              let neighborhoodCode: string | null = null;
              let selectedName: string = value; // 기본값은 전달된 value

              if (value === "all") {
                neighborhoodCode = null;
                selectedName = "전체";
              }

              else {
                const neighborhood = administrativeStore.neighborhoods.find((n) => n.code === value);

                if (neighborhood) {
                  neighborhoodCode = neighborhood.code.substring(5); // Full code to short code
                  selectedName = neighborhood.name;
                }
              }

              // API 재호출하여 취약시설 데이터 갱신
              await priorityStore.searchPriorityFacilities(
                administrativeStore.selectedProvinceCode || '26',
                administrativeStore.selectedDistrictCode || '230',
                neighborhoodCode
              );

              // API 완료 후 로컬 상태 업데이트 (useEffect 트리거)
              setSelectedNeighborhood(selectedName);
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
            {isRenderingFacilities && facilities.map((facility) => {
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
      
      <Button
        showIcon={false} onClick={glbTest}>
        glb 테스트
      </Button>

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
