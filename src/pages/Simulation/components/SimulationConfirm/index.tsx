import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import Confirm from '@/components/basic/Confirm'
import { simulationStore } from '@/stores/SimulationStore';

interface SimulationConfirmProps {
  onClose?: () => void;
}

const SimulationConfirm = observer(function SimulationConfirm({}: SimulationConfirmProps) {
  useEffect(() => {
    return () => {
    }
  }, [])

  return (
    <Confirm
      className="flex flex-col items-center gap-4"
    >
      <div className="w-full gap-4 py-[32px] px-[20px]">
        {/* 타이틀 */}
        <div className="text-center">
          <div className="font-bold text-lg">작성하신 내용으로 시뮬레이션을 실행하시겠습니까?</div>
          <div className="font-normal text-base">등록된 시뮬레이션은 {' '}
              <span className="text-[rgba(207,255,64,1)]">
                맞춤실행 {'>'} 실행목록
              </span>
            에서 확인하실 수 있습니다.</div>
        </div>

        {/* info */}
        <div className="my-6 font-normal text-base text-[rgba(166,166,166,1)] text-sm">* 완료까지 약 1~2시간 소요될 수 있습니다.</div>

        <div className="border border-[rgba(105,106,106,1)] bg-[rgba(0,0,0,0.8)] p-[12px] rounded-lg">
          <div className="flex py-2.5 px-2">
              <div className="w-[40%] font-[700] text-[14px]">시뮬레이션 제목</div>
              <div className="w-[60%] font-[400] text-[14px]">202615243테스트</div>
          </div>
          <div className="flex py-2.5 px-2">
              <div className="w-[40%] font-[700] text-[14px]">오염 물질/농도</div>
              <div className="w-[60%] font-[400] text-[14px]">미세먼지(PM-10)  /  151μg/m³</div>
          </div>
          <div className="flex py-2.5 px-2">
              <div className="w-[40%] font-[700] text-[14px]">발생 위치</div>
              <div className="w-[60%] font-[400] text-[14px]">
                (도로명) 부산광역시 부산진구 중앙대로 지하730
                (지번) 부산광역시 부산진구 부전동 573-1
              </div>
          </div>
          <div className="flex py-2.5 px-2">
              <div className="w-[40%] font-[700] text-[14px]">기상 조건</div>
              <div className="w-[60%] font-[400] text-[14px]">(풍향) 200°  (풍속) 3.41 m/s </div>
          </div>
          <div className="flex py-2.5 px-2">
              <div className="w-[40%] font-[700] text-[14px]">공개 설정</div>
              <div className="w-[60%] font-[400] text-[14px]">공개</div>
          </div>
        </div>

        <div className="flex mt-6 justify-center">
          <div 
            className="text-center w-[108px] cursor-pointer font-[700] text-[16px] py-[10px] px-[19px] rounded-[4px] border border-[rgba(207,255,64,1)]"
            onClick={() => simulationStore.closeModal()}
          >
            취소
          </div>
          <div 
            className="ml-2.5 cursor-pointer font-[700] text-[16px] py-[10px] px-[19px] rounded-[4px] border border-[rgba(207,255,64,1)] text-black bg-[rgba(207,255,64,1)]"
            onClick={() => simulationStore.closeModal()}
          >
            시뮬레이션 실행
          </div>
        </div>
      </div>
    </Confirm>
  )
})

export default SimulationConfirm