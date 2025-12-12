import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import Spacer from "@/components/basic/Spacer";
import SimulationCivilConfig from "./SimulationCivilConfig";
import SimulationCivilResult from "./SimulationCivilResult";
import { simulationStore } from "@/stores/SimulationStore";

interface SimulationCivilMainProps {
  onCloseMicroApp?: () => void;
}

const SimulationCivilMain = observer(function App({onCloseMicroApp}: SimulationCivilMainProps) {  
  const { currentView, isMinimized, isCivilInputDirty, civilConfigKey } = simulationStore;

const handleOnclose = async () => {
    // 설정 화면이고, 입력값이 있다면 경고 팝업
    if (currentView === 'civilConfig' && isCivilInputDirty) {
      const result = await simulationStore.openModal('moveReset'); // 'moveReset' 타입 사용
      
      if (result !== 'confirm') return;
    }

    if (currentView === 'civilConfig') {
      // 다음 실행을 위해 상태는 초기화해두고 창 닫기
      simulationStore.resetCivilConfig(); 
      onCloseMicroApp?.(); // 마이크로앱 닫기 함수 실행
      return;
    }

    // 초기화 및 화면 전환
    simulationStore.resetCivilConfig();
    
    // (만약 추가적인 닫기 로직이 있다면 여기에 작성)
    simulationStore.closeCivilStationAnalysis(); // 필요시 호출
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
        {(currentView === 'civilConfig' || currentView === 'civilList') && <SimulationCivilConfig onBack={handleOnclose} key={civilConfigKey}/>} 
        {currentView === 'civilResult' && <SimulationCivilResult />}

      </div>
    </>
  );
});

export default SimulationCivilMain;
