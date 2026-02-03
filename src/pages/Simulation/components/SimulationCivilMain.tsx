import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import Spacer from "@/components/basic/Spacer";
import SimulationCivilConfig from "./SimulationCivilConfig";
import SimulationCivilResult from "./SimulationCivilResult";
import { simulationStore } from "@/stores/SimulationStore";
import { cleanupAll } from "../cleanup";

interface SimulationCivilMainProps {
  onCloseMicroApp?: () => void;
}

const SimulationCivilMain = observer(function App({onCloseMicroApp}: SimulationCivilMainProps) {
  const { currentView, isMinimized, isCivilInputDirty, civilConfigKey } = simulationStore;

  /**
   * Step-by-step back navigation handler
   * Flow: StationAnalysis → civilResult → civilList → civilConfig → close app
   */
  const handleBack = async () => {
    // If at config screen with dirty input, show confirmation
    if (currentView === 'civilConfig' && isCivilInputDirty) {
      const result = await simulationStore.openModal('moveReset');
      if (result !== 'confirm') return;
      // Explicit cleanup before unmount (cleanupAll includes simulationStore.cleanup())
      console.log('[SimulationCivilMain] X button pressed with dirty input, cleaning up');
      cleanupAll();
      onCloseMicroApp?.();
      return;
    }

    // Step-by-step navigation
    const isAtInitial = simulationStore.goBackCivil();

    if (isAtInitial) {
      // Explicit cleanup before unmount (matches Monitoring pattern)
      console.log('[SimulationCivilMain] X button pressed at initial screen, cleaning up');
      cleanupAll();
      onCloseMicroApp?.();
    }
  };
  
  return (
    <>
      <Title
        info={currentView === 'civilConfig' ? "※ 부산진구에서 발생한 미세먼지(PM-10)의 확산을 시뮬레이션할 수 있습니다." : undefined}
        infoTitle={(currentView === 'civilConfig' || currentView === 'civilList') ? "시뮬레이션"
          : currentView === 'civilResult' && !simulationStore.isStationAnalysisMode ? "시뮬레이션 설정 정보"
          : "상세 시뮬레이션 결과"}
        onBack={currentView !== 'civilConfig' ? handleBack : undefined}
        onClose={handleBack}
        onMinimize={() => simulationStore.toggleMinimize()}
      >
        {(currentView === 'civilConfig' || currentView === 'civilList') ? "시뮬레이션"
          : currentView === 'civilResult' && !simulationStore.isStationAnalysisMode ? "시뮬레이션 설정 정보"
          : "상세 시뮬레이션 결과"}
      </Title>

      <div style={{ display: isMinimized ? 'none' : 'contents' }}>

        <Spacer height={16} />
        {/* {(currentView === 'civilConfig' || currentView === 'civilList') && <SimulationCivilConfig onBack={handleOnclose} key={civilConfigKey}/>}  */}
        {(currentView === 'civilConfig' || currentView === 'civilList') && <SimulationCivilConfig key={civilConfigKey}/>} 
        {currentView === 'civilResult' && <SimulationCivilResult />}

      </div>
    </>
  );
});

export default SimulationCivilMain;
