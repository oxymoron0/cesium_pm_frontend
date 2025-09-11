import { useEffect, useState } from 'react'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import VulnerabilityManager from '@/components/service/VulnerabilityManager'
import { initializePMFrontend } from '@/utils/cesiumControls'
import { get } from '@/utils/api/request'
import { renderStation, renderStations, type Station } from '@/utils/cesium/stationRenderer'
import { createDataSource, findDataSource, removeDataSource, clearDataSource, toggleDataSource } from '@/utils/cesium/datasources'

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

  // Station DataSource helper functions
  const [, setDsUpdateTrigger] = useState(0)
  
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

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {/* 전체 화면 Cesium Viewer */}
      <CesiumViewer />
      
      {/* UI Container Panel */}
      <Panel>
        <div className="w-full">
          <div className="pb-2 mb-4 text-lg font-semibold border-b border-yellow-400">
            Station DataSource Testing
          </div>
          
          <div className="space-y-6">
            {/* Status Section */}
            <div className="space-y-2">
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
            </div>

            {/* Station DataSource Test Controls */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-yellow-400">Station DataSource Tests</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCreateStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Create DS
                </button>
                <button
                  onClick={handleDeleteStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Delete DS
                </button>
                <button
                  onClick={handleClearStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Clear DS
                </button>
                <button
                  onClick={handleToggleStationDataSource}
                  disabled={cesiumStatus !== 'ready'}
                  className="px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Toggle Visibility
                </button>
              </div>
            </div>

            {/* Station API */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-yellow-400">Station API</div>
              <div className="space-y-2">
                <button
                  onClick={fetchStations}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Fetch Stations (20 items)'}
                </button>
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stations..."
                    className="flex-1 px-2 py-1 text-xs bg-gray-700 text-white border border-gray-600 rounded focus:border-yellow-400 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && searchStations()}
                  />
                  <button
                    onClick={searchStations}
                    disabled={loading || !searchQuery.trim()}
                    className="px-2 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Station Rendering */}
            {stations.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-yellow-400">Station Rendering</div>
                <button
                  onClick={handleRenderAllStations}
                  disabled={cesiumStatus !== 'ready'}
                  className="w-full px-3 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Render All Stations
                </button>
              </div>
            )}

            {/* Station List */}
            {stations.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-yellow-400">Station List (Click to Render)</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
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
                      <div className="text-gray-500 text-xs">
                        {station.location.latitude.toFixed(4)}, {station.location.longitude.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Station Info */}
            {selectedStation && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-yellow-400">Selected Station</div>
                <div className="p-3 bg-gray-700 rounded text-xs text-white">
                  <div className="font-semibold mb-1">{selectedStation.name}</div>
                  <div className="text-gray-300">ID: {selectedStation.ars_id || selectedStation.station_id}</div>
                  <div className="text-gray-300">Address: {selectedStation.location.address}</div>
                  <div className="text-gray-400 mt-1">
                    Lat: {selectedStation.location.latitude.toFixed(6)}<br/>
                    Lng: {selectedStation.location.longitude.toFixed(6)}
                  </div>
                </div>
              </div>
            )}

            {/* Vulnerability System */}
            <div className="mt-8 pt-6 border-t border-gray-600">
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