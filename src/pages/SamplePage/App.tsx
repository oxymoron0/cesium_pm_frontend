import { useEffect, useState } from 'react'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import VulnerabilityManager from '@/components/service/VulnerabilityManager'
import { initializePMFrontend } from '@/utils/cesiumControls'
import { get } from '@/utils/api/request'
import { renderStation, renderStations, type Station } from '@/utils/cesium/testRenderer'
import { createDataSource, findDataSource, removeDataSource, clearDataSource, toggleDataSource } from '@/utils/cesium/datasources'
import { routeStore } from '@/stores/RouteStore'
import { stationStore } from '@/stores/StationStore'
import { renderAllRoutes } from '@/utils/cesium/routeRenderer'
import { renderBusModels, clearBusModels, toggleBusModels, getBusModelCount, flyToBusModel } from '@/utils/cesium/glbRenderer'
import { getBusTrajectoryInitial, type BusTrajectoryData } from '@/utils/api/busApi'

interface StationApiResponse {
  stations: Station[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

function App(props: any) {
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
      const isQiankun = (window as any).__POWERED_BY_QIANKUN__
      const parentViewer = (window as any).cviewer
      
      if (isQiankun && parentViewer) {
        console.log('[SamplePage] 부모 Cesium Viewer 감지됨')
        setCesiumStatus('ready')
      } else if (!isQiankun) {
        // 독립 모드에서는 CesiumViewer 컴포넌트가 window.cviewer를 설정할 때까지 대기
        const waitForViewer = setInterval(() => {
          if ((window as any).cviewer) {
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

  // RouteStore 초기화 및 렌더링 (앱 시작시 한 번만 실행)
  useEffect(() => {
    let isInitialized = false;
    
    const initializeData = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      await routeStore.initializeRouteData();
      
      // 데이터 로딩 완료 후 자동으로 모든 노선 렌더링
      if (routeStore.routeGeomMap.size > 0) {
        await renderAllRoutes();
      }

      // 초기 방향을 inbound로 설정
      stationStore.setSelectedDirection('inbound');
      console.log('[SamplePage] Initial direction set to inbound');
    };

    // Cesium이 준비된 후에 데이터 로딩 시작
    if (cesiumStatus === 'ready') {
      initializeData();
    }
  }, [cesiumStatus])

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
      const response = await get<StationApiResponse>('http://61.98.41.151:8088/api/v1/stations?page=1&per_page=20')
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
      const response = await get<StationApiResponse>(`http://61.98.41.151:8088/api/v1/stations/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20`)
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
      const response = await getBusTrajectoryInitial()
      setBusData(response.data)
      console.log('Fetched bus trajectory data:', response.data.length, 'buses')
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
      
      {/* UI Container Panel */}
      <Panel>
        <div className="w-full max-h-[936px] overflow-y-auto" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#FFD040 transparent'
        }}>
          <div className="sticky top-0 z-10 pb-2 mb-4 text-lg font-semibold bg-gray-800 border-b border-yellow-400">
            Bus GLB Models & Station Testing
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

            {/* Bus Model List */}
            {busData.length > 0 && (
              <div className="p-3 space-y-3 rounded-lg bg-gray-900/30">
                <div className="pb-1 text-sm font-semibold text-yellow-400 border-b border-yellow-400/20">Bus Models (Click to Fly To)</div>
                <div className="space-y-1 overflow-y-auto max-h-40" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#FFD040 transparent'
                }}>
                  {busData.map((bus) => (
                    <div
                      key={bus.vehicle_number}
                      onClick={() => handleFlyToBus(bus.vehicle_number)}
                      className="p-2 text-xs text-gray-200 transition-colors bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
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
}

export default App