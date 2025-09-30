import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import Panel from '@/components/basic/Panel'
import Title from '@/components/basic/Title'
import RouteSelector from './RouteSelector'
import RouteDetail from './RouteDetail'
import StationDetail from './StationDetail'
import StationDetail_2 from './StationDetail_2'
import { routeStore } from '@/stores/RouteStore'
import { stationDetailStore } from '@/stores/StationDetailStore'

interface AirQualityStatusProps {
  onClose?: () => void;
  initialStationId?: string; // For external station selection (from Cesium hover)
}

const AirQualityStatus = observer(function AirQualityStatus({ onClose, initialStationId }: AirQualityStatusProps) {
  // Handle initial station selection from external source (Cesium)
  useEffect(() => {
    if (initialStationId) {
      // TODO: Fetch station details and set to store
      console.log('[AirQualityStatus] Initial station ID:', initialStationId)
    }
  }, [initialStationId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stationDetailStore.clearAll()
    }
  }, [])

  const handleRouteSelect = (routeName: string) => {
    stationDetailStore.selectRoute(routeName)
  }

  const handleStationSelect = (
    stationId: string,
    stationName: string,
    routeName: string,
    direction: 'inbound' | 'outbound',
    directionName: string
  ) => {
    stationDetailStore.selectStation(stationId, stationName, routeName, direction, directionName)
  }

  const handleStationClose = () => {
    stationDetailStore.clearStationSelection()
  }

  return (
    <Panel
      className="flex flex-col items-center gap-4"
      position="center"
      marginHorizontal={20}
      marginVertical={32}
    >
      <Title onClose={onClose}>노선별 실시간 공기질 현황</Title>

      <div className="flex flex-1 w-full gap-4">
        <RouteSelector onRouteSelect={handleRouteSelect} />

        {stationDetailStore.hasStationSelected ? (
          routeStore.isV1 ? (
            <StationDetail
              stationId={stationDetailStore.selectedStationId!}
              onClose={handleStationClose}
            />
          ) : (
            <StationDetail_2
              stationId={stationDetailStore.selectedStationId!}
              stationName={stationDetailStore.selectedStationName || undefined}
              routeName={stationDetailStore.selectedRouteName || undefined}
              onClose={handleStationClose}
            />
          )
        ) : (
          <RouteDetail
            selectedRoute={stationDetailStore.selectedRoute}
            initialStationId={initialStationId}
            onStationSelect={handleStationSelect}
          />
        )}
      </div>
    </Panel>
  )
})

export default AirQualityStatus