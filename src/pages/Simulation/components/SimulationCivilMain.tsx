import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import Spacer from "@/components/basic/Spacer";
import { simulationStore } from "@/stores/SimulationStore";
import SimulationCivilConfig from "./SimulationCivilConfig";

// interface SimulationCivilMainProps {
//   onCloseMicroApp?: () => void;
// }

const SimulationCivilMain = observer(function App() {  

  return (
    <>
      <Title
        info="※ 부산진구에서 발생한 미세먼지(PM-10)의 확산을 시뮬레이션할 수 있습니다."
        infoTitle="시뮬레이션"
        onClose={() => simulationStore.setCurrentView('civilConfig')}
        onMinimize={() => simulationStore.toggleMinimize()}
      >
        시뮬레이션
      </Title>

      <div style={{ display: simulationStore.isMinimized ? 'none' : 'contents' }}>

        <Spacer height={16} />

        <SimulationCivilConfig 
        onBack={() => simulationStore.setCurrentView('civilConfig')} 
        />      
      </div>
    </>
  );
});

export default SimulationCivilMain;
