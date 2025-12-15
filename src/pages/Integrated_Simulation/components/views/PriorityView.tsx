import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Panel from '@/components/basic/Panel';
import Icon from '@/components/basic/Icon';
import PriorityConfig from '@/pages/Priority/components/PriorityConfig';
import PriorityCustomConfig from '@/pages/Priority/components/PriorityCustomConfig';
import PriorityResult from '@/pages/Priority/components/PriorityResult';
import NearbyRoadList from '@/pages/Priority/components/NearbyRoadList';
import PriorityLocationGuide from '@/pages/Priority/components/PriorityLocationGuide';
import PriorityStatistics from '@/pages/Priority/components/PriorityStatistics';
import { priorityStore } from '@/stores/PriorityStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { routeStore } from '@/stores/RouteStore';
import { stationStore } from '@/stores/StationStore';
import type { PriorityView as PriorityViewType, PriorityConfig as PriorityConfigData } from '@/pages/Priority/types';
import { priorityStatisticsStore } from '@/stores/PriorityStatisticsStore';
import { clearPriorityCesium } from '../../utils/cesiumCleanup';

interface PriorityViewProps {
  isActive: boolean;
  cesiumStatus: 'loading' | 'ready' | 'error';
  onCloseMicroApp?: () => void;
}

const PriorityView = observer(function PriorityView({
  isActive,
  cesiumStatus,
  onCloseMicroApp,
}: PriorityViewProps) {
  const isInitializedRef = useRef(false);
  const wasActiveRef = useRef(false);
  const [currentView, setCurrentView] = useState<PriorityViewType>('config');
  const [configData, setConfigData] = useState<PriorityConfigData | null>(null);
  const [locationMode, setLocationMode] = useState<'address' | 'point'>('address');
  const [isStatisticsPopupOpen, setIsStatisticsPopupOpen] = useState(false);

  // RouteStore와 StationStore 초기화
  useEffect(() => {
    if (!isActive || cesiumStatus !== 'ready' || isInitializedRef.current) {
      return;
    }

    const initializeStores = async () => {
      isInitializedRef.current = true;

      try {
        // RouteStore 초기화 (노선 정보 및 geometry 로드)
        if (routeStore.routeInfoList.length === 0) {
          console.log('[PriorityView] Initializing RouteStore');
          await routeStore.initializeRouteData();
        }

        // StationStore 초기화 (모든 노선의 정류장 데이터 로드)
        if (stationStore.stationDataMap.size === 0 && routeStore.routeInfoList.length > 0) {
          console.log('[PriorityView] Initializing StationStore');
          const routeNames = routeStore.routeInfoList.map(route => route.route_name);

          const stationLoadPromises = routeNames.flatMap(routeName => [
            stationStore.loadStations(routeName, 'inbound'),
            stationStore.loadStations(routeName, 'outbound')
          ]);

          await Promise.all(stationLoadPromises);
          console.log('[PriorityView] Station data loading completed');
        }
      } catch (error) {
        console.error('[PriorityView] Store initialization failed:', error);
      }
    };

    initializeStores();
  }, [isActive, cesiumStatus]);

  // 서비스 전환 시 Cesium 정리/복원
  useEffect(() => {
    // 비활성화될 때: Cesium 정리 (MobX 상태는 유지)
    if (wasActiveRef.current && !isActive) {
      console.log('[PriorityView] Deactivating - clearing Cesium entities');
      clearPriorityCesium();
    }

    // 재활성화될 때: Priority 결과 등은 컴포넌트가 다시 마운트되면서 자동으로 렌더링됨
    if (!wasActiveRef.current && isActive && isInitializedRef.current && cesiumStatus === 'ready') {
      console.log('[PriorityView] Reactivating');
      // 결과 화면에서 돌아온 경우 자동으로 렌더링됨
    }

    wasActiveRef.current = isActive;
  }, [isActive, cesiumStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[PriorityView] Component unmounting, cleaning up');
      clearPriorityCesium();
      administrativeStore.clearSelection();
    };
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* Priority Panel - Left Top */}
      {cesiumStatus === 'ready' && (
        <Panel position="left" width="540px" maxHeight="calc(100vh - 160px)" allowOverflow={currentView === 'customConfig'}>
          {currentView === 'config' ? (
            <PriorityConfig
              onClose={onCloseMicroApp}
              onCustomConfig={() => setCurrentView('customConfig')}
              onSearch={(config) => {
                setConfigData(config);
                setCurrentView('result');
              }}
            />
          ) : currentView === 'customConfig' ? (
            <PriorityCustomConfig
              onBack={() => {
                setLocationMode('address');
                setCurrentView('config');
              }}
              onSearch={(config) => {
                setConfigData(config);
                setCurrentView('result');
              }}
              locationMode={locationMode}
              setLocationMode={setLocationMode}
            />
          ) : (
            configData && (
              <PriorityResult
                config={configData}
                onBack={() => {
                  priorityStore.resetResultState();
                  setCurrentView('config');
                }}
                onClose={onCloseMicroApp}
              />
            )
          )}
        </Panel>
      )}

      {/* Priority Location Guide - Top Center */}
      {cesiumStatus === 'ready' && currentView === 'customConfig' && locationMode === 'point' && (
        <PriorityLocationGuide />
      )}

      {/* Nearby Road Panel - Right Top */}
      {cesiumStatus === 'ready' && currentView === 'result' && priorityStore.selectedRoads.length > 0 && (
        <Panel position="right" width="540px" maxHeight="calc(100vh - 160px)">
          <NearbyRoadList
            roads={priorityStore.selectedRoads}
            onClose={() => priorityStore.clearFacilitySelection()}
          />
        </Panel>
      )}

      {/* Statistics Button - Right Bottom */}
      {cesiumStatus === 'ready' && (
        <div className="absolute bottom-26 right-26 z-[1000]">
          <button
            onClick={() => setIsStatisticsPopupOpen(!isStatisticsPopupOpen)}
            className={`
              flex flex-col items-center justify-center gap-1
              w-[72px] h-[72px] rounded-lg border-2 border-white
              font-pretendard text-[13px] font-bold
              cursor-pointer transition-all duration-200
              ${isStatisticsPopupOpen
                ? 'bg-gradient-to-b from-[#FDF106] to-[#FFD040] text-black'
                : 'bg-black/65 text-white'
              }
            `}
          >
            <div style={{ filter: isStatisticsPopupOpen ? 'invert(1)' : 'none' }}>
              <Icon name="chart" className="w-8 h-8" />
            </div>
            통계
          </button>
        </div>
      )}

      {/* Priority Statistics Popup */}
      {isStatisticsPopupOpen && (
        <PriorityStatistics onClose={() => {
          priorityStatisticsStore.isStatisticsPopupMinimized = false;
          setIsStatisticsPopupOpen(false);
        }}
        />
      )}

      {/* Loading State */}
      {cesiumStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-lg text-white">Cesium 초기화 중...</div>
        </div>
      )}

      {/* Error State */}
      {cesiumStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-lg text-red-500">Cesium 초기화 실패</div>
        </div>
      )}
    </>
  );
});

export default PriorityView;
