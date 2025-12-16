import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import MonitoringPanel from '@/pages/Monitoring/components/MonitoringPanel';
import AirQualityStatus from '@/pages/Monitoring/components/AirQualityStatus';
import AirConfig from '@/pages/Monitoring/components/AirConfig';
import StationHtmlRenderer from '@/components/service/StationHtmlRenderer';
import StationSensorRenderer from '@/components/service/StationSensorRenderer';
import BusHtmlRenderer from '@/components/service/BusHtmlRenderer';
import { flyToLocation } from '@/utils/cesiumControls';
import { routeStore } from '@/stores/RouteStore';
import { stationStore } from '@/stores/StationStore';
import { busStore } from '@/stores/BusStore';
import { stationSensorStore } from '@/stores/StationSensorStore';
import { stationDetailStore } from '@/stores/StationDetailStore';
import { bookmarkStore } from '@/stores/BookmarkStore';
import { userStore } from '@/stores/UserStore';
import { clearMonitoringCesium } from '../../utils/cesiumCleanup';
import { renderAllRoutes } from '@/utils/cesium/routeRenderer';
import { resetAllRouteColors } from '@/utils/cesium/routeColors';
import { renderAllStations } from '@/utils/cesium/stationRenderer';

interface MonitoringViewProps {
  isActive: boolean;
  cesiumStatus: 'loading' | 'ready' | 'error';
  onCloseMicroApp?: () => void;
}

const MonitoringView = observer(function MonitoringView({
  isActive,
  cesiumStatus,
  onCloseMicroApp,
}: MonitoringViewProps) {
  const isInitializedRef = useRef(false);
  const wasActiveRef = useRef(false);

  // RouteStore 초기화 (최초 활성화 시 한 번만 실행)
  useEffect(() => {
    if (!isActive || cesiumStatus !== 'ready' || isInitializedRef.current) {
      return;
    }

    const initializeData = async () => {
      isInitializedRef.current = true;

      // 초기 위치로 이동
      if (window.cviewer) {
        flyToLocation(window.cviewer, 129.053233, 35.162913, 1000);
      }

      // RouteStore와 BookmarkStore를 병렬로 로드
      console.log('[MonitoringView] Starting parallel RouteStore and BookmarkStore initialization');
      await Promise.all([
        routeStore.initializeRouteData(),
        bookmarkStore.initializeBookmarks(userStore.currentUser)
      ]);
      console.log('[MonitoringView] RouteStore and BookmarkStore initialization completed');

      // RouteStore 초기화 완료 후 StationStore 초기화
      const routeNames = routeStore.routeInfoList.map(route => route.route_name);
      console.log(`[MonitoringView] Available routes after RouteStore init:`, routeNames);

      if (routeNames.length > 0) {
        console.log(`[MonitoringView] Loading station data for ${routeNames.length} routes`);

        const stationLoadPromises = routeNames.flatMap(routeName => [
          stationStore.loadStations(routeName, 'inbound'),
          stationStore.loadStations(routeName, 'outbound')
        ]);

        try {
          await Promise.all(stationLoadPromises);
          console.log('[MonitoringView] Station data loading completed');

          // 센서 데이터 자동 업데이트 시작 (1분 주기)
          stationSensorStore.startAutoUpdate();
          console.log('[MonitoringView] Sensor data auto-update started (1 min interval)');

          // 초기 방향 설정
          stationStore.setSelectedDirection('inbound');
          console.log('[MonitoringView] Initial direction set to inbound');
        } catch (error) {
          console.error('[MonitoringView] Station data loading failed:', error);
        }
      }

      // 버스 시스템 초기화 및 애니메이션 시작
      try {
        console.log('[MonitoringView] Starting bus system initialization');
        busStore.setActive(true);
        await busStore.initializeBusSystem();
        console.log('[MonitoringView] Bus system initialized, starting animation system');
        await busStore.startAnimationSystem();
        console.log('[MonitoringView] Bus animation system started');
      } catch (error) {
        console.error('[MonitoringView] Bus system initialization failed:', error);
      }
    };

    initializeData();
  }, [isActive, cesiumStatus]);

  // 서비스 전환 시 Cesium 정리/복원
  useEffect(() => {
    // 비활성화될 때: Cesium 정리 (MobX 상태는 유지)
    if (wasActiveRef.current && !isActive) {
      console.log('[MonitoringView] Deactivating - clearing Cesium entities');
      busStore.setActive(false);  // 진행 중인 초기화 취소
      clearMonitoringCesium();
      busStore.cleanup();
      stationSensorStore.stopAutoUpdate();
    }

    // 재활성화될 때: 이미 초기화되어 있으면 Cesium 렌더링 복원
    if (!wasActiveRef.current && isActive && isInitializedRef.current && cesiumStatus === 'ready') {
      console.log('[MonitoringView] Reactivating - restoring Cesium entities');

      const restoreCesiumRendering = async () => {
        try {
          // 노선 렌더링 복원
          if (routeStore.routeGeomMap.size > 0) {
            await renderAllRoutes();
            resetAllRouteColors();
          }

          // 정류장 렌더링 복원
          if (stationStore.stationDataMap.size > 0) {
            await renderAllStations();
          }

          // 버스 시스템 재시작
          busStore.setActive(true);
          await busStore.initializeBusSystem();
          await busStore.startAnimationSystem();

          console.log('[MonitoringView] Cesium rendering restored');
        } catch (error) {
          console.error('[MonitoringView] Failed to restore Cesium rendering:', error);
        }
      };

      restoreCesiumRendering();
    }

    wasActiveRef.current = isActive;
  }, [isActive, cesiumStatus]);

  // Cleanup 함수 (컴포넌트 언마운트 시)
  useEffect(() => {
    return () => {
      console.log('[MonitoringView] Component unmounting, cleaning up');
      busStore.setActive(false);  // 진행 중인 초기화 취소
      clearMonitoringCesium();
      busStore.cleanup();
      stationSensorStore.stopAutoUpdate();
    };
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* 정류장 HTML 오버레이 */}
      {cesiumStatus === 'ready' && <StationHtmlRenderer />}

      {/* 정류장 센서 오버레이 */}
      {cesiumStatus === 'ready' && <StationSensorRenderer />}

      {/* 버스 HTML 오버레이 */}
      {cesiumStatus === 'ready' && <BusHtmlRenderer />}

      {/* 통합 모니터링 패널 */}
      <MonitoringPanel onCloseMicroApp={onCloseMicroApp} />

      {/* 대기 설정 버튼 그룹 */}
      <AirConfig />

      {/* AirQualityStatus 모달 */}
      {stationDetailStore.isModalOpen && (
        <AirQualityStatus onClose={() => stationDetailStore.closeModal()} />
      )}
    </>
  );
});

export default MonitoringView;
