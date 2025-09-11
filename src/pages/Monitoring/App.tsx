import { useEffect, useState } from 'react'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import Title from '@/components/basic/Title'
import TabNavigation from '@/components/basic/TabNavigation'
import Monitoring from './components/Monitoring'
import { flyToLocation } from '@/utils/cesiumControls'
import { routeStore } from '@/stores/RouteStore'

function App() {
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
    let isInitialized = false;
    
    const initializeData = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      await routeStore.initializeRouteData();
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

      {/* 오버레이 제어 패널 */}
      <Panel>
        <Title>모니터링</Title>
        <TabNavigation tabs={['버스번호', '정류장']} activeTab={0} onTabChange={() => {}} />
        <Monitoring />
      </Panel>
    </div>
  )
}

export default App