import { simulationStore } from "@/stores/SimulationStore";
import { observer } from "mobx-react-lite";
import type { SimulationActiveTab } from "../types";


const SimulationActiveTabList = observer(function SimulationActiveTabList() {
  const handleClick = (view: SimulationActiveTab) => {
  simulationStore.setActiveTab(view);
  }

  return (
  <div className="flex self-stretch gap-4">
    {/* 상세설정 */}
    <div
    className="flex-1 h-10 flex items-center justify-center gap-1 px-4 py-2.5 cursor-pointer"
    style={{
        background: simulationStore.activeTab === '상세설정' ? 'linear-gradient(180deg, #FDF106 0%, #FFD040 100%)' : '#696A6A',
        borderRadius: '19px'
    }}
    onClick={() => handleClick('상세설정')}
    >
      <div
          style={{
          fontFamily: 'Pretendard',
          fontSize: '16px',
          fontWeight: '700',
          lineHeight: 'normal',
          color: '#000',
          textAlign: 'center'
          }}
      >
          상세설정
      </div>
    </div>

    {/* 실행목록 */}
    <div
        className="flex-1 h-10 flex items-center justify-center gap-1 px-4 py-2.5 cursor-pointer"
      style={{
        background: simulationStore.activeTab === '실행목록' ? 'linear-gradient(180deg, #FDF106 0%, #FFD040 100%)' : '#696A6A',
        borderRadius: '19px'
      }}
      onClick={() => handleClick('실행목록')}
    >
      <div
        style={{
          fontFamily: 'Pretendard',
          fontSize: '16px',
          fontWeight: '500',
          lineHeight: 'normal',
          color: '#000',
          textAlign: 'center'
        }}
      >
        실행목록
      </div>
    </div>
  </div>
  );
});

export default SimulationActiveTabList;