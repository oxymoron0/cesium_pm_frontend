import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Icon from '@/components/basic/Icon';
import Spacer from '@/components/basic/Spacer';
import { simulationStore } from '@/stores/SimulationStore';

interface SimulationCivilRealTimeWeatherProps {
  onShowListClick: () => void;
  hasError: boolean;
}

/**
 * 실시간 환경 정보 표시 컴포넌트 (시민용)
 */
const SimulationCivilRealTimeWeather = observer(function SimulationCivilRealTimeWeather({ 
  onShowListClick, 
  hasError
}: SimulationCivilRealTimeWeatherProps) {
  const { currentWeather } = simulationStore;

  useEffect(() => {
    simulationStore.loadWeatherInfo();
  }, []);

  const getCurrentFormattedTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = now.getHours();
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${String(hour).padStart(2, '0')}:${minute}`;
  };

  return (
    <>
      {/* 섹션 컨테이너 */}
      <div className="flex flex-col w-full">
        {/* 헤더 */}
        <div className="w-full bg-[#464646] py-2 px-4 flex justify-between items-center">
          <span className="text-white font-bold text-sm">실시간 환경 정보</span>
          <Icon name="refresh" className="w-6 h-6 cursor-pointer text-white" onClick={() => simulationStore.loadWeatherInfo()} />
        </div>

        {/* 컨텐츠 (읽기 전용) */}
        <div className="flex flex-col gap-2 py-4">
           {/* 현재 시간 */}
           <div className="flex items-center gap-4">
             <span className="text-white font-bold text-sm w-20">현재 시간</span>
             <div className="flex-1 h-8 px-3 flex items-center rounded border border-[#696A6A] bg-black text-[#FFFFFF] text-sm">
               {getCurrentFormattedTime()}
             </div>
           </div>

           {/* 측정 물질 */}
           <div className="flex items-center gap-4">
             <span className="text-white font-bold text-sm w-20">측정 물질</span>
             <div className="flex-1 h-8 px-3 flex items-center rounded border border-[#696A6A] bg-black text-[#FFFFFF] text-sm">
               미세먼지(PM-10) &nbsp; <span className="text-white">103µg/m³</span>
             </div>
           </div>

           {/* 기상 상황 */}
           <div className="flex items-center gap-4">
             <span className="text-white font-bold text-sm w-20">기상 상황</span>
             <div className="flex-1 h-8 px-3 flex items-center rounded border border-[#696A6A] bg-black text-[#FFFFFF] text-sm">
               (풍향) {currentWeather?.wind_direction_1m ?? '-'}° &nbsp; (풍속) {currentWeather?.wind_speed_1m ?? '-'} m/s
             </div>
           </div>
        </div>
      </div>

      <Spacer height={36} />

      {/* 목록 확인 버튼 */}
      <div className="w-full">
        <button
          className={`w-full h-12 text-black font-bold text-lg rounded flex items-center justify-center gap-2 transition-colors ${hasError ? 'bg-[#5E5E5E]':'bg-[#CFFF40]'}`}
          onClick={onShowListClick} // 상위 핸들러 호출
        >
          <Icon name="saas" className="w-5 h-5 text-black" />
          시뮬레이션 목록 확인
        </button>
      </div>
    </>
  );
});

export default SimulationCivilRealTimeWeather;