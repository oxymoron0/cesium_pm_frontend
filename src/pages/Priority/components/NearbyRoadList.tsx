import React from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import { priorityStore } from '@/stores/PriorityStore';
import { toggleRoadVisibility } from '@/utils/cesium/nearbyRoadRenderer';
import type { NearbyRoad } from '../types';

interface NearbyRoadListProps {
  roads: NearbyRoad[];
  onClose?: () => void;
}

const NearbyRoadList = observer(function NearbyRoadList({ roads, onClose }: NearbyRoadListProps) {
  // 도로 상태 초기화 (첫 렌더링 시 모든 도로 선택 상태로 설정)
  React.useEffect(() => {
    if (roads.length === 0) return;

    roads.forEach(road => {
      if (!priorityStore.isRoadSelected(road.id)) {
        priorityStore.toggleRoadSelection(road.id);
      }
    });
  }, [roads]);

  const toggleRoad = (roadName: string) => {
    // Store 상태 토글
    priorityStore.toggleRoadSelection(roadName);

    // Cesium Entity visibility 토글
    const isSelected = priorityStore.isRoadSelected(roadName);
    toggleRoadVisibility(roadName, isSelected);

    console.log(`[NearbyRoadList] Toggled road "${roadName}" visibility: ${isSelected}`);
  };

  // Early return after hooks
  if (roads.length === 0) {
    return null;
  }

  return (
    <>
      <Title onClose={onClose}>
        살수차 우선 투입 추천 도로 정보
      </Title>

      <Spacer height={16} />
      * 취약시설 주변 공기질 개선을 위한 살수차 우선 투입 도로 정보를 확인하세요.

      {/* 도로 목록 */}
      <div
        className="flex flex-col self-stretch gap-2 custom-scrollbar"
        style={{
          maxHeight: 'calc(100vh - 240px)',
          overflowY: 'auto'
        }}
      >
        {roads.map((road) => {
          const roadName = road.roadName || road.id;
          const isSelected = priorityStore.isRoadSelected(road.id);

          return (
            <div
              key={road.id}
              className="flex items-center self-stretch gap-3 px-4 py-3"
              style={{
                backgroundColor: isSelected ? 'rgba(127, 252, 0, 0.1)' : '#454545',
                borderRadius: '4px',
                border: isSelected ? '1px solid #7CFC00' : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {/* 체크박스 */}
              <input
                type="checkbox"
                className="flex-shrink-0 custom-checkbox"
                checked={isSelected}
                onChange={() => toggleRoad(road.id)}
              />

              {/* 도로명 */}
              <div className="flex items-center flex-1 gap-2">
                <div
                  className="font-pretendard"
                  style={{
                    color: '#FFD040',
                    fontSize: '14px',
                    fontWeight: '700',
                    lineHeight: '20px'
                  }}
                >
                  도로명
                </div>
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
                <div
                  className="flex-1 font-pretendard"
                  style={{
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: '20px'
                  }}
                >
                  {roadName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
});

export default NearbyRoadList;
