import { useEffect, useState } from 'react'
import CesiumViewer from '../../components/CesiumViewer'
import Panel from '../../components/basic/Panel'

function App(props: any) {
  // const { onCloseMicroApp, dispatch } = props
  console.log(props)
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')

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
          }
        }, 100)
      }
    }
    checkCesiumStatus()
  }, [cesiumStatus])



  return (
    <div
      className="pm-frontend-scope"
    >
      {/* 전체 화면 Cesium Viewer */}
      <div className="w-full h-screen">
        <CesiumViewer />
      </div>

      {/* 오버레이 제어 패널 */}
      <Panel>
        <div className="text-xl">기본 폰트 테스트</div>
        <div className="font-suit text-xl">SUIT 폰트 테스트</div>
        <div className="font-suit text-xl font-bold">SUIT Bold 테스트</div>
        <div className="font-suit text-2xl font-black">SUIT Heavy 테스트</div>
      </Panel>
    </div>
  )
}

export default App