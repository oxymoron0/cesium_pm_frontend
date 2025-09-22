import { useEffect, useState } from 'react'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'

interface AppProps {
  [key: string]: unknown;
}

function App(props: AppProps) {
  console.log(props)
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    // Cesium 초기화 및 상태 감지
    const checkCesiumStatus = () => {
      const isQiankun = window.__POWERED_BY_QIANKUN__
      const parentViewer = window.cviewer

      if (isQiankun && parentViewer) {
        console.log('[Template] 부모 Cesium Viewer 감지됨')
        setCesiumStatus('ready')
      } else if (!isQiankun) {
        console.log('[Template] 독립 실행 모드 - Cesium Viewer 초기화 대기')
        // 독립 실행 시 CesiumViewer 컴포넌트가 초기화될 때까지 대기
        const waitForViewer = setInterval(() => {
          if (window.cviewer) {
            console.log('[Template] 독립 Cesium Viewer 초기화 완료')
            setCesiumStatus('ready')
            clearInterval(waitForViewer)
          }
        }, 100)

        // 10초 후 타임아웃
        setTimeout(() => {
          if (cesiumStatus === 'loading') {
            console.error('[Template] Cesium Viewer 초기화 타임아웃')
            setCesiumStatus('error')
            clearInterval(waitForViewer)
          }
        }, 10000)

        return () => clearInterval(waitForViewer)
      } else {
        console.error('[Template] Qiankun 환경이지만 부모 Viewer를 찾을 수 없음')
        setCesiumStatus('error')
      }
    }

    checkCesiumStatus()
  }, [cesiumStatus])

  const renderContent = () => {
    switch (cesiumStatus) {
      case 'loading':
        return (
          <Panel position="left">
            <div className="p-4">
              <h2 className="text-lg font-bold mb-2">Template Page</h2>
              <p className="text-gray-600">Cesium 초기화 중...</p>
            </div>
          </Panel>
        )
      case 'error':
        return (
          <Panel position="left">
            <div className="p-4">
              <h2 className="text-lg font-bold mb-2">Template Page</h2>
              <p className="text-red-600">Cesium 초기화 실패</p>
            </div>
          </Panel>
        )
      case 'ready':
        return (
          <Panel position="left">
            <div className="p-4">
              <h2 className="text-lg font-bold mb-2">Template Page</h2>
              <p className="text-green-600">Cesium 준비 완료</p>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  환경: {window.__POWERED_BY_QIANKUN__ ? 'Qiankun' : '독립 실행'}
                </p>
              </div>
            </div>
          </Panel>
        )
    }
  }

  const isQiankun = window.__POWERED_BY_QIANKUN__

  return (
    <div className="pm-frontend-scope h-full w-full">
      {!isQiankun && <CesiumViewer />}
      {renderContent()}
    </div>
  )
}

export default App