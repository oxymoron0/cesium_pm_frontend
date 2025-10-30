import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import Icon from "@/components/basic/Icon";
import DatePicker from "@/components/basic/DatePicker";
import Button from "@/components/basic/Button";
import { simulationStore } from "@/stores/SimulationStore";
import type { PMType } from "@/types/simulation_request_types";

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

const SimulationQuick = observer(function SimulationQuick() {
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });

  const [endDate, setEndDate] = useState<Date>(new Date());
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  // 최초 로드
  useEffect(() => {
    simulationStore.loadSimulationQuickList(startDate, endDate, 1, 7);
  }, [startDate, endDate]);

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
    simulationStore.loadSimulationQuickList(
      startDate,
      endDate,
      nextPage,
      pagination.limit
    );
  };

  const offset = (pagination.page - 1) * pagination.limit;

  return (
    <div className="flex flex-col gap-3 self-stretch min-h-[400px]">
      {/* 상단 설명 */}
      <div className="font-pretendard text-[14px] font-[400] leading-[16px] text-[#A6A6A6]">
        * IoT 센서로 수집한 부산진구 정류장 데이터 기반으로, 오염물질 확산
        시뮬레이션을 바로 실행할 수 있습니다.
      </div>
      {/* 날짜 선택 */}
      <div className="flex w-full items-center">
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
                  simulationStore.loadSimulationQuickList(
                    d,
                    endDate,
                    1,
                    pagination.limit
                  );
                }}
                onClose={() => setOpenStart(false)}
              />
            </div>
          )}
        </div>

        <span className="mx-[10px] text-[#A6A6A6]">-</span>

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
                  simulationStore.loadSimulationQuickList(
                    startDate,
                    fixed,
                    1,
                    pagination.limit
                  );
                }}
                onClose={() => setOpenEnd(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="w-full h-full">
        <div className="rounded-[8px] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center px-5 h-[50px] border-b border-[rgba(196,198,198,1)] font-pretendard text-[14px] font-[700] text-white">
            <div className="w-[6%] text-center">#</div>
            <div className="w-[20%] text-center">측정날짜</div>
            <div className="w-[20%] text-center">측정시간</div>
            <div className="w-[29%] text-center">측정물질</div>
            <div className="w-[25%] text-center">실행</div>
          </div>

          {simulationStore.isLoadingQuickList ? (
            <div className="flex justify-center items-center text-[14px] h-[260px]">
              데이터 불러오는 중
            </div>
          ) : (
            <>
              {/* 데이터 행들 */}
              {simulations.length === 0 ? (
                <div className="px-5 py-6 text-center text-[14px]">
                  데이터가 없습니다.
                </div>
              ) : (
                simulations.map((s: any, i: number) => {
                  const rowNo = offset + i + 1;
                  const dateStr = toLocalYMD(s.measured_at);
                  const timeStr = toLocalHM(s.measured_at);
                  const pmLabel = formatPollutant(s.pm_type as PMType);

                  return (
                    <div
                      key={`${s.index}-${s.measured_at}-${i}`}
                      className="flex items-center px-5 h-[58px] border-b border-[rgba(255,255,255,0.05)] text-[14px] text-[rgba(166,166,166,1)]"
                    >
                      <div className="w-[6%] text-center">{rowNo}</div>
                      <div className="w-[20%] text-center">{dateStr}</div>
                      <div className="w-[20%] text-center">{timeStr}</div>
                      <div className="w-[29%] text-center">{pmLabel}</div>
                      <div className="w-[25%] flex justify-center">
                        <Button
                          iconName={"excute"}
                          iconPos="right"
                          onClick={() => {
                            simulationStore.setCurrentView("quickResult");
                            simulationStore.setSelectedSimulationQuick(s);
                          }}
                        >
                          시뮬레이션 실행
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* 페이지네이션 */}
              <div className="flex justify-center items-center gap-3 h-[56px] border-t border-[rgba(255,255,255,0.1)] text-[14px] font-pretendard font-[400] text-white">
                {/* Prev */}
                <button
                  className="px-2 text-white/80 hover:text-white disabled:opacity-40"
                  disabled={pagination.page <= 1}
                  onClick={() => goPage(pagination.page - 1)}
                >
                  &lt;
                </button>

                {/* 페이지 버튼 최대 5개 */}
                {(() => {
                  const pages: number[] = [];
                  const total = pagination.total_pages || 1;
                  const current = pagination.page;

                  // 보여줄 페이지 범위 계산
                  let start = Math.max(1, current - 2);
                  let end = Math.min(total, current + 2);

                  // 항상 5개 유지하려고 양쪽 보정
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

                {/* Next */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default SimulationQuick;
