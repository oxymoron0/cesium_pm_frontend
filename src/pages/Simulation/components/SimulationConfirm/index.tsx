import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import Confirm from "@/components/basic/Confirm";
import type { PMType, SimulationListItem, SimulationRequest } from "@/types/simulation_request_types";
import { simulationStore } from "@/stores/SimulationStore";
import Spacer from "@/components/basic/Spacer";

// interface SimulationConfirmProps {
//   onClose?: () => void;
// }

const SimulationConfirm = observer( //맞춤실행 (시뮬레이션 요청, 시뮬레이션 결과)
  function SimulationConfirm(/*{}: SimulationConfirmProps*/) {
    const { dataForConfirm } = simulationStore;

    useEffect(() => {
      if (!dataForConfirm) {
        simulationStore.closeModal();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataForConfirm, simulationStore.closeModal]);

    if (!dataForConfirm) return null;

    // 실행 핸들러
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
      simulationStore.closeModal();
    };

    const confirmButtonText = simulationStore.currentView === 'detailConfig' ? '시뮬레이션 실행' : '바로 실행';

    const pmTypeToDisplay = simulationStore.currentView === 'detailConfig'
      ? (dataForConfirm as SimulationRequest)?.air_quality?.pm_type
      : (dataForConfirm as SimulationListItem)?.pm_type;

    const concentrationToDisplay = simulationStore.currentView === 'detailConfig'
      ? (dataForConfirm as SimulationRequest)?.air_quality?.points?.[0]?.concentration
      : (dataForConfirm as SimulationListItem)?.concentration;

    const jibunAddressToDisplay = 'lot' in dataForConfirm ? dataForConfirm.lot : '-';
    // formatPollutant 유틸리티 함수
    const formatPollutant = (pm_type: PMType) => {
      if (pm_type === "pm10") return "미세먼지(PM-10)";
      if (pm_type === "pm25") return "초미세먼지(PM-2.5)";
      return pm_type;
    };

    const InfoRow = ({
      label,
      children,
    }: {
      label: string;
      children: React.ReactNode;
    }) => {
      return (
        <div className="flex py-2.5 px-2">
          <div className="w-[40%] font-[700] text-[14px]">{label}</div>
          <div className="w-[60%] font-[400] text-[14px]">{children}</div>
        </div>
      );
    };

    return (
      <Confirm className="flex flex-col items-center gap-4">
        <div className="gap-4 py-[32px] px-[20px]" style={{width:'600px'}}>
          {/* ===== 헤더 메시지 ===== */}
          <div className="text-center">
            <div className="font-bold text-lg">
              {simulationStore.currentView === 'detailConfig' ?
              '작성하신 내용으로 시뮬레이션을 실행하시겠습니까?' : '해당 시뮬레이션을 실행하시겠습니까?'}
            </div>
          </div>
          {simulationStore.currentView === 'detailConfig' ?
            (
            <>
              {/* 안내 문구 (맞춤실행 > 실행목록) */}
              <div className="font-normal text-center ">
                등록된 시뮬레이션은{" "}
                <span className="text-[rgba(207,255,64,1)]">
                  맞춤실행 {">"} 실행목록
                </span>
                에서 확인하실 수 있습니다.
              </div>

              {/* ===== 소요 시간 안내 ===== */}
              <div className="my-6 font-normal text- text-[rgba(166,166,166,1)] text-sm">
                * 완료까지 약 1~2시간 소요될 수 있습니다.
              </div>
            </>
            )
            :
            (<Spacer height={16} />)
          }
          

          {/* ===== 요약 카드 ===== */}
          <div className="border border-[rgba(105,106,106,1)] bg-[rgba(0,0,0,0.8)] p-[12px] rounded-lg">
            {/* 시뮬레이션 제목 */}
            <InfoRow label="시뮬레이션 제목">
              {dataForConfirm?.simulation_name ?? "-"}
            </InfoRow>

            {/* 오염 물질/농도 */}
            <InfoRow label="오염 물질/농도">
              {pmTypeToDisplay && concentrationToDisplay != null
                ? `${formatPollutant(pmTypeToDisplay as PMType)} / ${concentrationToDisplay}μg/m³`
                : "-"}
            </InfoRow>

            {/* 발생 위치 */}
            <InfoRow label="발생 위치">
              {dataForConfirm.road_name || jibunAddressToDisplay !== '-' ? ( 
                <>
                  {dataForConfirm.road_name && (
                    <div>(도로명) {dataForConfirm.road_name}</div>
                  )}
                  {jibunAddressToDisplay !== '-' && ( 
                    <div>(지번) {jibunAddressToDisplay}</div>
                  )}
                </>
              ) : (
                "-"
              )}
            </InfoRow>

            {/* 기상 조건 */}
            <InfoRow label="기상 조건">
              {dataForConfirm.weather?.wind_direction_10m != null ||
               dataForConfirm.weather?.wind_speed_10m != null ? (
                 <>
                   {dataForConfirm.weather?.wind_direction_10m != null && (
                     <span>(풍향) {dataForConfirm.weather.wind_direction_10m}° </span>
                   )}
                   {dataForConfirm.weather?.wind_speed_10m != null && (
                     <span>(풍속) {dataForConfirm.weather.wind_speed_10m} m/s</span>
                   )}
                 </>
               ) : (
                 "-"
               )}
            </InfoRow>

            {/* 공개 설정 */}
            <InfoRow label="공개 설정">
              {dataForConfirm.is_private === true ? '비공개' 
                : dataForConfirm.is_private === false ? '공개' 
                : '-' }
            </InfoRow>
          </div>

          {/* ===== 하단 액션 버튼 ===== */}
          <div className="flex mt-6 justify-center">
            {/* 취소 */}
            <div
              className="text-center w-[108px] cursor-pointer font-[700] text-[16px] py-[10px] px-[19px] rounded-[4px] border border-[rgba(207,255,64,1)]"
              onClick={() => simulationStore.closeModal()}
            >
              취소
            </div>

            {/* 시뮬레이션 실행 */}
            <div
              className="ml-2.5 cursor-pointer font-[700] text-[16px] py-[10px] px-[19px] rounded-[4px] border border-[rgba(207,255,64,1)] text-black bg-[rgba(207,255,64,1)]"
              onClick={handleExecute}
            >
              {confirmButtonText}
            </div>
          </div>
        </div>
      </Confirm>
    );
  }
);

export default SimulationConfirm;
