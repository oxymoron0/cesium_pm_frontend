import { Entity, ModelGraphics, Cartesian3, Color, ColorBlendMode, HeightReference, HeadingPitchRange, ConstantPositionProperty, Transforms, Matrix4, HeadingPitchRoll, ConstantProperty } from 'cesium'
import { createDataSource, findDataSource, removeDataSource } from './datasources'
import { type BusTrajectoryData } from '@/utils/api/busApi'
import { getPositionOnRoute, lerpProgress, calculateShortestPath } from './routePositionCalculator'
import { routeStore } from '@/stores/RouteStore'

const basePath = import.meta.env.VITE_BASE_PATH || '/';

/**
 * 노선 번호에 따른 GLB 모델 URL 생성
 */
function getBusModelUrl(routeName: string): string {
  return `${basePath}BusanBus_num${routeName}.glb`
}

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

  // 각 버스의 초기 위치 계산 및 GLB 모델 배치
  busData.forEach((bus) => {
    if (bus.positions.length === 0) return

    // 최신 위치(마지막 위치) 사용
    const latestPosition = bus.positions[bus.positions.length - 1]
    const latestProgressPercent = latestPosition.progress_percent || 0

    // 초기 배치 위치: 최신 위치에서 -1.5% (단, 99~1% 구간은 동일 값 유지)
    let initialProgressPercent = latestProgressPercent
    if (latestProgressPercent >= 1 && latestProgressPercent <= 99) {
      // 일반 구간: -1.5% 적용
      initialProgressPercent = latestProgressPercent - 1.5
      if (initialProgressPercent < 0) {
        initialProgressPercent = 100 + initialProgressPercent // wrap-around
      }
    }
    // 99~1% 구간(99, 100, 0, 1)은 동일한 값 사용

    // 노선 좌표에서 위치 계산 (초기 배치 위치 기준)
    const routeGeom = routeStore.getRouteGeom(bus.route_name)
    let position: Cartesian3
    let heading = 0

    if (routeGeom?.entire?.coordinates) {
      const routePosition = getPositionOnRoute(routeGeom.entire.coordinates, initialProgressPercent)
      if (routePosition) {
        position = Cartesian3.fromDegrees(routePosition.longitude, routePosition.latitude, 0)
        heading = routePosition.heading
      } else {
        // fallback: 직접 좌표 사용
        position = Cartesian3.fromDegrees(latestPosition.position.longitude, latestPosition.position.latitude, 0)
      }
    } else {
      // fallback: 직접 좌표 사용
      position = Cartesian3.fromDegrees(latestPosition.position.longitude, latestPosition.position.latitude, 0)
    }

    const colorHex = ROUTE_COLOR_MAP[bus.route_name] || '#888888'
    const color = Color.fromCssColorString(colorHex)

    // GLB 모델의 기본 방향 보정 (+90도)
    const adjustedHeading = heading + Math.PI / 2
    const hpr = new HeadingPitchRoll(adjustedHeading, 0, 0)
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr)

    const entity = new Entity({
      id: `bus_model_${bus.vehicle_number}`,
      name: `Bus ${bus.vehicle_number} (Route ${bus.route_name})`,
      position: new ConstantPositionProperty(position),
      orientation: new ConstantProperty(orientation),
      model: new ModelGraphics({
        uri: getBusModelUrl(bus.route_name),
        scale: 1,
        minimumPixelSize: 48,
        maximumScale: 48,
        color: color,
        colorBlendMode: ColorBlendMode.HIGHLIGHT,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      }),
    })

    dataSource.entities.add(entity)

    // 버스 애니메이션 상태 초기화
    // animationProgress: 초기 배치 위치 (-3%)
    // targetProgress: 최신 위치 (애니메이션 목표)
    const initialProgressNormalized = initialProgressPercent / 100
    const latestProgressNormalized = latestProgressPercent / 100

    busProgressAnimations.set(bus.vehicle_number, {
      vehicleNumber: bus.vehicle_number,
      routeName: bus.route_name,
      animationProgress: initialProgressNormalized,
      targetProgress: latestProgressNormalized,
      isAnimating: false
    })

    console.log(`[renderBusModels] Bus ${bus.vehicle_number}: Initial position ${initialProgressPercent.toFixed(2)}% → Latest ${latestProgressPercent.toFixed(2)}%`)
  })
}

