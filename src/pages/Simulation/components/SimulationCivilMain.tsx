import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import Spacer from "@/components/basic/Spacer";
import { simulationStore } from "@/stores/SimulationStore";
import SimulationCivilConfig from "./SimulationCivilConfig";

// interface SimulationCivilMainProps {
//   onCloseMicroApp?: () => void;
//   onMinimize?: () => void;
//   dispatch?: (action: unknown) => void;
// }

const SimulationCivilMain = observer(function App() {  

  return (
    <>
      <Title
        info="※ 시뮬레이션 실행을 위한 설정 페이지입니다."
        infoTitle="시뮬레이션"
        onClose={() => simulationStore.setCurrentView("config")}
        onMinimize={() => simulationStore.toggleMinimize()}
      >
        시뮬레이션
      </Title>

      <div style={{ display: simulationStore.isMinimized ? 'none' : 'contents' }}>

        <Spacer height={16} />

        <SimulationCivilConfig />      
      </div>
    </>
  );
});

export default SimulationCivilMain;
