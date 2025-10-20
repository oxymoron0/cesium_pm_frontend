import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import CesiumViewer from '@/components/CesiumViewer'
import Panel from '@/components/basic/Panel'
import SimulationConfirm from './components/SimulationConfirm'
import SimulationConfig from './components/SimulationConfig'
import SimulationDetailConfig from './components/SimulationDetailConfig'
import DirectLocationGuide from './components/DirectLocationGuide'
import { simulationStore } from '@/stores/SimulationStore'
import type { SimulationView } from './types'
import TabNavigation from '@/components/basic/TabNavigation'
import Title from '@/components/basic/Title'
import SimulationActiveTabList from './components/SimulationActvieTabList'
import Spacer from '@/components/basic/Spacer'
import SimulationRunningList from './components/SimulationRunningList'

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready'>('loading')
  const [activeTab, setActiveTab] = useState(0);
  const [activeList, setActiveList] = useState('상세설정');
  const [currentView, setCurrentView] = useState<SimulationView>('config')

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

      {/* Direct Location Guide - Top Center */}
      {cesiumStatus === 'ready' && simulationStore.isDirectLocationMode && (
        <DirectLocationGuide />
      )}

      {/* Simulation Panel - Left Top */}
      {cesiumStatus === 'ready' && (
        <Panel position="left" width="540px" maxHeight="calc(100vh - 160px)">
          <Title
            info="시뮬레이션 실행을 위한 설정 페이지입니다."
            onClose={()=> setCurrentView('config')}
          >
            시뮬레이션
          </Title>
          <TabNavigation
            tabs={['맞춤실행', '빠른실행']}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <Spacer height={16} />

          {activeTab === 0 ? (
            <>
            <SimulationActiveTabList 
              activeList={activeList}
              setActiveList={setActiveList}
            />
              {activeList === '상세설정' ? (
                <>
                {currentView === 'config' ? (
                  <SimulationConfig
                  onClose={props.onCloseMicroApp}
                  onLocationComplete={() => setCurrentView('detailConfig')}
                  />
                ) : currentView === 'detailConfig' ? (
                 <SimulationDetailConfig
                  // onBack={() => setCurrentView('config')}
                  onExecute={() => console.log('시뮬레이션 실행')}
                  />)
                : null}
                </>
              ) : activeList === '실행목록' ? (
                <SimulationRunningList />
              ) : null}
            </>
          ) 
          : 
          <div>
            빠른실행
          </div>
          }
        </Panel>
      )}

      {/* Loading State */}
      {cesiumStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-lg text-white">Cesium 초기화 중...</div>
        </div>
      )}

        {/* SimulationConfirm 모달 */}
      {simulationStore.isModalOpen && (
        <SimulationConfirm onClose={() => simulationStore.closeModal()} />
      )}
    </div>
  )
});

export default App