import { observer } from "mobx-react-lite";
import SimulationConfig from "./SimulationConfig";
import SimulationDetailConfig from "./SimulationDetailConfig";
import TabNavigation from "@/components/basic/TabNavigation";
import Title from "@/components/basic/Title";
import SimulationActiveTabList from "./SimulationActvieTabList";
import Spacer from "@/components/basic/Spacer";
import SimulationRunningList from "./SimulationRunningList";
import SimulationQuick from "./SimulationQuick";
import { simulationStore } from "@/stores/SimulationStore";

interface SimulationMainProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
}

const SimulationMain = observer(function App(props: SimulationMainProps) {

  const isQuickView = simulationStore.currentView === "quick";

  return (
    <>
      <Title
        info="※ 시뮬레이션 실행을 위한 설정 페이지입니다."
        infoTitle="시뮬레이션"
        onClose={() => simulationStore.setCurrentView("config")}
      >
        시뮬레이션
      </Title>

      <TabNavigation
        tabs={["맞춤실행", "빠른실행"]}
        activeTab={isQuickView ? 1 : 0}
        onTabChange={(index) => {
          if (index === 0) {
            simulationStore.setCurrentView("config");
          } else {
            simulationStore.setCurrentView("quick");
          }
        }}
      />

      <Spacer height={16} />

      {isQuickView ? (
        <SimulationQuick />
      ) : (
        <>
          <SimulationActiveTabList />
              {simulationStore.currentView === "config" ? (
                <SimulationConfig
                  onClose={props.onCloseMicroApp}
                  onLocationComplete={() => {
                    simulationStore.disableDirectLocationMode();
                    simulationStore.setCurrentView("detailConfig");
                  }}
                />
              ) : simulationStore.currentView === "detailConfig" ? (
                <SimulationDetailConfig
                  onBack={() => simulationStore.setCurrentView("config")}
                  onExecute={() => console.log("시뮬레이션 실행")}
                />
              ) : simulationStore.currentView === "running" ? (
                <SimulationRunningList />
              ) : null}
            </>
      


      )}
    </>
  );
});

export default SimulationMain;
