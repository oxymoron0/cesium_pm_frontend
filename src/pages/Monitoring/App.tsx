import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import CesiumViewer from '@/components/CesiumViewer'
import MonitoringPanel from './components/MonitoringPanel'
import StationHtmlRenderer from '@/components/service/StationHtmlRenderer'
import StationSensorRenderer from '@/components/service/StationSensorRenderer'
import { flyToLocation } from '@/utils/cesiumControls'
import { routeStore } from '@/stores/RouteStore'
import { stationStore } from '@/stores/StationStore'
import { busStore } from '@/stores/BusStore'
import { stationSensorStore } from '@/stores/StationSensorStore'

const App = observer(function App() {
  // const { onCloseMicroApp, dispatch, user } = props // user.userid
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    // Cesium 초기화 및 상태 감지
    const checkCesiumStatus = () => {
      const isQiankun = window.__POWERED_BY_QIANKUN__
      const parentViewer = window.cviewer

      if (isQiankun && parentViewer) {
        setCesiumStatus('ready')
        // 부모 Viewer 사용 시 초기 위치로 이동
        setTimeout(() => {
          flyToLocation(parentViewer, 129.053233, 35.162913, 1000)
        }, 500)
      } else if (!isQiankun) {
        // 독립 모드에서는 CesiumViewer 컴포넌트가 window.cviewer를 설정할 때까지 대기
        const waitForViewer = setInterval(() => {
          if (window.cviewer) {
            setCesiumStatus('ready')
            clearInterval(waitForViewer)
            // 독립 모드에서 초기 위치로 이동
            setTimeout(() => {
              flyToLocation(window.cviewer!, 129.053233, 35.162913, 1000)
            }, 500)
          }
        }, 100)
      }
    }
    checkCesiumStatus()
  }, [cesiumStatus])

  // RouteStore 초기화 (앱 시작시 한 번만 실행)
  useEffect(() => {
    console.log(`[App] RouteStore useEffect triggered - cesiumStatus: ${cesiumStatus}`);
    let isInitialized = false;
    
    const initializeData = async () => {
      if (isInitialized) {
        console.log('[App] RouteStore initialization already completed');
        return;
      }
      isInitialized = true;
      
      console.log('[App] Starting RouteStore initialization');
      await routeStore.initializeRouteData();
      console.log('[App] RouteStore initialization completed');
      
      // RouteStore 초기화 완료 후 즉시 StationStore 초기화
      const routeNames = routeStore.routeInfoList.map(route => route.route_name);
      console.log(`[App] Available routes after RouteStore init:`, routeNames);
      
      if (routeNames.length > 0) {
        console.log(`[App] Loading station data for ${routeNames.length} routes`);
        
        const stationLoadPromises = routeNames.flatMap(routeName => [
          stationStore.loadStations(routeName, 'inbound'),
          stationStore.loadStations(routeName, 'outbound')
        ]);
        
        try {
          await Promise.all(stationLoadPromises);
          console.log('[App] Station data loading completed');

          // StationStore 데이터가 로드된 후 센서 모의 데이터 업데이트
          stationSensorStore.updateMockDataFromStationStore();
          console.log('[App] Sensor mock data updated');

          // 초기 방향을 inbound로 설정
          stationStore.setSelectedDirection('inbound');
          console.log('[App] Initial direction set to inbound');
        } catch (error) {
          console.error('[App] Station data loading failed:', error);
        }
      }

      // 버스 시스템 초기화 및 애니메이션 자동 시작
      try {
        console.log('[App] Starting bus system initialization');
        await busStore.initializeBusSystem();
        console.log('[App] Bus system initialized, starting animation system');
        await busStore.startAnimationSystem();
        console.log('[App] Bus animation system started');
      } catch (error) {
        console.error('[App] Bus system initialization failed:', error);
      }
    };

    // Cesium이 준비된 후에 데이터 로딩 시작
    if (cesiumStatus === 'ready') {
      initializeData();
    }
  }, [cesiumStatus])

  // Cleanup 함수 (컴포넌트 언마운트 시)
  useEffect(() => {
    return () => {
      console.log('[App] Component unmounting, cleaning up bus system');
      busStore.cleanup();
    };
  }, [])




  return (
    <div
      className="relative w-full h-screen overflow-hidden pm-frontend-scope"
      style={{ overflow: 'hidden' }}
    >
      {/* 전체 화면 Cesium Viewer */}
      <CesiumViewer />

      {/* 정류장 HTML 오버레이 */}
      {cesiumStatus === 'ready' && <StationHtmlRenderer />}

      {/* 정류장 센서 오버레이 */}
      {cesiumStatus === 'ready' && <StationSensorRenderer />}

      {/* 통합 모니터링 패널 */}
      <MonitoringPanel />
    </div>
  )
});

export default App