import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import { priorityStore } from '@/stores/PriorityStore';
import type { NearbyRoad } from '../types';

interface NearbyRoadListProps {
  roads: NearbyRoad[];
  onClose?: () => void;
}

const NearbyRoadList = observer(function NearbyRoadList({ roads, onClose }: NearbyRoadListProps) {
  if (roads.length === 0) {
    return null; // 도로가 없으면 패널을 표시하지 않음
  }

  const toggleRoad = (roadId: string) => {
    priorityStore.toggleRoadSelection(roadId);
  };

  // 도로명/지번 라인 렌더링 함수
  const renderAddressLine = (label: string, address: string) => (
    <div className="flex items-start gap-2">
      {/* 라벨 */}
      <div
        className="flex-shrink-0 font-pretendard"
        style={{
          color: '#FFD040',
          fontSize: '14px',
          fontWeight: '700',
          lineHeight: '20px'
        }}
      >
        {label}
      </div>

      {/* 구분자 */}
      <div
        className="font-pretendard"
        style={{
          color: '#FFF',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '20px'
        }}
      >
        |
      </div>

      {/* 주소 */}
      <div
        className="flex-1 font-pretendard"
        style={{
          color: '#FFF',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '20px'
        }}
      >
        {address}
      </div>
    </div>
  );

  return (
    <>
      <Title onClose={onClose}>
        살수차 우선 투입 주변 도로 정보
      </Title>

      <Spacer height={8} />

      {/* 캡션 텍스트 */}
      <div
        className="self-stretch"
        style={{
          color: '#A6A6A6',
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: 'normal',
          opacity: 0.8
        }}
      >
        ※ 취약시설 주변 공기질 개선을 위한 살수차 우선 투입 도로 정보를 확인하세요.
      </div>

      <Spacer height={16} />

      {/* 도로 리스트 */}
      <div
        className="flex flex-col self-stretch gap-2 custom-scrollbar"
        style={{
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      >
        {roads.map((road) => {
          return (
            <div
              key={road.id}
              className="flex items-start self-stretch gap-3 px-4 py-3"
              style={{
                backgroundColor: '#454545',
                borderRadius: '4px'
              }}
            >
              {/* 체크박스 */}
              <input
                type="checkbox"
                className="flex-shrink-0 custom-checkbox"
                style={{ marginTop: '2px' }}
                checked={priorityStore.isRoadSelected(road.id)}
                onChange={() => toggleRoad(road.id)}
              />

              {/* 도로명/지번 정보 */}
              <div className="flex flex-col flex-1 gap-1">
                {road.roadName && road.roadAddress && renderAddressLine('도로명', road.roadAddress)}
                {road.lotNumber && road.lotAddress && renderAddressLine('지번', road.lotAddress)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
});

export default NearbyRoadList;
