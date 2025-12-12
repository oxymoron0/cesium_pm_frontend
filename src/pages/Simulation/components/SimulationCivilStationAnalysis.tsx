import { observer } from 'mobx-react-lite';
import { simulationStore } from '@/stores/SimulationStore';
import Spacer from '@/components/basic/Spacer';
import Icon from '@/components/basic/Icon'; // 적절한 아이콘이 없다면 대체 혹은 텍스트 사용

const basePath = import.meta.env.VITE_BASE_PATH || '/'

// 1. 등급별 활동 가이드 데이터 정의
const ACTIVITY_GUIDES: Record<string, Array<{ title: string; desc: string; badge: string; color: string }>> = {
  '좋음': [
    { title: '마스크', desc: '오늘은 맨얼굴로 바람맞아도 괜찮아요', badge: '필요 없음', color: '#1C67D7' },
    { title: '자전거', desc: '오늘은 라이딩각, 바람이 스포트라이트 쏴줍니다', badge: '추천', color: '#1C67D7' },
    { title: '산책', desc: '강아지도 신나는 날, 같이 산책 인증샷 남겨요', badge: '추천', color: '#1C67D7' },
    { title: '야외 달리기', desc: '오늘은 러너`s 하이, 코스 좀 늘려도 돼요', badge: '추천', color: '#1C67D7' },
    { title: '캠핑', desc: '이건 바로 차박각, 텐트 들고 지금 출발해도 좋아요.', badge: '좋음', color: '#1C67D7' },
    { title: '별 관찰', desc: '오늘 밤은 별이 쏟아지듯 잘 보여요', badge: '최적', color: '#1C67D7' },
  ],
  '보통': [
    { title: '마스크', desc: '가방에 KF80하나 챙겨두면 마음이 편해요', badge: '선택', color: '#18A274' },
    { title: '자전거', desc: '동네 한 바퀴면 충분히 기분 전환돼요', badge: '양호', color: '#18A274' },
    { title: '산책', desc: '짧게 돌고 바로 집콕, 반반 산책 추천합니다', badge: '양호', color: '#18A274' },
    { title: '야외 달리기', desc: '5KM까지만 달리고, 카페로 직행 어떠세요?', badge: '조심', color: '#18A274' },
    { title: '캠핑', desc: '오늘은 짧은 피크닉 모드, 가볍게 즐기고 빨리 복귀해요', badge: '양호', color: '#18A274' },
    { title: '별 관찰', desc: '몇 개 별은 보이지만, 흐린 밤이네요', badge: '가능', color: '#18A274' },
  ],
  '나쁨': [
    { title: '마스크', desc: 'KF94는 오늘 외출의 드레스 코드예요', badge: '착용 필수', color: '#FF7700' },
    { title: '자전거', desc: '오늘은 페달 대신 대중교통이 더 낫겠어요', badge: '주의', color: '#FF7700' },
    { title: '산책', desc: '오늘 산책은 FLEX 말고 PASS가 정답이에요', badge: '주의', color: '#FF7700' },
    { title: '야외 달리기', desc: '러닝화 대신 헬스장 카드 꺼낼 차례예요', badge: '자제', color: '#FF7700' },
    { title: '캠핑', desc: '오늘은 텐트보다 창문 닫힌 방이 더 안전해요', badge: '자제', color: '#FF7700' },
    { title: '별 관찰', desc: '오늘은 별 대신 유튜브 밤하늘 영상이 더 선명해요', badge: '불가능', color: '#FF7700' },
  ]
  // '매우나쁨': [
  //   { title: '마스크', desc: '외출은 최대한 자제하고, 나간다면 KF94 필수!', badge: '절대필수', color: '#D32F2D' }, // 빨간색
  //   { title: '자전거', desc: '절대 금물! 호흡기 건강을 지키세요', badge: '금지', color: '#D32F2D' },
  //   { title: '산책', desc: '이불 밖은 위험해요. 집에서 쉬세요', badge: '금지', color: '#D32F2D' },
  //   { title: '야외 달리기', desc: '폐 건강을 위해 오늘은 참아주세요', badge: '금지', color: '#D32F2D' },
  //   { title: '캠핑', desc: '오늘 캠핑은 건강에 해로울 수 있어요', badge: '취소', color: '#D32F2D' },
  //   { title: '별 관찰', desc: '창문을 닫고 공기청정기를 가동하세요', badge: '금지', color: '#D32F2D' },
  // ]
};