/**
 * 모든 버스 모델을 제거하는 함수
 */
export function clearBusModels(): void {
  removeDataSource(DATASOURCE_NAME)
  stopAllProgressAnimations()
  busProgressAnimations.clear()
}

/**
 * 특정 버스 Entity 검색
 */
export function getBusEntity(vehicleNumber: string): Entity | undefined {
  const dataSource = findDataSource(DATASOURCE_NAME)
  if (!dataSource) return undefined

  return dataSource.entities.getById(`bus_model_${vehicleNumber}`)
}

// =============================================================================
// Progress 기반 애니메이션 시스템 (MATCHING_ROUTE_BUS_SAMPLE_FUNC.txt 방식)
// =============================================================================

interface BusProgressAnimationState {
  vehicleNumber: string
  routeName: string
  animationProgress: number  // 0-1
  targetProgress: number      // 0-1
  isAnimating: boolean
  startTime?: number         // Animation start timestamp (ms)
  endTime?: number           // Animation end timestamp (ms)
  startProgress?: number     // Initial progress at animation start (0-1)
}

// 버스별 progress 애니메이션 상태
const busProgressAnimations = new Map<string, BusProgressAnimationState>()

// preRender 이벤트 리스너 (전역 단일 리스너)
let preRenderListener: (() => void) | null = null
let isPreRenderActive = false

/**
 * Progress 기반 애니메이션 루프 (preRender)
 */
function animationLoop() {
  const currentTime = Date.now()

  busProgressAnimations.forEach((state, vehicleNumber) => {
    const entity = getBusEntity(vehicleNumber)
    if (!entity) return

    // 시간 기반 애니메이션이 설정된 경우
    if (state.startTime !== undefined && state.endTime !== undefined && state.startProgress !== undefined) {
      const duration = state.endTime - state.startTime
      const elapsed = currentTime - state.startTime

      if (elapsed >= duration) {
        // 애니메이션 완료
        state.animationProgress = state.targetProgress
        state.isAnimating = false
        state.startTime = undefined
        state.endTime = undefined
        state.startProgress = undefined
      } else {
        // 시간 기반 선형 진행률 계산
        const timeProgress = elapsed / duration

        // startProgress에서 targetProgress로 선형 이동
        const diff = calculateShortestPath(state.startProgress, state.targetProgress)
        state.animationProgress = state.startProgress + (diff * timeProgress)

        // 0~1 범위로 정규화
        if (state.animationProgress > 1) state.animationProgress -= 1
        if (state.animationProgress < 0) state.animationProgress += 1

        state.isAnimating = true
      }
    } else {
      // 레거시: lerp 기반 애니메이션 (하위 호환성)
      const diff = calculateShortestPath(state.animationProgress, state.targetProgress)

      if (Math.abs(diff) > 0.001) {
        state.animationProgress = lerpProgress(state.animationProgress, state.targetProgress, 0.05)
        state.isAnimating = true
      } else {
        state.animationProgress = state.targetProgress
        state.isAnimating = false
      }

      // 0~1 범위로 정규화
      if (state.animationProgress > 1) state.animationProgress -= 1
      if (state.animationProgress < 0) state.animationProgress += 1
    }

    // 노선 좌표에서 위치 계산
    const routeGeom = routeStore.getRouteGeom(state.routeName)
    if (!routeGeom?.entire?.coordinates) {
      return
    }

    const progressPercent = state.animationProgress * 100
    const routePosition = getPositionOnRoute(routeGeom.entire.coordinates, progressPercent)

    if (routePosition) {
      const position = Cartesian3.fromDegrees(routePosition.longitude, routePosition.latitude, 0)

      // 위치 업데이트
      entity.position = new ConstantPositionProperty(position)

      // 방향 업데이트 (GLB 모델 기본 방향 보정 +90도)
      const adjustedHeading = routePosition.heading + Math.PI / 2
      const hpr = new HeadingPitchRoll(adjustedHeading, 0, 0)
      const orientation = Transforms.headingPitchRollQuaternion(position, hpr)
      entity.orientation = new ConstantProperty(orientation)
    }
  })
}

/**
 * preRender 애니메이션 시작
 */
