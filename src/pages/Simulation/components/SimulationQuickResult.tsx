import { useMemo } from "react";
import { observer } from "mobx-react-lite";
import Title from "@/components/basic/Title";
import SubTitle from "@/components/basic/SubTitle";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import Button from "@/components/basic/Button";
import type { SimulationView } from "../types";

interface SimulationQuickResultProps {
  onCloseMicroApp?: () => void;
  setCurrentView: (v: SimulationView) => void;
}

type StationRow = {
  id: number;
  name: string;
  time: string;
  pm10: string;
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-[7px] h-8 self-stretch"
      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.3)" }}
    >
      <div
        style={{
          width: "120px",
          flexShrink: 0,
          fontFamily: "Pretendard",
          fontSize: "14px",
          fontWeight: 700,
          color: "rgba(255, 255, 255, 1)",
        }}
      >
        {label}
      </div>
      <div
        className="flex-1 px-3 py-1"
        style={{
          fontFamily: "Pretendard",
          fontSize: "14px",
          fontWeight: 400,
          color: "#FFFFFF",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const SimulationQuickResult = observer(function SimulationQuickResult({
  setCurrentView,
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
    {
      id: 1,
      name: "부전시장 (05709)",
      time: "2024.08.07 15:00",
      pm10: "22 μg/m³",
    },
    {
      id: 2,
      name: "범내골역 (05715)",
      time: "2024.08.07 14:59",
      pm10: "13 μg/m³",
    },
    {
      id: 3,
      name: "가야역 (05723)",
      time: "2024.08.07 14:58",
      pm10: "33 μg/m³",
    },
    {
      id: 4,
      name: "동의대역 (05727)",
      time: "2024.08.07 14:57",
      pm10: "70 μg/m³",
    },
    {
      id: 5,
      name: "동의대역 (05727)",
      time: "2024.08.07 14:57",
      pm10: "70 μg/m³",
    },
  ];

  const textStyle = {
    fontFamily: "Pretendard",
    fontSize: "14px",
    fontWeight: 400,
    color: "#FFFFFF",
  };

  return (
    <>
      <Title onClose={onCloseMicroApp} onBack={() => setCurrentView("config")}>
        <span
          style={{
            fontFamily: "Pretendard",
            fontSize: "24px",
            fontWeight: 700,
            color: "#FFFFFF",
          }}
        >
          시뮬레이션 설정 정보
        </span>
      </Title>

      <Spacer height={8} />

      <div className="self-stretch">
        <InfoField label="현재 시간" value={nowText} />
      </div>

      <Spacer height={16} />

      <div className="flex flex-col gap-3 self-stretch">
        <InfoField label="측정물질" value="미세먼지 (PM-10)" />
        <InfoField label="측정일시" value="2025.08.07 오후 15:00" />
        <InfoField label="측정위치" value="부산진구 정류장" />
        <InfoField label="위치수" value="19개" />
        <InfoField label="고도" value="1.5m" />
        <InfoField label="기상" value="(풍향) 170°  (풍속) 2.41 m/s" />
      </div>

      <Spacer height={20} />

      <SubTitle>
        <span
          style={{
            fontFamily: "Pretendard",
            fontSize: "18px",
            fontWeight: 700,
            color: "#FFFFFF",
          }}
        >
          정류장 측정 목록 (19)
        </span>
      </SubTitle>
      <Divider />
      <Spacer height={12} />

      {/* 헤더 */}
      <div
        className="grid self-stretch"
        style={{
          gridTemplateColumns: "56px 1fr 160px 140px",
          fontFamily: "Pretendard",
          fontSize: "14px",
          fontWeight: 700,
          color: "rgba(255, 255, 255, 1)",
        }}
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
      <div
        className="self-stretch"
        style={{
          borderTop: "1px solid #696A6A",
          borderBottom: "1px solid #696A6A",
          maxHeight: "360px",
          overflowY: "auto",
        }}
      >
        {rows.map((r, idx) => (
          <div
            key={r.id}
            className="grid items-center"
            style={{
              gridTemplateColumns: "56px 1fr 160px 140px",
              height: "56px",
              borderBottom:
                idx === rows.length - 1 ? "none" : "1px solid #696A6A",
            }}
          >
            <div style={{ ...textStyle, fontWeight: 600 }}>
              {String(r.id).padStart(2, "0")}
            </div>
            <div style={textStyle}>{r.name}</div>
            <div style={textStyle}>{r.time}</div>
            <div style={{ ...textStyle, fontWeight: 700 }}>{r.pm10}</div>
          </div>
        ))}
      </div>

      <Spacer height={20} />

      <div className="self-stretch">
        <Button
          variant="solid"
          showIcon={false}
          className="w-full"
          style={{
            background: "#CFFF40",
            color: "#000000",
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 700,
            height: "48px",
            border: "1px solid #C3C3C3",
          }}
          onClick={() => setCurrentView("config")}
        >
          시뮬레이션 종료
        </Button>
      </div>
    </>
  );
});

export default SimulationQuickResult;
