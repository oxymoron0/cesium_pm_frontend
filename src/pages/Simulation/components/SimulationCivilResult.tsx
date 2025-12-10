import { useMemo, useEffect, useState, useRef } from "react";
import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import SubTitle from "@/components/basic/SubTitle";
import Spacer from "@/components/basic/Spacer";
import Button from "@/components/basic/Button";
import { simulationStore } from "@/stores/SimulationStore";
import {
  renderCivilResultStations,
  clearCivilResultStations,
  getSelectedCivilStationId,
  setSelectedCivilStationId
} from "@/utils/cesium/SimulationCivilResultRenderer";
import SimulationCivilProgressIndicator from "@/components/service/SimulationCivilProgressIndicator";
import SimulationStationHtmlRenderer from "@/components/service/SimulationStationHtmlRenderer";

export type StationRow = {
  id: number;
  name: string;
  time: string;
  pm10: string;
  pmLabel: string;
  point: [number, number];
};

const to2 = (n: number) => String(n).padStart(2, "0");

const formatDateTimeKOR = (iso: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = to2(d.getMonth() + 1);
  const day = to2(d.getDate());
  const t = d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${y}.${m}.${day} ${t}`;
};

const formatPollutant = (pm: string | undefined) => {
  if (pm === "pm10") return "미세먼지 (PM-10)";
  if (pm === "pm25") return "초미세먼지 (PM-2.5)";
  return "미세먼지";
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center self-stretch border-b border-[rgba(255,255,255,0.3)]">
      <div className="w-[100px] my-[10px] font-pretendard text-[14px] font-bold text-white border-r [border-right-color:rgba(255,255,255,0.3)]">
        {label}
      </div>
      <div className="flex-1 px-3 font-pretendard text-[14px] font-normal text-white">
        {value}
      </div>
    </div>
  );
}

const getPmLabelStyle = (label: string) => {
  switch (label) {
    case '좋음':
      return { backgroundColor: '#00C851', color: '#FFFFFF' }; // 녹색
    case '보통':
      return { backgroundColor: '#FFD040', color: '#000000' }; // 노란색
    case '나쁨':
      return { backgroundColor: '#FF7700', color: '#FFFFFF' }; // 주황색
    case '매우나쁨':
      return { backgroundColor: '#FF3333', color: '#FFFFFF' }; // 빨간색
    default:
      return { backgroundColor: '#666666', color: '#FFFFFF' }; // 기본값 (회색)
  }
};

const ensureVisible = (
  container: HTMLElement,
  el: HTMLElement,
  mode: "center" | "nearest" = "center",
  pad = 6
) => {
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();

  const overTop = eRect.top < cRect.top + pad;
  const overBottom = eRect.bottom > cRect.bottom - pad;

  if (!overTop && !overBottom) return;

  let delta = 0;
  if (mode === "center") {
    const cMid = (cRect.top + cRect.bottom) / 2;
    const eMid = (eRect.top + eRect.bottom) / 2;
    delta = eMid - cMid;
  } else {
    delta = overTop
      ? eRect.top - cRect.top - pad
      : eRect.bottom - cRect.bottom + pad;
  }
  container.scrollTo({
    top: container.scrollTop + delta,
    behavior: "smooth",
  });
};

const SimulationCivilResult = observer(function SimulationCivilResult() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 1. 데이터 가져오기
  const simData = simulationStore.selectedCivilSimulation;

  // 2. Cesium 선택 상태 동기화 (Polling)
  useEffect(() => {
    setSelectedCivilStationId(null);
    const intervalId = setInterval(() => {
      const raw = getSelectedCivilStationId();
      const normalized = raw == null ? null : typeof raw === "number" ? `station_${raw}` : /^\d+$/.test(String(raw)) ? `station_${raw}` : String(raw);
      setSelectedStationId(normalized);
    }, 16);

    return () => {
      clearInterval(intervalId);
      clearCivilResultStations();
      setSelectedCivilStationId(null);
    };
  }, []);

  // 3. 스크롤 이동
  useEffect(() => {
    if (!selectedStationId) return;
    const container = listRef.current;
    const el = rowRefs.current[selectedStationId];
    if (container && el) ensureVisible(container, el, "center", 8);
  }, [selectedStationId]);

  const weatherText = useMemo(() => {
    if (!simData?.weather) return "-";
    const w = simData.weather;
    return `(풍향) ${w.wind_direction_1m}°  (풍속) ${w.wind_speed_1m} m/s`;
  }, [simData]); // simData 전체 의존

  const rows: StationRow[] = useMemo(() => {
    if (!simData?.station_data) return [];
    
    return simData.station_data.map((st) => ({
      id: st.index,
      name: st.station_name,
      time: formatDateTimeKOR(st.measured_at),
      pm10: `${Math.round(st.concentration)}`,
      pmLabel: st.pm_label || '-',
      point: [st.location.coordinates[0], st.location.coordinates[1]],
    }));
  }, [simData]);

  useEffect(() => {
    const viewer = window.cviewer;
    if (!viewer) return;

    if (rows.length > 0) {
      renderCivilResultStations(rows);
    }
    return () => {
      clearCivilResultStations();
    };
  }, [rows]);

  // [수정] 7. 모든 Hooks 호출 후 데이터 체크 및 Early Return
  if (!simData) {
    return <div className="text-white p-4">데이터를 불러올 수 없습니다.</div>;
  }

  return (
    <>
      <Title onClose={() => simulationStore.setCurrentView("civilList")} onBack={() => simulationStore.setCurrentView("civilList")}>
        <span className="font-pretendard text-[20px] font-bold text-white">시뮬레이션 결과</span>
      </Title>

      <Spacer height={8} />

      {/* 상단 정보 섹션 */}
      <SubTitle>
        <span className="font-pretendard text-[16px] font-bold text-white">
          현재시간
        </span>
      </SubTitle>
      <div className="w-full p-4 rounded-lg">
        <div className="flex flex-col border-t border-[#FFFFFF)]">
           <InfoField label="측정물질" value={formatPollutant(simData.pm_type)} />
           <InfoField label="측정일시" value={formatDateTimeKOR(simData.measured_at)} />
           <InfoField label="측정위치" value={'부산진구 정류장'} />
           <InfoField label="측정위치 수" value={`${rows.length}개`} />
           <InfoField label="기상조건" value={weatherText} />
        </div>
      </div>

      <Spacer height={16} />

      {/* 정류장 리스트 섹션 */}
      <SubTitle>
        <span className="font-pretendard text-[16px] font-bold text-white">
          정류장 측정 목록 ({rows.length})
        </span>
      </SubTitle>
      
      <div className=" rounded-lg overflow-hidden w-full">
         {/* 헤더 */}
         <div className="flex items-center h-[50px] text-white text-sm font-bold border-t border-b border-[#FFFFFF]">
            <div className="w-[50px] text-center">No</div>
            <div className="flex-1 text-center">정류장</div>
            <div className="w-[120px] text-center">측정시간</div>
            <div className="w-[120px] text-center">{formatPollutant(simData.pm_type)}</div>
         </div>

         {/* 바디 */}
         <div ref={listRef} className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {rows.map((r) => {
              const key = `station_${r.id}`;
              const isSelected = selectedStationId === key;
              const labelStyle = getPmLabelStyle(r.pmLabel);
              return (
                <div
                  key={r.id}
                  ref={(el) => { rowRefs.current[key] = el; }}
                  className={`flex items-center h-[48px] text-sm border-b border-[#444444] transition-colors cursor-pointer last:border-b-0 ${isSelected ? 'bg-[rgba(255,208,64,0.2)]' : 'hover:bg-[#2C2C2C] text-[#A6A6A6]'}`}
                  onClick={() => {
                     const entity = window.cviewer?.dataSources.getByName("simulation_civil_result_stations")[0]?.entities.getById(key);
                     if (entity) {
                        window.cviewer?.flyTo(entity, { duration: 1.0 });
                        setSelectedCivilStationId(r.id);
                     }
                  }}
                >
                   <div className={`w-[50px] text-center text-white`}>{to2(r.id)}</div>
                   <div className={`flex-1 text-center px-2 truncate text-white`}>{r.name}</div>
                   <div className={`w-[120px] text-center text-white`}>{r.time}</div>
                   <div className={`w-[120px] text-center font-bold`}>
                    <div
                       style={{
                         backgroundColor: labelStyle.backgroundColor,
                         color: labelStyle.color,
                         borderRadius: '16px', // 둥근 모서리
                         padding: '4px 12px', // 내부 여백
                         fontSize: '16px',
                         fontWeight: '600',
                         fontFamily: 'Pretendard',
                         display: 'inline-flex', // 텍스트 길이에 맞게 늘어남
                         alignItems: 'center',
                         justifyContent: 'center',
                         minWidth: '82px', // 최소 너비 확보
                         minHeight: '36px', // 최소 너비 확보
                         lineHeight: 'normal'
                       }}
                     >
                       {r.pmLabel}
                     </div>
                    </div>
                </div>
              );
            })}
         </div>
      </div>

      <Spacer height={20} />

      <div className="self-stretch">
        <Button variant="solid" showIcon={false} className="w-full h-12 text-lg font-bold" onClick={() => simulationStore.setCurrentView("civilList")}>
          시뮬레이션 종료
        </Button>
      </div>

      <SimulationCivilProgressIndicator />
      <SimulationStationHtmlRenderer />
    </>
  );
});

export default SimulationCivilResult;