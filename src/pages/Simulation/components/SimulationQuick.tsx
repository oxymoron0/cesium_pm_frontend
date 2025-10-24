import { useState } from "react";
import { observer } from "mobx-react-lite";
import Icon from "@/components/basic/Icon";
import DatePicker from "@/components/basic/DatePicker";
import Button from "@/components/basic/Button";
import { simulationStore } from "@/stores/SimulationStore";


const SimulationQuick = observer(function SimulationQuick() {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const handleStartChange = (d: Date) => {
    setStartDate(d);
    if (endDate < d) setEndDate(d);
  };

  const handleEndChange = (d: Date) => {
    setEndDate(d < startDate ? startDate : d);
  };

  const formatDate = (d: Date) => d.toLocaleDateString();

  const datePickerStyle = {
    background: "#000000",
    border: "1px solid #696A6A",
  };

  const dateButtonStyle = {
    fontFamily: "Pretendard",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "normal",
    color: "#FFFFFF",
  };

  return (
    <div className="flex flex-col gap-3 self-stretch">
      <div
        style={{
          fontFamily: "Pretendard",
          fontSize: "14px",
          fontWeight: 400,
          lineHeight: "16px",
          color: "#A6A6A6",
        }}
      >
        * IoT 센서로 수집한 부산진구 정류장 데이터 기반으로, 오염물질 확산
        시뮬레이션을 바로 실행할 수 있습니다.
      </div>

      <div className="flex w-full items-center">
        {/* 시작일 */}
        <div className="relative flex items-center gap-[7px] h-8">
          <div
            className="flex items-center px-[12px] py-[4px] rounded-[4px] cursor-pointer"
            onClick={() => setOpenStart(true)}
            style={datePickerStyle}
          >
            <Icon name="calendar" className="w-4 h-4" />
            <button className="px-3 py-1 rounded" style={dateButtonStyle}>
              {formatDate(startDate)}
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

        <span className="mx-[10px]" style={{ color: "#A6A6A6" }}>
          -
        </span>

        {/* 종료일 */}
        <div className="relative flex items-center gap-[7px] h-8">
          <div
            className="flex items-center px-[12px] py-[4px] rounded-[4px] cursor-pointer"
            onClick={() => setOpenEnd(true)}
            style={datePickerStyle}
          >
            <Icon name="calendar" className="w-4 h-4" />
            <button className="px-3 py-1 rounded" style={dateButtonStyle}>
              {formatDate(endDate)}
            </button>
          </div>

          {openEnd && (
            <div className="absolute top-[40px] left-0 z-[9999]">
              <DatePicker
                value={endDate}
                onChange={(d) => {
                  handleEndChange(d);
                  setOpenEnd(false);
                }}
                onClose={() => setOpenEnd(false)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="w-full mx-auto">
        <div className="rounded-[8px] overflow-hidden">
          {/* 헤더 */}
          <div
            className="flex items-center px-5 h-[50px]"
            style={{
              borderBottom: "1px solid rgba(196, 198, 198, 1)",
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 1)",
            }}
          >
            <div className="w-[6%] text-center">#</div>
            <div className="w-[20%] text-center">측정날짜</div>
            <div className="w-[20%] text-center">측정시간</div>
            <div className="w-[29%] text-center">측정물질</div>
            <div className="w-[25%] text-center">실행</div>
          </div>

          {/* 데이터 행 */}
          <div
            className="flex items-center px-5 h-[58px]"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div
              className="w-[6%] text-center"
              style={{ color: "rgba(166, 166, 166, 1)" }}
            >
              1
            </div>
            <div
              className="w-[20%] text-center"
              style={{ color: "rgba(166, 166, 166, 1)" }}
            >
              측정날짜
            </div>
            <div
              className="w-[20%] text-center"
              style={{ color: "rgba(166, 166, 166, 1)" }}
            >
              측정시간
            </div>
            <div
              className="w-[29%] text-center"
              style={{ color: "rgba(166, 166, 166, 1)" }}
            >
              측정물질
            </div>
            <div className="w-[25%] flex justify-center">
              <Button
                variant="solid"
                showIcon={false}
                onClick={() => simulationStore.setCurrentView("result")}
              >
                시뮬레이션 실행 ▶
              </Button>
            </div>
          </div>

          {/* 페이지네이션 */}
          <div
            className="flex justify-center items-center gap-3 h-[56px]"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 400,
            }}
          >
            <div className="cursor-pointer select-none">{"<"}</div>
            <div className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-[#FFD040] text-[#FFD040] font-[600]">
              1
            </div>
            <div className="w-8 h-8 flex items-center justify-center rounded-[4px] text-white/70 cursor-pointer hover:text-white">
              2
            </div>
            <div className="cursor-pointer select-none">{">"}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SimulationQuick;
