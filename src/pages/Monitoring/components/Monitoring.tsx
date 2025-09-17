import { observer } from 'mobx-react-lite';
import Title from "@/components/basic/Title";
import TabNavigation from "@/components/basic/TabNavigation";
import Button from "@/components/basic/Button";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import SubTitle from "@/components/basic/SubTitle";
import RouteCard from "@/components/service/RouteCard";
import { routeStore } from '@/stores/RouteStore';

interface MonitoringProps {
  onRouteSelect: (routeNumber: string) => void;
}

const Monitoring = observer(function Monitoring({ onRouteSelect }: MonitoringProps) {

  return (
      <>
        <Title info="• 버스 노선별 실시간 공기질을 디지털 트윈 상에서 확인할 수 있습니다.

• 본 사업에서 제공하는 정보와 환경부(에어코리아)정보는 일부 차이가 있을 수 있습니다.

• 본 사업에서는 전문가 자문을 받아 일반 시민의 호흡선높이(버스 바닥에서 약 1.5m 높이)에 센서를 설치하여 도로변의 공기질을 측정하며, 환경부(에어코리아)는 대기질 관리을 목적로 빌딩 옥상에 센서를 설치하고 있습니다.">모니터링</Title>
        <TabNavigation tabs={['버스번호', '정류장']} activeTab={0} onTabChange={() => {}} />
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
        <Spacer height={16} />
        <Divider height="h-[2px]"></Divider>
        <Spacer height={32} />
        <Button>노선별 실시간 공기질 현황</Button>
      </>
  )
});

export default Monitoring;