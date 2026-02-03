import { observer } from 'mobx-react-lite'
import { useEffect, useState, useMemo, useRef } from 'react'
import { routeStore } from '@/stores/RouteStore'
import { calculateDirectionSplitPoint } from '@/utils/cesium/routePositionCalculator'
import { stationDetailStore } from '@/stores/StationDetailStore'
import { stationSensorStore } from '@/stores/StationSensorStore'
import { busStore } from '@/stores/BusStore'
import { getRouteStations } from '@/utils/api/routeApi'
import { getAirQualityLevel, AIR_QUALITY_COLORS } from '@/utils/airQuality'
import { isCivil, getBasePath } from '@/utils/env'
import Title from '@/components/basic/Title'
import AirQualityDisplay from '@/components/service/sensor/AirQualityDisplay'
import type { RouteStationsResponse, AirQualityLevel } from '@/utils/api/types'

// Default animation duration fallback (ms)
const DEFAULT_ANIMATION_DURATION = 10000

const basePath = getBasePath()

// Edge colors for route line highlighting
const EDGE_COLORS = {
  normal: '#656565',
  highlighted: '#FFD040'  // Yellow for Busanjin-gu edges
} as const

// Calculate which edges should be highlighted (both stations in target district)
function calculateEdgeHighlights(
  flatStations: Array<{ properties: { is_in_target_district: boolean } }>
): Map<number, boolean> {
  const highlights = new Map<number, boolean>()

  for (let i = 0; i < flatStations.length - 1; i++) {
    const current = flatStations[i]
    const next = flatStations[i + 1]
    // Edge is highlighted only if BOTH stations are in target district
    const isHighlighted = current.properties.is_in_target_district && next.properties.is_in_target_district
    highlights.set(i, isHighlighted)
  }

  return highlights
}

// Station icon mapping based on air quality level
const STATION_ICONS: Record<AirQualityLevel, string> = {
  good: 'station_good.svg',
  normal: 'station_normal.svg',
  bad: 'station_bad.svg',
  very_bad: 'station_very_bad.svg'
}

// Station display type based on position relative to bus
type StationDisplayType = 'inactive' | 'upcoming' | 'passed'

// Get station icon path based on display type and PM10 value
function getStationIconByType(displayType: StationDisplayType, pm10Value: number): string {
  switch (displayType) {
    case 'upcoming':
      return `${basePath}icon/station_upcoming.svg`
    case 'passed': {
      const { level } = getAirQualityLevel('pm10', pm10Value)
      return `${basePath}icon/${STATION_ICONS[level]}`
    }
    case 'inactive':
    default:
      return `${basePath}icon/station_inactive.svg`
  }
}

// Get station text color based on display type and PM10 value
function getStationTextColor(displayType: StationDisplayType, pm10Value: number): string {
  switch (displayType) {
    case 'upcoming':
      return '#FFFFFF'
    case 'passed': {
      const { level } = getAirQualityLevel('pm10', pm10Value)
      return AIR_QUALITY_COLORS[level]
    }
    case 'inactive':
    default:
      return '#A6A6A6'
  }
}

// Bus sensor color calculation using centralized colors
function getBusSensorColor(type: 'pm10' | 'pm25', value: number): { bg: string; text: string } {
  const { level } = getAirQualityLevel(type, value)
  const bg = AIR_QUALITY_COLORS[level]
  // White text for blue and red backgrounds, black for green and yellow
  const text = (level === 'good' || level === 'very_bad') ? '#FFF' : '#000'
  return { bg, text }
}

// Bus sensor data display component
interface BusSensorData {
  pm: number
  fpm: number
  voc: number
}

// PM10 등급 계산 (Civil 모드용)
function getPM10Grade(value: number): { icon: string; text: string } {
  if (value <= 30) return { icon: `${basePath}icon/state_good.svg`, text: '좋음' }
  if (value <= 80) return { icon: `${basePath}icon/state_normal.svg`, text: '보통' }
  return { icon: `${basePath}icon/state_bad.svg`, text: '나쁨' }
}

