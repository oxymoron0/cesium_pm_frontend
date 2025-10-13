import { useEffect, useState } from 'react'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import Title from '@/components/basic/Title'
import VulnerabilityManager from '@/components/service/VulnerabilityManager'
// import AirQualityDisplay from '@/components/service/sensor/AirQualityDisplay'
// import StationSensorContainer from '@/components/basic/StationSensorContainer'
import BusHtmlRenderer from '@/components/service/BusHtmlRenderer'
import { initializePMFrontend } from '@/utils/cesiumControls'
import { get } from '@/utils/api/request'
import { getApiPath } from '@/utils/api/config'
import { renderStation, renderStations, type Station } from '@/utils/cesium/testRenderer'
import { createDataSource, findDataSource, removeDataSource, clearDataSource, toggleDataSource } from '@/utils/cesium/datasources'
import { routeStore } from '@/stores/RouteStore'
import { stationStore } from '@/stores/StationStore'
import { renderAllRoutes } from '@/utils/cesium/routeRenderer'
import { renderBusModels, clearBusModels, toggleBusModels, getBusModelCount, flyToBusModel } from '@/utils/cesium/glbRenderer'
import { type BusTrajectoryData } from '@/utils/api/busApi'
import { busStore } from '@/stores/BusStore'
import { observer } from 'mobx-react-lite'