// 2. 등급별 대표 색상 반환 함수
const getStatusColor = (label: string) => {
  switch (label) {
    case '좋음': return '#1C67D7';
    case '보통': return '#18A274';
    case '나쁨': return '#FF7700';
    case '매우나쁨': return '#D32F2D';
    default: return '#A6A6A6';
  }
};

const STATION_ICONS: Record<string, string> = {
  '좋음': 'state_good.svg',
  '보통': 'state_normal.svg',
  '나쁨': 'state_bad.svg',
  '매우나쁨': 'state_very_bad.svg'
}
const GUID_ICONS: Record<number, string> = {
  0: 'mask',
  1: 'bicycle',
  2: 'walking',
  3: 'running',
  4: 'camping',
  5: 'telescope'
}

const SimulationCivilStationAnalysis = observer(() => {
  const { selectedCivilSimulation, selectedCivilStationAnalysisId } = simulationStore;

  // 선택된 정류장 데이터 찾기
  const stationData = selectedCivilSimulation?.station_data.find(s => s.index === selectedCivilStationAnalysisId);

  if (!stationData) return null;

  // 날짜 포맷 (YYYY년 MM월 DD일)
  const dateObj = new Date(stationData.measured_at);
  const dateStr = `${dateObj.getFullYear()}년 ${String(dateObj.getMonth() + 1).padStart(2, '0')}월 ${String(dateObj.getDate()).padStart(2, '0')}일`;

  // 등급에 따른 스타일
  // 실제로는 stationData.pm_label 또는 concentration 값에 따라 분기 필요
  const pmLabel = stationData.pm_label || '보통'; // 데이터 없을 시 기본값
  const statusColor = getStatusColor(pmLabel);
  const statusImg = `${basePath}icon/${STATION_ICONS[pmLabel]}`
  const guides = ACTIVITY_GUIDES[pmLabel] || ACTIVITY_GUIDES['보통'];

  const fontPretendard = { fontFamily: 'Pretendard', lineHeight: 'normal' };

  return (
    <>
      <Spacer height={24} />

      <div className="text-white font-bold text-lg mb-2" style={fontPretendard}>활동가이드</div>
      <div className="w-full h-[1px] bg-[#C3C3C3] mb-4"></div>

      {/* 1. 상단 배너 (활동 지수) */}
      <div 
        className="w-full rounded-[30px] p-6 flex items-center justify-between relative overflow-hidden"
        style={{ backgroundColor: statusColor }}
      >
        <div className="flex items-center gap-4 z-10">
          
          <div className="w-16 h-16 flex items-center justify-center">
             <img src={statusImg}></img>             
          </div>
          
          <div className="flex flex-col text-white">
            <span className="text-sm opacity-90 font-medium">{dateStr}</span>
            <span className="text-2xl font-bold">활동지수</span>
          </div>
        </div>

        {/* 등급 뱃지 */}
        <div className="text-white px-6 py-2 rounded-full font-bold text-lg z-10 border-3 border-[#000000]" style={{ backgroundColor: statusColor }}>
          {pmLabel}
        </div>
      </div>

      <Spacer height={16} />

      {/* 2. 활동 카드 그리드 (3열) */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {guides.map((item, idx) => (
          <div 
            key={idx} 
            className="bg-[#2C2C2C] border border-[#696A6A] rounded-lg p-4 flex flex-col justify-between h-[140px]"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name={GUID_ICONS[idx]} className="w-5 h-5 text-white" /> {/* 아이콘 교체 필요 */}
                <span className="text-white font-bold text-lg">{item.title}</span>
              </div>
              <div className="text-[#A6A6A6] text-sm break-keep leading-tight">
                {item.desc}
              </div>
            </div>
            
            <div className="flex justify-end mt-2">
              <div 
                className="px-4 py-1 rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: statusColor }}
              >
                {item.badge}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Spacer height={24} />
    </>
  );
});

export default SimulationCivilStationAnalysis;