// PM2.5 등급 계산 (Civil 모드용)
function getPM25Grade(value: number): { icon: string; text: string } {
  if (value <= 15) return { icon: `${basePath}icon/state_good.svg`, text: '좋음' }
  if (value <= 35) return { icon: `${basePath}icon/state_normal.svg`, text: '보통' }
  return { icon: `${basePath}icon/state_bad.svg`, text: '나쁨' }
}

function BusSensorDisplay({ sensorData }: { sensorData: BusSensorData }) {
  const civilMode = isCivil()
  const pm10Value = Math.round(sensorData.pm * 10) / 10
  const pm25Value = Math.round(sensorData.fpm * 10) / 10
  const vocsValue = Math.round(sensorData.voc * 10) / 10
  const pm10Style = getBusSensorColor('pm10', pm10Value)
  const pm25Style = getBusSensorColor('pm25', pm25Value)

  // Civil 모드: 아이콘 + 등급 텍스트
  if (civilMode) {
    const pm10Grade = getPM10Grade(pm10Value)
    const pm25Grade = getPM25Grade(pm25Value)

    return (
      <div
        style={{
          display: 'flex',
          padding: '8px',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '8px',
          borderRadius: '6px',
          border: '1px solid #C4C6C6',
          background: 'rgba(0, 0, 0, 0.80)',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap'
        }}
      >
        {/* PM10 */}
        <div style={{ display: 'flex', width: '48px', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#FFF', fontSize: '10px', fontWeight: 700, fontFamily: 'Pretendard', whiteSpace: 'nowrap' }}>미세먼지</span>
          <img src={pm10Grade.icon} alt={pm10Grade.text} style={{ width: '32px', height: '32px' }} />
          <span style={{ color: '#FFF', fontSize: '8px', fontWeight: 400, fontFamily: 'Pretendard' }}>{pm10Grade.text}</span>
        </div>
        {/* PM2.5 */}
        <div style={{ display: 'flex', width: '48px', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#FFF', fontSize: '10px', fontWeight: 700, fontFamily: 'Pretendard', whiteSpace: 'nowrap' }}>초미세먼지</span>
          <img src={pm25Grade.icon} alt={pm25Grade.text} style={{ width: '32px', height: '32px' }} />
          <span style={{ color: '#FFF', fontSize: '8px', fontWeight: 400, fontFamily: 'Pretendard' }}>{pm25Grade.text}</span>
        </div>
      </div>
    )
  }

  // 일반 모드: 숫자 값 표시
  return (
    <div
      style={{
        display: 'flex',
        padding: '4px 6px',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '6px',
        border: '1px solid #C4C6C6',
        background: 'rgba(30, 30, 30, 0.90)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap'
      }}
    >
      {/* PM10 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#FFF', fontSize: '8px', fontWeight: 700, fontFamily: 'Pretendard' }}>PM10</span>
        <div
          style={{
            display: 'flex',
            width: '32px',
            height: '32px',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '50%',
            background: pm10Style.bg
          }}
        >
          <span style={{ color: pm10Style.text, fontSize: '11px', fontWeight: 600, fontFamily: 'Pretendard' }}>
            {pm10Value}
          </span>
        </div>
      </div>
      {/* PM2.5 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#FFF', fontSize: '8px', fontWeight: 700, fontFamily: 'Pretendard' }}>PM2.5</span>
        <div
          style={{
            display: 'flex',
            width: '32px',
            height: '32px',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '50%',
            background: pm25Style.bg
          }}
        >
          <span style={{ color: pm25Style.text, fontSize: '11px', fontWeight: 600, fontFamily: 'Pretendard' }}>
            {pm25Value}
          </span>
        </div>
      </div>
      {/* VOCs */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#FFF', fontSize: '8px', fontWeight: 700, fontFamily: 'Pretendard' }}>VOCs</span>
        <div
          style={{
            display: 'flex',
            width: '32px',
            height: '32px',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '50%',
            background: '#C8C8C8'
          }}
        >
          <span style={{ color: '#000', fontSize: '11px', fontWeight: 600, fontFamily: 'Pretendard' }}>
            {vocsValue}
          </span>
        </div>
      </div>
    </div>
  )
}

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
  // Split point is calculated dynamically based on actual route geometry distances
  const flatStations = useMemo(() => {
    // Get route geometry for dynamic split point calculation
    const routeGeom = selectedRoute ? routeStore.getRouteGeom(selectedRoute) : undefined
    // Calculate actual split point based on inbound/entire length ratio
    // Falls back to 50% if routeGeom is not available
    const splitPoint = routeGeom ? calculateDirectionSplitPoint(routeGeom) : 50

    const stations = [
      ...(stationData.inbound?.features.map(f => ({
        ...f,
        direction: 'inbound' as const,
        directionName: stationData.inbound?.direction_name || '상행선',
        // Inbound: 0-100% → 0-splitPoint%
        entireProgress: f.properties.progress_percent * (splitPoint / 100)
      })) || []),
      ...(stationData.outbound?.features.map(f => ({
        ...f,
        direction: 'outbound' as const,
        directionName: stationData.outbound?.direction_name || '하행선',
        // Outbound: 0-100% → splitPoint-100%
        entireProgress: splitPoint + f.properties.progress_percent * ((100 - splitPoint) / 100)
      })) || [])
    ]

    // Sort by entireProgress to ensure correct order on the route diagram
    // This handles cases where outbound stations are returned in reverse order from API
    return stations.sort((a, b) => a.entireProgress - b.entireProgress)
  }, [stationData.inbound, stationData.outbound, selectedRoute])

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

    // Get split point for direction determination
    const routeGeom = selectedRoute ? routeStore.getRouteGeom(selectedRoute) : undefined
    const splitPoint = routeGeom ? calculateDirectionSplitPoint(routeGeom) : 50

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

    // Helper to determine bus direction by finding the nearest station
    // Stations have accurate direction info, so this is more reliable than route coordinates
    const determineBusDirection = (longitude: number, latitude: number): 'inbound' | 'outbound' => {
      if (flatStations.length === 0) {
        return 'inbound' // fallback
      }

      let nearestStation = flatStations[0]
      let minDist = Infinity

      for (const station of flatStations) {
        const [stationLon, stationLat] = station.geometry.coordinates
        const dist = Math.sqrt(
          Math.pow(longitude - stationLon, 2) + Math.pow(latitude - stationLat, 2)
        )
        if (dist < minDist) {
          minDist = dist
          nearestStation = station
        }
      }

      return nearestStation.direction
    }

    // Convert direction-specific progress (0-100) to entire route progress (0-100)
    const convertToEntireProgress = (directionProgress: number, direction: 'inbound' | 'outbound'): number => {
      if (direction === 'inbound') {
        // Inbound: 0-100% → 0-splitPoint%
        return directionProgress * (splitPoint / 100)
      } else {
        // Outbound: 0-100% → splitPoint-100%
        return splitPoint + directionProgress * ((100 - splitPoint) / 100)
      }
    }

    return operatingBusData.map(bus => {
      // Get sorted positions (oldest to newest)
      const sortedPositions = [...bus.positions].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )

      // Get previous and current position data
      const prevPosition = sortedPositions.length >= 2 ? sortedPositions[sortedPositions.length - 2] : sortedPositions[0]
      const currPosition = sortedPositions[sortedPositions.length - 1]

      // Determine bus direction based on current GPS position
      const busDirection = determineBusDirection(
        currPosition.position.longitude,
        currPosition.position.latitude
      )
      const isInbound = busDirection === 'inbound'

      // Get this bus's individual animation progress (0-1)
      const busProgress = busAnimationProgress.get(bus.vehicle_number) ?? 0

      // Convert direction-specific progress to entire route progress
      const prevProgressRaw = prevPosition?.progress_percent ?? currPosition.progress_percent
      const currProgressRaw = currPosition.progress_percent

      const prevEntireProgress = convertToEntireProgress(prevProgressRaw, busDirection)
      const currEntireProgress = convertToEntireProgress(currProgressRaw, busDirection)

      const progressDelta = currEntireProgress - prevEntireProgress

      // Handle various movement scenarios
      let animatedProgress: number

      if (Math.abs(progressDelta) > 30) {
        // Large jump: skip animation, use current position directly
        animatedProgress = currEntireProgress
      } else if (progressDelta < 0) {
        // Backward movement: use current position directly
        animatedProgress = currEntireProgress
      } else {
        // Normal forward movement: animate from prev to curr
        animatedProgress = prevEntireProgress + progressDelta * busProgress
      }

      // Find station pair using entire route progress
      const stationPair = findStationPair(animatedProgress)

      if (!stationPair) return null

      const { lowerIndex, upperIndex, factor } = stationPair

      const lowerCol = Math.floor(lowerIndex / ROW_COUNT)
      const lowerRow = lowerIndex % ROW_COUNT
      const upperCol = Math.floor(upperIndex / ROW_COUNT)
      const upperRow = upperIndex % ROW_COUNT

      // Get sensor data from latest position
      const latestPosition = sortedPositions[sortedPositions.length - 1]
      const sensorData = latestPosition?.sensor_data

      return {
        vehicleNumber: bus.vehicle_number,
        animatedProgress,
        progressDelta, // Direction of movement: positive = forward (index increasing), negative = backward
        factor: Math.max(0, Math.min(1, factor)),
        lowerCol,
        lowerRow,
        upperCol,
        upperRow,
        lowerIndex,
        upperIndex,
        sensorData,
        isInbound
      }
    }).filter((pos): pos is NonNullable<typeof pos> => pos !== null)
  }, [flatStations, operatingBusData, busAnimationProgress, ROW_COUNT, selectedRoute])

  // Calculate station display type based on bus positions
  // - upcoming: 3 stations ahead of any bus (in travel direction)
  // - passed: 2 stations behind any bus (opposite of travel direction)
  // - inactive: all other stations
  const stationDisplayTypes = useMemo(() => {
    const displayTypes = new Map<number, StationDisplayType>()

    // Initialize all stations as inactive
    flatStations.forEach((_, index) => {
      displayTypes.set(index, 'inactive')
    })

    // For each bus, mark stations relative to its position
    busPositions.forEach(pos => {
      // Determine movement direction based on progressDelta
      // If progressDelta >= 0: bus is moving forward (index increasing direction)
      // If progressDelta < 0: bus is moving backward (index decreasing direction)
      const isMovingForward = pos.progressDelta >= 0

      if (isMovingForward) {
        // Forward movement: upcoming = higher index, passed = lower index
        // Mark 3 stations ahead as upcoming
        for (let i = 0; i <= 2; i++) {
          const upcomingIndex = pos.upperIndex + i
          if (upcomingIndex < flatStations.length) {
            displayTypes.set(upcomingIndex, 'upcoming')
          }
        }
        // Mark 2 stations behind as passed
        for (let i = 0; i <= 1; i++) {
          const passedIndex = pos.lowerIndex - i
          if (passedIndex >= 0 && displayTypes.get(passedIndex) !== 'upcoming') {
            displayTypes.set(passedIndex, 'passed')
          }
        }
      } else {
        // Backward movement: upcoming = lower index, passed = higher index
        // Mark 3 stations ahead as upcoming (in backward direction)
        for (let i = 0; i <= 2; i++) {
          const upcomingIndex = pos.lowerIndex - i
          if (upcomingIndex >= 0) {
            displayTypes.set(upcomingIndex, 'upcoming')
          }
        }
        // Mark 2 stations behind as passed (in backward direction)
        for (let i = 0; i <= 1; i++) {
          const passedIndex = pos.upperIndex + i
          if (passedIndex < flatStations.length && displayTypes.get(passedIndex) !== 'upcoming') {
            displayTypes.set(passedIndex, 'passed')
          }
        }
      }
    })

    return displayTypes
  }, [flatStations, busPositions])

  // Calculate edge highlights for Busanjin-gu stations
  const edgeHighlights = useMemo(() => {
    return calculateEdgeHighlights(flatStations)
  }, [flatStations])

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
          gap: '20px',
          maxHeight: 'calc(100vh - 400px)',
          minHeight: '200px',
          paddingTop: '55px', // Space for bus sensor display above first row
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
                {/* Horizontal connecting line - base gray layer (ORIGINAL STYLE) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '18px', // Center of 36px icon
                    left: isEvenRow ? '30px' : `calc(30px + ${emptyPercentage}% - ${emptySlots * 6}px)`,
                    right: isEvenRow ? `calc(30px + ${emptyPercentage}% - ${emptySlots * 6}px)` : '30px',
                    height: '2px',
                    backgroundColor: EDGE_COLORS.normal,
                    zIndex: 0
                  }}
                />

                {/* Highlighted edge overlay segments (Busanjin-gu) */}
                {(() => {
                  const segments: React.ReactElement[] = []
                  const stationsInColumn = stationGrid.map(row => row[colIndex]).filter(s => s !== null)

                  // Horizontal edges between consecutive stations
                  for (let i = 0; i < stationsInColumn.length - 1; i++) {
                    const flatIndex = colIndex * ROW_COUNT + i
                    const isHighlighted = edgeHighlights.get(flatIndex) ?? false

                    if (!isHighlighted) continue  // Only render highlighted segments

                    const visualSlot = isEvenRow ? i : (stationsInColumn.length - 2 - i)
                    const leftPercent = ((visualSlot + 0.5) / ROW_COUNT) * 100
                    const widthPercent = 100 / ROW_COUNT

                    segments.push(
                      <div
                        key={`edge_h_${colIndex}_${i}`}
                        style={{
                          position: 'absolute',
                          top: '16px',  // Slightly higher to overlay gray line
                          left: `calc(30px + ${leftPercent}% - ${leftPercent * 0.6}px)`,
                          width: `calc(${widthPercent}% - ${widthPercent * 0.06}px)`,
                          height: '4px',  // Thicker than gray line
                          backgroundColor: EDGE_COLORS.highlighted,
                          zIndex: 1  // Above base gray line
                        }}
                      />
                    )
                  }

                  // Horizontal edge from last station to OUTGOING vertical connector
                  if (!isLastRow) {
                    const outgoingEdgeIndex = (colIndex + 1) * ROW_COUNT - 1
                    const isOutgoingHighlighted = edgeHighlights.get(outgoingEdgeIndex) ?? false

                    if (isOutgoingHighlighted && stationsInColumn.length > 0) {
                      // For even rows: segment goes from last station to right edge
                      // For odd rows: segment goes from last station (leftmost visual) to left edge
                      const lastStationSlot = isEvenRow
                        ? stationsInColumn.length - 1  // Rightmost station
                        : 0  // Leftmost visual station (last in data order appears leftmost due to row-reverse)

                      const stationCenterPercent = ((lastStationSlot + 0.5) / ROW_COUNT) * 100

                      if (isEvenRow) {
                        // From station center to right edge
                        segments.push(
                          <div
                            key={`edge_h_to_v_out_${colIndex}`}
                            style={{
                              position: 'absolute',
                              top: '16px',
                              left: `calc(30px + ${stationCenterPercent}% - ${stationCenterPercent * 0.6}px)`,
                              right: '29px',
                              height: '4px',
                              backgroundColor: EDGE_COLORS.highlighted,
                              zIndex: 1
                            }}
                          />
                        )
                      } else {
                        // From left edge to station center
                        segments.push(
                          <div
                            key={`edge_h_to_v_out_${colIndex}`}
                            style={{
                              position: 'absolute',
                              top: '16px',
                              left: '29px',
                              width: `calc(${stationCenterPercent}% - ${stationCenterPercent * 0.6}px + 1px)`,
                              height: '4px',
                              backgroundColor: EDGE_COLORS.highlighted,
                              zIndex: 1
                            }}
                          />
                        )
                      }
                    }
                  }

                  // Horizontal edge from INCOMING vertical connector to first station
                  if (colIndex > 0) {
                    const incomingEdgeIndex = colIndex * ROW_COUNT - 1  // Last edge of previous row
                    const isIncomingHighlighted = edgeHighlights.get(incomingEdgeIndex) ?? false

                    if (isIncomingHighlighted && stationsInColumn.length > 0) {
                      // Previous row exits from opposite side of current row's exit
                      // Even row: incoming from LEFT, first station at leftmost (slot 0)
                      // Odd row: incoming from RIGHT, first station at rightmost (slot 9 due to row-reverse)

                      if (isEvenRow) {
                        // Incoming from LEFT, first station at visual slot 0
                        const firstStationSlot = 0
                        const stationCenterPercent = ((firstStationSlot + 0.5) / ROW_COUNT) * 100
                        segments.push(
                          <div
                            key={`edge_v_to_h_in_${colIndex}`}
                            style={{
                              position: 'absolute',
                              top: '16px',
                              left: '29px',
                              width: `calc(${stationCenterPercent}% - ${stationCenterPercent * 0.6}px + 1px)`,
                              height: '4px',
                              backgroundColor: EDGE_COLORS.highlighted,
                              zIndex: 1
                            }}
                          />
                        )
                      } else {
                        // Incoming from RIGHT, first station at visual slot 9 (rightmost due to row-reverse)
                        const firstStationSlot = ROW_COUNT - 1
                        const stationCenterPercent = ((firstStationSlot + 0.5) / ROW_COUNT) * 100
                        segments.push(
                          <div
                            key={`edge_v_to_h_in_${colIndex}`}
                            style={{
                              position: 'absolute',
                              top: '16px',
                              left: `calc(30px + ${stationCenterPercent}% - ${stationCenterPercent * 0.6}px)`,
                              right: '29px',
                              height: '4px',
                              backgroundColor: EDGE_COLORS.highlighted,
                              zIndex: 1
                            }}
                          />
                        )
                      }
                    }
                  }

                  return segments
                })()}

                {/* Vertical connector to next row (ORIGINAL POSITION STYLE) */}
                {!isLastRow && (() => {
                  const edgeIndex = (colIndex + 1) * ROW_COUNT - 1
                  const isHighlighted = edgeHighlights.get(edgeIndex) ?? false

                  return (
                    <div
                      style={{
                        position: 'absolute',
                        top: '18px',
                        [isEvenRow ? 'right' : 'left']: isHighlighted ? '29px' : '30px',
                        width: isHighlighted ? '4px' : '2px',
                        height: `${80 - 18 + 38 + 18}px`, // 118px: remaining row + gap + next row top
                        backgroundColor: isHighlighted ? EDGE_COLORS.highlighted : EDGE_COLORS.normal,
                        zIndex: isHighlighted ? 1 : 0
                      }}
                    />
                  )
                })()}

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

                    // Bus image direction logic:
                    // - Even rows: visual flow is left → right (progress increases rightward)
                    // - Odd rows: visual flow is right → left (row-reverse, progress increases leftward)
                    // Bus image default: facing LEFT
                    // On even rows, bus faces RIGHT (flip)
                    // On odd rows, bus faces LEFT (no flip)
                    const shouldFlipBusImage = isEvenRow

                    return (
                      <div
                        key={`bus_h_${pos.vehicleNumber}`}
                        style={{
                          position: 'absolute',
                          top: '0px', // 버스 아이콘 하단이 노선 라인에 맞도록 조정
                          left: `calc(30px + ${positionPercent}% - ${positionPercent * 0.6}px)`,
                          transform: 'translateX(-50%)',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}
                      >
                        {/* Sensor Data Display - 버스 위에 absolute 배치 */}
                        {pos.sensorData && (
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '4px'
                          }}>
                            <BusSensorDisplay sensorData={pos.sensorData} />
                          </div>
                        )}
                        {/* Bus Icon */}
                        <img
                          src={`${basePath}icon/bus_image.png`}
                          alt={`버스 ${pos.vehicleNumber}`}
                          style={{
                            width: '84px',
                            height: 'auto',
                            transform: shouldFlipBusImage ? 'scaleX(-1)' : 'none'
                          }}
                        />
                      </div>
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
                      <div
                        key={`bus_v_${pos.vehicleNumber}`}
                        style={{
                          position: 'absolute',
                          top: `${verticalOffset - 22}px`,
                          [isEvenRow ? 'right' : 'left']: '-12px',
                          display: 'flex',
                          flexDirection: isEvenRow ? 'row' : 'row-reverse',
                          alignItems: 'center',
                          gap: '4px',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}
                      >
                        {/* Sensor Data Display */}
                        {pos.sensorData && (
                          <BusSensorDisplay sensorData={pos.sensorData} />
                        )}
                        {/* Bus Icon */}
                        <img
                          src={`${basePath}icon/bus_image.png`}
                          alt={`버스 ${pos.vehicleNumber}`}
                          style={{
                            width: '84px',
                            height: 'auto',
                            transform: 'rotate(-90deg)'
                          }}
                        />
                      </div>
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
                          style={{ flex: '1 0 0', minWidth: 0, height: '98px' }}
                        />
                      )
                    }

                    const isSelected = selectedStationId === station.properties.station_id
                    const sensorData = stationSensorStore.getSensorData(station.properties.station_id)
                    const pm10Value = sensorData?.pm10 ?? 0

                    // Calculate station index in flatStations array
                    const stationIndex = colIndex * ROW_COUNT + rowIndex
                    // Get display type based on bus positions
                    const displayType = stationDisplayTypes.get(stationIndex) ?? 'inactive'
                    // Get icon and text color based on display type
                    const stationIconSrc = getStationIconByType(displayType, pm10Value)
                    const stationTextColor = getStationTextColor(displayType, pm10Value)

                    const handleStationClick = () => {
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
                    }

                    return (
                      <div
                        key={`${station.direction}_${station.properties.station_id}_${rowIndex}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          flex: '1 0 0',
                          minWidth: 0,
                          height: '98px',
                          opacity: isSelected ? 1 : 0.8,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        {/* Station Icon */}
                        <img
                          src={stationIconSrc}
                          alt="정류장"
                          onClick={handleStationClick}
                          className="hover:brightness-150 transition-[filter] duration-200"
                          style={{
                            width: '36px',
                            height: '36px',
                            position: 'relative',
                            zIndex: 2,
                            cursor: 'pointer'
                          }}
                        />
                        {/* Station Name */}
                        <span
                          onClick={handleStationClick}
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '14px',
                            fontWeight: (isSelected || displayType === 'upcoming') ? '700' : '400',
                            color: isSelected ? '#40B5F1' : stationTextColor,
                            textAlign: 'center',
                            lineHeight: 'normal',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'keep-all',
                            maxWidth: '100%',
                            width: '100%',
                            cursor: 'pointer'
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
      {selectedStation && (() => {
        const selectedSensorData = stationSensorStore.getSensorData(selectedStation.properties.station_id)
        return (
          <div className="pt-4 border-t border-gray-600">
            <div className="mb-3 text-base font-medium text-white">
              선택된 정류장: {selectedStation.properties.station_name}
            </div>
            <div className="mb-4 text-sm text-gray-300">
              실시간 공기질 모니터링 데이터
            </div>
            <AirQualityDisplay
              pm10Value={selectedSensorData?.pm10 ?? 0}
              pm25Value={selectedSensorData?.pm25 ?? 0}
              vocsValue={selectedSensorData?.vocs ?? 0}
            />
          </div>
        )
      })()}
    </div>
  )
})

export default RouteDetail