import { observer } from "mobx-react-lite";
import { useEffect, type ReactNode } from "react";
import Confirm from "@/components/basic/Confirm";
import type {
  PMType,
  SimulationListItem,
  SimulationRequest,
} from "@/types/simulation_request_types";
import { simulationStore } from "@/stores/SimulationStore";

type ConfirmForm = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  content?: ReactNode;
  cancelText: string;
  confirmText: string;
  onConfirm?: () => void; // 확인 버튼 클릭 시 호출 (결과만 전달)
};

const SimulationConfirm = observer(function SimulationConfirm() {
  const { dataForConfirm } = simulationStore;


  const handleExecute = async () => {
  if (simulationStore.currentView === 'detailConfig' && simulationStore.pendingSimulationData) {
    console.log('상세설정 실행:', simulationStore.pendingSimulationData);
    await simulationStore.submitSimulationRequest(simulationStore.pendingSimulationData);
  } else if (simulationStore.currentView === 'running' && simulationStore.selectedStartSimulation) {
    console.log('실행목록 실행:', simulationStore.selectedStartSimulation.uuid);
    await simulationStore.selectSimulation(simulationStore.selectedStartSimulation.uuid);

    if (!simulationStore.detailError && simulationStore.simulationDetail) {
      simulationStore.setCurrentView('result')
      console.log("simulationStore.simulationDetail : ", simulationStore.simulationDetail)
    }
  }
};

  const needsData =
    simulationStore.isModalConfirmType === "runCustom" ||
    simulationStore.isModalConfirmType === "runDup" ||
    simulationStore.isModalConfirmType === "runList";

  useEffect(() => {
    if (needsData && !dataForConfirm) {
      simulationStore.cancelModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsData, dataForConfirm]);

  // 모달 open 상태가 아니면 렌더하지 않음
  if (!simulationStore.isModalOpen) return null;
  // 데이터가 필요한 모달인데 없으면 렌더하지 않음
  if (needsData && !dataForConfirm) return null;

  // --- 표시용 유틸 ---
  const formatPollutant = (pm_type: PMType) => {
    if (pm_type === "pm10") return "미세먼지(PM-10)";
    if (pm_type === "pm25") return "초미세먼지(PM-2.5)";
    return pm_type;
  };

  // [refactor] 표시 데이터 추출 공통화 (dataForConfirm가 없을 수도 있으니 안전 접근)
  const pmTypeToDisplay =
    simulationStore.currentView === "detailConfig"
      ? (dataForConfirm as SimulationRequest | undefined)?.air_quality?.pm_type
      : (dataForConfirm as SimulationListItem | undefined)?.pm_type;

  const concentrationToDisplay =
    simulationStore.currentView === "detailConfig"
      ? (dataForConfirm as SimulationRequest | undefined)?.air_quality
          ?.points?.[0]?.concentration
      : (dataForConfirm as SimulationListItem | undefined)?.concentration;

  const jibunAddressToDisplay =
    dataForConfirm && "lot" in dataForConfirm ? dataForConfirm.lot : "-";

  const renderAddress = () => {
    return dataForConfirm &&
      (dataForConfirm.road_name || jibunAddressToDisplay !== "-") ? (
      <>
        {dataForConfirm.road_name && (
          <div>(도로명) {dataForConfirm.road_name}</div>
        )}
        {jibunAddressToDisplay !== "-" && (
          <div>(지번) {jibunAddressToDisplay}</div>
        )}
      </>
    ) : (
      "-"
    );
  };

  const renderWeather = () => {
    const wd = dataForConfirm?.weather?.wind_direction_10m;
    const ws = dataForConfirm?.weather?.wind_speed_10m;
    return wd != null || ws != null ? (
      <>
        {wd != null && <span>(풍향) {wd}° </span>}
        {ws != null && <span>(풍속) {ws} m/s</span>}
      </>
    ) : (
      "-"
    );
  };

  const renderPrivacy = () => {
    return dataForConfirm
      ? dataForConfirm.is_private === true
        ? "비공개"
        : dataForConfirm.is_private === false
        ? "공개"
        : "-"
      : "-";
  };

  // [refactor] 요약 카드 공통 컴포넌트
  const SummaryCard: React.FC = () => (
    <div
      className="flex flex-col items-center gap-4"
      style={{ width: "600px" }}
    >
      <div className="border border-[rgba(105,106,106,1)] bg-[rgba(0,0,0,0.8)] p-[12px] rounded-lg w-full">
        <div className="flex py-2.5 px-2">
          <div className="w-[40%] font-[700] text-[14px]">시뮬레이션 제목</div>
          <div className="w-[60%] font-[400] text-[14px]">
            {simulationStore.dataForConfirm?.simulation_name ?? "-"}
          </div>
        </div>

        <div className="flex py-2.5 px-2">
          <div className="w-[40%] font-[700] text-[14px]">오염 물질/농도</div>
          <div className="w-[60%] font-[400] text-[14px]">
            {pmTypeToDisplay && concentrationToDisplay != null
              ? `${formatPollutant(
                  pmTypeToDisplay
                )} / ${concentrationToDisplay}μg/m³`
              : "-"}
          </div>
        </div>

        <div className="flex py-2.5 px-2">
          <div className="w-[40%] font-[700] text-[14px]">발생 위치</div>
          <div className="w-[60%] font-[400] text-[14px]">
            {renderAddress()}
          </div>
        </div>

        <div className="flex py-2.5 px-2">
          <div className="w-[40%] font-[700] text-[14px]">기상 조건</div>
          <div className="w-[60%] font-[400] text-[14px]">
            {renderWeather()}
          </div>
        </div>

        <div className="flex py-2.5 px-2">
          <div className="w-[40%] font-[700] text-[14px]">공개 설정</div>
          <div className="w-[60%] font-[400] text-[14px]">
            {renderPrivacy()}
          </div>
        </div>
      </div>
    </div>
  );

  // --- 폼 정의 (확인/취소 결과만 반환) ---
  const form: ConfirmForm | null = (() => {
    switch (simulationStore.isModalConfirmType) {
      case "moveReset":
        return {
          open: true,
          title: (
            <>
              <div>
                현재 입력 값은 저장되지 않으며, <br /> 이동 시 초기화됩니다.
              </div>
            </>
          ),
          description: "계속 진행하시겠습니까?",
          cancelText: "취소",
          confirmText: "이동",
          onConfirm: () => simulationStore.confirmModal(),
        };

      case "locStart":
        return {
          open: true,
          title: "위치가 지정되었습니다.",
          description: (
            <>
              <div>
                선택한 위치로 시뮬레이션 상세 설정을 <br /> 진행하시겠습니까?
              </div>
            </>
          ),
          cancelText: "취소",
          confirmText: "시작",
          onConfirm: () => simulationStore.confirmModal(),
        };

      case "stopSim":
        return {
          open: true,
          title: "시뮬레이션 분석을 중지하시겠습니까?",
          description: (
            <>
              <div className="text-[rgba(166,166,166,1)]">
                중지 시 해당 시뮬레이션 진행이 초기화되며,
                <br />
                대기 상태로 변경됩니다.
                <br />타 사용자의 시뮬레이션이 우선 대기중일 경우 선진행됩니다.
              </div>
            </>
          ),
          cancelText: "취소",
          confirmText: "중지",
          onConfirm: () => simulationStore.confirmModal(),
        };

      case "delSim":
        return {
          open: true,
          title: (
            <>
              <div>
                선택한 항목을 삭제하시겠습니까? <br /> 삭제 후에는 복구할 수
                없습니다.
              </div>
            </>
          ),
          cancelText: "취소",
          confirmText: "삭제",
          onConfirm: () => simulationStore.confirmModal(),
        };

      case "runCustom":
        return {
          open: true,
          title: "작성하신 내용으로 시뮬레이션을 실행하시겠습니까?",
          description: (
            <>
              <div className="font-normal text-center">
                등록된 시뮬레이션은{" "}
                <span className="text-[rgba(207,255,64,1)]">
                  맞춤실행 &gt; 실행목록
                </span>
                에서 확인하실 수 있습니다.
              </div>
              <div className="text-left font-normal text-[rgba(166,166,166,1)] text-sm">
                * 완료까지 약 1~2시간 소요될 수 있습니다.
              </div>
            </>
          ),
          content: <SummaryCard />,
          cancelText: "취소",
          confirmText: "시뮬레이션 실행",
          onConfirm: () => simulationStore.confirmModal(),
        };

      case "runDup":
        return {
          open: true,
          title: "작성하신 내용으로 시뮬레이션을 실행하시겠습니까?",
          description: (
            <div className="text-left font-normal text-[rgba(166,166,166,1)] text-sm">
              * 현재 실행 중인 시뮬레이션이 있어 완료까지 2시간 이상 소요될 수
              있습니다.
            </div>
          ),
          content: <SummaryCard />,
          cancelText: "취소",
          confirmText: "시뮬레이션 실행",
          onConfirm: () => simulationStore.confirmModal(),
        };

      case "runList":
        return {
          open: true,
          title: "해당 시뮬레이션을 실행하시겠습니까?",
          content: <SummaryCard />,
          cancelText: "취소",
          confirmText: "바로 실행",
          onConfirm: () => {
            handleExecute();
            simulationStore.confirmModal()
          }
        };

      default:
        return null;
    }
  })();

  if (!form || !form.open) return null;

  return (
    <Confirm className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center text-white py-8 px-5 min-w-[400px] min-h-[210px] ">
        {/* 제목 */}
        {form.title && (
          <div className="mb-4 text-center font-[700] text-[18px] text-white">
            {form.title}
          </div>
        )}

        {/* 설명 */}
        {form.description && (
          <div className="mb-4 text-center text-[14px] font-normal">
            {form.description}
          </div>
        )}

        {/* 본문(요약카드 등) */}
        {form.content && (
          <div className="w-full flex flex-col items-center">
            {form.content}
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex mt-6 justify-center">
          {/* 취소 → 호출자에게 'cancel' 반환 */}
          <div
            className="text-center w-[108px] cursor-pointer font-[700] text-[16px]
            py-[10px] px-[19px] rounded-[4px] border border-[rgba(207,255,64,1)] min-w-[108px]"
            onClick={() => simulationStore.cancelModal()}
          >
            {form.cancelText}
          </div>

          {/* 확인 → 호출자에게 'confirm' 반환 */}
          <div
            className="ml-2.5 text-center min-w-[108px] cursor-pointer font-[700] text-[16px] py-[10px] px-[19px] rounded-[4px] border border-[rgba(207,255,64,1)] text-black bg-[rgba(207,255,64,1)]"
            onClick={form.onConfirm}
          >
            {form.confirmText}
          </div>
        </div>
      </div>
    </Confirm>
  );
});

export default SimulationConfirm;
