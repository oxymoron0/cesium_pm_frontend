import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Panel from '@/components/basic/Panel';
import Monitoring from './Monitoring';
import StationInfo from './StationInfo';
import { routeStore } from '@/stores/RouteStore';
import { stationStore } from '@/stores/StationStore';
import { stationSensorStore } from '@/stores/StationSensorStore';
import { renderAllRoutes } from '@/utils/cesium/routeRenderer';
import { resetAllRouteColors } from '@/utils/cesium/routeColors';
import { renderAllStations } from '@/utils/cesium/stationRenderer';

type ViewType = 'routes' | 'stations';

interface MonitoringPanelProps {
  onCloseMicroApp?: () => void;
}

const MonitoringPanel = observer(function MonitoringPanel(props: MonitoringPanelProps) {
  // 선택된 노선이 있으면 stations 뷰로 시작 (페이지 전환 후 복귀 시 상태 유지)
  const [currentView, setCurrentView] = useState<ViewType>(
    routeStore.selectedRouteName ? 'stations' : 'routes'
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

            // 현재 선택된 방향 정보를 함께 전달
            const selectedDirection = stationStore.selectedDirection;
            await createFocusedRoute(routeGeom, selectedDirection || undefined);
            await showOnlyStationsForRoute(routeNumber);

            // 센서가 표시 중이면 새로운 노선의 센서로 업데이트
            if (stationSensorStore.visibleCount > 0) {
              stationSensorStore.showSelectedRoute();
            }
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
    // 센서만 정리 (사용자 설정은 유지)
    stationSensorStore.clearVisibleStations();
  };

  // 노선 목록 뷰 렌더링
  const renderRoutesView = () => (
    <Monitoring onRouteSelect={handleRouteSelect} onCloseMicroApp={props.onCloseMicroApp} />
  );

  // 정류장 상세 뷰 렌더링
  const renderStationsView = () => (
    <StationInfo onBackClick={handleBackToRoutes} onCloseMicroApp={props.onCloseMicroApp} />
  );

  return (
    <Panel
      width={currentView === 'stations' ? '498px' : '400px'}
      maxHeight={currentView === 'stations' ? '936px' : undefined}
    >
      {currentView === 'routes' ? renderRoutesView() : renderStationsView()}
    </Panel>
  );
});

export default MonitoringPanel;