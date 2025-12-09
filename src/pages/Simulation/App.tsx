import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import CesiumViewer from "@/components/CesiumViewer";
import Panel from "@/components/basic/Panel";
import SimulationConfirm from "./components/SimulationConfirm";
import SimulationMain from "./components/SimulationMain";
import SimulationConfigInfo from "./components/SimulationConfigInfo";
import SimulationResultSummary from "./components/SimulationResultSummary";
import DirectLocationGuide from "./components/DirectLocationGuide";
import SimulationQuickGuide from "./components/SimulationQuickGuide";
import { simulationStore } from "@/stores/SimulationStore";
import { flyToLocation } from "@/utils/cesiumControls";
import SimulationQuickResult from "./components/SimulationQuickResult";
import { clearLocationMarker } from "@/utils/cesium/locationMarker";
import { disableDirectLocationClickHandler } from "@/utils/cesium/directLocationRenderer";
import SimulationStationHtmlRenderer from "@/components/service/SimulationStationHtmlRenderer";
import SimulationGlbHeatmapRender from "@/components/service/SimulationGlbHeatmapRender";
import SimulationCivilMain from "./components/SimulationCivilMain";

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  const [cesiumStatus, setCesiumStatus] = useState<"loading" | "ready">(
    "loading"
  );
  const isCivil = import.meta.env.VITE_IS_CIVIL === 'true'

  useEffect(() => {
    const checkCesiumStatus = () => {
      const isQiankun = window.__POWERED_BY_QIANKUN__;
      const parentViewer = window.cviewer;

      if (isQiankun && parentViewer) {
        setCesiumStatus("ready");
        setTimeout(() => {
          flyToLocation(parentViewer, 129.0545, 35.1598, 3000);
        }, 500);
      } else if (!isQiankun) {
        const waitForViewer = setInterval(() => {
          if (window.cviewer) {
            setCesiumStatus("ready");
            clearInterval(waitForViewer);
            setTimeout(() => {
              flyToLocation(window.cviewer!, 129.0545, 35.1598, 3000);
            }, 500);
          }
        }, 100);
      }
    };

    checkCesiumStatus();
  }, [cesiumStatus]);

  // Clear location marker and disable handlers when leaving config/detailConfig views or switching tabs
  useEffect(() => {
    const isConfigView = simulationStore.currentView === "config"


    if (!isConfigView) {
      clearLocationMarker();
      disableDirectLocationClickHandler();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationStore.currentView]);

  const isQiankun = window.__POWERED_BY_QIANKUN__;

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {!isQiankun && <CesiumViewer />}

      {!isCivil ? <>
        {/* 행정 */}
        {cesiumStatus === "ready" && simulationStore.isDirectLocationMode && (
          <DirectLocationGuide />
        )}

        {cesiumStatus === "ready" && simulationStore.isSimulationQuickGuideMode && (
          <SimulationQuickGuide />
        )}

        {cesiumStatus === "ready" &&
          simulationStore.currentView == "quickResult" && (
          <>
            <SimulationStationHtmlRenderer />
            <SimulationGlbHeatmapRender />
          </>
        )}

        {cesiumStatus === "ready" && 
          simulationStore.currentView !== "result" && (
            <Panel
              position="left"
              width={
                simulationStore.currentView === "quick" ||
                simulationStore.currentView === "quickResult" ||
                simulationStore.currentView === "running" 
                  ? "720px"
                  : "540px"
              }
              maxHeight="calc(100vh - 50px)"
              allowOverflow={true}
            >
              {simulationStore.currentView === "quickResult" ? (
                <SimulationQuickResult
                  onCloseMicroApp={props.onCloseMicroApp}
                />
              ) : (
                <SimulationMain
                  onCloseMicroApp={props.onCloseMicroApp}
                  dispatch={props.dispatch}
                />
              )}
    
            </Panel>
          )}
        

        {cesiumStatus === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-lg text-white">Cesium 초기화 중...</div>
          </div>
        )}

        {simulationStore.isModalOpen && (
          <SimulationConfirm />
        )}

        {simulationStore.isConfigPopupOpen && (
          <SimulationConfigInfo onClose={() => simulationStore.closeConfigPopup()} />
        )}
        {simulationStore.isResultPopupOpen && (
          <SimulationResultSummary onClose={() => simulationStore.setCurrentView('running')} />
        )}
        </> :
        <>
        {/* 대민 */}
          <Panel
            position="left"
            width={"540px"}
            maxHeight="calc(100vh - 50px)"
            allowOverflow={true}
          >
            <SimulationCivilMain />
          </Panel>
        </>
      }
    </div>
  );
});

export default App;
