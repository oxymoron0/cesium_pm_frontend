/**
 * 노선 좌표 기반 위치 계산 유틸리티
 * progress_percent (0-100)를 기반으로 노선 LineString 위의 정확한 위치를 계산
 */

import type { RouteGeom } from '@/utils/api/types'

export interface RoutePosition {
  longitude: number
  latitude: number
  heading: number  // radians (북쪽 기준 시계방향)
}

/**
 * 두 좌표 사이의 거리를 계산 (Haversine formula - meters)
 */
function calculateDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const R = 6371000 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * 두 좌표 사이의 heading 계산 (radians, 북쪽 기준 시계방향)
 * Forward Azimuth 계산 (Bearing)
 */
function calculateHeading(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  // 위도를 라디안으로 변환
  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180

  // 경도 차이를 라디안으로 변환
  const lonDiffRad = ((lon2 - lon1) * Math.PI) / 180

  // Bearing 계산 공식
  const y = Math.sin(lonDiffRad) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lonDiffRad)

  const bearing = Math.atan2(y, x)
  return bearing // radians (북쪽 기준 시계방향)
}

/**
 * 노선의 전체 길이를 계산 (meters)
 */
export function calculateTotalRouteLength(
  coordinates: [number, number, number][]
): number {
  let totalLength = 0

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i]
    const [lon2, lat2] = coordinates[i + 1]
    totalLength += calculateDistance(lon1, lat1, lon2, lat2)
  }

  return totalLength
}

/**
 * 노선의 각 세그먼트별 누적 거리를 계산
 */
function calculateCumulativeDistances(
  coordinates: [number, number, number][]
): number[] {
  const cumulativeDistances: number[] = [0]

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i]
    const [lon2, lat2] = coordinates[i + 1]
    const segmentDistance = calculateDistance(lon1, lat1, lon2, lat2)
    cumulativeDistances.push(cumulativeDistances[i] + segmentDistance)
  }

  return cumulativeDistances
}

/**
 * progress_percent를 기반으로 노선 위의 정확한 위치를 계산
 * @param coordinates 노선 LineString 좌표 배열 [[lon, lat, height], ...]
 * @param progressPercent 진행률 (0-100)
 * @returns RoutePosition (longitude, latitude, heading in radians)
 */
export function getPositionOnRoute(
  coordinates: [number, number, number][],
  progressPercent: number
): RoutePosition | null {
  if (!coordinates || coordinates.length < 2) {
    console.error('[getPositionOnRoute] Invalid coordinates:', coordinates)
    return null
  }

  // progress_percent를 0-1 범위로 정규화
  const progress = Math.max(0, Math.min(100, progressPercent)) / 100

  // 전체 노선 길이 계산
  const totalLength = calculateTotalRouteLength(coordinates)
  if (totalLength === 0) {
    console.error('[getPositionOnRoute] Total route length is zero')
    return null
  }

  // 목표 거리
  const targetDistance = totalLength * progress

  // 각 세그먼트의 누적 거리
  const cumulativeDistances = calculateCumulativeDistances(coordinates)

  // 목표 거리가 속한 세그먼트 찾기
  let segmentIndex = 0
  for (let i = 0; i < cumulativeDistances.length - 1; i++) {
    if (targetDistance >= cumulativeDistances[i] && targetDistance <= cumulativeDistances[i + 1]) {
      segmentIndex = i
      break
    }
  }

  // 세그먼트 내 위치 계산
  const segmentStart = cumulativeDistances[segmentIndex]
  const segmentEnd = cumulativeDistances[segmentIndex + 1]
  const segmentLength = segmentEnd - segmentStart

  if (segmentLength === 0) {
    // 세그먼트 길이가 0이면 시작점 반환
    const [lon, lat] = coordinates[segmentIndex]
    const [nextLon, nextLat] = coordinates[Math.min(segmentIndex + 1, coordinates.length - 1)]
    return {
      longitude: lon,
      latitude: lat,
      heading: calculateHeading(lon, lat, nextLon, nextLat)
    }
  }

  // 세그먼트 내 비율 계산
  const segmentProgress = (targetDistance - segmentStart) / segmentLength

  // 선형 보간
  const [lon1, lat1] = coordinates[segmentIndex]
  const [lon2, lat2] = coordinates[segmentIndex + 1]

  const longitude = lon1 + (lon2 - lon1) * segmentProgress
  const latitude = lat1 + (lat2 - lat1) * segmentProgress
  const heading = calculateHeading(lon1, lat1, lon2, lat2)

  return {
    longitude,
    latitude,
    heading
  }
}

/**
 * 최단 경로 계산 (0-1 원형 구조)
 * MATCHING_ROUTE_BUS_SAMPLE_FUNC.txt의 moveToTarget 로직 참고
 * @param currentProgress 현재 진행률 (0-1)
 * @param targetProgress 목표 진행률 (0-1)
 * @returns 최단 경로 차이 (-0.5 ~ 0.5)
 */
export function calculateShortestPath(
  currentProgress: number,
  targetProgress: number
): number {
  let diff = targetProgress - currentProgress

  // -0.5 ~ 0.5 범위로 정규화 (최단 경로)
  if (diff > 0.5) {
    diff -= 1
  } else if (diff < -0.5) {
    diff += 1
  }

  return diff
}

/**
 * 두 진행률 사이의 부드러운 lerp (0-1 범위 정규화)
 * @param current 현재 진행률 (0-1)
 * @param target 목표 진행률 (0-1)
 * @param speed lerp 속도 (0.05 권장)
 * @returns 새로운 진행률 (0-1)
 */
export function lerpProgress(
  current: number,
  target: number,
  speed: number = 0.05
): number {
  const diff = calculateShortestPath(current, target)

  let newProgress = current + diff * speed

  // 0~1 범위로 정규화
  if (newProgress > 1) newProgress -= 1
  if (newProgress < 0) newProgress += 1

  return newProgress
}

/**
 * RouteGeom에서 상행/하행 분할점 계산
 * entire route에서 inbound가 끝나고 outbound가 시작되는 지점의 percentage를 반환
 * @param routeGeom - 노선 geometry (entire, inbound, outbound 좌표 포함)
 * @returns 분할점 percentage (0-100), 기본값 50
 */
export function calculateDirectionSplitPoint(routeGeom: RouteGeom): number {
  const entireCoords = routeGeom.entire?.coordinates
  const inboundCoords = routeGeom.inbound?.coordinates

  if (!entireCoords || !inboundCoords || entireCoords.length < 2 || inboundCoords.length < 2) {
    return 50 // fallback
  }

  const entireLength = calculateTotalRouteLength(entireCoords)
  const inboundLength = calculateTotalRouteLength(inboundCoords)

  if (entireLength === 0) {
    return 50 // fallback
  }

  return (inboundLength / entireLength) * 100
}
