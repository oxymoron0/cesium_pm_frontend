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
        className="font-pretendard flex-shrink-0"
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
        실수차 우선 투입 주변 도로 정보
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
        실수차 우선 투입 취약시설에 인접한 도로를 파악할 수 있습니다.
      </div>

      <Spacer height={16} />

      {/* 도로 리스트 */}
      <div
        className="flex flex-col gap-2 self-stretch custom-scrollbar"
        style={{
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      >
        {roads.map((road) => {
          return (
            <div
              key={road.id}
              className="flex items-start gap-3 self-stretch px-4 py-3"
              style={{
                backgroundColor: '#454545',
                borderRadius: '4px'
              }}
            >
              {/* 체크박스 */}
              <input
                type="checkbox"
                className="custom-checkbox flex-shrink-0"
                style={{ marginTop: '2px' }}
                checked={priorityStore.isRoadSelected(road.id)}
                onChange={() => toggleRoad(road.id)}
              />

              {/* 도로명/지번 정보 */}
              <div className="flex flex-col gap-1 flex-1">
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
