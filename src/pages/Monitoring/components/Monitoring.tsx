import Button from "@/components/basic/Button";
import Divider from "@/components/basic/Divider";
import Spacer from "@/components/basic/Spacer";
import SubTitle from "@/components/basic/SubTitle";
import RouteCard from "@/components/service/RouteCard";

interface MonitoringProps {
  tabs?: string[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

function Monitoring(props: MonitoringProps) {
  console.log(props)

  return (
      <>
        <Spacer height={16} />
        <SubTitle> 저장한 버스 </SubTitle>
        <Divider></Divider>
        <Spacer height={16} />
        <div className="flex flex-col items-start self-stretch gap-2">
          {/* <StationCard name="서면역" description="05710 서면역 서면지하상가방면" isBookmarked={true}></StationCard>
          <StationCard name="부산역" description="12345 부산역 중앙로방면" isBookmarked={false}></StationCard> */}
          <RouteCard routeNumber="10" isExpress={false} description="송정 ←> 모라주공" />
        </div>
        <Spacer height={16}/>
        <SubTitle> 노선도 </SubTitle>
        <Divider color="bg-white"></Divider>
        <Spacer height={16} />
        <div className="flex flex-col items-start self-stretch gap-2">
          {/* <StationCard name="해운대역" description="67890 해운대역 해변방면" isBookmarked={true}></StationCard>
          <StationCard name="남포동역" description="54321 남포동역 자갈치시장방면" isBookmarked={false}></StationCard> */}
        </div>
        <Spacer height={16} />
        <Divider height="h-[2px]"></Divider>
        <Spacer height={32} />
        <Button>노선별 실시간 공기질 현황</Button>
      </>
  )
}

export default Monitoring;