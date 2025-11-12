import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import Icon from '@/components/basic/Icon'
import PriorityConfig from './components/PriorityConfig'
import PriorityCustomConfig from './components/PriorityCustomConfig'
import PriorityResult from './components/PriorityResult'
import NearbyRoadList from './components/NearbyRoadList'
import PriorityLocationGuide from './components/PriorityLocationGuide'
import PriorityStatistics from './components/PriorityStatistics'
import { priorityStore } from '@/stores/PriorityStore'
import { administrativeStore } from '@/stores/AdministrativeStore'
import { routeStore } from '@/stores/RouteStore'
import { stationStore } from '@/stores/StationStore'
import type { PriorityView, PriorityConfig as PriorityConfigData } from './types'

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [currentView, setCurrentView] = useState<PriorityView>('config')
  const [configData, setConfigData] = useState<PriorityConfigData | null>(null)
  const [locationMode, setLocationMode] = useState<'address' | 'point'>('address')
  const [isStatisticsPopupOpen, setIsStatisticsPopupOpen] = useState(false)

  useEffect(() => {
    // Cesium 초기화 및 상태 감지
    const checkCesiumStatus = () => {
      const isQiankun = window.__POWERED_BY_QIANKUN__
      const parentViewer = window.cviewer

      if (isQiankun && parentViewer) {
        console.log('[Priority] 부모 Cesium Viewer 감지됨')
        setCesiumStatus('ready')
      } else if (!isQiankun) {
        console.log('[Priority] 독립 실행 모드 - Cesium Viewer 초기화 대기')
        // 독립 실행 시 CesiumViewer 컴포넌트가 초기화될 때까지 대기
        const waitForViewer = setInterval(() => {
          if (window.cviewer) {
            console.log('[Priority] 독립 Cesium Viewer 초기화 완료')
            setCesiumStatus('ready')
            clearInterval(waitForViewer)
          }
        }, 100)

        return () => clearInterval(waitForViewer)
      } else {
        console.error('[Priority] Qiankun 환경이지만 부모 Viewer를 찾을 수 없음')
        setCesiumStatus('error')
      }
    }

    checkCesiumStatus()

    // Cleanup on unmount
    return () => {
      administrativeStore.clearSelection()
      console.log('[Priority] Cleared administrative selection on unmount')
    }
  }, [cesiumStatus])

  // RouteStore와 StationStore 초기화
  useEffect(() => {
    const initializeStores = async () => {
      try {
        // RouteStore 초기화 (노선 정보 및 geometry 로드)
        if (routeStore.routeInfoList.length === 0) {
          console.log('[Priority] Initializing RouteStore')
          await routeStore.initializeRouteData()
        }

        // StationStore 초기화 (모든 노선의 정류장 데이터 로드)
        if (stationStore.stationDataMap.size === 0 && routeStore.routeInfoList.length > 0) {
          console.log('[Priority] Initializing StationStore')
          const routeNames = routeStore.routeInfoList.map(route => route.route_name)

          const stationLoadPromises = routeNames.flatMap(routeName => [
            stationStore.loadStations(routeName, 'inbound'),
            stationStore.loadStations(routeName, 'outbound')
          ])

          await Promise.all(stationLoadPromises)
          console.log('[Priority] Station data loading completed')
        }
      } catch (error) {
        console.error('[Priority] Store initialization failed:', error)
      }
    }

    if (cesiumStatus === 'ready') {
      initializeStores()
    }
  }, [cesiumStatus])

  const isQiankun = window.__POWERED_BY_QIANKUN__

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {/* Cesium Viewer */}
      {!isQiankun && <CesiumViewer />}

      {/* Priority Panel - Left Top */}
      {cesiumStatus === 'ready' && (
        <Panel position="left" width="540px" maxHeight="calc(100vh - 160px)" allowOverflow={currentView === 'customConfig'}>
          {currentView === 'config' ? (
            <PriorityConfig
              onClose={props.onCloseMicroApp}
              onCustomConfig={() => setCurrentView('customConfig')}
              onSearch={(config) => {
                setConfigData(config)
                setCurrentView('result')
              }}
            />
          ) : currentView === 'customConfig' ? (
            <PriorityCustomConfig
              onBack={() => {
                setLocationMode('address')
                setCurrentView('config')
              }}
              onSearch={(config) => {
                setConfigData(config)
                setCurrentView('result')
              }}
              locationMode={locationMode}
              setLocationMode={setLocationMode}
            />
          ) : (
            configData && (
              <PriorityResult
                config={configData}
                onBack={() => {
                  priorityStore.resetResultState()
                  setCurrentView('config')
                }}
                onClose={props.onCloseMicroApp}
              />
            )
          )}
        </Panel>
      )}

      {/* Priority Location Guide - Top Center */}
      {cesiumStatus === 'ready' && currentView === 'customConfig' && locationMode === 'point' && (
        <PriorityLocationGuide />
      )}

      {/* Nearby Road Panel - Right Top */}
      {cesiumStatus === 'ready' && currentView === 'result' && priorityStore.selectedRoads.length > 0 && (
        <Panel position="right" width="540px" maxHeight="calc(100vh - 160px)">
          <NearbyRoadList
            roads={priorityStore.selectedRoads}
            onClose={() => priorityStore.clearFacilitySelection()}
          />
        </Panel>
      )}

      {/* Statistics Button - Right Bottom */}
      {cesiumStatus === 'ready' && (
        <div className="absolute bottom-26 right-26 z-[1000]">
          <button
            onClick={() => setIsStatisticsPopupOpen(!isStatisticsPopupOpen)}
            className={`
              flex flex-col items-center justify-center gap-1
              w-[72px] h-[72px] rounded-lg border-2 border-white
              font-pretendard text-[13px] font-bold
              cursor-pointer transition-all duration-200
              ${isStatisticsPopupOpen
                ? 'bg-gradient-to-b from-[#FDF106] to-[#FFD040] text-black'
                : 'bg-black/65 text-white'
              }
            `}
          >
            <div style={{ filter: isStatisticsPopupOpen ? 'invert(1)' : 'none' }}>
              <Icon name="chart" className="w-8 h-8" />
            </div>
            통계
          </button>
        </div>
      )}

      {/* Priority Statistics Popup */}
      {isStatisticsPopupOpen && (
        <PriorityStatistics onClose={() => setIsStatisticsPopupOpen(false)} />
      )}

      {/* Loading State */}
      {cesiumStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-lg text-white">Cesium 초기화 중...</div>
        </div>
      )}

      {/* Error State */}
      {cesiumStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-lg text-red-500">Cesium 초기화 실패</div>
        </div>
      )}
    </div>
  )
})

export default App