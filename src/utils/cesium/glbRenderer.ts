import { Entity, ModelGraphics, Cartesian3, Color, ColorBlendMode, HeightReference, HeadingPitchRange, ConstantPositionProperty } from 'cesium'
import { createDataSource, findDataSource, removeDataSource } from './datasources'
import { type BusTrajectoryData } from '@/utils/api/busApi'

const basePath = import.meta.env.VITE_BASE_PATH || '/';


const GLB_MODEL_URL = `${basePath}CesiumMilkTruck.glb`
const DATASOURCE_NAME = 'bus_models'

// 노선별 색상 매핑
const ROUTE_COLOR_MAP: Record<string, string> = {
  '10': '#FF6B6B',  // 빨강
  '31': '#4ECDC4',  // 청록
  '44': '#45B7D1',  // 파랑
  '167': '#FFA726' // 주황
}

/**
 * Cesium viewer 가용성 체크
 */
function getViewer() {
  const viewer = window.cviewer
  if (!viewer) {
    console.error('[glbRenderer] Cesium viewer not available')
    return null
  }
  return viewer
}

/**
 * 버스 GLB 모델을 렌더링하는 함수
 * @param busData - Bus trajectory API에서 받은 데이터
 */
export async function renderBusModels(busData: BusTrajectoryData[]): Promise<void> {
  const viewer = getViewer()
  if (!viewer) return

  // 기존 DataSource 제거 후 새로 생성
  removeDataSource(DATASOURCE_NAME)
  const dataSource = createDataSource(DATASOURCE_NAME)

  // 각 버스의 첫 번째 위치에 GLB 모델 배치
  busData.forEach((bus) => {
    if (bus.positions.length === 0) return

    const firstPosition = bus.positions[0]
    const { longitude, latitude } = firstPosition.position
    const colorHex = ROUTE_COLOR_MAP[bus.route_name] || '#888888' // 기본 회색
    const color = Color.fromCssColorString(colorHex)

    const entity = new Entity({
      id: `bus_model_${bus.vehicle_number}`,
      name: `Bus ${bus.vehicle_number} (Route ${bus.route_name})`,
      position: new ConstantPositionProperty(Cartesian3.fromDegrees(longitude, latitude, 0)),
      model: new ModelGraphics({
        uri: GLB_MODEL_URL,
        scale: 1,
        minimumPixelSize: 32,
        maximumScale: 64,
        color: color,
        colorBlendMode: ColorBlendMode.HIGHLIGHT,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      }),
    })

    dataSource.entities.add(entity)
  })

}

/**
 * 모든 버스 모델을 제거하는 함수
 */
export function clearBusModels(): void {
  removeDataSource(DATASOURCE_NAME)
}


/**
 * 특정 버스 Entity 검색
 */
export function getBusEntity(vehicleNumber: string): Entity | undefined {
  const dataSource = findDataSource(DATASOURCE_NAME)
  if (!dataSource) return undefined

  return dataSource.entities.getById(`bus_model_${vehicleNumber}`)
}


// 애니메이션 상태 관리
interface BusAnimation {
  startPosition: Cartesian3
  targetPosition: Cartesian3
  startTime: number
  duration: number
  interval?: NodeJS.Timeout
}

const busAnimations = new Map<string, BusAnimation>()

/**
 * 개별 버스를 특정 위치로 애니메이션 이동
 */
export function animateSingleBus(
  vehicleNumber: string,
  targetLongitude: number,
  targetLatitude: number,
  durationSeconds: number = 3
): boolean {
  const viewer = getViewer()
  if (!viewer) return false

  const entity = getBusEntity(vehicleNumber)
  if (!entity) {
    console.error(`[animateSingleBus] Bus ${vehicleNumber} not found`)
    return false
  }

  // 기존 애니메이션 중지
  stopSingleBusAnimation(vehicleNumber)

  // 현재 위치 가져오기
  const currentPos = entity.position?.getValue(viewer.clock.currentTime)
  if (!currentPos) {
    console.error(`[animateSingleBus] Cannot get current position for bus ${vehicleNumber}`)
    return false
  }

  const targetPosition = Cartesian3.fromDegrees(targetLongitude, targetLatitude, 0)

  // 간단한 setInterval 기반 애니메이션
  const animation: BusAnimation = {
    startPosition: currentPos,
    targetPosition,
    startTime: Date.now(),
    duration: durationSeconds * 1000
  }

  busAnimations.set(vehicleNumber, animation)

  // 60fps 애니메이션
  animation.interval = setInterval(() => {
    const elapsed = Date.now() - animation.startTime
    const progress = Math.min(elapsed / animation.duration, 1.0)

    if (progress >= 1.0) {
      // 애니메이션 완료
      entity.position = new ConstantPositionProperty(targetPosition)
      stopSingleBusAnimation(vehicleNumber)
      return
    }

    // Ease-out cubic
    const easedProgress = 1 - Math.pow(1 - progress, 3)
    const currentPosition = Cartesian3.lerp(
      animation.startPosition,
      animation.targetPosition,
      easedProgress,
      new Cartesian3()
    )

    entity.position = new ConstantPositionProperty(currentPosition)
  }, 16) // ~60fps

  return true
}

/**
 * 특정 버스의 애니메이션 중지
 */
export function stopSingleBusAnimation(vehicleNumber: string): void {
  const animation = busAnimations.get(vehicleNumber)
  if (!animation) return

  // interval 정리
  if (animation.interval) {
    clearInterval(animation.interval)
  }

  busAnimations.delete(vehicleNumber)
}

/**
 * 특정 버스에 카메라 추적 시작
 */
export function trackBusEntity(vehicleNumber: string): boolean {
  const viewer = getViewer()
  if (!viewer) return false

  const entity = getBusEntity(vehicleNumber)
  if (!entity) {
    console.error(`[trackBusEntity] Bus ${vehicleNumber} not found`)
    return false
  }

  viewer.trackedEntity = entity
  return true
}

/**
 * 카메라 추적 중지
 */
export function stopTracking(): void {
  const viewer = getViewer()
  if (!viewer) return

  viewer.trackedEntity = undefined
}

/**
 * 현재 추적 중인 버스 정보 반환
 */
export function getCurrentTrackedBus(): string | null {
  const viewer = getViewer()
  if (!viewer || !viewer.trackedEntity) return null

  const entityId = viewer.trackedEntity.id
  if (entityId.startsWith('bus_model_')) {
    return entityId.replace('bus_model_', '')
  }

  return null
}

/**
 * 버스 모델 수 반환
 */
export function getBusModelCount(): number {
  const dataSource = findDataSource(DATASOURCE_NAME)
  return dataSource ? dataSource.entities.values.length : 0
}

/**
 * 버스 모델 DataSource 가시성 토글
 */
export function toggleBusModels(visible?: boolean): void {
  const dataSource = findDataSource(DATASOURCE_NAME)
  if (dataSource) {
    dataSource.show = visible !== undefined ? visible : !dataSource.show
  }
}

/**
 * 특정 버스 모델에 시선 이동
 */
export function flyToBusModel(vehicleNumber: string): void {
  const viewer = getViewer()
  if (!viewer) return

  const entity = getBusEntity(vehicleNumber)
  if (entity) {
    viewer.flyTo(entity, {
      offset: new HeadingPitchRange(0, -0.5, 200)
    })
  }
}