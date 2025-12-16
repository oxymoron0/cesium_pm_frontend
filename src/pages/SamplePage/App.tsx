import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import Title from '@/components/basic/Title'
import VulnerabilityManager from '@/components/service/VulnerabilityManager'
import StationHtmlRenderer from '@/components/service/StationHtmlRenderer'
import StationSensorRenderer from '@/components/service/StationSensorRenderer'
import BusHtmlRenderer from '@/components/service/BusHtmlRenderer'
import SimulationTestButton from './components/SimulationTestButton'
import SimulationList from './components/SimulationList'
import SimulationDetailPanel from './components/SimulationDetailPanel'
import PolygonDrawer from './components/PolygonDrawer'
import { initializePMFrontend } from '@/utils/cesiumControls'
import { routeStore } from '@/stores/RouteStore'
import { stationStore } from '@/stores/StationStore'
import { busStore } from '@/stores/BusStore'
import { stationSensorStore } from '@/stores/StationSensorStore'
import { renderAllRoutes } from '@/utils/cesium/routeRenderer'

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  console.log(props)
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    // Cesium 초기화 및 상태 감지
    const checkCesiumStatus = () => {
      const isQiankun = window.__POWERED_BY_QIANKUN__
      const parentViewer = window.cviewer

      if (isQiankun && parentViewer) {
        console.log('[SamplePage] 부모 Cesium Viewer 감지됨')
        setCesiumStatus('ready')
      } else if (!isQiankun) {
        // 독립 모드에서는 CesiumViewer 컴포넌트가 window.cviewer를 설정할 때까지 대기
        const waitForViewer = setInterval(() => {
          if (window.cviewer) {
            console.log('[SamplePage] 독립 Cesium Viewer 준비됨')
            setCesiumStatus('ready')
            clearInterval(waitForViewer)
            // PM Frontend 초기화
            initializePMFrontend()
          }
        }, 100)

        // 10초 후 타임아웃
        setTimeout(() => {
          clearInterval(waitForViewer)
          if (cesiumStatus === 'loading') {
            setCesiumStatus('error')
          }
        }, 10000)
      }
    }

    checkCesiumStatus()
  }, [cesiumStatus])

  // BusRouting 시스템 초기화 (RouteStore, StationStore, BusStore)
  useEffect(() => {
    console.log(`[SamplePage] BusRouting useEffect triggered - cesiumStatus: ${cesiumStatus}`)
    let isInitialized = false

    const initializeData = async () => {
      if (isInitialized) {
        console.log('[SamplePage] BusRouting initialization already completed')
        return
      }
      isInitialized = true

      try {
        // RouteStore 초기화
        console.log('[SamplePage] Starting RouteStore initialization')
        await routeStore.initializeRouteData()
        console.log('[SamplePage] RouteStore initialization completed')

        // Route 시각화 렌더링
        if (routeStore.routeGeomMap.size > 0) {
          console.log('[SamplePage] Rendering routes on Cesium')
          await renderAllRoutes()
          console.log('[SamplePage] Route rendering completed')
        }

        // StationStore 초기화 (모든 노선의 양방향 정류장 로드)
        const routeNames = routeStore.routeInfoList.map(route => route.route_name)
        console.log(`[SamplePage] Available routes:`, routeNames)

        if (routeNames.length > 0) {
          console.log(`[SamplePage] Loading station data for ${routeNames.length} routes`)

          const stationLoadPromises = routeNames.flatMap(routeName => [
            stationStore.loadStations(routeName, 'inbound'),
            stationStore.loadStations(routeName, 'outbound')
          ])

          await Promise.all(stationLoadPromises)
          console.log('[SamplePage] Station data loading completed')

          // StationSensorStore 초기화 (센서 데이터 로드)
          await stationSensorStore.loadSensorData()
          console.log('[SamplePage] Sensor data loaded from API')

          // 초기 방향을 inbound로 설정
          stationStore.setSelectedDirection('inbound')
          console.log('[SamplePage] Initial direction set to inbound')
        }

        // BusStore 초기화 및 애니메이션 시작
        console.log('[SamplePage] Starting bus system initialization')
        await busStore.initializeBusSystem()
        console.log('[SamplePage] Bus system initialized, starting animation system')
        await busStore.startAnimationSystem()
        console.log('[SamplePage] Bus animation system started')
      } catch (error) {
        console.error('[SamplePage] BusRouting initialization failed:', error)
      }
    }

    // Cesium이 준비된 후에 데이터 로딩 시작
    if (cesiumStatus === 'ready') {
      initializeData()
    }
  }, [cesiumStatus])

  // Cleanup 함수 (컴포넌트 언마운트 시)
  useEffect(() => {
    return () => {
      console.log('[SamplePage] Component unmounting, cleaning up')
      busStore.cleanup()
      stationSensorStore.stopAutoUpdate()
    }
  }, [])


  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {/* 전체 화면 Cesium Viewer */}
      <CesiumViewer />

      {/* BusRouting HTML 오버레이 렌더러 */}
      {cesiumStatus === 'ready' && <StationHtmlRenderer />}
      {cesiumStatus === 'ready' && <StationSensorRenderer />}
      {cesiumStatus === 'ready' && <BusHtmlRenderer />}

      {/* Simulation Detail Panel */}
      <SimulationDetailPanel />

      {/* UI Container Panel */}
      <Panel>
        <div className="w-full max-h-[936px] overflow-y-auto" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#FFD040 transparent'
        }}>
          <div className="sticky top-0 z-10 bg-gray-800">
            <Title
              onClose={() => {
                console.log('[SamplePage] Close icon clicked: Triggering onCloseMicroApp')
                console.log('[SamplePage] DataSources before close:', window.cviewer?.dataSources.length)
                props.onCloseMicroApp?.()
              }}
            >
              BusRouting & 취약시설 시각화
            </Title>
          </div>

          <div className="pb-4 space-y-6">
            {/* BusRouting Status Section */}
            <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
              <div className="pb-2 mb-2 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">
                BusRouting 시각화 상태
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Cesium:</span>
                <span className={cesiumStatus === 'ready' ? 'text-green-400' : cesiumStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                  {cesiumStatus === 'ready' ? 'Ready' : cesiumStatus === 'error' ? 'Error' : 'Loading'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">노선:</span>
                <span className="text-blue-300">{routeStore.routeInfoList.length}개</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">정류장:</span>
                <span className="text-blue-300">{stationStore.stationDataMap.size}개 방향</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">버스:</span>
                <span className={busStore.isSystemReady ? 'text-green-400' : 'text-yellow-400'}>
                  {busStore.isSystemReady ? `${busStore.totalBuses}대 운행 중` : '초기화 중...'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">애니메이션:</span>
                <span className={busStore.isAnimationSystemEnabled ? 'text-green-400' : 'text-red-400'}>
                  {busStore.isAnimationSystemEnabled ? '활성화' : '비활성화'}
                </span>
              </div>
            </div>

            {/* Simulation Test Section */}
            <div className="p-3 pt-6 space-y-4 border-t border-gray-600 rounded-lg bg-gray-900/30">
              <div className="pb-2 text-lg font-semibold border-b border-blue-400">
                시뮬레이션 시스템
              </div>
              <SimulationTestButton />
              <SimulationList />
            </div>

            {/* Polygon Test System */}
            <div className="p-3 pt-6 border-t border-gray-600 rounded-lg bg-gray-900/30">
              <div className="pb-2 mb-4 text-lg font-semibold border-b border-purple-400">
                Polygon 테스트 시스템
              </div>
              <PolygonDrawer />
            </div>

            {/* Vulnerability System */}
            <div className="p-3 pt-6 border-t border-gray-600 rounded-lg bg-gray-900/30">
              <div className="pb-2 mb-4 text-lg font-semibold border-b border-yellow-400">
                취약시설 시각화 시스템
              </div>
              <VulnerabilityManager autoLoadOnMount={true} />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
})

export default App