interface StationApiResponse {
  stations: Station[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  console.log(props)
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [busData, setBusData] = useState<BusTrajectoryData[]>([])
  const [busLoading, setBusLoading] = useState(false)

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

  // RouteStore 및 BusStore 초기화 (앱 시작시 한 번만 실행)
  useEffect(() => {
    let isInitialized = false;

    const initializeData = async () => {
      if (isInitialized) return;
      isInitialized = true;

      try {
        // Route 시스템 초기화
        await routeStore.initializeRouteData();
        if (routeStore.routeGeomMap.size > 0) {
          await renderAllRoutes();
        }
        stationStore.setSelectedDirection('inbound');
        console.log('[SamplePage] Route system initialized');

        // Bus 시스템 자동 초기화 (데이터 + 렌더링 + 실시간 폴링)
        setBusLoading(true);
        await busStore.initializeBusSystem();
        setBusData(busStore.busData);
        console.log('[SamplePage] Bus system auto-initialized:', busStore.busData.length, 'buses');

        // 애니메이션 시스템 자동 시작
        await busStore.startAnimationSystem();
        console.log('[SamplePage] Animation system auto-started');

      } catch (error) {
        console.error('[SamplePage] Auto-initialization failed:', error);
      } finally {
        setBusLoading(false);
      }
    };

    // Cesium이 준비된 후에 데이터 로딩 시작
    if (cesiumStatus === 'ready') {
      initializeData();
    }
  }, [cesiumStatus])

  // 컴포넌트 정리 시 버스 시스템 정리
  useEffect(() => {
    return () => {
      busStore.cleanup();
    };
  }, []);

  // Station DataSource helper functions
  const [, setDsUpdateTrigger] = useState(0)

  // Bus GLB Model helper functions
  const getBusModelDataSource = () => {
    return findDataSource('bus_models')
  }

  const isBusModelVisible = () => {
    const ds = getBusModelDataSource()
    return ds ? ds.show !== false : false
  }

  const getStationDataSource = () => {
    return findDataSource('station')
  }

  const getStationCount = () => {
    const ds = getStationDataSource()
    return ds ? ds.entities.values.length : 0
  }

  const isStationDataSourceVisible = () => {
    const ds = getStationDataSource()
    return ds ? ds.show !== false : false
  }

  // Station DataSource test functions
  const handleCreateStationDataSource = () => {
    try {
      createDataSource('station')
      setDsUpdateTrigger(prev => prev + 1)
      console.log('Station DataSource created')
    } catch (error) {
      console.error('Create DataSource error:', error)
    }
  }

  const handleDeleteStationDataSource = () => {
    const success = removeDataSource('station')
    if (success) {
      setSelectedStation(null)
      setDsUpdateTrigger(prev => prev + 1)
      console.log('Station DataSource deleted')
    }
  }

  const handleClearStationDataSource = () => {
    clearDataSource('station')
    setSelectedStation(null)
    setDsUpdateTrigger(prev => prev + 1)
    console.log('Station DataSource cleared')
  }

  const handleToggleStationDataSource = () => {
    const isVisible = isStationDataSourceVisible()
    toggleDataSource('station', !isVisible)
    setDsUpdateTrigger(prev => prev + 1)
    console.log(`Station DataSource ${!isVisible ? 'shown' : 'hidden'}`)
  }

  // Station API functions
  const fetchStations = async () => {
    if (loading) return
    setLoading(true)
    try {
      const response = await get<StationApiResponse>(getApiPath('api/v1/stations?page=1&per_page=20'))
      if (response.ok) {
        setStations(response.data.stations)
        console.log('Fetched stations:', response.data)
      } else {
        console.error('Failed to fetch stations:', response.status)
      }
    } catch (error) {
      console.error('Error fetching stations:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchStations = async () => {
    if (!searchQuery.trim() || loading) return
    setLoading(true)
    try {
      const response = await get<StationApiResponse>(getApiPath(`api/v1/stations/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20`))
      if (response.ok) {
        setStations(response.data.stations)
        console.log('Search results:', response.data)
      } else {
        console.error('Failed to search stations:', response.status)
      }
    } catch (error) {
      console.error('Error searching stations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Station rendering functions
  const handleRenderAllStations = () => {
    if (stations.length > 0) {
      renderStations(stations, { groupColors: true, showLabels: true })
    }
  }

  const handleRenderStation = (station: Station) => {
    renderStation(station, { flyToStation: true, showLabel: true })
    setSelectedStation(station)
  }

  // Bus GLB Model functions
  const fetchBusTrajectory = async () => {
    if (busLoading) return
    setBusLoading(true)
    try {
      // BusStore 초기화 (API 호출 포함)
      await busStore.initializeBusSystem()

      // 로컬 state도 동기화
      setBusData(busStore.busData)

      console.log('Fetched bus trajectory data:', busStore.busData.length, 'buses')
    } catch (error) {
      console.error('Error fetching bus trajectory:', error)
    } finally {
      setBusLoading(false)
    }
  }

  const handleRenderBusModels = async () => {
    if (busData.length === 0) {
      console.warn('No bus data available. Fetch bus trajectory first.')
      return
    }
    await renderBusModels(busData)
    setDsUpdateTrigger(prev => prev + 1)
  }

  const handleClearBusModels = () => {
    clearBusModels()
    setDsUpdateTrigger(prev => prev + 1)
  }

  const handleToggleBusModels = () => {
    const isVisible = isBusModelVisible()
    toggleBusModels(!isVisible)
    setDsUpdateTrigger(prev => prev + 1)
  }

  const handleFlyToBus = (vehicleNumber: string) => {
    flyToBusModel(vehicleNumber)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {/* 전체 화면 Cesium Viewer */}
      <CesiumViewer />

      {/* 버스 HTML 오버레이 렌더러 */}
      <BusHtmlRenderer />

      {/* 화면 중앙 StationSensorContainer 테스트 */}
      {/* <div className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
        <StationSensorContainer
          pm10Value={45}
          pm25Value={15}
          vocsValue={120}
        />
      </div> */}

      {/* 화면 하단 공기질 센서 */}
      {/* <div className="absolute z-10 transform -translate-x-1/2 bottom-10 left-1/2">
        <AirQualityDisplay
          pm10Value={45}
          pm25Value={25}
          vocsValue={120}
        />
      </div> */} 
      <div className="absolute z-10 transform -translate-x-1/2 bottom-10 left-1/2">
        
      </div>

      {/* UI Container Panel */}
      <Panel>
        <div className="w-full max-h-[936px] overflow-y-auto" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#FFD040 transparent'
        }}>
          <div className="sticky top-0 z-10 bg-gray-800">
            <Title
              onClose={() => {
                console.log('[SamplePage] Close icon clicked: Triggering onCloseMicroApp');
                console.log('[SamplePage] DataSources before close:', window.cviewer?.dataSources.length);
                props.onCloseMicroApp?.();
              }}
            >
              Bus GLB Models & Station Testing
            </Title>
          </div>

          <div className="pb-4 space-y-6">
            {/* Status Section */}
            <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Cesium:</span>
                <span className={cesiumStatus === 'ready' ? 'text-green-400' : cesiumStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                  {cesiumStatus === 'ready' ? 'Ready' : cesiumStatus === 'error' ? 'Error' : 'Loading'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Station DataSource:</span>
                <span className={getStationDataSource() ? 'text-green-400' : 'text-red-400'}>
                  {getStationDataSource() ? 'Exists' : 'Not Found'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Station Entities:</span>
                <span className="text-blue-300">{getStationCount()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Visibility:</span>
                <span className={isStationDataSourceVisible() ? 'text-green-400' : 'text-red-400'}>
                  {isStationDataSourceVisible() ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Loaded Stations:</span>
                <span className="text-blue-300">{stations.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Bus Models:</span>
                <span className={getBusModelDataSource() ? 'text-green-400' : 'text-red-400'}>
                  {getBusModelDataSource() ? 'Loaded' : 'Not Loaded'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Model Count:</span>
                <span className="text-blue-300">{getBusModelCount()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Model Visibility:</span>
                <span className={isBusModelVisible() ? 'text-green-400' : 'text-red-400'}>
                  {isBusModelVisible() ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Bus Data:</span>
                <span className="text-blue-300">{busData.length} buses loaded</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">System:</span>
                <span className={busStore.isSystemReady ? 'text-green-400' : 'text-yellow-400'}>
                  {busStore.isSystemReady ? 'Ready' : busStore.isLoading ? 'Loading...' : 'Standby'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Active Buses:</span>
                <span className="text-blue-300">{busStore.activeBuses}/{busStore.totalBuses}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Tracking:</span>
                <span className="text-green-300">
                  {busStore.trackedBusId || 'None'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Real-time:</span>
                <span className={busStore.isPolling ? (busStore.pollFailureCount > 0 ? 'text-yellow-400' : 'text-green-400') : 'text-gray-400'}>
                  {busStore.isPolling ?
                    (busStore.pollFailureCount > 0 ? `Polling (${busStore.pollFailureCount} fails)` : 'Polling') :
                    'Stopped'
                  }
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Last Poll:</span>
                <span className="text-blue-300">
                  {busStore.lastSuccessfulPoll ?
                    new Date(busStore.lastSuccessfulPoll).toLocaleTimeString() :
                    'Never'
                  }
                </span>
              </div>
            </div>

            {/* Station DataSource Test Controls */}
            <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
              <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">Station DataSource Tests</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCreateStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Create DS
                </button>
                <button
                  onClick={handleDeleteStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Delete DS
                </button>
                <button
                  onClick={handleClearStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs text-white bg-orange-600 rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Clear DS
                </button>
                <button
                  onClick={handleToggleStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Toggle Visibility
                </button>
              </div>
            </div>

            {/* Bus GLB Model Controls */}
            <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
              <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">Bus GLB Models</div>
              <div className="space-y-2">
                <button
                  onClick={fetchBusTrajectory}
                  disabled={busLoading || cesiumStatus !== 'ready'}
                  className="w-full px-3 py-2 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {busLoading ? 'Loading...' : 'Fetch Bus Trajectory Data'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleRenderBusModels}
                    disabled={cesiumStatus !== 'ready' || busData.length === 0}
                    className="px-3 py-2 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Render Models
                  </button>
                  <button
                    onClick={handleClearBusModels}
                    disabled={cesiumStatus !== 'ready'}
                    className="px-3 py-2 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Clear Models
                  </button>
                </div>
                <button
                  onClick={handleToggleBusModels}
                  disabled={cesiumStatus !== 'ready' || getBusModelCount() === 0}
                  className="w-full px-3 py-2 text-xs text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Toggle Visibility
                </button>
              </div>
            </div>

            {/* Real-time Polling Controls */}
            <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
              <div className="pb-1 text-sm font-semibold text-green-400 border-b border-green-400/20">Real-time Bus Tracking</div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Polling Status:</span>
                  <span className={busStore.isPolling ? 'text-green-400' : 'text-red-400'}>
                    {busStore.isPolling ? 'Active' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Update Interval:</span>
                  <span className="text-blue-300">{busStore.pollIntervalSeconds}s</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Latest Positions:</span>
                  <span className="text-blue-300">{busStore.latestPositions.size} buses</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => busStore.startRealTimePolling()}
                  disabled={cesiumStatus !== 'ready' || busStore.isPolling || busStore.totalBuses === 0}
                  className="px-3 py-2 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Start Polling
                </button>
                <button
                  onClick={() => busStore.stopRealTimePolling()}
                  disabled={!busStore.isPolling}
                  className="px-3 py-2 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Stop Polling
                </button>
              </div>

              <div className="p-2 text-xs bg-gray-800 rounded">
                <div className="font-medium text-green-400">Real-time Features:</div>
                <div className="text-gray-300">• 10-second position updates</div>
                <div className="text-gray-300">• Smooth 3-second animations</div>
                <div className="text-gray-300">• Automatic movement detection</div>
                <div className="text-gray-300">• Background continuous tracking</div>
              </div>
            </div>

            {/* Animation System Controls */}
            <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
              <div className="pb-1 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">Animation System</div>

              {/* Animation Status */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>System Status</span>
                  <span className={busStore.isAnimationSystemEnabled ? 'text-green-400' : 'text-red-400'}>
                    {busStore.isAnimationSystemEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Active Animations</span>
                  <span className="text-cyan-400">{busStore.activeAnimations}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Queued Animations</span>
                  <span className="text-yellow-400">{busStore.totalQueuedAnimations}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Speed</span>
                  <span>{busStore.animationSystem.playbackSpeed}x</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => await busStore.startAnimationSystem()}
                  disabled={cesiumStatus !== 'ready' || busStore.totalBuses === 0 || busStore.isAnimationSystemEnabled}
                  className="px-3 py-2 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  ▶ Start System
                </button>
                <button
                  onClick={() => busStore.stopAnimationSystem()}
                  disabled={!busStore.isAnimationSystemEnabled}
                  className="px-3 py-2 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  ⏹ Stop System
                </button>
              </div>

              {/* Speed Controls */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Playback Speed</div>
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 1.0, 2.0, 5.0].map(speed => (
                    <button
                      key={speed}
                      onClick={() => busStore.setPlaybackSpeed(speed)}
                      className={`px-2 py-1 text-xs rounded ${
                        busStore.animationSystem.playbackSpeed === speed
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Animation Info */}
              <div className="p-2 text-xs bg-gray-800 rounded">
                <div className="font-medium text-cyan-400">Animation Status:</div>
                <div className="text-gray-300">System: {busStore.animationSystemStatus.enabled ? 'Enabled' : 'Disabled'}</div>
                <div className="text-gray-300">Active: {busStore.animationSystemStatus.activeAnimations}</div>
                <div className="text-gray-300">Queued: {busStore.animationSystemStatus.queuedAnimations}</div>
                <div className="text-gray-300">Speed: {busStore.animationSystem.playbackSpeed}x</div>
              </div>

              <div className="pt-2 border-t border-gray-600">
                <div className="pb-1 text-xs font-medium text-gray-400">Individual Bus Tests</div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      // Test: Move first bus to Frontend Connected position
                      if (busData.length > 0) {
                        busStore.animateBusToPosition(
                          busData[0].vehicle_number,
                          129.075986, // Frontend Connected longitude
                          35.179554,  // Frontend Connected latitude
                          5
                        )
                      }
                    }}
                    disabled={!busStore.isSystemReady || busData.length === 0}
                    className="w-full px-2 py-1 text-xs text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Move First Bus (5s)
                  </button>
                </div>
                <div className="pt-2 border-t border-gray-500">
                  <div className="pb-1 text-xs font-medium text-gray-400">Camera Tracking</div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        // Track first bus
                        if (busData.length > 0) {
                          busStore.trackBus(busData[0].vehicle_number)
                        }
                      }}
                      disabled={!busStore.isSystemReady || busData.length === 0}
                      className="w-full px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      Track First Bus
                    </button>
                    <button
                      onClick={() => busStore.stopCameraTracking()}
                      disabled={!busStore.isSystemReady}
                      className="w-full px-2 py-1 text-xs text-white bg-orange-600 rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      Stop Tracking
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bus Model List */}
            {busData.length > 0 && (
              <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
                <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">
                  Bus Models (Left: Fly To, Right: Move, Middle: Track)
                </div>
                <div className="space-y-1 overflow-y-auto max-h-40" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#FFD040 transparent'
                }}>
                  {busData.map((bus) => (
                    <div
                      key={bus.vehicle_number}
                      onClick={() => handleFlyToBus(bus.vehicle_number)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        // Right click: Move bus to a random nearby position
                        const randomLat = 35.179554 + (Math.random() - 0.5) * 0.01
                        const randomLng = 129.075986 + (Math.random() - 0.5) * 0.01
                        busStore.animateBusToPosition(bus.vehicle_number, randomLng, randomLat, 3)
                      }}
                      onMouseDown={(e) => {
                        if (e.button === 1) { // Middle click
                          e.preventDefault()
                          busStore.trackBus(bus.vehicle_number)
                        }
                      }}
                      className={`p-2 text-xs transition-colors rounded cursor-pointer hover:bg-gray-600 ${
                        busStore.trackedBusId === bus.vehicle_number
                          ? 'bg-green-600 text-white border border-green-400'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Bus {bus.vehicle_number}</span>
                          <span className="ml-2 text-gray-400">Route {bus.route_name}</span>
                        </div>
                        <div className="text-gray-500">
                          {bus.positions.length} positions
                        </div>
                      </div>
                      {bus.positions.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          {bus.positions[0].position.latitude.toFixed(4)}, {bus.positions[0].position.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Station API */}
            <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
              <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">Station API</div>
              <div className="space-y-2">
                <button
                  onClick={fetchStations}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Fetch Stations (20 items)'}
                </button>
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stations..."
                    className="flex-1 px-2 py-1 text-xs text-white bg-gray-700 border border-gray-600 rounded focus:border-yellow-400 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && searchStations()}
                  />
                  <button
                    onClick={searchStations}
                    disabled={loading || !searchQuery.trim()}
                    className="px-2 py-1 text-xs text-white rounded bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Station Rendering */}
            {stations.length > 0 && (
              <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
                <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">Station Rendering</div>
                <button
                  onClick={handleRenderAllStations}
                  disabled={cesiumStatus !== 'ready'}
                  className="w-full px-3 py-2 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Render All Stations
                </button>
              </div>
            )}

            {/* Station List */}
            {stations.length > 0 && (
              <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
                <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">Station List (Click to Render)</div>
                <div className="space-y-1 overflow-y-auto max-h-48" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#FFD040 transparent'
                }}>
                  {stations.map((station) => (
                    <div
                      key={station.id}
                      onClick={() => handleRenderStation(station)}
                      className={`p-2 text-xs rounded cursor-pointer transition-colors ${
                        selectedStation?.id === station.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-medium">{station.name}</div>
                      <div className="text-gray-400">{station.ars_id || station.station_id}</div>
                      <div className="text-xs text-gray-500">
                        {station.location.latitude.toFixed(4)}, {station.location.longitude.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Station Info */}
            {selectedStation && (
              <div className="p-3 space-y-2 rounded-lg bg-gray-900/30">
                <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">Selected Station</div>
                <div className="p-3 text-xs text-white bg-gray-700 rounded">
                  <div className="mb-1 font-semibold">{selectedStation.name}</div>
                  <div className="text-gray-300">ID: {selectedStation.ars_id || selectedStation.station_id}</div>
                  <div className="text-gray-300">Address: {selectedStation.location.address}</div>
                  <div className="mt-1 text-gray-400">
                    Lat: {selectedStation.location.latitude.toFixed(6)}<br/>
                    Lng: {selectedStation.location.longitude.toFixed(6)}
                  </div>
                </div>
              </div>
            )}

            {/* Vulnerability System */}
            <div className="p-3 pt-6 mt-8 border-t border-gray-600 rounded-lg bg-gray-900/30">
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