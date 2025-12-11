import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import Spacer from "@/components/basic/Spacer";
import SimulationCivilConfig from "./SimulationCivilConfig";
import SimulationCivilResult from "./SimulationCivilResult";
import { simulationStore } from "@/stores/SimulationStore";

// interface SimulationCivilMainProps {
//   onCloseMicroApp?: () => void;
// }

const SimulationCivilMain = observer(function App() {  
  const { currentView, isMinimized } = simulationStore;

  const handleOnclose = () => {
    simulationStore.setCurrentView('civilConfig')
    simulationStore.closeCivilStationAnalysis();
  }
  
  return (
    <>
      <Title
        info="※ 부산진구에서 발생한 미세먼지(PM-10)의 확산을 시뮬레이션할 수 있습니다."
        infoTitle={(currentView === 'civilConfig' || currentView === 'civilList') ? "시뮬레이션" 
          : currentView === 'civilResult' ? "시뮬레이션 설정 정보" 
          : "상세 시뮬레이션 결과"}
        onClose={handleOnclose}
        onMinimize={() => simulationStore.toggleMinimize()}
      >
        {(currentView === 'civilConfig' || currentView === 'civilList') ? "시뮬레이션" 
          : currentView === 'civilResult' ? "시뮬레이션 설정 정보" 
          : "상세 시뮬레이션 결과"}
      </Title>

      <div style={{ display: isMinimized ? 'none' : 'contents' }}>

        <Spacer height={16} />
        {(currentView === 'civilConfig' || currentView === 'civilList') && <SimulationCivilConfig onBack={() => simulationStore.setCurrentView('civilConfig')} />} 
        {currentView === 'civilResult' && <SimulationCivilResult />}

      </div>
    </>
  );
});

export default SimulationCivilMain;
