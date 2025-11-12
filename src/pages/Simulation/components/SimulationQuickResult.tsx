import { useMemo, useEffect, useState, useRef } from "react";
import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import SubTitle from "@/components/basic/SubTitle";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import Button from "@/components/basic/Button";
import { simulationStore } from "@/stores/SimulationStore";
import {
  renderSimulationResultStations,
  clearSimulationResultStations,
  getSelectedSimulationStationId,
} from "@/utils/cesium/simulationResultRenderer";

interface SimulationQuickResultProps {
  onCloseMicroApp?: () => void;
}

export type StationRow = {
  id: number;
  name: string;
  time: string;
  pm10: string;
  point: [number, number]; // [longitude, latitude]
};

const to2 = (n: number) => String(n).padStart(2, "0");

const formatDateTime24 = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = to2(d.getMonth() + 1);
  const day = to2(d.getDate());
  const hh = to2(d.getHours());
  const mm = to2(d.getMinutes());
  return `${y}.${m}.${day} ${hh}:${mm}`;
};

const formatDateTimeKOR = (iso: string) => {
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
      <div className="w-[120px] my-[10px] font-pretendard text-[14px] font-bold text-white text-center border-r [border-right-color:rgba(255,255,255,0.3)]">
        {label}
      </div>
      <div className="flex-1 px-3 font-pretendard text-[14px] font-normal text-white">
        {value}
      </div>
    </div>
  );
}

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
    delta = eMid - cMid; // 중앙 정렬
  } else {
    // 보이는 영역 가장 가까운 쪽으로만 맞추기
    delta = overTop
      ? eRect.top - cRect.top - pad
      : eRect.bottom - cRect.bottom + pad;
  }

  container.scrollTo({
    top: container.scrollTop + delta,
    behavior: "smooth",
  });
};
const SimulationQuickResult = observer(function SimulationQuickResult({
  onCloseMicroApp,
}: SimulationQuickResultProps) {
  // 선택된 정류장 하이라이트 상태 추적
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 빠른 폴링(60fps)로 CESIUM 선택 상태 반영
  useEffect(() => {
    //가이드 문구 active
    simulationStore.isSimulationQuickGuideMode = true;
    const intervalId = setInterval(() => {
      const raw = getSelectedSimulationStationId();
      const normalized =
        raw == null
          ? null
          : typeof raw === "number"
          ? `station_${raw}`
          : /^\d+$/.test(String(raw))
          ? `station_${raw}`
          : String(raw);
      setSelectedStationId(normalized);
    }, 16);
    return () => {
      clearInterval(intervalId);
      //가이드 문구 active false
      simulationStore.isSimulationQuickGuideMode = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedStationId) return;
    const container = listRef.current;
    const el = rowRefs.current[selectedStationId];
    if (container && el) ensureVisible(container, el, "center", 8);
  }, [selectedStationId]);

  const nowText = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const t = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${y}.${m}.${d} ${t}`;
  }, []);

  // ====== 여기서 실제 스토어 데이터 꺼냄 ======
  const sim = simulationStore.selectedsimulationQuick;

  // 상단 정보 영역 텍스트
  const measuredAtText = sim?.measured_at
    ? formatDateTimeKOR(sim.measured_at)
    : "-";
  const pollutantText = formatPollutant(sim?.pm_type);
  const locationCountText = sim?.station_data
    ? `${sim.station_data.length}개`
    : "-";

  const weatherText = useMemo(() => {
    if (!sim?.weather) return "-";
    // 10m 우선, 없으면 1m로 폴백
    const wd = sim.weather.wind_direction_10m ?? sim.weather.wind_direction_1m;
    const ws = sim.weather.wind_speed_10m ?? sim.weather.wind_speed_1m;
    const wdText = typeof wd === "number" ? `${wd}°` : "-";
    const wsText = typeof ws === "number" ? `${ws} m/s` : "-";
    return `(풍향) ${wdText}  (풍속) ${wsText}`;
  }, [sim?.weather]);

  // 리스트 행: 실제 station_data → StationRow로 매핑
  const rows: StationRow[] = useMemo(() => {
    if (!sim?.station_data) return [];
    return sim.station_data.map((s) => ({
      id: s.index,
      name: s.station_name, // station_id가 있다면 뒤에 ()로 붙이고 싶으면 `${s.station_name}${s.station_id ? ` (${s.station_id})` : ""}`
      time: formatDateTime24(s.measured_at),
      pm10: `${
        Number.isFinite(s.concentration)
          ? s.concentration.toFixed(2)
          : s.concentration
      } μg/m³`,
      point: [
        s.location?.coordinates?.[0] ?? 0,
        s.location?.coordinates?.[1] ?? 0,
      ],
    }));
  }, [sim?.station_data]);

  // Cesium 엔티티 렌더링: 실제 rows로 그리기
  useEffect(() => {
    const viewer = window.cviewer;
    if (!viewer) {
      console.warn("[SimulationQuickResult] Cesium viewer not available");
      return;
    }
    if (rows.length > 0) {
      renderSimulationResultStations(rows);
    }
    return () => {
      clearSimulationResultStations();
    };
    // rows가 바뀌면 다시 렌더 (실데이터 교체/갱신 대비)
  }, [rows]);

  return (
    <>
      <Title
        onClose={onCloseMicroApp}
        onBack={() => simulationStore.setCurrentView("quick")}
        onMinimize={() => simulationStore.toggleMinimize()}
      >
        <span className="font-pretendard text-[24px] font-bold text-white">
          시뮬레이션 설정 정보
        </span>
      </Title>

      <div style={{ display: simulationStore.isMinimized ? 'none' : 'contents' }}>
        <Spacer height={8} />

        <div className="w-full flex items-center py-[20px] border-b border-b-[rgba(255,255,255,1)]">
        <div className="w-[120px] text-white font-pretendard font-bold text-[16px]">
          현재 시간
        </div>
        <div className="w-[320px] rounded-[4px] border border-[rgba(105,106,106,1)] bg-[rgba(0,0,0,1)] text-white text-[14px] font-pretendard font-normal px-[8px] py-[6px]">
          {nowText}
        </div>
      </div>

      <Spacer height={16} />

      <div className="flex flex-col self-stretch">
        <InfoField label="측정물질" value={pollutantText} />
        <InfoField label="측정일시" value={measuredAtText} />
        <InfoField label="측정위치" value="부산진구 정류장" />
        <InfoField label="위치수" value={locationCountText} />
        {/* <InfoField label="고도" value="1.5m" /> */}
        <InfoField label="기상" value={weatherText} />
      </div>

      <Spacer height={20} />

      <SubTitle>
        <span className="font-pretendard text-[18px] font-bold text-white">
          정류장 측정 목록 ({rows.length})
        </span>
      </SubTitle>

      <Divider />
      <Spacer height={12} />

      {/* 헤더 */}
      <div className="grid self-stretch text-center items-center font-pretendard text-[14px] font-bold text-white [grid-template-columns:56px_1fr_160px_140px]">
        <div>No</div>
        <div>정류장</div>
        <div>측정시간</div>
        <div>
          {formatPollutant(sim?.pm_type)}
        </div>
      </div>

      <Spacer height={8} />

      {/* 리스트 */}
      <div
        ref={listRef}
        className="self-stretch border-t border-b border-[#696A6A] max-h-[300px] overflow-y-auto custom-scrollbar"
      >
        {rows.map((r) => {
          const key = `station_${r.id}`;
          const isSelected = selectedStationId === key;
          return (
            <div
              key={r.id}
              ref={(el) => {
                rowRefs.current[key] = el;
              }}
              className="grid text-center items-center h-[56px] [grid-template-columns:56px_1fr_160px_140px]"
              style={{
                border: isSelected ? "1px solid #FFD040" : "none",
                backgroundColor: isSelected
                  ? "rgba(255, 208, 64, 0.2)"
                  : "transparent",
                transition: "all 0.3s ease",
              }}
            >
              <div className="font-pretendard text-[14px] font-semibold text-white">
                {String(r.id).padStart(2, "0")}
              </div>
              <div className="font-pretendard text-[14px] font-normal text-white">
                {r.name}
              </div>
              <div className="font-pretendard text-[14px] font-normal text-white">
                {r.time}
              </div>
              <div className="font-pretendard text-[14px] font-bold text-white">
                {r.pm10}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="py-6 text-center text-white/70 font-pretendard text-[14px]">
            표시할 측정 데이터가 없습니다.
          </div>
        )}
      </div>

      <Spacer height={20} />

        <div className="self-stretch">
          <Button
            variant="solid"
            showIcon={false}
            className="w-full"
            onClick={() => simulationStore.setCurrentView("quick")}
          >
            시뮬레이션 종료
          </Button>
        </div>
      </div>
    </>
  );
});

export default SimulationQuickResult;
