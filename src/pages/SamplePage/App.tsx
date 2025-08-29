import { useEffect, useState } from 'react'
import CesiumViewer from '@/components/CesiumViewer'
import MobXTest from '@/components/MobXTest'
import { addTestMarker, flyToLocation, addMarker, clearAllEntities, initializePMFrontend } from '@/utils/cesiumControls'

function App(props: any) {
  // const { onCloseMicroApp, dispatch } = props
  console.log(props)
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [isUsingParentViewer, setIsUsingParentViewer] = useState(false)

  useEffect(() => {
    // Cesium 초기화 및 상태 감지
    const checkCesiumStatus = () => {
      const isQiankun = (window as any).__POWERED_BY_QIANKUN__
      const parentViewer = (window as any).cviewer
      
      if (isQiankun && parentViewer) {
        console.log('[SamplePage] 부모 Cesium Viewer 감지됨')
        setIsUsingParentViewer(true)
        setCesiumStatus('ready')
        // 부모 Viewer에 즉시 테스트 마커 추가
        addTestMarker(parentViewer)
      } else if (!isQiankun) {
        // 독립 모드에서는 CesiumViewer 컴포넌트가 window.cviewer를 설정할 때까지 대기
        const waitForViewer = setInterval(() => {
          if ((window as any).cviewer) {
            console.log('[SamplePage] 독립 Cesium Viewer 준비됨')
            setIsUsingParentViewer(false)
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

  // Cesium 제어 함수들
  const handleAddTestMarker = () => {
    if (cesiumStatus !== 'ready') return
    const viewer = (window as any).cviewer
    if (viewer) {
      addTestMarker(viewer)
    }
  }

  const handleFlyToBusan = () => {
    if (cesiumStatus !== 'ready') return
    const viewer = (window as any).cviewer
    if (viewer) {
      flyToLocation(viewer, 129.0756, 35.1796, 1000)
    }
  }

  const handleAddCustomMarker = () => {
    if (cesiumStatus !== 'ready') return
    const viewer = (window as any).cviewer
    if (viewer) {
      addMarker(viewer, {
        name: 'Custom Marker',
        longitude: 129.1756,
        latitude: 35.2796,
        text: 'Custom Location'
      })
    }
  }

  const handleClearAll = () => {
    if (cesiumStatus !== 'ready') return
    const viewer = (window as any).cviewer
    if (viewer) {
      clearAllEntities(viewer)
    }
  }

  return (
    <div
      className="pm-frontend-scope"
    >
      {/* 전체 화면 Cesium Viewer */}
      <div className="w-full h-screen">
        <CesiumViewer />
      </div>

      {/* 오버레이 제어 패널 */}
      <div className="fixed top-4 left-4 w-60 h-[720px] bg-slate-800 bg-opacity-50 rounded-lg border border-gray-400 border-opacity-30 z-[2000]">
        {/* Header */}
        <div className="p-4 text-white rounded-t-lg bg-gradient-to-r from-blue-500 to-blue-600 bg-blue-500/80">
          <div className="text-lg font-semibold text-white">PM Control Panel</div>
          <div className="text-sm text-blue-100">Microfrontend Controls</div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto h-[632px]">
          <div className="pb-4 border-b border-gray-300/30">
            <div className="mb-2 text-sm font-medium text-white">State Management</div>
            <MobXTest />
          </div>
          
          <div className="pb-4 border-b border-gray-300/30">
            <div className="mb-2 text-sm font-medium text-white">Cesium Status</div>
            <div className="space-y-1 text-xs text-white">
              <div>
                Status: <div className={`inline ${cesiumStatus === 'ready' ? 'text-green-400' : cesiumStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {cesiumStatus === 'ready' ? '✅ Ready' : cesiumStatus === 'error' ? '❌ Error' : '⏳ Loading'}
                </div>
              </div>
              <div>Mode: {isUsingParentViewer ? '🔗 Parent Viewer' : '🔧 Independent'}</div>
            </div>
          </div>
          
          <div>
            <div className="mb-2 text-sm font-medium text-white">Cesium Controls</div>
            <div className="space-y-2">
              <div 
                onClick={handleAddTestMarker}
                className={`w-full px-3 py-1 text-xs text-white rounded cursor-pointer text-center ${
                  cesiumStatus === 'ready' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                Add Test Marker
              </div>
              <div 
                onClick={handleFlyToBusan}
                className={`w-full px-3 py-1 text-xs text-white rounded cursor-pointer text-center ${
                  cesiumStatus === 'ready' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                Fly to Busan
              </div>
              <div 
                onClick={handleAddCustomMarker}
                className={`w-full px-3 py-1 text-xs text-white rounded cursor-pointer text-center ${
                  cesiumStatus === 'ready' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                Add Custom Marker
              </div>
              <div 
                onClick={handleClearAll}
                className={`w-full px-3 py-1 text-xs text-white rounded cursor-pointer text-center ${
                  cesiumStatus === 'ready' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                Clear All
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App