import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Button from "@/components/basic/Button";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import SubTitle from "@/components/basic/SubTitle";
import RouteCard from "@/components/service/RouteCard";
import { routeStore } from '@/stores/RouteStore';
import { renderAllRoutes } from '@/utils/cesium/routeRenderer';

interface MonitoringProps {
  tabs?: string[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

const Monitoring = observer(function Monitoring(props: MonitoringProps) {
  console.log(props)

  // Auto-render all routes when data loading is complete
  useEffect(() => {
    if (!routeStore.isLoading && routeStore.routeGeomMap.size > 0) {
      console.log('[Monitoring] Auto-rendering all routes on component mount');
      renderAllRoutes();
    }
  }, [routeStore.isLoading, routeStore.routeGeomMap.size]);

  return (
      <>
        <Spacer height={16} />
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
            // 로딩 중: 스켈레톤 UI만 표시
            <>
              {[1, 2, 3, 4].map((index) => (
                <div 
                  key={`skeleton-${index}`}
                  className="bg-[#1A1A1A] rounded-lg p-4 animate-pulse w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-6 bg-gray-600 rounded"></div>
                      <div className="w-8 h-6 bg-gray-600 rounded"></div>
                    </div>
                    <div className="w-7 h-7 bg-gray-600 rounded"></div>
                  </div>
                  <div className="mt-2 w-48 h-4 bg-gray-600 rounded"></div>
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
                    onBookmarkToggle={() => {
                      // TODO: 북마크 기능 구현 예정
                      console.log(`북마크 토글: ${routeInfo.route_name}`);
                    }}
                    onSelect={(routeNumber) => {
                      console.log(`노선 선택: ${routeNumber}`);
                    }}
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
        <Spacer height={16} />
        <Divider height="h-[2px]"></Divider>
        <Spacer height={32} />
        <Button>노선별 실시간 공기질 현황</Button>
      </>
  )
});

export default Monitoring;