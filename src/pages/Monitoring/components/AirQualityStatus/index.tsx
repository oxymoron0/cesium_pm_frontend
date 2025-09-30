import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import Panel from '@/components/basic/Panel'
import Title from '@/components/basic/Title'
import RouteSelector from './RouteSelector'
import RouteDetail from './RouteDetail'
import StationDetail from './StationDetail'
import StationDetail_2 from './StationDetail_2'
import { routeStore } from '@/stores/RouteStore'

interface AirQualityStatusProps {
  onClose?: () => void;
  initialStationId?: string; // For external station selection (from Cesium hover)
}

const AirQualityStatus = observer(function AirQualityStatus({ onClose, initialStationId }: AirQualityStatusProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [selectedStationName, setSelectedStationName] = useState<string | null>(null)
  const [selectedRouteName, setSelectedRouteName] = useState<string | null>(null)

  // Handle initial station selection from external source (Cesium)
  useEffect(() => {
    if (initialStationId) {
      setSelectedStationId(initialStationId)
      // You might want to fetch station details here
    }
  }, [initialStationId])

  const handleRouteSelect = (routeName: string) => {
    setSelectedRoute(routeName)
    // Clear station selection when route changes
    setSelectedStationId(null)
    setSelectedStationName(null)
    setSelectedRouteName(null)
  }

  const handleStationSelect = (stationId: string, stationName: string, routeName: string) => {
    setSelectedStationId(stationId)
    setSelectedStationName(stationName)
    setSelectedRouteName(routeName)
  }

  const handleStationClose = () => {
    setSelectedStationId(null)
    setSelectedStationName(null)
    setSelectedRouteName(null)
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

        {selectedStationId ? (
          routeStore.isV1 ? (
            <StationDetail
              stationId={selectedStationId}
              stationName={selectedStationName || undefined}
              routeName={selectedRouteName || undefined}
              onClose={handleStationClose}
            />
          ) : (
            <StationDetail_2
              stationId={selectedStationId}
              stationName={selectedStationName || undefined}
              routeName={selectedRouteName || undefined}
              onClose={handleStationClose}
            />
          )
        ) : (
          <RouteDetail
            selectedRoute={selectedRoute}
            initialStationId={initialStationId}
            onStationSelect={handleStationSelect}
          />
        )}
      </div>
    </Panel>
  )
})

export default AirQualityStatus