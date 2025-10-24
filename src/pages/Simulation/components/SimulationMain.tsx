import { useState } from "react";
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
  setShowConfigInfo: (value: boolean) => void;
  setShowResultSummary: (value: boolean) => void;
}

const SimulationMain = observer(function App(props: SimulationMainProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <Title
        info="시뮬레이션 실행을 위한 설정 페이지입니다."
        onClose={() => simulationStore.setCurrentView("config")}
      >
        시뮬레이션
      </Title>

      <TabNavigation
        tabs={["맞춤실행", "빠른실행"]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Spacer height={16} />

      {activeTab === 0 ? (
        <>
          <SimulationActiveTabList />
          {simulationStore.activeTab === "상세설정" ? (
            <>
              {simulationStore.currentView === "config" ? (
                <SimulationConfig
                  onClose={props.onCloseMicroApp}
                  onLocationComplete={() => simulationStore.setCurrentView("detailConfig")}
                />
              ) : simulationStore.currentView === "detailConfig" ? (
                <SimulationDetailConfig
                  onBack={() => simulationStore.setCurrentView("config")}
                  onExecute={() => console.log("시뮬레이션 실행")}
                  onShowPanels={() => {
                    props.setShowConfigInfo(true);
                    props.setShowResultSummary(true);
                  }}
                />
              ) : null}
            </>
          ) : simulationStore.activeTab === "실행목록" ? (
            <SimulationRunningList />
          ) : null}
        </>
      ) : (
        <SimulationQuick />
      )}
    </>
  );
});

export default SimulationMain;
