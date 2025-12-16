import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import Panel from '@/components/basic/Panel';
import SimulationConfirm from '@/pages/Simulation/components/SimulationConfirm';
import SimulationMain from '@/pages/Simulation/components/SimulationMain';
import SimulationConfigInfo from '@/pages/Simulation/components/SimulationConfigInfo';
import SimulationResultSummary from '@/pages/Simulation/components/SimulationResultSummary';
import DirectLocationGuide from '@/pages/Simulation/components/DirectLocationGuide';
import SimulationQuickGuide from '@/pages/Simulation/components/SimulationQuickGuide';
import SimulationQuickResult from '@/pages/Simulation/components/SimulationQuickResult';
import SimulationStationHtmlRenderer from '@/components/service/SimulationStationHtmlRenderer';
import SimulationGlbHeatmapRender from '@/components/service/SimulationGlbHeatmapRender';
import SimulationCivilMain from '@/pages/Simulation/components/SimulationCivilMain';
import { simulationStore } from '@/stores/SimulationStore';
import { flyToLocation } from '@/utils/cesiumControls';
import { clearLocationMarker } from '@/utils/cesium/locationMarker';
import { disableDirectLocationClickHandler } from '@/utils/cesium/directLocationRenderer';
import { isCivil as getIsCivil } from '@/utils/env';
import { clearSimulationCesium } from '../../utils/cesiumCleanup';

interface SimulationViewProps {
  isActive: boolean;
  cesiumStatus: 'loading' | 'ready' | 'error';
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const SimulationView = observer(function SimulationView({
  isActive,
  cesiumStatus,
  onCloseMicroApp,
  dispatch,
}: SimulationViewProps) {
  const isInitializedRef = useRef(false);
  const wasActiveRef = useRef(false);
  const isCivil = getIsCivil();

  // 초기화 (최초 활성화 시)
  useEffect(() => {
    if (!isActive || cesiumStatus !== 'ready' || isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    // Store 상태 초기화 (초기 화면으로 복귀) + Civil 모드 동기화
    simulationStore.cleanup();
    simulationStore.initializeCivilMode();

    // 초기 위치로 이동
    if (window.cviewer) {
      flyToLocation(window.cviewer, 129.0545, 35.1598, 3000);
    }
  }, [isActive, cesiumStatus]);

  // Clear location marker when leaving config views
  useEffect(() => {
    if (!isActive) return;

    const isConfigView = simulationStore.currentView === 'config';

    if (!isConfigView) {
      clearLocationMarker();
      disableDirectLocationClickHandler();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, simulationStore.currentView]);

  // 서비스 전환 시 Cesium 정리/복원
  useEffect(() => {
    // 비활성화될 때: Cesium 정리 + Store 상태 초기화
    if (wasActiveRef.current && !isActive) {
      console.log('[SimulationView] Deactivating - clearing Cesium entities and resetting store');
      clearSimulationCesium();
      simulationStore.cleanup();
    }

    // 재활성화될 때: Store 상태 초기화 후 렌더링
    if (!wasActiveRef.current && isActive && isInitializedRef.current && cesiumStatus === 'ready') {
      console.log('[SimulationView] Reactivating - resetting store to initial state');
      simulationStore.cleanup();
      simulationStore.initializeCivilMode();
    }

    wasActiveRef.current = isActive;
  }, [isActive, cesiumStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[SimulationView] Component unmounting, cleaning up');
      clearSimulationCesium();
      simulationStore.cleanup();
    };
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <>
      {!isCivil ? (
        <>
          {/* 행정 */}
          {cesiumStatus === 'ready' && simulationStore.isDirectLocationMode && (
            <DirectLocationGuide />
          )}

          {cesiumStatus === 'ready' && simulationStore.isSimulationQuickGuideMode && (
            <SimulationQuickGuide />
          )}

          {cesiumStatus === 'ready' &&
            simulationStore.currentView === 'quickResult' && (
              <>
                <SimulationStationHtmlRenderer />
                <SimulationGlbHeatmapRender />
              </>
            )}

          {cesiumStatus === 'ready' &&
            simulationStore.currentView !== 'result' && (
              <Panel
                position="left"
                width={
                  simulationStore.currentView === 'quick' ||
                  simulationStore.currentView === 'quickResult' ||
                  simulationStore.currentView === 'running'
                    ? '720px'
                    : '540px'
                }
                maxHeight="calc(100vh - 50px)"
                allowOverflow={true}
              >
                {simulationStore.currentView === 'quickResult' ? (
                  <SimulationQuickResult onCloseMicroApp={onCloseMicroApp} />
                ) : (
                  <SimulationMain
                    onCloseMicroApp={onCloseMicroApp}
                    dispatch={dispatch}
                  />
                )}
              </Panel>
            )}

          {cesiumStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-lg text-white">Cesium 초기화 중...</div>
            </div>
          )}

          {simulationStore.isModalOpen && <SimulationConfirm />}

          {simulationStore.isConfigPopupOpen && (
            <SimulationConfigInfo
              onClose={() => simulationStore.closeConfigPopup()}
            />
          )}
          {simulationStore.isResultPopupOpen && (
            <SimulationResultSummary
              onClose={() => simulationStore.setCurrentView('running')}
            />
          )}
        </>
      ) : (
        <>
          {/* 대민 */}
          <Panel
            position="left"
            width={
              (simulationStore.currentView === 'civilConfig' ||
                simulationStore.currentView === 'civilResult') &&
              !simulationStore.isStationAnalysisMode
                ? '540px'
                : '720px'
            }
            maxHeight="calc(100vh - 50px)"
            allowOverflow={true}
          >
            <SimulationCivilMain onCloseMicroApp={onCloseMicroApp} />
          </Panel>

          {simulationStore.isModalOpen && <SimulationConfirm />}
        </>
      )}
    </>
  );
});

export default SimulationView;
