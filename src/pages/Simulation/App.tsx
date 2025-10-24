import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import CesiumViewer from "@/components/CesiumViewer";
import Panel from "@/components/basic/Panel";
import SimulationConfirm from "./components/SimulationConfirm";
import SimulationMain from "./components/SimulationMain";
import SimulationConfigInfo from "./components/SimulationConfigInfo";
import SimulationResultSummary from "./components/SimulationResultSummary";
import DirectLocationGuide from "./components/DirectLocationGuide";
import { simulationStore } from "@/stores/SimulationStore";
import { flyToLocation } from "@/utils/cesiumControls";
import SimulationQuickResult from "./components/SimulationQuickResult";

interface AppProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const App = observer(function App(props: AppProps) {
  const [cesiumStatus, setCesiumStatus] = useState<"loading" | "ready">(
    "loading"
  );
  const [showConfigInfo, setShowConfigInfo] = useState(false);
  const [showResultSummary, setShowResultSummary] = useState(false);


  useEffect(() => {
    const checkCesiumStatus = () => {
      const isQiankun = (window as any).__POWERED_BY_QIANKUN__;
      const parentViewer = (window as any).cviewer;

      if (isQiankun && parentViewer) {
        setCesiumStatus("ready");
        setTimeout(() => {
          flyToLocation(parentViewer, 129.0545, 35.1598, 3000);
        }, 500);
      } else if (!isQiankun) {
        const waitForViewer = setInterval(() => {
          if ((window as any).cviewer) {
            setCesiumStatus("ready");
            clearInterval(waitForViewer);
            setTimeout(() => {
              flyToLocation((window as any).cviewer!, 129.0545, 35.1598, 3000);
            }, 500);
          }
        }, 100);
      }
    };

    checkCesiumStatus();
  }, [cesiumStatus]);

  const isQiankun = (window as any).__POWERED_BY_QIANKUN__;

  return (
    <div className="relative w-full h-screen overflow-hidden pm-frontend-scope">
      {!isQiankun && <CesiumViewer />}

      {cesiumStatus === "ready" && simulationStore.isDirectLocationMode && (
        <DirectLocationGuide />
      )}

      {cesiumStatus === "ready" && (
        <Panel position="left" width={simulationStore.activeTab === '실행목록' ? "720px" : "540px"} maxHeight="calc(100vh - 160px)">
          {simulationStore.currentView === "config" || simulationStore.currentView === "detailConfig" ? (
            <SimulationMain
              onCloseMicroApp={props.onCloseMicroApp}
              dispatch={props.dispatch}
              setShowConfigInfo={setShowConfigInfo}
              setShowResultSummary={setShowResultSummary}
            />
          ) : (
            <SimulationQuickResult
              onCloseMicroApp={props.onCloseMicroApp}
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
        <SimulationConfirm onClose={() => simulationStore.closeModal()} />
      )}

      {showConfigInfo && (
        <SimulationConfigInfo onClose={() => setShowConfigInfo(false)} />
      )}
      {showResultSummary && (
        <SimulationResultSummary onClose={() => setShowResultSummary(false)} />
      )}
    </div>
  );
});

export default App;
