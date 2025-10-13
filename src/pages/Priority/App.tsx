import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import PriorityConfig from './components/PriorityConfig'
import PriorityResult from './components/PriorityResult'
import NearbyRoadList from './components/NearbyRoadList'
import { priorityStore } from '@/stores/PriorityStore'
import type { PriorityView, PriorityConfig as PriorityConfigData } from './types'

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [currentView, setCurrentView] = useState<PriorityView>('config')
  const [configData, setConfigData] = useState<PriorityConfigData | null>(null)

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

        // 10초 후 타임아웃
        setTimeout(() => {
          if (cesiumStatus === 'loading') {
            console.error('[Priority] Cesium Viewer 초기화 타임아웃')
            setCesiumStatus('error')
            clearInterval(waitForViewer)
          }
        }, 10000)

        return () => clearInterval(waitForViewer)
      } else {
        console.error('[Priority] Qiankun 환경이지만 부모 Viewer를 찾을 수 없음')
        setCesiumStatus('error')
      }
    }

    checkCesiumStatus()
  }, [cesiumStatus])

  const isQiankun = window.__POWERED_BY_QIANKUN__

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {/* Cesium Viewer */}
      {!isQiankun && <CesiumViewer />}

      {/* Priority Panel - Left Top */}
      {cesiumStatus === 'ready' && (
        <Panel position="left" width="540px" maxHeight="calc(100vh - 160px)">
          {currentView === 'config' ? (
            <PriorityConfig
              onClose={props.onCloseMicroApp}
              onSearch={(config) => {
                setConfigData(config)
                setCurrentView('result')
              }}
            />
          ) : (
            configData && (
              <PriorityResult
                config={configData}
                onBack={() => setCurrentView('config')}
                onClose={props.onCloseMicroApp}
              />
            )
          )}
        </Panel>
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