export function startProgressAnimationSystem(): void {
  if (isPreRenderActive) {
    console.log('[glbRenderer] Progress animation system already running')
    return
  }

  const viewer = getViewer()
  if (!viewer) return

  preRenderListener = () => animationLoop()
  viewer.scene.preRender.addEventListener(preRenderListener)
  isPreRenderActive = true

  console.log('[glbRenderer] Progress animation system started')
}

/**
 * preRender 애니메이션 중지
 */
export function stopProgressAnimationSystem(): void {
  if (!isPreRenderActive || !preRenderListener) return

  const viewer = getViewer()
  if (!viewer) return

  viewer.scene.preRender.removeEventListener(preRenderListener)
  preRenderListener = null
  isPreRenderActive = false

  console.log('[glbRenderer] Progress animation system stopped')
}

/**
 * 개별 버스의 목표 progress 설정 (시간 기반 이동)
 * @param vehicleNumber 버스 차량번호
 * @param targetProgressPercent 목표 진행률 (0-100)
 * @param durationSeconds 애니메이션 지속 시간 (초, 기본값 60초)
 */
export function setBusTargetProgress(
  vehicleNumber: string,
  targetProgressPercent: number,
  durationSeconds: number = 60
): boolean {
  const state = busProgressAnimations.get(vehicleNumber)
  if (!state) {
    console.error(`[setBusTargetProgress] Bus ${vehicleNumber} not found in animation system`)
    return false
  }

  // 0-100 → 0-1
  const targetProgress = Math.max(0, Math.min(100, targetProgressPercent)) / 100

  // 최단 경로 계산하여 targetProgress 설정
  const diff = calculateShortestPath(state.animationProgress, targetProgress)
  state.targetProgress = state.animationProgress + diff

  // 0~1 범위 정규화
  if (state.targetProgress > 1) state.targetProgress -= 1
  if (state.targetProgress < 0) state.targetProgress += 1

  // 시간 기반 애니메이션 설정
  const currentTime = Date.now()
  state.startTime = currentTime
  state.endTime = currentTime + (durationSeconds * 1000)
  state.startProgress = state.animationProgress

  console.log(`[setBusTargetProgress] Bus ${vehicleNumber}: ${(state.animationProgress * 100).toFixed(2)}% → ${(state.targetProgress * 100).toFixed(2)}% over ${durationSeconds}s`)

  return true
}

/**
 * 개별 버스의 progress 즉시 설정 (애니메이션 없이)
 */
export function setBusProgressImmediate(vehicleNumber: string, progressPercent: number): boolean {
  const state = busProgressAnimations.get(vehicleNumber)
  if (!state) {
    console.error(`[setBusProgressImmediate] Bus ${vehicleNumber} not found in animation system`)
    return false
  }

  const progress = Math.max(0, Math.min(100, progressPercent)) / 100
  state.animationProgress = progress
  state.targetProgress = progress

  return true
}

/**
 * 모든 버스 애니메이션 중지
 */
export function stopAllProgressAnimations(): void {
  busProgressAnimations.forEach(state => {
    state.isAnimating = false
    state.targetProgress = state.animationProgress
  })
}

/**
 * 버스 애니메이션 상태 조회
 */
export function getBusAnimationState(vehicleNumber: string): BusProgressAnimationState | undefined {
  return busProgressAnimations.get(vehicleNumber)
}

// =============================================================================
// 레거시: 직접 좌표 기반 애니메이션 (하위 호환성)
// =============================================================================

interface BusAnimation {
  startPosition: Cartesian3
  targetPosition: Cartesian3
  startTime: number
  duration: number
  interval?: NodeJS.Timeout
}

const busAnimations = new Map<string, BusAnimation>()

/**
 * 두 위치 사이의 heading 계산 (북쪽 기준 시계방향, radians)
 */
function calculateHeading(startPosition: Cartesian3, targetPosition: Cartesian3): number {
  const direction = Cartesian3.subtract(targetPosition, startPosition, new Cartesian3())

  if (Cartesian3.magnitude(direction) < 0.01) {
    return 0
  }

  Cartesian3.normalize(direction, direction)

  const transform = Transforms.eastNorthUpToFixedFrame(startPosition, undefined, new Matrix4())
  const inverseTransform = Matrix4.inverse(transform, new Matrix4())
  const localDirection = Matrix4.multiplyByPointAsVector(
    inverseTransform,
    direction,
    new Cartesian3()
  )

  const heading = Math.atan2(localDirection.x, localDirection.y)
  return heading
}

