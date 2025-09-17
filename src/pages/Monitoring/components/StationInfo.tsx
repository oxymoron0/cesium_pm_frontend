import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import Divider from '@/components/basic/Divider';
import Spacer from '@/components/basic/Spacer';
import SubTitle from '@/components/basic/SubTitle';
import Item from '@/components/basic/Item';
import TabNavigation from '@/components/basic/TabNavigation';
import { routeStore } from '@/stores/RouteStore';
import { stationStore } from '@/stores/StationStore';

interface StationInfoProps {
  onBackClick: () => void;
}

/**
 * StationInfo Component
 * 선택된 노선의 정류장 정보를 표시하는 컴포넌트
 * RouteStore와 StationStore를 연동하여 방향별 정류장 목록을 제공
 */
const StationInfo = observer(function StationInfo({ onBackClick }: StationInfoProps) {
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  // RouteStore에서 선택된 노선 정보
  const selectedRouteName = routeStore.selectedRouteName;
  const selectedRouteInfo = routeStore.selectedRouteInfo;

  // StationStore와 RouteStore 상태 동기화 - RouteStore가 Single Source of Truth이므로 제거
  // StationStore.selectedRouteName은 이제 RouteStore.selectedRouteName을 참조

  // 방향 선택 핸들러
  const handleDirectionSelect = async (direction: 'inbound' | 'outbound') => {
    stationStore.setSelectedDirection(direction);

    // 노선 방향 강조 업데이트
    try {
      const { updateFocusedRouteDirection } = await import('@/utils/cesium/routeColors');
      updateFocusedRouteDirection(direction);
    } catch (error) {
      console.error('[handleDirectionSelect] Failed to update route direction emphasis:', error);
    }
  };

  // TabNavigation용 핸들러
  const handleTabChange = (index: number) => {
    const direction = index === 0 ? 'inbound' : 'outbound';
    handleDirectionSelect(direction);
  };

  // 현재 선택된 방향을 탭 인덱스로 변환
  const getActiveTabIndex = () => {
    if (!stationStore.selectedDirection) return -1;
    return stationStore.selectedDirection === 'inbound' ? 0 : 1;
  };

  // 정류장 선택 핸들러
  const handleStationSelect = (stationId: string) => {
    stationStore.setSelectedStation(stationId);
  };

  // 선택된 노선이 없으면 빈 상태 표시
  if (!selectedRouteName || !selectedRouteInfo) {
    return (
      <>
        <Spacer height={16} />
        <SubTitle>버스 전체 노선</SubTitle>
        <Divider color="bg-white" />
        <Spacer height={16} />
        <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
          노선을 먼저 선택해주세요.
        </div>
      </>
    );
  }

  // 현재 선택된 방향의 정류장 데이터
  const currentStationData = stationStore.currentStationData;
  const currentStations = stationStore.currentStations;
  const isLoading = stationStore.isLoading;

  return (
    <>
      {/* 제목과 뒤로가기 버튼 */}
      <Title>
        <div className="flex items-center gap-2">
          <button
            onClick={onBackClick}
            className="flex items-center justify-center w-6 h-6 transition-opacity hover:opacity-80"
          >
            <img
              src={`${basePath}icon/back.svg`}
              alt="뒤로가기"
              className="w-3 h-4"
            />
          </button>
          <span>버스 전체 노선</span>
        </div>
      </Title>
      <Spacer height={16} />
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <img
            src={`${basePath}icon/normal.svg`}
            alt="일반"
            className="h-6 w-9"
          />
          <span
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '24px',
              fontWeight: '700',
              lineHeight: '24px'
            }}
          >
            {selectedRouteName}
          </span>
        </div>
        <div
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: '24px'
          }}
        >
          {selectedRouteInfo.origin} ↔ {selectedRouteInfo.destination}
        </div>
      </div>

      {/* 방향 선택 탭 */}
      <TabNavigation
        tabs={[
          `${selectedRouteInfo.destination} 방면`,
          `${selectedRouteInfo.origin} 방면`
        ]}
        activeTab={getActiveTabIndex()}
        onTabChange={handleTabChange}
      />

      {/* 정류장 목록 */}
      <div
        className="flex flex-col w-full gap-2 px-1 overflow-y-auto"
        style={{
          maxHeight: 'calc(936px - 320px)', // Panel maxHeight - 고정 요소들 높이 = 616px
          minHeight: '300px', // 최소 높이 보장
          scrollbarWidth: 'thin',
          scrollbarColor: '#FFD040 transparent'
        }}
      >
        {!stationStore.selectedDirection ? (
          <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
            방향을 선택해주세요.
          </div>
        ) : isLoading ? (
          // 로딩 상태
          <>
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={`skeleton-${index}`}
                className="bg-[#1A1A1A] rounded-lg p-4 animate-pulse w-full"
              >
                <div className="w-3/4 h-4 mb-2 bg-gray-600 rounded"></div>
                <div className="w-1/2 h-3 bg-gray-600 rounded"></div>
              </div>
            ))}
          </>
        ) : currentStations.length > 0 ? (
          // 정류장 목록 표시
          <>
            <Spacer height={8} />
            {currentStations.map((station) => (
              <Item
                key={station.station_id}
                className={`cursor-pointer transition-all ${
                  stationStore.isStationSelected(station.station_id)
                    ? 'ring-2 ring-[#FFD040] bg-[#2A2A2A]'
                    : 'hover:bg-[#1A1A1A]'
                }`}
                onClick={() => handleStationSelect(station.station_id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1">
                    <div
                      style={{
                        color: '#FFF',
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: '600',
                        lineHeight: '20px'
                      }}
                    >
                      {station.station_name}
                    </div>
                    <div
                      style={{
                        color: '#A6A6A6',
                        fontFamily: 'Pretendard',
                        fontSize: '12px',
                        fontWeight: '400',
                        lineHeight: '16px'
                      }}
                    >
                      {station.ars_id} • {station.dong}
                    </div>
                  </div>
                </div>
              </Item>
            ))}
          </>
        ) : (
          <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
            정류장 데이터를 불러올 수 없습니다.
          </div>
        )}
      </div>

      <Spacer height={16} />
      <Divider height="h-[2px]" />
      <Spacer height={16} />
      
      {/* 하단 체크박스 */}
      <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
        <input
          type="checkbox"
          style={{
            width: '16px',
            height: '16px',
            appearance: 'none',
            WebkitAppearance: 'none',
            backgroundColor: 'transparent',
            border: '1px solid #A6A6A6',
            borderRadius: '4px',
            cursor: 'pointer',
            position: 'relative'
          }}
          onInput={(e) => {
            const target = e.target as HTMLInputElement;
            if (target.checked) {
              target.style.backgroundColor = '#FFD040';
              target.style.borderColor = '#FFD040';
            } else {
              target.style.backgroundColor = 'transparent';
              target.style.borderColor = '#A6A6A6';
            }
          }}
        />
        <span
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontSize: '12px',
            fontWeight: '400',
            lineHeight: '16px'
          }}
        >
          모든 정류장의 실시간 공기질 보기
        </span>
      </div>
    </>
  );
});

export default StationInfo;