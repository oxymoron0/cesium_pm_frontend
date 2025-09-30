import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { routeStore } from '@/stores/RouteStore'
import { stationDetailStore } from '@/stores/StationDetailStore'
import { getRouteStations } from '@/utils/api/routeApi'
import StationCard from '@/components/service/StationCard'
import AirQualityDisplay from '@/components/service/sensor/AirQualityDisplay'
import type { RouteStationsResponse } from '@/utils/api/types'

interface RouteDetailProps {
  selectedRoute: string | null
  initialStationId?: string
  onStationSelect?: (stationId: string, stationName: string, routeName: string, direction: 'inbound' | 'outbound', directionName: string) => void
}

const RouteDetail = observer(function RouteDetail({ selectedRoute, initialStationId, onStationSelect }: RouteDetailProps) {
  const [selectedDirection, setSelectedDirection] = useState<'inbound' | 'outbound'>('inbound')
  const [selectedStationId, setSelectedStationId] = useState<string | null>(initialStationId || null)
  const [stationData, setStationData] = useState<{
    inbound?: RouteStationsResponse
    outbound?: RouteStationsResponse
  }>({})
  const [isLoading, setIsLoading] = useState(false)

  // Load station data when route is selected
  useEffect(() => {
    if (selectedRoute) {
      // Check cache first
      const cached = stationDetailStore.getCachedRouteStations(selectedRoute)
      if (cached) {
        setStationData(cached)
        return
      }

      // Load from API if not cached
      const loadStations = async () => {
        setIsLoading(true)
        try {
          const [inboundData, outboundData] = await Promise.all([
            getRouteStations(selectedRoute, 'inbound'),
            getRouteStations(selectedRoute, 'outbound')
          ])
          const data = {
            inbound: inboundData,
            outbound: outboundData
          }
          stationDetailStore.cacheRouteStations(selectedRoute, data)
          setStationData(data)
        } catch (error) {
          console.error('Failed to load station data:', error)
        } finally {
          setIsLoading(false)
        }
      }
      loadStations()
    } else {
      setStationData({})
      setSelectedStationId(null)
    }
  }, [selectedRoute])

  // Handle initial station selection from external source
  useEffect(() => {
    if (initialStationId) {
      setSelectedStationId(initialStationId)
    }
  }, [initialStationId])

  // Generate sample air quality data based on station ID
  const generateSampleAirQualityData = (stationId: string) => {
    const seed = parseInt(stationId.slice(-2), 10) || 1
    return {
      pm10: 30 + (seed * 7) % 50, // 30-80 range
      pm25: 15 + (seed * 5) % 35, // 15-50 range
      vocs: 100 + (seed * 13) % 200 // 100-300 range
    }
  }

  const selectedRouteInfo = selectedRoute ? routeStore.getRouteInfo(selectedRoute) : null
  const currentStationData = stationData[selectedDirection]
  const selectedStation = currentStationData?.features.find(
    feature => feature.properties.station_id === selectedStationId
  )

  if (!selectedRoute || !selectedRouteInfo) {
    return (
      <div
        className="flex flex-col self-stretch"
        style={{
          padding: '20px',
          gap: '12px',
          flex: '1 0 0',
          borderRadius: '8px',
          border: '1px solid #696A6A',
          background: 'rgba(0, 0, 0, 0.80)',
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.10)'
        }}
      >
        <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
          노선을 선택하면 정류장 목록이 표시됩니다.
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col self-stretch"
      style={{
        padding: '20px',
        gap: '12px',
        flex: '1 0 0',
        borderRadius: '8px',
        border: '1px solid #696A6A',
        background: 'rgba(0, 0, 0, 0.80)',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.10)'
      }}
    >
      <div className="text-lg font-medium text-white">
        {selectedRouteInfo.route_name}번 노선도
      </div>

      <div className="text-sm text-gray-300">
        {selectedRouteInfo.origin} ↔ {selectedRouteInfo.destination}
      </div>

      {/* Direction Selection */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSelectedDirection('inbound')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            selectedDirection === 'inbound'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {selectedRouteInfo.destination} 방면
        </button>
        <button
          onClick={() => setSelectedDirection('outbound')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            selectedDirection === 'outbound'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {selectedRouteInfo.origin} 방면
        </button>
      </div>

      {/* Station List */}
      <div className="flex flex-col flex-1 gap-4">
        <div
          className="flex flex-col gap-2 px-1 overflow-y-auto"
          style={{
            maxHeight: 'calc(100vh - 400px)',
            minHeight: '200px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#FFD040 transparent'
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              정류장 데이터를 불러오는 중...
            </div>
          ) : currentStationData?.features ? (
            currentStationData.features.map((stationFeature) => (
              <StationCard
                key={stationFeature.properties.station_id}
                stationId={stationFeature.properties.station_id}
                name={stationFeature.properties.station_name}
                description={`정류장 ID: ${stationFeature.properties.station_id}`}
                isSelected={selectedStationId === stationFeature.properties.station_id}
                onSelect={(stationId) => {
                  setSelectedStationId(stationId)
                  // Call parent callback for detailed station view
                  if (onStationSelect && selectedRoute) {
                    const currentDirectionData = stationData[selectedDirection]
                    onStationSelect(
                      stationId,
                      stationFeature.properties.station_name,
                      selectedRoute,
                      selectedDirection,
                      currentDirectionData?.direction_name || (selectedDirection === 'inbound' ? '상행선' : '하행선')
                    )
                  }
                }}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              정류장 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* Selected Station Air Quality */}
        {selectedStation && (
          <div className="pt-4 border-t border-gray-600">
            <div className="mb-3 text-base font-medium text-white">
              선택된 정류장: {selectedStation.properties.station_name}
            </div>
            <div className="mb-4 text-sm text-gray-300">
              실시간 공기질 모니터링 데이터
            </div>
            <AirQualityDisplay
              pm10Value={generateSampleAirQualityData(selectedStation.properties.station_id).pm10}
              pm25Value={generateSampleAirQualityData(selectedStation.properties.station_id).pm25}
              vocsValue={generateSampleAirQualityData(selectedStation.properties.station_id).vocs}
            />
          </div>
        )}
      </div>
    </div>
  )
})

export default RouteDetail