/**
 * 위치와 heading으로부터 orientation quaternion 생성
 */
function createOrientationFromHeading(position: Cartesian3, heading: number) {
  const adjustedHeading = heading + Math.PI / 2
  const hpr = new HeadingPitchRoll(adjustedHeading, 0, 0)
  const quaternion = Transforms.headingPitchRollQuaternion(position, hpr)
  return quaternion
}

/**
 * 개별 버스를 특정 위치로 애니메이션 이동 (레거시)
 * @deprecated progress 기반 애니메이션 사용 권장
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

  stopSingleBusAnimation(vehicleNumber)

  const currentPos = entity.position?.getValue(viewer.clock.currentTime)
  if (!currentPos) {
    console.error(`[animateSingleBus] Cannot get current position for bus ${vehicleNumber}`)
    return false
  }

  const targetPosition = Cartesian3.fromDegrees(targetLongitude, targetLatitude, 0)
  const movementHeading = calculateHeading(currentPos, targetPosition)

  const animation: BusAnimation = {
    startPosition: currentPos,
    targetPosition,
    startTime: Date.now(),
    duration: durationSeconds * 1000
  }

  busAnimations.set(vehicleNumber, animation)

  animation.interval = setInterval(() => {
    const elapsed = Date.now() - animation.startTime
    const progress = Math.min(elapsed / animation.duration, 1.0)

    if (progress >= 1.0) {
      entity.position = new ConstantPositionProperty(targetPosition)
      const finalOrientation = createOrientationFromHeading(targetPosition, movementHeading)
      entity.orientation = new ConstantProperty(finalOrientation)
      stopSingleBusAnimation(vehicleNumber)
      return
    }

    const easedProgress = 1 - Math.pow(1 - progress, 3)
    const currentPosition = Cartesian3.lerp(
      animation.startPosition,
      animation.targetPosition,
      easedProgress,
      new Cartesian3()
    )

    entity.position = new ConstantPositionProperty(currentPosition)

    const orientation = createOrientationFromHeading(currentPosition, movementHeading)
    entity.orientation = new ConstantProperty(orientation)
  }, 16)

  return true
}

/**
 * 특정 버스의 애니메이션 중지 (레거시)
 */
export function stopSingleBusAnimation(vehicleNumber: string): void {
  const animation = busAnimations.get(vehicleNumber)
  if (!animation) return

  if (animation.interval) {
    clearInterval(animation.interval)
  }

  busAnimations.delete(vehicleNumber)
}

// =============================================================================
// 카메라 추적
// =============================================================================

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

  const DEFAULT_CAMERA_OFFSET = new HeadingPitchRange(0, -0.4, 180)
  let preservedOffset: HeadingPitchRange | undefined

  if (viewer.trackedEntity) {
    try {
      const currentTrackedId = viewer.trackedEntity.id
      const newEntityId = `bus_model_${vehicleNumber}`

      if (currentTrackedId === newEntityId) {
        const currentEntityPosition = viewer.trackedEntity.position?.getValue(viewer.clock.currentTime)
        if (currentEntityPosition) {
          const cameraPosition = viewer.camera.position
          const distance = Cartesian3.distance(cameraPosition, currentEntityPosition)
          const heading = viewer.camera.heading
          const pitch = viewer.camera.pitch

          preservedOffset = new HeadingPitchRange(heading, pitch, distance)
        }
      }
    } catch (error) {
      console.warn('[trackBusEntity] Failed to preserve camera offset:', error)
    }
  }

  viewer.trackedEntity = entity

  const offsetToApply = preservedOffset || DEFAULT_CAMERA_OFFSET

  viewer.scene.postRender.addEventListener(function applyOffset() {
    try {
      const newEntityPosition = entity.position?.getValue(viewer.clock.currentTime)
      if (newEntityPosition) {
        viewer.camera.lookAt(
          newEntityPosition,
          new HeadingPitchRange(
            offsetToApply.heading,
            offsetToApply.pitch,
            offsetToApply.range
          )
        )

        viewer.scene.postRender.removeEventListener(applyOffset)
      }
    } catch (error) {
      console.warn('[trackBusEntity] Failed to apply preserved offset:', error)
      viewer.scene.postRender.removeEventListener(applyOffset)
    }
  })

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

// =============================================================================
// 유틸리티
// =============================================================================

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
