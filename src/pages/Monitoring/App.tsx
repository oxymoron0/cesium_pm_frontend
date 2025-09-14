import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import Title from '@/components/basic/Title'
import TabNavigation from '@/components/basic/TabNavigation'
import Monitoring from './components/Monitoring'
import { flyToLocation } from '@/utils/cesiumControls'
import { routeStore } from '@/stores/RouteStore'
import { stationStore } from '@/stores/StationStore'
import StationInfo from '@/pages/Monitoring/components/StationInfo'

const App = observer(function App() {
  // const { onCloseMicroApp, dispatch, user } = props // user.userid
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    // Cesium 초기화 및 상태 감지
    const checkCesiumStatus = () => {
      const isQiankun = (window as any).__POWERED_BY_QIANKUN__
      const parentViewer = (window as any).cviewer

      if (isQiankun && parentViewer) {
        setCesiumStatus('ready')
        // 부모 Viewer 사용 시 초기 위치로 이동
        setTimeout(() => {
          flyToLocation(parentViewer, 129.053233, 35.162913, 1000)
        }, 500)
      } else if (!isQiankun) {
        // 독립 모드에서는 CesiumViewer 컴포넌트가 window.cviewer를 설정할 때까지 대기
        const waitForViewer = setInterval(() => {
          if ((window as any).cviewer) {
            setCesiumStatus('ready')
            clearInterval(waitForViewer)
            // 독립 모드에서 초기 위치로 이동
            setTimeout(() => {
              flyToLocation((window as any).cviewer, 129.053233, 35.162913, 1000)
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

          // 초기 방향을 inbound로 설정
          stationStore.setSelectedDirection('inbound');
          console.log('[App] Initial direction set to inbound');
        } catch (error) {
          console.error('[App] Station data loading failed:', error);
        }
      }
    };

    // Cesium이 준비된 후에 데이터 로딩 시작
    if (cesiumStatus === 'ready') {
      initializeData();
    }
  }, [cesiumStatus])




  return (
    <div
      className="relative w-full h-screen overflow-hidden pm-frontend-scope"
    >
      {/* 전체 화면 Cesium Viewer */}
      <CesiumViewer />

      {/* 기본 모니터링 패널 */}
      <Panel>
        <Title info="• 버스 노선별 실시간 공기질을 디지털 트윈 상에서 확인할 수 있습니다.

• 본 사업에서 제공하는 정보와 환경부(에어코리아)정보는 일부 차이가 있을 수 있습니다.

• 본 사업에서는 전문가 자문을 받아 일반 시민의 호흡선높이(버스 바닥에서 약 1.5m 높이)에 센서를 설치하여 도로변의 공기질을 측정하며, 환경부(에어코리아)는 대기질 관리을 목적로 빌딩 옥상에 센서를 설치하고 있습니다.">모니터링</Title>
        <TabNavigation tabs={['버스번호', '정류장']} activeTab={0} onTabChange={() => {}} />
        <Monitoring />
      </Panel>

      {/* 정류장 정보 패널 - 노선 선택 시에만 표시 */}
      {routeStore.hasSelectedRoute && (
        <StationInfo />
      )}
    </div>
  )
});

export default App