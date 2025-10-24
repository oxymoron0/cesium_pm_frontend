import { useMemo } from "react";
import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import SubTitle from "@/components/basic/SubTitle";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import Button from "@/components/basic/Button";
import { simulationStore } from "@/stores/SimulationStore";

interface SimulationQuickResultProps {
  onCloseMicroApp?: () => void;
}

type StationRow = {
  id: number;
  name: string;
  time: string;
  pm10: string;
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

const SimulationQuickResult = observer(function SimulationQuickResult({
  onCloseMicroApp,
}: SimulationQuickResultProps) {
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

  const rows: StationRow[] = [
    { id: 1, name: "부전시장 (05709)", time: "2024.08.07 15:00", pm10: "22 μg/m³" },
    { id: 2, name: "범내골역 (05715)", time: "2024.08.07 14:59", pm10: "13 μg/m³" },
    { id: 3, name: "가야역 (05723)", time: "2024.08.07 14:58", pm10: "33 μg/m³" },
    { id: 4, name: "동의대역 (05727)", time: "2024.08.07 14:57", pm10: "70 μg/m³" },
    { id: 5, name: "동의대역 (05727)", time: "2024.08.07 14:57", pm10: "70 μg/m³" },
  ];

  return (
    <>
      <Title onClose={onCloseMicroApp} onBack={() =>  simulationStore.setCurrentView("config")}>
        <span className="font-pretendard text-[24px] font-bold text-white">
          시뮬레이션 설정 정보
        </span>
      </Title>

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
        <InfoField label="측정물질" value="미세먼지 (PM-10)" />
        <InfoField label="측정일시" value="2025.08.07 오후 15:00" />
        <InfoField label="측정위치" value="부산진구 정류장" />
        <InfoField label="위치수" value="19개" />
        <InfoField label="고도" value="1.5m" />
        <InfoField label="기상" value="(풍향) 170°  (풍속) 2.41 m/s" />
      </div>

      <Spacer height={20} />

      <SubTitle>
        <span className="font-pretendard text-[18px] font-bold text-white">
          정류장 측정 목록 (19)
        </span>
      </SubTitle>

      <Divider />
      <Spacer height={12} />

      {/* 헤더 */}
      <div
        className="grid self-stretch text-center items-center font-pretendard text-[14px] font-bold text-white [grid-template-columns:56px_1fr_160px_140px]"
      >
        <div>No</div>
        <div>정류장</div>
        <div>측정시간</div>
        <div>
          미세먼지
          <br />
          (PM-10)
        </div>
      </div>

      <Spacer height={8} />

      {/* 리스트 */}
      <div className="self-stretch border-t border-b border-[#696A6A] max-h-[300px] overflow-y-auto">
        {rows.map((r, idx) => (
          <div
            key={r.id}
            className={`grid text-center items-center h-[56px] [grid-template-columns:56px_1fr_160px_140px] ${
              idx === rows.length - 1 ? "" : "border-b border-[#696A6A]"
            }`}
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
        ))}
      </div>

      <Spacer height={20} />

      <div className="self-stretch">
        <Button
          variant="solid"
          showIcon={false}
          className="w-full"
          onClick={() => simulationStore.setCurrentView("config")}
        >
          시뮬레이션 종료
        </Button>
      </div>
    </>
  );
});

export default SimulationQuickResult;
