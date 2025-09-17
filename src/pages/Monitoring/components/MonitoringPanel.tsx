import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import TabNavigation from '@/components/basic/TabNavigation';
import Button from "@/components/basic/Button";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import SubTitle from "@/components/basic/SubTitle";
import RouteCard from "@/components/service/RouteCard";
import Item from '@/components/basic/Item';
import { routeStore } from '@/stores/RouteStore';
import { stationStore } from '@/stores/StationStore';
import { renderAllRoutes } from '@/utils/cesium/routeRenderer';
import { resetAllRouteColors } from '@/utils/cesium/routeColors';
import { renderAllStations } from '@/utils/cesium/stationRenderer';

type ViewType = 'routes' | 'stations';

const MonitoringPanel = observer(function MonitoringPanel() {
  const [currentView, setCurrentView] = useState<ViewType>('routes');
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  // Auto-render all routes and stations when data loading is complete
  useEffect(() => {
    if (!routeStore.isLoading && routeStore.routeGeomMap.size > 0) {
      const renderAll = async () => {
        try {
          console.log('[MonitoringPanel] Starting route and station rendering');

          // 1. 먼저 노선 렌더링
          await renderAllRoutes();
          resetAllRouteColors();
          console.log('[MonitoringPanel] Route rendering completed');

          // 2. StationStore에 데이터가 있으면 정류장도 렌더링
          const hasStationData = stationStore.stationDataMap.size > 0;
          if (hasStationData) {
            console.log(`[MonitoringPanel] StationStore has ${stationStore.stationDataMap.size} datasets, rendering stations`);
            await renderAllStations();
            console.log('[MonitoringPanel] Station rendering completed');
          } else {
            console.log('[MonitoringPanel] No station data available yet');
          }

        } catch (error) {
          console.error('[MonitoringPanel] Failed to render routes and stations:', error);
        }
      };
      renderAll();
    }
  }, [routeStore.isLoading, routeStore.routeGeomMap.size, stationStore.stationDataMap.size]);

  // 노선 선택 핸들러
  const handleRouteSelect = (routeNumber: string) => {
    const wasSelected = routeStore.isRouteSelected(routeNumber);

    // Store 상태 즉시 업데이트 (UI 반응성 확보)
    routeStore.setSelectedRoute(routeNumber);

    if (!wasSelected) {
      // 새로운 노선 선택: 즉시 뷰 전환
      setCurrentView('stations');

      // Cesium 렌더링은 비동기로 처리
      setTimeout(async () => {
        try {
          const routeGeom = routeStore.getRouteGeom(routeNumber);
          if (routeGeom) {
            const { createFocusedRoute } = await import('@/utils/cesium/routeColors');
            const { showOnlyStationsForRoute } = await import('@/utils/cesium/stationRenderer');

            await createFocusedRoute(routeGeom);
            await showOnlyStationsForRoute(routeNumber);
          }
        } catch (error) {
          console.error('[handleRouteSelect] Cesium rendering failed:', error);
        }
      }, 0);
    } else {
      // 노선 해제
      routeStore.clearSelection();
      setCurrentView('routes');
    }
  };

  // 뒤로가기 핸들러
  const handleBackToRoutes = () => {
    setCurrentView('routes');
    // 노선 선택 해제
    routeStore.clearSelection();
  };

  // 방향 선택 핸들러
  const handleDirectionSelect = (direction: 'inbound' | 'outbound') => {
    stationStore.setSelectedDirection(direction);
  };

  // TabNavigation용 핸들러
  const handleTabChange = (index: number) => {
    const direction = index === 0 ? 'inbound' : 'outbound';
    handleDirectionSelect(direction);
  };

  // 현재 선택된 방향을 탭 인덱스로 변환
  const getActiveTabIndex = () => {
    if (!stationStore.selectedDirection) return -1;
    return stationStore.selectedDirection === 'inbound' ? 0 : 1;
  };

  // 정류장 선택 핸들러
  const handleStationSelect = (stationId: string) => {
    stationStore.setSelectedStation(stationId);
  };

  // 노선 목록 뷰 렌더링
  const renderRoutesView = () => (
    <>
      <Title info="• 버스 노선별 실시간 공기질을 디지털 트윈 상에서 확인할 수 있습니다.

• 본 사업에서 제공하는 정보와 환경부(에어코리아)정보는 일부 차이가 있을 수 있습니다.

• 본 사업에서는 전문가 자문을 받아 일반 시민의 호흡선높이(버스 바닥에서 약 1.5m 높이)에 센서를 설치하여 도로변의 공기질을 측정하며, 환경부(에어코리아)는 대기질 관리을 목적로 빌딩 옥상에 센서를 설치하고 있습니다.">모니터링</Title>
      <TabNavigation tabs={['버스번호', '정류장']} activeTab={0} onTabChange={() => {}} />

      <Spacer height={16} />
      <SubTitle> 저장한 버스 </SubTitle>
      <Divider></Divider>
      <Spacer height={16} />
      <div className="flex flex-col items-start self-stretch gap-2">
        {/* <RouteCard routeNumber="10" isExpress={false} description="송정 ←> 모라주공" /> */}
      </div>
      <Spacer height={16}/>
      <SubTitle> 노선도 </SubTitle>
      <Divider color="bg-white"></Divider>
      <Spacer height={16} />
      <div className="flex flex-col items-start self-stretch gap-2">
        {routeStore.isLoading ? (
          // 로딩 중: 스켈레톤 UI만 표시
          <>
            {[1, 2, 3, 4].map((index) => (
              <div
                key={`skeleton-${index}`}
                className="bg-[#1A1A1A] rounded-lg p-4 animate-pulse w-full"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-6 bg-gray-600 rounded w-9"></div>
                    <div className="w-8 h-6 bg-gray-600 rounded"></div>
                  </div>
                  <div className="bg-gray-600 rounded w-7 h-7"></div>
                </div>
                <div className="w-48 h-4 mt-2 bg-gray-600 rounded"></div>
              </div>
            ))}
          </>
        ) : (
          // 로딩 완료: 실제 데이터 또는 빈 상태 표시
          <>
            {routeStore.routeInfoList.length > 0 ? (
              routeStore.routeInfoList.map((routeInfo) => (
                <RouteCard
                  key={routeInfo.route_name}
                  routeNumber={routeInfo.route_name}
                  description={`${routeInfo.origin} ↔ ${routeInfo.destination}`}
                  isExpress={false}
                  isBookmarked={false}
                  isSelected={routeStore.isRouteSelected(routeInfo.route_name)}
                  onBookmarkToggle={() => {
                    // TODO: 북마크 기능 구현 예정
                  }}
                  onSelect={(routeNumber) => {
                    handleRouteSelect(routeNumber);
                  }}
                />
              ))
            ) : (
              <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
                노선 데이터를 불러올 수 없습니다.
              </div>
            )}
          </>
        )}
      </div>
      <Spacer height={16} />
      <Divider height="h-[2px]"></Divider>
      <Spacer height={32} />
      <Button>노선별 실시간 공기질 현황</Button>
    </>
  );

  // 정류장 상세 뷰 렌더링
  const renderStationsView = () => {
    const selectedRouteName = routeStore.selectedRouteName;
    const selectedRouteInfo = routeStore.selectedRouteInfo;

    if (!selectedRouteName || !selectedRouteInfo) {
      return (
        <>
          <Spacer height={16} />
          <SubTitle>버스 전체 노선</SubTitle>
          <Divider color="bg-white" />
          <Spacer height={16} />
          <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
            노선을 먼저 선택해주세요.
          </div>
        </>
      );
    }

    const currentStationData = stationStore.currentStationData;
    const currentStations = stationStore.currentStations;
    const isLoading = stationStore.isLoading;

    return (
      <>
        {/* 제목과 뒤로가기 버튼 */}
        <Title>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToRoutes}
              className="flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
            >
              <img
                src={`${basePath}icon/back.svg`}
                alt="뒤로가기"
                className="w-3 h-4"
              />
            </button>
            <span>버스 전체 노선</span>
          </div>
        </Title>

        <Spacer height={16} />
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <img
              src={`${basePath}icon/normal.svg`}
              alt="일반"
              className="h-6 w-9"
            />
            <span
              style={{
                color: '#FFF',
                fontFamily: 'Pretendard',
                fontSize: '24px',
                fontWeight: '700',
                lineHeight: '24px'
              }}
            >
              {selectedRouteName}
            </span>
          </div>
          <div
            style={{
              color: '#A6A6A6',
              fontFamily: 'Pretendard',
              fontSize: '14px',
              fontWeight: '400',
              lineHeight: '24px'
            }}
          >
            {selectedRouteInfo.origin} ↔ {selectedRouteInfo.destination}
          </div>
        </div>

        {/* 방향 선택 탭 */}
        <TabNavigation
          tabs={[
            `${selectedRouteInfo.destination} 방면`,
            `${selectedRouteInfo.origin} 방면`
          ]}
          activeTab={getActiveTabIndex()}
          onTabChange={handleTabChange}
        />

        {/* 정류장 목록 */}
        <div
          className="flex flex-col w-full gap-2 overflow-y-auto max-h-96 px-1"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#FFD040 transparent'
          }}
        >
          {!stationStore.selectedDirection ? (
            <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
              방향을 선택해주세요.
            </div>
          ) : isLoading ? (
            // 로딩 상태
            <>
              {[1, 2, 3, 4, 5].map((index) => (
                <div
                  key={`skeleton-${index}`}
                  className="bg-[#1A1A1A] rounded-lg p-4 animate-pulse w-full"
                >
                  <div className="w-3/4 h-4 mb-2 bg-gray-600 rounded"></div>
                  <div className="w-1/2 h-3 bg-gray-600 rounded"></div>
                </div>
              ))}
            </>
          ) : currentStations.length > 0 ? (
            // 정류장 목록 표시
            <>
              {currentStationData && (
                <div className="mb-2 text-sm text-gray-300">
                  {currentStationData.direction_name} ({currentStations.length}개 정류장)
                </div>
              )}
              {currentStations.map((station) => (
                <Item
                  key={station.station_id}
                  className={`cursor-pointer transition-all ${
                    stationStore.isStationSelected(station.station_id)
                      ? 'ring-2 ring-[#FFD040] bg-[#2A2A2A]'
                      : 'hover:bg-[#1A1A1A]'
                  }`}
                  onClick={() => handleStationSelect(station.station_id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1">
                      <div
                        style={{
                          color: '#FFF',
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: '600',
                          lineHeight: '20px'
                        }}
                      >
                        {station.station_name}
                      </div>
                      <div
                        style={{
                          color: '#A6A6A6',
                          fontFamily: 'Pretendard',
                          fontSize: '12px',
                          fontWeight: '400',
                          lineHeight: '16px'
                        }}
                      >
                        {station.ars_id} • {station.dong}
                      </div>
                    </div>
                  </div>
                </Item>
              ))}
            </>
          ) : (
            <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
              정류장 데이터를 불러올 수 없습니다.
            </div>
          )}
        </div>

        <Spacer height={16} />
        <Divider height="h-[2px]" />
        <Spacer height={16} />

        {/* 하단 체크박스 */}
        <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
          <input
            type="checkbox"
            style={{
              width: '16px',
              height: '16px',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundColor: 'transparent',
              border: '1px solid #A6A6A6',
              borderRadius: '4px',
              cursor: 'pointer',
              position: 'relative'
            }}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              if (target.checked) {
                target.style.backgroundColor = '#FFD040';
                target.style.borderColor = '#FFD040';
              } else {
                target.style.backgroundColor = 'transparent';
                target.style.borderColor = '#A6A6A6';
              }
            }}
          />
          <span
            style={{
              color: '#A6A6A6',
              fontFamily: 'Pretendard',
              fontSize: '12px',
              fontWeight: '400',
              lineHeight: '16px'
            }}
          >
            모든 정류장의 실시간 공기질 보기
          </span>
        </div>
      </>
    );
  };

  return (
    <Panel>
      {currentView === 'routes' ? renderRoutesView() : renderStationsView()}
    </Panel>
  );
});

export default MonitoringPanel;