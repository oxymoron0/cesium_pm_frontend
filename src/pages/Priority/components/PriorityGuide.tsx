import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Divider from '@/components/basic/Divider';

interface PriorityGuideProps {
  onClose: () => void;
}

const PriorityGuide = function PriorityGuide({ onClose }: PriorityGuideProps) {
  return (
    <Panel
      position="center"
      width="600px"
      marginHorizontal={20}
      marginVertical={32}
    >
      <Title onClose={onClose}>
        우선순위 도움말
      </Title>

      <Spacer height={16} />

      {/* 맞춤설정 섹션 */}
      <div className="flex flex-col gap-3">
        <p className="text-white font-pretendard text-[16px] font-bold">
          맞춤설정으로 조회
        </p>
        <Divider />
        <div className="text-[#CCCCCC] font-pretendard text-[14px] leading-relaxed">
          <p className="mb-2">원하는 날짜, 시간, 행정구역을 직접 선택하여 취약시설 중심의 살수차 우선 투입 순위를 확인할 수 있습니다.</p>

          <p className="font-bold text-white mt-4 mb-2">• 주소 조회</p>
          <p className="ml-4">행정구역(읍/면/동)을 직접 선택하여 해당 지역의 취약시설 우선순위를 조회합니다.</p>

          <p className="font-bold text-white mt-4 mb-2">• 위치 지정</p>
          <p className="ml-4">지도에서 원하는 읍/면/동을 직접 클릭하여 선택할 수 있습니다. 클릭한 지역이 흰색으로 강조 표시됩니다.</p>
        </div>
      </div>

      <Spacer height={24} />

      {/* 우선순위 조회 결과 섹션 */}
      <div className="flex flex-col gap-3">
        <p className="text-white font-pretendard text-[16px] font-bold">
          우선순위 조회 결과
        </p>
        <Divider />
        <div className="text-[#CCCCCC] font-pretendard text-[14px] leading-relaxed">
          <p className="mb-2">선택한 조건에 따라 취약시설의 우선순위 목록이 표시됩니다.</p>

          <p className="font-bold text-white mt-4 mb-2">• 취약시설 선택</p>
          <p className="ml-4">체크박스를 선택하면 해당 시설 주변의 정류장과 도로 정보를 확인할 수 있습니다.</p>

          <p className="font-bold text-white mt-4 mb-2">• 예측 등급</p>
          <p className="ml-4">각 시설의 예측 대기질 농도와 등급이 색상으로 표시됩니다.</p>
          <p className="ml-4 mt-1">
            <span className="inline-block w-16 text-center py-1 rounded" style={{ backgroundColor: '#1C67D7', color: '#FFFFFF' }}>좋음</span>
            {' '}
            <span className="inline-block w-16 text-center py-1 rounded" style={{ backgroundColor: '#18A274', color: '#000000' }}>보통</span>
            {' '}
            <span className="inline-block w-16 text-center py-1 rounded" style={{ backgroundColor: '#FEE046', color: '#000000' }}>나쁨</span>
            {' '}
            <span className="inline-block w-20 text-center py-1 rounded" style={{ backgroundColor: '#D32F2D', color: '#FFFFFF' }}>매우나쁨</span>
          </p>
        </div>
      </div>

      <Spacer height={24} />

      {/* 읍면동 경계 섹션 */}
      <div className="flex flex-col gap-3">
        <p className="text-white font-pretendard text-[16px] font-bold">
          읍/면/동 경계 표시
        </p>
        <Divider />
        <div className="text-[#CCCCCC] font-pretendard text-[14px] leading-relaxed">
          <p className="mb-2">지도에서 선택한 행정구역의 경계가 표시됩니다.</p>

          <p className="font-bold text-white mt-4 mb-2">• 초록색 경계</p>
          <p className="ml-4">선택되지 않은 일반 행정구역 경계입니다.</p>

          <p className="font-bold text-white mt-4 mb-2">• 흰색 경계</p>
          <p className="ml-4">현재 선택된 행정구역 경계입니다.</p>
        </div>
      </div>
    </Panel>
  );
};

export default PriorityGuide;
