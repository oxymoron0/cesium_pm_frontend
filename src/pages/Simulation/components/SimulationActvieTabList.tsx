import { simulationStore } from "@/stores/SimulationStore";
import { observer } from "mobx-react-lite";


const SimulationActiveTabList = observer(function SimulationActiveTabList() {
  // currentView를 기반으로 활성 탭 계산 (단방향 데이터 플로우)
  const customTab = (simulationStore.currentView === 'config' || simulationStore.currentView === 'detailConfig') ? '0' : '1';

  const handleClick = (tab: string) => {
    if (tab === '0') {
      simulationStore.setCurrentView('config')
    } else {
      simulationStore.setCurrentView('running')
    }
  }

  return (
  <div className="flex self-stretch gap-4">
    {/* 상세설정 */}
    <div
    className="flex-1 h-10 flex items-center justify-center gap-1 px-4 py-2.5 cursor-pointer"
    style={{
        background: customTab === '0' ? 'linear-gradient(180deg, #FDF106 0%, #FFD040 100%)' : '#696A6A',
        borderRadius: '19px'
    }}
    onClick={() => handleClick('0')}
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
        background: customTab === '1' ? 'linear-gradient(180deg, #FDF106 0%, #FFD040 100%)' : '#696A6A',
        borderRadius: '19px'
      }}
      onClick={() => handleClick('1')}
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