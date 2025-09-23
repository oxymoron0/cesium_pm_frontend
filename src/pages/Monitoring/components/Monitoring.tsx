import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import Title from "@/components/basic/Title";
import TabNavigation from "@/components/basic/TabNavigation";
import Button from "@/components/basic/Button";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import SubTitle from "@/components/basic/SubTitle";
import SearchInput from "@/components/basic/SearchInput";
import Icon from "@/components/basic/Icon";
import RouteCard from "@/components/service/RouteCard";
import StationCard from "@/components/service/StationCard";
import { routeStore } from '@/stores/RouteStore';

interface MonitoringProps {
  onRouteSelect: (routeNumber: string) => void;
}

const Monitoring = observer(function Monitoring({ onRouteSelect }: MonitoringProps) {
  const [selectedTab, setSelectedTab] = useState<'bus' | 'station'>('station');
  const [searchQuery, setSearchQuery] = useState('서면역');
  const [currentPage, setCurrentPage] = useState(1);

  // 임시 데이터 - 나중에 실제 API 데이터로 교체
  const savedStations = [
    { name: '서면역.서면지하상가', description: '05711 (서면역.서면지하상가방면)', isBookmarked: true },
    { name: '서면역.서면지하상가', description: '05710 (서면역.서면지하상가방면)', isBookmarked: true }
  ];

  const searchResults = [
    { name: '서면역.서면지하상가', description: '05711 (서면역.서면지하상가방면)', isBookmarked: false },
    { name: '서면역.서면지하상가', description: '05710 (서면역.서면지하상가방면)', isBookmarked: false },
    { name: '서면한전', description: '05712 (서면역.서면지하상가방면)', isBookmarked: false },
    { name: '서면한전', description: '05713 (벡내골역방면)', isBookmarked: false },
    { name: '서면역 1번출구', description: '05714 (서면역방면)', isBookmarked: false },
    { name: '서면역 2번출구', description: '05715 (서면역방면)', isBookmarked: false },
    { name: '서면역 3번출구', description: '05716 (서면역방면)', isBookmarked: false },
    { name: '서면역 4번출구', description: '05717 (서면역방면)', isBookmarked: false },
    { name: '서면사거리', description: '05718 (서면역방면)', isBookmarked: false },
    { name: '서면로터리', description: '05719 (서면역방면)', isBookmarked: false },
    { name: '서면CGV', description: '05720 (서면역방면)', isBookmarked: false },
    { name: '서면롯데백화점', description: '05721 (서면역방면)', isBookmarked: false },
    { name: '서면NC백화점', description: '05722 (서면역방면)', isBookmarked: false },
    { name: '서면젊음의거리', description: '05723 (서면역방면)', isBookmarked: false },
    { name: '서면맥주거리', description: '05724 (서면역방면)', isBookmarked: false },
    { name: '서면종합터미널', description: '05725 (서면역방면)', isBookmarked: false }
  ];

  const itemsPerPage = 4;
  const isSearchMode = searchQuery.trim().length > 0;
  const currentData = isSearchMode ? searchResults : savedStations;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = currentData.slice(startIndex, startIndex + itemsPerPage);

  const handleTabChange = (index: number) => {
    setSelectedTab(index === 0 ? 'bus' : 'station');
  };

  const getActiveTabIndex = () => {
    return selectedTab === 'bus' ? 0 : 1;
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // 검색시 페이지 리셋
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStationSelect = (stationName: string) => {
    console.log('Station selected:', stationName);
    // TODO: 정류장 선택 로직 구현
  };

  const handleBookmarkToggle = (stationName: string) => {
    console.log('Bookmark toggle:', stationName);
    // TODO: 북마크 토글 로직 구현
  };

  const getSubTitleText = () => {
    if (isSearchMode) {
      return `${searchQuery} 검색결과`;
    }
    return '저장한 정류장';
  };

  const renderBusTab = () => (
    <>
      <SubTitle> 저장한 버스 </SubTitle>
      <Divider></Divider>
      <Spacer height={16} />
      <div className="flex flex-col items-start self-stretch gap-2">
        {/* <RouteCard routeNumber="10" isExpress={false} description="송정 ←> 모라주공" /> */}
      </div>
      <Spacer height={16}/>
      <SubTitle> 노선도 </SubTitle>
      <Divider color="bg-white"></Divider>
      <Spacer height={16} />
      <div className="flex flex-col items-start self-stretch gap-2">
        {routeStore.isLoading ? (
          // 로딩 중: 스켈레톤 UI만 표시 (텍스트 제거)
          <>
            {[1, 2, 3, 4].map((index) => (
              <div
                key={`skeleton-${index}`}
                className="bg-[#1A1A1A] rounded-lg p-4 animate-pulse w-full"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-6 bg-gray-600 rounded w-9"></div>
                    <div className="w-8 h-6 bg-gray-600 rounded"></div>
                  </div>
                  <div className="bg-gray-600 rounded w-7 h-7"></div>
                </div>
                <div className="w-48 h-4 mt-2 bg-gray-600 rounded"></div>
              </div>
            ))}
          </>
        ) : (
          // 로딩 완료: 실제 데이터 또는 빈 상태 표시
          <>
            {routeStore.routeInfoList.length > 0 ? (
              routeStore.routeInfoList.map((routeInfo) => (
                <RouteCard
                  key={routeInfo.route_name}
                  routeNumber={routeInfo.route_name}
                  description={`${routeInfo.origin} ↔ ${routeInfo.destination}`}
                  isExpress={false} // 모든 노선을 일반버스로 설정 (필요시 추후 변경)
                  isBookmarked={false} // 북마크 기능은 추후 구현
                  isSelected={routeStore.isRouteSelected(routeInfo.route_name)}
                  onBookmarkToggle={() => {
                    // TODO: 북마크 기능 구현 예정
                  }}
                  onSelect={onRouteSelect}
                />
              ))
            ) : (
              <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
                노선 데이터를 불러올 수 없습니다.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 mx-1 rounded ${
            currentPage === i
              ? 'bg-[#FFD040] text-black font-semibold'
              : 'bg-transparent text-white hover:bg-gray-700'
          }`}
          style={{
            fontFamily: 'Pretendard',
            fontSize: '14px',
            lineHeight: '20px'
          }}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2 py-4 w-full">
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1 disabled:opacity-50"
        >
          <Icon name="left" className="w-6 h-6" />
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1 disabled:opacity-50"
        >
          <Icon name="right" className="w-6 h-6" />
        </button>
      </div>
    );
  };

  const renderStationTab = () => (
    <>
      <SearchInput
        value={searchQuery}
        placeholder="버스 정류장을 입력하세요."
        onChange={handleSearchChange}
      />
      <Spacer height={16} />

      <div className="flex items-center justify-between w-full">
        <SubTitle>{getSubTitleText()}</SubTitle>
        <span
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: '20px'
          }}
        >
          총 {totalItems}건
        </span>
      </div>

      <Divider></Divider>
      <Spacer height={16} />

      <div
        className="flex flex-col items-start self-stretch gap-2 overflow-y-auto px-1 py-1"
        style={{
          alignItems: 'flex-start',
          maxHeight: '400px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#FFD040 transparent'
        }}
      >
        {currentItems.length > 0 ? (
          currentItems.map((station, index) => (
            <StationCard
              key={`${station.name}-${station.description}-${index}`}
              name={station.name}
              description={station.description}
              isBookmarked={station.isBookmarked}
              onBookmarkToggle={() => handleBookmarkToggle(station.name)}
              onSelect={handleStationSelect}
            />
          ))
        ) : (
          <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
            {isSearchMode ? '검색 결과가 없습니다.' : '저장된 정류장이 없습니다.'}
          </div>
        )}
      </div>

      {renderPagination()}
    </>
  );

  return (
      <>
        <Title info="• 버스 노선별 실시간 공기질을 디지털 트윈 상에서 확인할 수 있습니다.

• 본 사업에서 제공하는 정보와 환경부(에어코리아)정보는 일부 차이가 있을 수 있습니다.

• 본 사업에서는 전문가 자문을 받아 일반 시민의 호흡선높이(버스 바닥에서 약 1.5m 높이)에 센서를 설치하여 도로변의 공기질을 측정하며, 환경부(에어코리아)는 대기질 관리을 목적로 빌딩 옥상에 센서를 설치하고 있습니다.">모니터링</Title>
        <TabNavigation tabs={['버스번호', '정류장']} activeTab={getActiveTabIndex()} onTabChange={handleTabChange} />
        <Spacer height={16} />
{selectedTab === 'bus' ? renderBusTab() : renderStationTab()}
        <Spacer height={16} />
        <Divider height="h-[2px]"></Divider>
        <Spacer height={32} />
        <Button>노선별 실시간 공기질 현황</Button>
      </>
  )
});

export default Monitoring;