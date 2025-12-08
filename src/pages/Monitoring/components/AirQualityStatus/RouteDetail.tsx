import { observer } from 'mobx-react-lite'
import { useEffect, useState, useMemo, useRef } from 'react'
import { routeStore } from '@/stores/RouteStore'
import { stationDetailStore } from '@/stores/StationDetailStore'
import { busStore } from '@/stores/BusStore'
import { getRouteStations } from '@/utils/api/routeApi'
import Title from '@/components/basic/Title'
import AirQualityDisplay from '@/components/service/sensor/AirQualityDisplay'
import type { RouteStationsResponse } from '@/utils/api/types'

// Default animation duration fallback (ms)
const DEFAULT_ANIMATION_DURATION = 10000

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

  // Per-bus animation progress state: Map<vehicleNumber, progress 0-1>
  const [busAnimationProgress, setBusAnimationProgress] = useState<Map<string, number>>(new Map())
  // Track animation start times for each bus
  const busAnimationRef = useRef<Map<string, { startTime: number; duration: number }>>(new Map())

  // Get operating buses for this route from busData (has previous + current positions)
  // Note: busStore.busData is a MobX observable, so we access it directly for reactivity
  const busData = busStore.busData
  const operatingBusData = useMemo(() => {
    if (!selectedRoute) return []
    return busData.filter(
      bus => bus.route_name === selectedRoute &&
             bus.positions.length > 0 &&
             bus.positions.some(pos => pos.progress_percent >= 1 && pos.progress_percent <= 99)
    )
  }, [selectedRoute, busData])

  const operatingBusCount = operatingBusData.length

  // Calculate time difference between two positions in milliseconds
  const getTimeDiffMs = (pos1: { recorded_at: string }, pos2: { recorded_at: string }): number => {
    const time1 = new Date(pos1.recorded_at).getTime()
    const time2 = new Date(pos2.recorded_at).getTime()
    return Math.abs(time2 - time1)
  }

  // Animation effect - each bus animates based on its own time difference
  useEffect(() => {
    if (operatingBusData.length === 0) return

    const now = Date.now()

    // Initialize or update animation state for each bus
    operatingBusData.forEach(bus => {
      const sortedPositions = [...bus.positions].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )

      if (sortedPositions.length < 2) return

      const prevPosition = sortedPositions[sortedPositions.length - 2]
      const currPosition = sortedPositions[sortedPositions.length - 1]

      // Calculate duration from actual time difference
      const timeDiff = getTimeDiffMs(prevPosition, currPosition)
      const duration = timeDiff > 0 ? timeDiff : DEFAULT_ANIMATION_DURATION

      // Check if this is new data (different recorded_at)
      const existing = busAnimationRef.current.get(bus.vehicle_number)
      const isNewData = !existing || existing.duration !== duration

      if (isNewData) {
        busAnimationRef.current.set(bus.vehicle_number, { startTime: now, duration })
      }
    })

    // Animation loop
    let animationId: number

    const animate = () => {
      const currentTime = Date.now()
      const newProgress = new Map<string, number>()

      busAnimationRef.current.forEach((state, vehicleNumber) => {
        const elapsed = currentTime - state.startTime
        const progress = Math.min(elapsed / state.duration, 1)
        newProgress.set(vehicleNumber, progress)
      })

      setBusAnimationProgress(newProgress)

      // Continue animation if any bus is still animating
      const hasActiveAnimation = Array.from(newProgress.values()).some(p => p < 1)
      if (hasActiveAnimation) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [operatingBusData])

  // Merge inbound and outbound stations into a single array with direction info
  // Convert direction-based progress (0-100 each) to entire route progress (0-100 total)
  // Inbound: 0-100% → 0-50%, Outbound: 0-100% → 50-100%
  const flatStations = useMemo(() => [
    ...(stationData.inbound?.features.map(f => ({
      ...f,
      direction: 'inbound' as const,
      directionName: stationData.inbound?.direction_name || '상행선',
      entireProgress: f.properties.progress_percent * 0.5 // 0-100 → 0-50
    })) || []),
    ...(stationData.outbound?.features.map(f => ({
      ...f,
      direction: 'outbound' as const,
      directionName: stationData.outbound?.direction_name || '하행선',
      entireProgress: 50 + f.properties.progress_percent * 0.5 // 0-100 → 50-100
    })) || [])
  ], [stationData.inbound, stationData.outbound])

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

  // Calculate bus positions on the route diagram with animation
  // Uses entireProgress (0-100 for whole route) to match Cesium's coordinate system
  const busPositions = useMemo(() => {
    if (flatStations.length < 2) return []

    // Helper to find station pair for a given progress on entire route
    const findStationPair = (busProgress: number) => {
      // Find adjacent stations by entireProgress
      for (let i = 0; i < flatStations.length - 1; i++) {
        const currProgress = flatStations[i].entireProgress
        const nextProgress = flatStations[i + 1].entireProgress

        if (currProgress <= busProgress && nextProgress >= busProgress) {
          return {
            lowerIndex: i,
            upperIndex: i + 1,
            factor: nextProgress > currProgress
              ? (busProgress - currProgress) / (nextProgress - currProgress)
              : 0.5
          }
        }
      }

      // Edge cases: before first station
      if (busProgress <= flatStations[0].entireProgress) {
        return { lowerIndex: 0, upperIndex: 1, factor: 0 }
      }
      // After last station
      if (busProgress >= flatStations[flatStations.length - 1].entireProgress) {
        return {
          lowerIndex: flatStations.length - 2,
          upperIndex: flatStations.length - 1,
          factor: 1
        }
      }

      return null
    }

    return operatingBusData.map(bus => {
      // Get sorted positions (oldest to newest)
      const sortedPositions = [...bus.positions].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )

      // Get previous and current progress values
      const prevPosition = sortedPositions.length >= 2 ? sortedPositions[sortedPositions.length - 2] : sortedPositions[0]
      const currPosition = sortedPositions[sortedPositions.length - 1]

      // Get this bus's individual animation progress (0-1)
      const busProgress = busAnimationProgress.get(bus.vehicle_number) ?? 0

      // Interpolate progress based on this bus's animation state
      const prevProgress = prevPosition?.progress_percent ?? currPosition.progress_percent
      const currProgress = currPosition.progress_percent
      const animatedProgress = prevProgress + (currProgress - prevProgress) * busProgress

      // Find station pair using entire route progress (same as Cesium)
      const stationPair = findStationPair(animatedProgress)

      if (!stationPair) return null

      const { lowerIndex, upperIndex, factor } = stationPair

      const lowerCol = Math.floor(lowerIndex / ROW_COUNT)
      const lowerRow = lowerIndex % ROW_COUNT
      const upperCol = Math.floor(upperIndex / ROW_COUNT)
      const upperRow = upperIndex % ROW_COUNT

      return {
        vehicleNumber: bus.vehicle_number,
        animatedProgress,
        factor: Math.max(0, Math.min(1, factor)),
        lowerCol,
        lowerRow,
        upperCol,
        upperRow,
        lowerIndex,
        upperIndex
      }
    }).filter((pos): pos is NonNullable<typeof pos> => pos !== null)
  }, [flatStations, operatingBusData, busAnimationProgress, ROW_COUNT])

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

      {/* Operating Bus Count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '12px 0'
        }}
      >
        <img
          src={`${basePath}icon/bus.svg`}
          alt="버스"
          style={{ width: '18px', height: '18px' }}
        />
        <span
          style={{
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            color: '#FFF'
          }}
        >
          대기질 측정 버스 (운행 중) : {' '}
          <span style={{ fontWeight: '700', color: '#FFD040' }}>
            {operatingBusCount}
          </span>
          대
        </span>
      </div>

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
            // Count actual stations in this row
            const stationsInRow = stationGrid.filter(row => row[colIndex] !== null).length
            // Calculate line coverage (percentage of row with actual stations)
            const emptySlots = ROW_COUNT - stationsInRow
            const emptyPercentage = (emptySlots / ROW_COUNT) * 100

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
                    left: isEvenRow ? '30px' : `calc(30px + ${emptyPercentage}% - ${emptySlots * 6}px)`,
                    right: isEvenRow ? `calc(30px + ${emptyPercentage}% - ${emptySlots * 6}px)` : '30px',
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
                      [isEvenRow ? 'right' : 'left']: '30px',
                      width: '2px',
                      height: `${80 - 18 + 38 + 18}px`, // 118px: remaining row + gap + next row top
                      backgroundColor: '#656565',
                      zIndex: 0
                    }}
                  />
                )}

                {/* Bus icons on horizontal line */}
                {busPositions
                  .filter(pos => pos.lowerCol === colIndex && pos.upperCol === colIndex)
                  .map(pos => {
                    // Calculate position between two stations on this row
                    // Each station slot width = (container width - 2*30px padding) / 10
                    // Station positions: slot 0 center, slot 1 center, etc.
                    const lowerSlot = isEvenRow ? pos.lowerRow : (ROW_COUNT - 1 - pos.lowerRow)
                    const upperSlot = isEvenRow ? pos.upperRow : (ROW_COUNT - 1 - pos.upperRow)

                    // Interpolate between the two slot positions
                    const busSlot = lowerSlot + (upperSlot - lowerSlot) * pos.factor

                    // Convert slot to percentage (0-1 across the 10 slots)
                    // Each slot center is at (slot + 0.5) / 10
                    const positionPercent = (busSlot + 0.5) / ROW_COUNT * 100

                    return (
                      <img
                        key={`bus_h_${pos.vehicleNumber}`}
                        src={`${basePath}icon/busPosition.svg`}
                        alt={`버스 ${pos.vehicleNumber}`}
                        style={{
                          position: 'absolute',
                          top: '-4px', // Adjust to center on the line (icon is 44px tall)
                          left: `calc(30px + ${positionPercent}% - ${positionPercent * 0.6}px - 42px)`,
                          width: '84px',
                          height: '44px',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}
                      />
                    )
                  })}

                {/* Bus icons on vertical connector (between columns) */}
                {busPositions
                  .filter(pos => pos.lowerCol === colIndex && pos.upperCol === colIndex + 1)
                  .map(pos => {
                    // Bus is on the vertical connector between this column and next
                    // Vertical connector height: 118px (from icon center to next row icon center)
                    const verticalOffset = 18 + pos.factor * 118 // 18px is top of connector

                    return (
                      <img
                        key={`bus_v_${pos.vehicleNumber}`}
                        src={`${basePath}icon/busPosition.svg`}
                        alt={`버스 ${pos.vehicleNumber}`}
                        style={{
                          position: 'absolute',
                          top: `${verticalOffset - 22}px`, // Center the 44px icon
                          [isEvenRow ? 'right' : 'left']: '-12px', // Position near the vertical line
                          width: '84px',
                          height: '44px',
                          zIndex: 10,
                          pointerEvents: 'none',
                          transform: 'rotate(90deg)' // Rotate for vertical movement
                        }}
                      />
                    )
                  })}

                {/* Station items container */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: isEvenRow ? 'row' : 'row-reverse',
                    gap: '12px',
                    alignItems: 'flex-start',
                    position: 'relative',
                    zIndex: 1,
                    padding: '0 30px'
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
                            wordBreak: 'keep-all',
                            maxWidth: '100%',
                            width: '100%'
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