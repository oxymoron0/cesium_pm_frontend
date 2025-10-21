import { useState, useEffect, useMemo } from 'react';
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
import { stationStore } from '@/stores/StationStore';
import { stationDetailStore } from '@/stores/StationDetailStore';
import { bookmarkStore } from '@/stores/BookmarkStore';
import { userStore } from '@/stores/UserStore';
import { searchStations } from '@/utils/api/routeApi';
import { renderSearchStations, updateSearchStationSelection, clearSearchStations } from '@/utils/cesium/searchStationRenderer';
import { flyToSearchStation } from '@/utils/cesium/cameraUtils';
import type { StationSearchResponse, RouteStationFeature } from '@/utils/api/types';

interface MonitoringProps {
  onRouteSelect: (routeNumber: string) => void;
  onCloseMicroApp?: () => void;
}

const Monitoring = observer(function Monitoring({ onRouteSelect, onCloseMicroApp }: MonitoringProps) {
  const [selectedTab, setSelectedTab] = useState<'bus' | 'station'>('bus');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // API 상태 관리
  const [searchResults, setSearchResults] = useState<StationSearchResponse | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 선택된 정류장 상태 관리
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // 정류장 북마크 토글 핸들러
  const handleStationBookmarkToggle = async (stationId: string) => {
    try {
      await bookmarkStore.toggleStationBookmark(userStore.currentUser, stationId);
    } catch (error) {
      console.error('[Monitoring] Failed to toggle station bookmark:', error);
    }
  };

  // 북마크된 정류장 정보 가져오기 (stationDataMap에서 검색)
  const getBookmarkedStations = () => {
    const bookmarkedStations: Array<{
      stationId: string;
      name: string;
      description: string;
      isBookmarked: boolean;
    }> = [];

    bookmarkStore.bookmarkedStations.forEach(stationId => {
      // StationStore의 모든 stationDataMap을 순회하여 정류장 정보 찾기
      for (const [, stationData] of stationStore.stationDataMap.entries()) {
        const feature = stationData.features.find(f => f.properties.station_id === stationId);
        if (feature) {
          bookmarkedStations.push({
            stationId: feature.properties.station_id,
            name: feature.properties.station_name,
            description: `${feature.properties.ars_id} (${feature.properties.city})`,
            isBookmarked: true
          });
          break; // 찾았으면 다음 stationId로
        }
      }
    });

    return bookmarkedStations;
  };

  const itemsPerPage = 4;
  const isSearchMode = searchQuery.trim().length > 0;

  // 북마크된 정류장의 GeoJSON Features 추출 (Cesium 렌더링용)
  const bookmarkFeatures = useMemo(() => {
    if (isSearchMode) return null;

    const features: RouteStationFeature[] = [];
    bookmarkStore.bookmarkedStations.forEach(stationId => {
      // StationStore의 모든 stationDataMap을 순회하여 Feature 추출
      for (const [, stationData] of stationStore.stationDataMap.entries()) {
        const feature = stationData.features.find(f => f.properties.station_id === stationId);
        if (feature) {
          features.push(feature);
          break; // 찾았으면 다음 stationId로
        }
      }
    });

    return features.length > 0 ? features : null;
    // MobX observer는 observable 변경 시 자동으로 재렌더링하므로 의존성 필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchMode, bookmarkStore.bookmarkedStations, stationStore.stationDataMap]);

  // 현재 표시할 데이터 계산
  const getCurrentData = () => {
    if (isSearchMode && searchResults) {
      // API 검색 결과 사용 (클라이언트 사이드 페이징)
      const allItems = searchResults.features.map(feature => ({
        stationId: feature.properties.station_id,
        name: feature.properties.station_name,
        description: `${feature.properties.ars_id} (${feature.properties.city})`,
        isBookmarked: bookmarkStore.isStationBookmarked(feature.properties.station_id),
        isSelected: selectedStationId === feature.properties.station_id
      }));

      const totalItems = allItems.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const items = allItems.slice(startIndex, startIndex + itemsPerPage);

      return { items, totalItems, totalPages };
    } else {
      // 저장된 정류장 (북마크된 정류장 표시)
      const bookmarkedStations = getBookmarkedStations();
      const totalItems = bookmarkedStations.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const items = bookmarkedStations.slice(startIndex, startIndex + itemsPerPage).map(station => ({
        stationId: station.stationId,
        name: station.name,
        description: station.description,
        isBookmarked: station.isBookmarked,
        isSelected: selectedStationId === station.stationId
      }));

      return { items, totalItems, totalPages };
    }
  };

  const { items: currentItems, totalItems, totalPages } = getCurrentData();

  // 검색 결과 및 북마크 정류장 Cesium 렌더링 (통합)
  useEffect(() => {
    const renderStations = async () => {
      // 렌더링할 Features 결정: 검색 모드면 searchResults, 북마크 모드면 bookmarkFeatures
      const featuresToRender = isSearchMode ? searchResults?.features : bookmarkFeatures;

      if (featuresToRender && featuresToRender.length > 0) {
        console.log(`[Monitoring] Rendering ${isSearchMode ? 'search' : 'bookmark'} stations to Cesium:`, featuresToRender.length);
        await renderSearchStations(featuresToRender, null); // 선택 상태 없이 렌더링
        // 렌더링 후 현재 선택 상태 적용
        updateSearchStationSelection(selectedStationId);
      } else {
        console.log('[Monitoring] Clearing station rendering from Cesium');
        await clearSearchStations();
      }
    };

    renderStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, bookmarkFeatures, isSearchMode]); // selectedStationId 의도적으로 제외 (깜빡임 방지)

  // 선택 상태만 업데이트 (깜빡임 방지)
  useEffect(() => {
    const featuresToRender = isSearchMode ? searchResults?.features : bookmarkFeatures;

    if (featuresToRender && featuresToRender.length > 0) {
      updateSearchStationSelection(selectedStationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]); // isSearchMode, searchResults, bookmarkFeatures 의도적으로 제외 (깜빡임 방지)

  // 검색 API 호출 (검색어 변경시에만)
  useEffect(() => {
    const performSearch = async () => {
      if (!isSearchMode) {
        setSearchResults(null);
        return;
      }

      setIsSearchLoading(true);
      setSearchError(null);

      try {
        const result = await searchStations(searchQuery);
        setSearchResults(result);
      } catch (error) {
        console.error('[Monitoring] Station search failed:', error);
        setSearchError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.');
        setSearchResults(null);
      } finally {
        setIsSearchLoading(false);
      }
    };

    // 검색어 변경시에만 API 호출 (디바운싱 적용)
    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, isSearchMode]);

  const handleTabChange = (index: number) => {
    const newTab = index === 0 ? 'bus' : 'station';
    setSelectedTab(newTab);

    // 버스 탭으로 변경 시 검색 결과 정리
    if (newTab === 'bus') {
      setSearchQuery('');
      setSelectedStationId(null);
      clearSearchStations();
    }
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

  const handleStationSelect = (stationId: string, stationName: string) => {
    console.log('Station selected:', { stationId, stationName });
    setSelectedStationId(stationId);

    // Cesium 선택 상태 즉시 업데이트
    updateSearchStationSelection(stationId);

    // 선택된 정류장으로 카메라 이동 (500m 높이, 즉시 이동)
    // 검색 모드면 searchResults.features, 북마크 모드면 bookmarkFeatures 사용
    const featuresToUse = isSearchMode ? searchResults?.features : bookmarkFeatures;

    if (featuresToUse) {
      flyToSearchStation(featuresToUse, stationId, 500);
    }
  };

  const getSubTitleText = () => {
    if (isSearchMode) {
      return `${searchQuery} 검색결과`;
    }
    return '저장한 정류장';
  };

  // 노선 북마크 토글 핸들러
  const handleRouteBookmarkToggle = async (routeName: string) => {
    try {
      await bookmarkStore.toggleRouteBookmark(userStore.currentUser, routeName);
    } catch (error) {
      console.error('[Monitoring] Failed to toggle route bookmark:', error);
    }
  };

  const renderBusTab = () => (
    <>
      <SubTitle> 저장한 버스 </SubTitle>
      <Divider></Divider>
      <Spacer height={16} />
      <div className="flex flex-col items-start self-stretch gap-2">
        {bookmarkStore.bookmarkedRoutes.length > 0 ? (
          bookmarkStore.bookmarkedRoutes.map((routeName) => {
            const routeInfo = routeStore.getRouteInfo(routeName);
            if (!routeInfo) return null;

            return (
              <RouteCard
                key={`bookmark-${routeName}`}
                routeNumber={routeInfo.route_name}
                description={`${routeInfo.origin} ↔ ${routeInfo.destination}`}
                isExpress={false}
                isBookmarked={true} // 저장한 버스 섹션이므로 항상 true
                isSelected={routeStore.isRouteSelected(routeInfo.route_name)}
                onBookmarkToggle={() => handleRouteBookmarkToggle(routeName)}
                onSelect={onRouteSelect}
              />
            );
          })
        ) : (
          <div className="text-gray-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
            저장한 버스가 없습니다.
          </div>
        )}
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
                  isBookmarked={bookmarkStore.isRouteBookmarked(routeInfo.route_name)}
                  isSelected={routeStore.isRouteSelected(routeInfo.route_name)}
                  onBookmarkToggle={() => handleRouteBookmarkToggle(routeInfo.route_name)}
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
      <div className="flex items-center justify-center w-full gap-2 py-4">
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 5))}
          disabled={totalPages < 5}
          className="p-1 disabled:opacity-50"
        >
          <Icon name="left" className="w-6 h-6" />
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 5))}
          disabled={totalPages < 5}
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
        className="flex flex-col items-start self-stretch gap-2 px-1 py-1 overflow-y-auto"
        style={{
          alignItems: 'flex-start',
          height: '400px', // 고정 높이 (4개 StationCard 기준)
          minHeight: '400px',
          maxHeight: '400px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#FFD040 transparent'
        }}
      >
        {isSearchLoading && !searchResults ? (
          // 최초 검색 로딩 상태 (페이지 변경시에는 기존 데이터 유지)
          <>
            {[1, 2, 3, 4].map((index) => (
              <div
                key={`search-skeleton-${index}`}
                className="bg-[#1A1A1A] rounded-lg p-4 animate-pulse w-full"
              >
                <div className="w-3/4 h-4 mb-2 bg-gray-600 rounded"></div>
                <div className="w-1/2 h-3 bg-gray-600 rounded"></div>
              </div>
            ))}
          </>
        ) : searchError ? (
          // 검색 에러 상태
          <div className="text-red-400 text-center p-4 bg-[#1A1A1A] rounded-lg w-full">
            {searchError}
          </div>
        ) : currentItems.length > 0 ? (
          // 정상 데이터 표시
          currentItems.map((station, index) => (
            <StationCard
              key={`${station.stationId}-${index}`}
              stationId={station.stationId}
              name={station.name}
              description={station.description}
              isBookmarked={station.isBookmarked}
              isSelected={station.isSelected}
              onBookmarkToggle={() => handleStationBookmarkToggle(station.stationId)}
              onSelect={handleStationSelect}
            />
          ))
        ) : (
          // 빈 상태
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
        <Title
          info="• 버스 노선별 실시간 공기질을 디지털 트윈 상에서 확인할 수 있습니다.

• 본 사업에서 제공하는 정보와 환경부(에어코리아)정보는 일부 차이가 있을 수 있습니다.

• 본 사업에서는 전문가 자문을 받아 일반 시민의 호흡선높이(버스 바닥에서 약 1.5m 높이)에 센서를 설치하여 도로변의 공기질을 측정하며, 환경부(에어코리아)는 대기질 관리을 목적로 빌딩 옥상에 센서를 설치하고 있습니다."
          onClose={() => {
            console.log('[Monitoring] Close icon clicked: Triggering onCloseMicroApp');
            console.log('[Monitoring] DataSources before close:', window.cviewer?.dataSources.length);
            onCloseMicroApp?.();
          }}
        >
          모니터링
        </Title>
        <TabNavigation tabs={['버스번호', '정류장']} activeTab={getActiveTabIndex()} onTabChange={handleTabChange} />
        <Spacer height={16} />
{selectedTab === 'bus' ? renderBusTab() : renderStationTab()}
        <Spacer height={16} />
        <Divider height="h-[2px]"></Divider>
        <Spacer height={32} />
        <Button onClick={() => stationDetailStore.openModal()}>노선별 실시간 공기질 현황</Button>
      </>
  )
});

export default Monitoring;