import { observer } from "mobx-react-lite";

interface SimulationActiveTabProps {
  activeList? : String;
  setActiveList? : (selected: string) => void;
}

const SimulationActiveTabList = observer(function SimulationActiveTabList({ activeList, setActiveList }: SimulationActiveTabProps) {
  const handleClick = (view: string) => {
    if (setActiveList) {
      setActiveList(view);
    }
  }

  return (
  <div className="flex self-stretch gap-4">
    {/* 상세설정 */}
    <div
    className="flex-1 h-10 flex items-center justify-center gap-1 px-4 py-2.5 cursor-pointer"
    style={{
        background: activeList === '상세설정' ? 'linear-gradient(180deg, #FDF106 0%, #FFD040 100%)' : '#696A6A',
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
        background: activeList === '실행목록' ? 'linear-gradient(180deg, #FDF106 0%, #FFD040 100%)' : '#696A6A',
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