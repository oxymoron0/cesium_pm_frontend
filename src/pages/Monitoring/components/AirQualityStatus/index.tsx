import { observer } from 'mobx-react-lite'
import Panel from '../../../../components/basic/Panel'
import Title from '../../../../components/basic/Title'
import RouteSelector from './RouteSelector'
import RouteDetail from './RouteDetail'

interface AirQualityStatusProps {
  onClose?: () => void;
}

const AirQualityStatus = observer(function AirQualityStatus({ onClose }: AirQualityStatusProps) {
  return (
    <Panel
      className="flex flex-col items-center gap-4"
      position="center"
      marginHorizontal={70}
      marginVertical={72}
    >
      <Title onClose={onClose}>노선별 실시간 공기질 현황</Title>

      <div className="flex w-full gap-4 flex-1">
        <RouteSelector />
        <RouteDetail />
      </div>
    </Panel>
  )
})

export default AirQualityStatus