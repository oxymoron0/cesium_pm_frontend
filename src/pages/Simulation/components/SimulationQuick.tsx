import { useEffect, useState, useRef, useCallback } from "react";
import { observer } from "mobx-react-lite";
import Icon from "@/components/basic/Icon";
import DatePicker from "@/components/basic/DatePicker";
import Button from "@/components/basic/Button";
import { simulationStore } from "@/stores/SimulationStore";
import type { PMType, SimulationQuickData } from "@/types/simulation_request_types";
// import { getSimulationQuickGlbDetail } from "@/utils/api/simulationApi";
import { MOCK_GLB_DATA } from "@/utils/mockData/simulationQuickGlbDetail";

const formatPollutant = (t: PMType) =>
  t === "pm10" ? "미세먼지(PM-10)" : t === "pm25" ? "초미세먼지(PM-2.5)" : t;

const toLocalYMD = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const toLocalHM = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// 시간 옵션 생성 (00시 ~ 23시)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

// TODO: 백엔드가 시간대를 지원하면 true로 변경
const INCLUDE_TIME_IN_API = false;

// 시간 드롭다운 컴포넌트 (날짜 UI와 동일한 스타일)
interface HourDropdownProps {
  hour: number;
  onHourChange: (h: number) => void;
}

function HourDropdown({ hour, onHourChange }: HourDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatHour = (n: number) => `${String(n).padStart(2, "0")}시`;

  return (
    <div ref={ref} className="relative flex items-center h-8">
      <div
        className="flex items-center px-3 py-1 rounded-[4px] cursor-pointer bg-black border border-[#696A6A]"
        onClick={() => setOpen(!open)}
      >
        <span className="px-2 py-1 font-pretendard text-[14px] font-[400] leading-normal text-white">
          {formatHour(hour)}
        </span>
        <Icon name="dropmenubtn" className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div
          className="absolute top-[40px] left-0 z-[9999] w-[72px] max-h-[200px] overflow-y-auto rounded-[4px] bg-[#1E1E1E] border border-[#696A6A] shadow-lg"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#FFD040 transparent' }}
        >
          {HOUR_OPTIONS.map((h) => (
            <div
              key={h}
              onClick={() => { onHourChange(h); setOpen(false); }}
              className={`px-3 py-2 text-[14px] cursor-pointer hover:bg-[#333] transition-colors ${hour === h ? 'text-[#FFD040] bg-[#2A2A2A]' : 'text-white'}`}
            >
              {formatHour(h)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SimulationQuick = observer(function SimulationQuick() {
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);

  const fmtYMD = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  };
  const fmtHM = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const fmtYMDHM = (iso: string) => `${fmtYMD(iso)} ${fmtHM(iso)}`;

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  // 시간 상태 (시작: 00시, 종료: 23시)
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(23);

  // 날짜+시간을 조합하여 API 호출용 문자열 생성
  // isEndTime이 true면 해당 시간의 59분 59초까지 포함 (17시 → 17:59:59)
  const buildDateTimeString = useCallback((
    date: Date,
    hour: number,
    isEndTime: boolean,
    includeTime: boolean = true
  ): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    if (!includeTime) {
      return `${y}-${m}-${d}`;
    }

    const hh = String(hour).padStart(2, "0");
    // 종료 시간은 해당 시간의 59분 59초까지 포함
    const mm = isEndTime ? "59" : "00";
    const ss = isEndTime ? "59" : "00";
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }, []);

  // 데이터 로드 함수
  const loadData = useCallback((page: number = 1) => {
    const startDateTime = buildDateTimeString(startDate, startHour, false, INCLUDE_TIME_IN_API);
    const endDateTime = buildDateTimeString(endDate, endHour, true, INCLUDE_TIME_IN_API);
    console.log(`[SimulationQuick] Loading data: ${startDateTime} ~ ${endDateTime}`);
    simulationStore.loadSimulationQuickList(startDateTime, endDateTime, page, 7);
  }, [buildDateTimeString, startDate, startHour, endDate, endHour]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const simulations = simulationStore.simulationQuickList ?? [];
  const pagination = simulationStore.paginationQuick ?? {
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  };

  const handleStartChange = (d: Date) => {
    setStartDate(d);
    if (endDate < d) setEndDate(d);
  };

  const handleEndChange = (d: Date) => {
    setEndDate(d < startDate ? startDate : d);
  };

  const formatDateChip = (d: Date) =>
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const goPage = (nextPage: number) => {
    if (
      nextPage < 1 ||
      (pagination.total_pages && nextPage > pagination.total_pages)
    )
      return;
    loadData(nextPage);
    setOpenRowIndex(null);
  };

  const offset = (pagination.page - 1) * pagination.limit;

  const RowDetail = ({ row }: { row: SimulationQuickData }) => {
    // weather 폴백 처리
    const wd10 =
      row?.weather?.wind_direction_10m ??
      row?.weather?.wind_direction_1m ??
      "-";
    const ws10 =
      row?.weather?.wind_speed_10m ?? row?.weather?.wind_speed_1m ?? "-";
    const measured = row?.measured_at ? fmtYMDHM(row.measured_at) : "-";

    // 정류장 목록
    const stations: Array<{
      index?: number;
      station_name?: string;
      station_id?: string;
      measured_at?: string;
      concentration?: number;
    }> = row?.station_data ?? [];

    return (
      <div className="px-4 pb-5 pt-4 bg-[rgba(0,0,0,0.35)] border-b border-[rgba(255,255,255,0.10)]">
        {/* 박스 전체 테두리 */}
        <div className="rounded-[8px] border border-[rgba(196,198,198,0.6)] bg-[rgba(0,0,0,0.25)] overflow-hidden">
          {/* 섹션 타이틀 */}
          <div className="px-4 py-3 text-white font-[700] text-[16px] bg-[rgba(255,255,255,0.06)]">
            측정 환경 정보
          </div>

          {/* 내용: 라벨/값 */}
          <div className="p-4">
            {/* 측정 시간 */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-[100px] text-[14px] font-[700] text-white mt-1">
                측정 시간
              </div>
              <div className="flex-1">
                <div className="px-3 py-2 rounded-[6px] bg-black border border-[#696A6A] text-white text-[15px] leading-[20px]">
                  {measured}
                </div>
              </div>
            </div>

            {/* 기상 상황 */}
            <div className="flex items-start gap-3">
              <div className="w-[100px] text-[14px] font-[700] text-white mt-1">
                기상 상황
              </div>
              <div className="flex-1">
                <div className="px-3 py-2 rounded-[6px] bg-black border border-[#696A6A] text-white text-[15px] leading-[22px]">
                  <div>(풍향)&nbsp;&nbsp;{wd10}°</div>
                  <div>(풍속)&nbsp;&nbsp;{ws10} m/s</div>
                </div>
              </div>
            </div>
          </div>

          {/* 정류장 목록 섹션 타이틀 */}
          <div className="px-4 py-3 text-white font-[700] text-[16px] bg-[rgba(255,255,255,0.06)] border-t border-[rgba(196,198,198,0.4)]">
            정류장 측정 목록 ({stations.length})
          </div>

          {/* 테이블 헤더 */}
          <div className="px-4">
            <div className="h-[1px] bg-[rgba(255,255,255,0.15)] w-full mt-2" />
            <div className="flex text-center items-center h-10 text-[14px] font-[700] text-white/95">
              <div className="w-[10%] text-left pl-1">No</div>
              <div className="w-[40%]">정류장</div>
              <div className="w-[30%]">측정시간</div>
              <div className="w-[20%]">미세먼지(PM-10)</div>
            </div>
            <div className="h-[1px] bg-[rgba(255,255,255,0.15)] w-full" />
          </div>

          {/* 테이블 바디 (스크롤) */}
          <div
            className="max-h-[100px] overflow-y-auto px-4 text-center"
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: "#FFD040 transparent",
            }}
          >
            {stations.length === 0 ? (
              <div className="h-12 flex items-center justify-center text-[14px] text-white/70">
                정류장 데이터가 없습니다.
              </div>
            ) : (
              stations.map((st, i) => (
                <div
                  key={`${st.index ?? i}-${st.station_name ?? "station"}`}
                  className="flex items-center h-[42px] text-[14px] text-white/90 border-b border-[rgba(255,255,255,0.08)]"
                >
                  <div className="w-[10%] pl-1">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="w-[40%]">
                    {st.station_name}
                    {st.station_id ? ` (${st.station_id})` : ""}
                  </div>
                  <div className="w-[30%]">
                    {st.measured_at ? fmtYMDHM(st.measured_at) : "-"}
                  </div>
                  <div className="w-[20%]">
                    {typeof st.concentration === "number"
                      ? `${st.concentration} μg/m³`
                      : st.concentration ?? "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-3 self-stretch min-h-[400px]">
      <div className="font-pretendard text-[14px] font-[400] leading-[16px] text-[#A6A6A6]">
        * IoT 센서로 수집한 부산진구 정류장 데이터 기반으로, 오염물질 확산
        시뮬레이션을 바로 실행할 수 있습니다.
      </div>

      {/* 날짜/시간 선택 영역 */}
      <div className="flex w-full items-center flex-wrap gap-y-2">
        {/* 시작일 */}
        <div className="relative flex items-center gap-[7px] h-8">
          <div
            className="flex items-center px-3 py-1 rounded-[4px] cursor-pointer bg-black border border-[#696A6A]"
            onClick={() => setOpenStart(true)}
          >
            <Icon name="calendar" className="w-4 h-4" />
            <button className="px-3 py-1 rounded font-pretendard text-[14px] font-[400] leading-normal text-white">
              {formatDateChip(startDate)}
            </button>
          </div>
          {openStart && (
            <div className="absolute top-[40px] left-0 z-[9999]">
              <DatePicker
                value={startDate}
                onChange={(d) => {
                  handleStartChange(d);
                  setOpenStart(false);
                }}
                onClose={() => setOpenStart(false)}
              />
            </div>
          )}
        </div>

        {/* 시작 시간 */}
        <div className="ml-2">
          <HourDropdown hour={startHour} onHourChange={setStartHour} />
        </div>

        <span className="mx-[10px] text-[#A6A6A6]">~</span>

        {/* 종료일 */}
        <div className="relative flex items-center gap-[7px] h-8">
          <div
            className="flex items-center px-3 py-1 rounded-[4px] cursor-pointer bg-black border border-[#696A6A]"
            onClick={() => setOpenEnd(true)}
          >
            <Icon name="calendar" className="w-4 h-4" />
            <button className="px-3 py-1 rounded font-pretendard text-[14px] font-[400] leading-normal text-white">
              {formatDateChip(endDate)}
            </button>
          </div>
          {openEnd && (
            <div className="absolute top-[40px] left-0 z-[9999]">
              <DatePicker
                value={endDate}
                onChange={(d) => {
                  const fixed = d < startDate ? startDate : d;
                  handleEndChange(fixed);
                  setOpenEnd(false);
                }}
                onClose={() => setOpenEnd(false)}
              />
            </div>
          )}
        </div>

        {/* 종료 시간 */}
        <div className="ml-2">
          <HourDropdown hour={endHour} onHourChange={setEndHour} />
        </div>
      </div>

      {/* 테이블 */}
      <div
        className="w-full h-full"
        style={{
          maxHeight: "calc(-50px + 100vh)",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#FFD040 transparent",
        }}
      >
        <div className="rounded-[8px] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center px-5 h-[50px] border-b border-[rgba(196,198,198,1)] font-pretendard text-[14px] font-[700] text-white">
            <div className="w-[6%] text-center">#</div>
            <div className="w-[20%] text-center">측정날짜</div>
            <div className="w-[10%] text-center">측정시간</div>
            <div className="w-[29%] text-center">측정물질</div>
            <div className="w-[35%] text-center">실행</div>
          </div>

          {simulationStore.isLoadingQuickList ? (
            <div className="flex justify-center items-center text-[14px] h-[260px]">
              데이터 불러오는 중
            </div>
          ) : simulations.length === 0 ? (
            <div className="px-5 py-6 text-center text-[14px]">
              데이터가 없습니다.
            </div>
          ) : (
            simulations.map((s: SimulationQuickData, i: number) => {
              const rowNo = offset + i + 1;
              const dateStr = toLocalYMD(s.measured_at);
              const timeStr = toLocalHM(s.measured_at);
              const pmLabel = formatPollutant(s.pm_type as PMType);
              const isOpen = openRowIndex === i; // ▼▼▼ 여기서 isOpen 사용
              

              return (
                <div key={`${s.index}-${s.measured_at}-${i}`}>
                  {/* 기본 행 */}
                  <div className="flex items-center px-5 h-[58px] border-b border-[rgba(255,255,255,0.05)] text-[14px] text-[rgba(166,166,166,1)]">
                    <div className="w-[6%] text-center">{rowNo}</div>
                    <div className="w-[20%] text-center">{dateStr}</div>
                    <div className="w-[10%] text-center">{timeStr}</div>
                    <div className="w-[29%] text-center">{pmLabel}</div>
                    <div className="w-[35%] flex justify-center gap-2">
                      <Button
                        iconName={"excute"}
                        iconPos="right"
                        onClick={() => {
                          simulationStore.setCurrentView("quickResult");
                          simulationStore.setSelectedSimulationQuick(s);

                          // 목업 데이터 사용 (API 연결 전)
                          console.log('[SimulationQuick] GLB Detail Data (MOCK):', MOCK_GLB_DATA);

                          // TODO: API 연결 시 아래 코드 활성화
                          // const glbData = await getSimulationQuickGlbDetail(s.uuid);
                          // console.log('[SimulationQuick] GLB Detail Data:', glbData);
                        }}
                      >
                        시뮬레이션 실행
                      </Button>

                      {/* 펼침 화살표 버튼 */}
                      <button
                        className="w-8 h-8 grid place-items-center text-white/80 hover:text-white transition-transform"
                        onClick={() => setOpenRowIndex(isOpen ? null : i)}
                        aria-label={isOpen ? "접기" : "펼치기"}
                      >
                        <Icon
                          name="dropmenubtn"
                          className={`w-4 h-4 cursor-pointer transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 펼침 패널 */}
                  {isOpen && <RowDetail row={s} />}
                </div>
              );
            })
          )}

          {/* 페이지네이션 */}
          {!simulationStore.isLoadingQuickList && simulations.length > 0 && (
            <div className="flex justify-center items-center gap-3 h-[56px] border-t border-[rgba(255,255,255,0.1)] text-[14px] font-pretendard font-[400] text-white">
              <button
                className="px-2 text-white/80 hover:text-white disabled:opacity-40"
                disabled={pagination.page <= 1}
                onClick={() => goPage(pagination.page - 1)}
              >
                &lt;
              </button>

              {(() => {
                const pages: number[] = [];
                const total = pagination.total_pages || 1;
                const current = pagination.page;
                let start = Math.max(1, current - 2);
                let end = Math.min(total, current + 2);
                if (end - start < 4) {
                  if (start === 1) end = Math.min(total, start + 4);
                  else if (end === total) start = Math.max(1, end - 4);
                }
                for (let p = start; p <= end; p++) pages.push(p);
                return pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => goPage(p)}
                    className={[
                      "w-8 h-8 flex items-center justify-center rounded-[6px] border transition-colors cursor-pointer",
                      p === current
                        ? "border-[#FFD040] text-[#FFD040] font-[600]"
                        : "border-transparent text-white/80 hover:text-white",
                    ].join(" ")}
                  >
                    {p}
                  </button>
                ));
              })()}

              <button
                className="px-2 text-white/80 hover:text-white disabled:opacity-40"
                disabled={
                  !!pagination.total_pages &&
                  pagination.page >= pagination.total_pages
                }
                onClick={() => goPage(pagination.page + 1)}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SimulationQuick;
