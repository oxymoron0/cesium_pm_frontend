import { useState } from "react";
import { observer } from "mobx-react-lite";
import SimulationConfig from "./SimulationConfig";
import SimulationDetailConfig from "./SimulationDetailConfig";
import type { SimulationView } from "../types";
import TabNavigation from "@/components/basic/TabNavigation";
import Title from "@/components/basic/Title";
import SimulationActiveTabList from "./SimulationActvieTabList";
import Spacer from "@/components/basic/Spacer";
import SimulationRunningList from "./SimulationRunningList";
import SimulationQuick from "./SimulationQuick";

interface SimulationMainProps {
  onCloseMicroApp?: () => void;
  dispatch?: (action: unknown) => void;
  setShowConfigInfo: (value: boolean) => void;
  setShowResultSummary: (value: boolean) => void;
  currentView: SimulationView;
  setCurrentView: (v: SimulationView) => void;
}

const SimulationMain = observer(function App(props: SimulationMainProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeList, setActiveList] = useState("상세설정");
  const { currentView, setCurrentView } = props;

  return (
    <>
      <Title
        info="시뮬레이션 실행을 위한 설정 페이지입니다."
        onClose={() => setCurrentView("config")}
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
          <SimulationActiveTabList
            activeList={activeList}
            setActiveList={setActiveList}
          />
          {activeList === "상세설정" ? (
            <>
              {currentView === "config" ? (
                <SimulationConfig
                  onClose={props.onCloseMicroApp}
                  onLocationComplete={() => setCurrentView("detailConfig")}
                />
              ) : currentView === "detailConfig" ? (
                <SimulationDetailConfig
                  onBack={() => setCurrentView("config")}
                  onExecute={() => console.log("시뮬레이션 실행")}
                  onShowPanels={() => {
                    props.setShowConfigInfo(true);
                    props.setShowResultSummary(true);
                  }}
                />
              ) : null}
            </>
          ) : activeList === "실행목록" ? (
            <SimulationRunningList />
          ) : null}
        </>
      ) : (
        <SimulationQuick setCurrentView={setCurrentView} />
      )}
    </>
  );
});

export default SimulationMain;
