import {
  Color,
  Cartesian3,
  PolygonHierarchy,
  Entity,
  PolygonGraphics,
  HeightReference
} from 'cesium'

/**
 * Cesium Polygon 생성 및 관리 유틸리티
 * 테스트 목적으로 간단한 Polygon 추가/제거 기능 제공
 */

export interface PolygonPoint {
  longitude: number
  latitude: number
  height?: number
}

export interface PolygonOptions {
  color?: string
  extrudedHeight?: number
}

/**
 * Polygon Entity를 Cesium Viewer에 추가
 * @param points - 폴리곤 꼭짓점 좌표 배열 (경도, 위도, 높이 포함)
 * @param options - Polygon 옵션 (색상, extrudedHeight)
 * @param id - Entity ID (선택사항)
 * @returns 생성된 Entity ID
 */
export function addPolygon(
  points: PolygonPoint[],
  options: PolygonOptions = {},
  id?: string
): string | null {
  const viewer = window.cviewer
  if (!viewer) {
    console.error('[PolygonUtils] Cesium viewer not found')
    return null
  }

  if (points.length < 3) {
    console.error('[PolygonUtils] Polygon requires at least 3 points')
    return null
  }

  const { color = '#FF6B00', extrudedHeight } = options

  // 첫 좌표와 마지막 좌표가 같은지 확인하고 다르다면 닫기
  const coords = [...points]
  if (
    coords[0].longitude !== coords[coords.length - 1].longitude ||
    coords[0].latitude !== coords[coords.length - 1].latitude
  ) {
    coords.push(coords[0])
  }

  // Cartesian3 positions 생성 (height 포함)
  const positions = coords.map(point =>
    Cartesian3.fromDegrees(point.longitude, point.latitude, point.height || 0)
  )

  // 첫 번째 점의 높이를 기준으로 extrudedHeight 계산
  const baseHeight = coords[0].height || 0

  // Entity 생성
  const entity = viewer.entities.add(
    new Entity({
      id: id || `polygon_${Date.now()}`,
      polygon: new PolygonGraphics({
        hierarchy: new PolygonHierarchy(positions),
        material: Color.fromCssColorString(color).withAlpha(0.5),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        extrudedHeight: extrudedHeight
          ? baseHeight + extrudedHeight
          : undefined,
        outline: true,
        outlineColor: Color.fromCssColorString(color),
        outlineWidth: 2
      })
    })
  )

  console.log(`[PolygonUtils] Polygon added: ${entity.id}`)
  if (extrudedHeight) {
    console.log(`[PolygonUtils] ExtrudedHeight: ${extrudedHeight}m (base: ${baseHeight.toFixed(2)}m, total: ${(baseHeight + extrudedHeight).toFixed(2)}m)`)
  }

  return entity.id
}

/**
 * Entity ID로 Polygon 제거
 * @param entityId - 제거할 Entity ID
 * @returns 제거 성공 여부
 */
export function removePolygon(entityId: string): boolean {
  const viewer = window.cviewer
  if (!viewer) {
    console.error('[PolygonUtils] Cesium viewer not found')
    return false
  }

  const entity = viewer.entities.getById(entityId)
  if (!entity) {
    console.error(`[PolygonUtils] Entity not found: ${entityId}`)
    return false
  }

  viewer.entities.remove(entity)
  console.log(`[PolygonUtils] Polygon removed: ${entityId}`)
  return true
}

/**
 * 모든 Polygon Entity 제거
 * @returns 제거된 Entity 개수
 */
export function removeAllPolygons(): number {
  const viewer = window.cviewer
  if (!viewer) {
    console.error('[PolygonUtils] Cesium viewer not found')
    return 0
  }

  const entities = viewer.entities.values
  const polygonEntities = entities.filter(
    entity => entity.id.startsWith('polygon_')
  )

  polygonEntities.forEach(entity => {
    viewer.entities.remove(entity)
  })

  console.log(`[PolygonUtils] Removed ${polygonEntities.length} polygons`)
  return polygonEntities.length
}

/**
 * 현재 Viewer에 존재하는 모든 Polygon Entity ID 반환
 * @returns Polygon Entity ID 배열
 */
export function getAllPolygonIds(): string[] {
  const viewer = window.cviewer
  if (!viewer) {
    console.error('[PolygonUtils] Cesium viewer not found')
    return []
  }

  const entities = viewer.entities.values
  return entities
    .filter(entity => entity.id.startsWith('polygon_'))
    .map(entity => entity.id)
}
