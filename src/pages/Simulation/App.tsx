import { useEffect, useState } from 'react'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import SimulationConfig from './components/SimulationConfig'

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

function App(props: AppProps) {
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready'>('loading')

  useEffect(() => {
    // Cesium 초기화 및 상태 감지
    const checkCesiumStatus = () => {
      const isQiankun = window.__POWERED_BY_QIANKUN__
      const parentViewer = window.cviewer

      if (isQiankun && parentViewer) {
        setCesiumStatus('ready')
      } else if (!isQiankun) {
        // 독립 모드에서는 CesiumViewer 컴포넌트가 window.cviewer를 설정할 때까지 대기
        const waitForViewer = setInterval(() => {
          if (window.cviewer) {
            setCesiumStatus('ready')
            clearInterval(waitForViewer)
          }
        }, 100)
      }
    }

    checkCesiumStatus()
  }, [cesiumStatus])

  const isQiankun = window.__POWERED_BY_QIANKUN__

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {/* Cesium Viewer */}
      {!isQiankun && <CesiumViewer />}

      {/* Simulation Panel - Left Top */}
      {cesiumStatus === 'ready' && (
        <Panel position="left" width="540px" maxHeight="calc(100vh - 160px)">
          <SimulationConfig onClose={props.onCloseMicroApp} />
        </Panel>
      )}

      {/* Loading State */}
      {cesiumStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-lg text-white">Cesium 초기화 중...</div>
        </div>
      )}
    </div>
  )
}

export default App