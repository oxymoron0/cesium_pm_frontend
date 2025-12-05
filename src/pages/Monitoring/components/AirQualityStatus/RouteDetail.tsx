import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { routeStore } from '@/stores/RouteStore'
import { stationDetailStore } from '@/stores/StationDetailStore'
import { getRouteStations } from '@/utils/api/routeApi'
import Title from '@/components/basic/Title'
import AirQualityDisplay from '@/components/service/sensor/AirQualityDisplay'
import type { RouteStationsResponse } from '@/utils/api/types'

const basePath = import.meta.env.VITE_BASE_PATH || '/'

interface RouteDetailProps {
  selectedRoute: string | null
  initialStationId?: string
  onStationSelect?: (stationId: string, stationName: string, routeName: string, direction: 'inbound' | 'outbound', directionName: string) => void
}

const RouteDetail = observer(function RouteDetail({ selectedRoute, initialStationId, onStationSelect }: RouteDetailProps) {
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

  // Merge inbound and outbound stations into a single array with direction info
  const flatStations = [
    ...(stationData.inbound?.features.map(f => ({ ...f, direction: 'inbound' as const, directionName: stationData.inbound?.direction_name || '상행선' })) || []),
    ...(stationData.outbound?.features.map(f => ({ ...f, direction: 'outbound' as const, directionName: stationData.outbound?.direction_name || '하행선' })) || [])
  ]

  // Convert to 2D array: 10 rows, columns vary based on station count
  const ROW_COUNT = 10
  const columnCount = Math.ceil(flatStations.length / ROW_COUNT)
  const stationGrid: (typeof flatStations[number] | null)[][] = Array.from(
    { length: ROW_COUNT },
    () => Array(columnCount).fill(null)
  )

  // Fill the grid column by column
  flatStations.forEach((station, index) => {
    const col = Math.floor(index / ROW_COUNT)
    const row = index % ROW_COUNT
    stationGrid[row][col] = station
  })

  // Find selected station from flat list
  const selectedStation = flatStations.find(
    station => station.properties.station_id === selectedStationId
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
      <Title dividerColor="bg-[#696A6A]">
        <div className="flex gap-3 items-end">
          <span
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '24px',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            {selectedRouteInfo.route_name}번 노선도
          </span>
          <span
            style={{
              color: '#A6A6A6',
              fontFamily: 'Pretendard',
              fontSize: '14px',
              fontWeight: '400',
              lineHeight: 'normal'
            }}
          >
            {selectedRouteInfo.origin} ↔ {selectedRouteInfo.destination}
          </span>
        </div>
      </Title>

      {/* Station Grid - 10 stations per row */}
      <div
        className="flex flex-col overflow-y-auto"
        style={{
          gap: '38px',
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
        ) : columnCount > 0 ? (
          // Render column by column - each column becomes a visual row of 10 stations
          Array.from({ length: columnCount }).map((_, colIndex) => {
            const isLastRow = colIndex === columnCount - 1
            const isEvenRow = colIndex % 2 === 0

            return (
              <div
                key={`row-${colIndex}`}
                style={{ position: 'relative' }}
              >
                {/* Horizontal connecting line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '18px', // Center of 36px icon
                    left: '20px',
                    right: '20px',
                    height: '2px',
                    backgroundColor: '#656565',
                    zIndex: 0
                  }}
                />

                {/* Vertical connector to next row */}
                {!isLastRow && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '18px',
                      [isEvenRow ? 'right' : 'left']: '20px',
                      width: '2px',
                      height: `${80 - 18 + 38 + 18}px`, // 118px: remaining row + gap + next row top
                      backgroundColor: '#656565',
                      zIndex: 0
                    }}
                  />
                )}

                {/* Station items container */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: isEvenRow ? 'row' : 'row-reverse',
                    gap: '12px',
                    alignItems: 'flex-start',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  {stationGrid.map((row, rowIndex) => {
                    const station = row[colIndex]

                    // Empty placeholder for alignment
                    if (!station) {
                      return (
                        <div
                          key={`empty_${colIndex}_${rowIndex}`}
                          style={{ flex: '1 0 0', minWidth: 0, height: '80px' }}
                        />
                      )
                    }

                    const isSelected = selectedStationId === station.properties.station_id

                    return (
                      <div
                        key={`${station.direction}_${station.properties.station_id}_${rowIndex}`}
                        onClick={() => {
                          setSelectedStationId(station.properties.station_id)
                          if (onStationSelect && selectedRoute) {
                            onStationSelect(
                              station.properties.station_id,
                              station.properties.station_name,
                              selectedRoute,
                              station.direction,
                              station.directionName
                            )
                          }
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          flex: '1 0 0',
                          minWidth: 0,
                          height: '80px',
                          cursor: 'pointer',
                          opacity: isSelected ? 1 : 0.8,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        {/* Station Icon */}
                        <img
                          src={`${basePath}icon/station_inactive.svg`}
                          alt="정류장"
                          style={{
                            width: '36px',
                            height: '36px',
                            position: 'relative',
                            zIndex: 2
                          }}
                        />
                        {/* Station Name */}
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: isSelected ? '700' : '400',
                            color: isSelected ? '#40B5F1' : '#A6A6A6',
                            textAlign: 'center',
                            lineHeight: 'normal',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'keep-all'
                          }}
                        >
                          {station.properties.station_name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
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
  )
})

export default RouteDetail