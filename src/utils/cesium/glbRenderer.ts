import { Model, Cartesian3, HeadingPitchRange, Transforms, Matrix4, HeadingPitchRoll, CustomShader, Cartographic, sampleTerrainMostDetailed, ScreenSpaceEventHandler, ScreenSpaceEventType, Cartesian2, Math as CesiumMath } from 'cesium'
import { createPrimitiveGroup, addPrimitive, removePrimitiveGroup, findPrimitiveGroup } from './primitives'
import { type BusTrajectoryData } from '@/utils/api/busApi'
import { getPositionOnRoute, lerpProgress, calculateShortestPath } from './routePositionCalculator'
import { routeStore } from '@/stores/RouteStore'
import { getBasePath } from '@/utils/env';

const basePath = getBasePath();

/**
 * 노선 번호에 따른 GLB 모델 URL 생성
 */
function getBusModelUrl(routeName: string): string {
  return `${basePath}BusanBus_num${routeName}.glb`
}

const PRIMITIVE_GROUP_NAME = 'bus_models'

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
 * 3D Tiles 뒤에 있어도 항상 보이도록 하는 CustomShader
 * depth buffer를 0으로 설정하여 occlusion을 무시
 */
const ALWAYS_ON_TOP_SHADER = new CustomShader({
  fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
      #ifdef GL_EXT_frag_depth
        gl_FragDepthEXT = 0.0;
      #endif
      czm_writeLogDepth(1.0);
    }
  `
})

// =============================================================================
// Terrain Height Cache
// =============================================================================

const terrainHeightCache = new Map<string, number>()

/**
 * 동기식 terrain 높이 조회 (globe 캐시 사용)
 * preRender/postRender에서 안전하게 사용 가능
 */
function getTerrainHeightSync(longitude: number, latitude: number): number {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`
  if (terrainHeightCache.has(key)) {
    return terrainHeightCache.get(key)!
  }

  const viewer = getViewer()
  if (!viewer?.scene?.globe) return 0

  try {
    const cartographic = Cartographic.fromDegrees(longitude, latitude)
    const height = viewer.scene.globe.getHeight(cartographic)
    const finalHeight = (height != null && height >= 0) ? height : 0
    terrainHeightCache.set(key, finalHeight)
    return finalHeight
  } catch {
    return 0
  }
}

/**
 * 특정 좌표의 terrain 높이를 비동기로 가져오는 함수 (초기 배치용)
 * 결과는 캐싱되어 재사용됨
 */
async function getTerrainHeight(longitude: number, latitude: number): Promise<number> {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`
  if (terrainHeightCache.has(key)) {
    return terrainHeightCache.get(key)!
  }

  const viewer = getViewer()
  if (!viewer?.terrainProvider) return 0

  try {
    const cartographic = Cartographic.fromDegrees(longitude, latitude)
    const positions = await sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic])
    const height = positions[0]?.height || 0

    terrainHeightCache.set(key, height)
    return height
  } catch (error) {
    console.warn('[glbRenderer] Terrain sampling failed:', error)
    return 0
  }
}

// =============================================================================
// Bus Model Registry
// =============================================================================

// 버스 Model 레지스트리 (vehicleNumber -> Model)
const busModels = new Map<string, Model>()

/**
 * 버스 Model 조회
 */
export function getBusEntity(vehicleNumber: string): Model | undefined {
  return busModels.get(vehicleNumber)
}

// =============================================================================
// Progress 기반 애니메이션 시스템
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
  model?: Model              // 해당 버스의 Model 참조
}

// 버스별 progress 애니메이션 상태
const busProgressAnimations = new Map<string, BusProgressAnimationState>()

// preRender 이벤트 리스너 (전역 단일 리스너)
let preRenderListener: (() => void) | null = null
let isPreRenderActive = false

/**
 * 버스 GLB 모델을 렌더링하는 함수 (Primitive-based)
 * @param busData - Bus trajectory API에서 받은 데이터
 */
export async function renderBusModels(busData: BusTrajectoryData[]): Promise<void> {
  const viewer = getViewer()
  if (!viewer) return

  // 기존 Primitive 그룹 제거
  removePrimitiveGroup(PRIMITIVE_GROUP_NAME)
  busModels.clear()
  busProgressAnimations.clear()

  // 새 Primitive 그룹 생성
  try {
    createPrimitiveGroup(PRIMITIVE_GROUP_NAME)
  } catch {
    console.warn('[renderBusModels] Primitive group already exists, continuing...')
  }

  // 각 버스의 초기 위치 계산 및 GLB 모델 배치
  for (const bus of busData) {
    if (bus.positions.length === 0) continue

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
    let longitude: number
    let latitude: number
    let heading = 0

    if (routeGeom?.entire?.coordinates) {
      const routePosition = getPositionOnRoute(routeGeom.entire.coordinates, initialProgressPercent)
      if (routePosition) {
        longitude = routePosition.longitude
        latitude = routePosition.latitude
        heading = routePosition.heading
      } else {
        // fallback: 직접 좌표 사용
        longitude = latestPosition.position.longitude
        latitude = latestPosition.position.latitude
      }
    } else {
      // fallback: 직접 좌표 사용
      longitude = latestPosition.position.longitude
      latitude = latestPosition.position.latitude
    }

    // Terrain 높이 샘플링
    const terrainHeight = await getTerrainHeight(longitude, latitude)
    const position = Cartesian3.fromDegrees(longitude, latitude, terrainHeight)

    // GLB 모델의 기본 방향 보정 (-90도)
    const adjustedHeading = heading - Math.PI / 2
    const hpr = new HeadingPitchRoll(adjustedHeading, 0, 0)
    const modelMatrix = Transforms.headingPitchRollToFixedFrame(position, hpr)

    try {
      // Model 생성 (CustomShader 적용으로 건물에 가려져도 보임)
      const model = await Model.fromGltfAsync({
        url: getBusModelUrl(bus.route_name),
        modelMatrix: modelMatrix,
        scale: 1,
        minimumPixelSize: 48,
        maximumScale: 48,
        customShader: ALWAYS_ON_TOP_SHADER
      })

      addPrimitive(PRIMITIVE_GROUP_NAME, model)
      busModels.set(bus.vehicle_number, model)

      // 버스 애니메이션 상태 초기화
      const initialProgressNormalized = initialProgressPercent / 100
      const latestProgressNormalized = latestProgressPercent / 100

      busProgressAnimations.set(bus.vehicle_number, {
        vehicleNumber: bus.vehicle_number,
        routeName: bus.route_name,
        animationProgress: initialProgressNormalized,
        targetProgress: latestProgressNormalized,
        isAnimating: false,
        model: model
      })

      console.log(`[renderBusModels] Bus ${bus.vehicle_number}: Initial position ${initialProgressPercent.toFixed(2)}% → Latest ${latestProgressPercent.toFixed(2)}%`)
    } catch (error) {
      console.error(`[renderBusModels] Failed to create model for bus ${bus.vehicle_number}:`, error)
    }
  }
}

/**
 * Progress 기반 애니메이션 루프 (preRender)
 * 동기 함수로 구현하여 프레임 드롭 방지
 */
function animationLoop(): void {
  const currentTime = Date.now()

  for (const [vehicleNumber, state] of busProgressAnimations) {
    const model = busModels.get(vehicleNumber)
    if (!model) continue

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
      continue
    }

    const progressPercent = state.animationProgress * 100
    const routePosition = getPositionOnRoute(routeGeom.entire.coordinates, progressPercent)

    if (routePosition) {
      // Terrain 높이 샘플링 (동기식, 캐시 활용)
      const terrainHeight = getTerrainHeightSync(routePosition.longitude, routePosition.latitude)
      const position = Cartesian3.fromDegrees(routePosition.longitude, routePosition.latitude, terrainHeight)

      // 방향 업데이트 (GLB 모델 기본 방향 보정 -90도)
      const adjustedHeading = routePosition.heading - Math.PI / 2
      const hpr = new HeadingPitchRoll(adjustedHeading, 0, 0)

      // Model의 modelMatrix 업데이트
      model.modelMatrix = Transforms.headingPitchRollToFixedFrame(position, hpr)
    }
  }
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
// 카메라 추적 (Manual Tracking for Primitives)
// =============================================================================

let trackedVehicleNumber: string | null = null
let trackingListener: (() => void) | null = null
let inputHandler: ScreenSpaceEventHandler | null = null

// 카메라 오프셋: heading(좌우), pitch(상하), range(거리)
let currentHeading = 0
let currentPitch = -0.4
let currentRange = 180

// 마우스 드래그 상태
let isDragging = false
let lastMousePosition: Cartesian2 | null = null

/**
 * 특정 버스에 카메라 추적 시작
 * lookAt 방식으로 버스를 항상 중심에 두고, 사용자가 heading/pitch/range 조절 가능
 */
export function trackBusEntity(vehicleNumber: string): boolean {
  const viewer = getViewer()
  const model = busModels.get(vehicleNumber)
  if (!viewer || !model) {
    console.error(`[trackBusEntity] Bus ${vehicleNumber} not found`)
    return false
  }

  // 기존 추적 중지
  stopTracking()

  trackedVehicleNumber = vehicleNumber

  // 현재 버스 위치
  const initialPosition = Matrix4.getTranslation(model.modelMatrix, new Cartesian3())

  // 초기 카메라 오프셋 설정
  currentHeading = 0
  currentPitch = -0.4
  currentRange = 180

  // 초기 카메라 이동: lookAt으로 버스를 화면 중앙에 배치
  const initialOffset = new HeadingPitchRange(currentHeading, currentPitch, currentRange)
  viewer.camera.lookAt(initialPosition, initialOffset)

  // 입력 핸들러 설정 (마우스 드래그, 휠)
  inputHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)

  // 마우스 왼쪽 버튼 누름 - 드래그 시작
  inputHandler.setInputAction((click: { position: Cartesian2 }) => {
    isDragging = true
    lastMousePosition = click.position.clone()
  }, ScreenSpaceEventType.LEFT_DOWN)

  // 마우스 왼쪽 버튼 뗌 - 드래그 종료
  inputHandler.setInputAction(() => {
    isDragging = false
    lastMousePosition = null
  }, ScreenSpaceEventType.LEFT_UP)

  // 마우스 이동 - heading/pitch 조절
  inputHandler.setInputAction((movement: { startPosition: Cartesian2; endPosition: Cartesian2 }) => {
    if (!isDragging || !lastMousePosition) return

    const deltaX = movement.endPosition.x - lastMousePosition.x
    const deltaY = movement.endPosition.y - lastMousePosition.y

    // heading: 좌우 드래그 (감도 조절)
    currentHeading -= deltaX * 0.005

    // pitch: 상하 드래그 (감도 조절, 범위 제한)
    currentPitch -= deltaY * 0.005
    currentPitch = CesiumMath.clamp(currentPitch, -CesiumMath.PI_OVER_TWO + 0.1, -0.05)

    lastMousePosition = movement.endPosition.clone()
  }, ScreenSpaceEventType.MOUSE_MOVE)

  // 마우스 휠 - range(거리/높이) 조절
  inputHandler.setInputAction((delta: number) => {
    // delta > 0: 휠 위로 (줌 인), delta < 0: 휠 아래로 (줌 아웃)
    const zoomFactor = delta > 0 ? 0.8 : 1.25
    currentRange = CesiumMath.clamp(currentRange * zoomFactor, 30, 3000)
  }, ScreenSpaceEventType.WHEEL)

  // postRender 리스너: 버스 위치에 lookAt 적용
  trackingListener = () => {
    if (!trackedVehicleNumber) return

    const trackedModel = busModels.get(trackedVehicleNumber)
    if (!trackedModel) {
      stopTracking()
      return
    }

    try {
      const busPosition = Matrix4.getTranslation(trackedModel.modelMatrix, new Cartesian3())
      const offset = new HeadingPitchRange(currentHeading, currentPitch, currentRange)
      viewer.camera.lookAt(busPosition, offset)
    } catch (error) {
      console.warn('[trackBusEntity] Failed to update camera position:', error)
    }
  }

  viewer.scene.postRender.addEventListener(trackingListener)

  console.log(`[trackBusEntity] Started tracking bus ${vehicleNumber}`)
  return true
}

/**
 * 카메라 추적 중지
 */
export function stopTracking(): void {
  const viewer = getViewer()
  if (!viewer) return

  // 입력 핸들러 정리
  if (inputHandler) {
    inputHandler.destroy()
    inputHandler = null
  }

  if (trackingListener) {
    viewer.scene.postRender.removeEventListener(trackingListener)
    trackingListener = null
  }

  // 드래그 상태 초기화
  isDragging = false
  lastMousePosition = null

  if (trackedVehicleNumber) {
    console.log(`[stopTracking] Stopped tracking bus ${trackedVehicleNumber}`)
    trackedVehicleNumber = null
  }

  // 카메라 잠금 해제 (자유 이동 모드로 복원)
  viewer.camera.lookAtTransform(Matrix4.IDENTITY)
}

/**
 * 현재 추적 중인 버스 정보 반환
 */
export function getCurrentTrackedBus(): string | null {
  return trackedVehicleNumber
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * 모든 버스 모델을 제거하는 함수
 */
export function clearBusModels(): void {
  stopTracking()
  stopAllProgressAnimations()
  stopProgressAnimationSystem()
  removePrimitiveGroup(PRIMITIVE_GROUP_NAME)
  busModels.clear()
  busProgressAnimations.clear()
  terrainHeightCache.clear()
}

// =============================================================================
// 유틸리티
// =============================================================================

/**
 * 버스 모델 수 반환
 */
export function getBusModelCount(): number {
  return busModels.size
}

/**
 * 버스 모델 가시성 토글
 */
export function toggleBusModels(visible?: boolean): void {
  const group = findPrimitiveGroup(PRIMITIVE_GROUP_NAME)
  if (!group) return

  const newVisibility = visible !== undefined ? visible : !group.show
  group.show = newVisibility

  // 모든 모델의 show 속성 업데이트
  busModels.forEach(model => {
    model.show = newVisibility
  })
}

// =============================================================================
// Bus Position API (for BusHtmlRenderer)
// =============================================================================

/**
 * 모든 버스의 현재 위치 반환
 * BusHtmlRenderer에서 사용
 */
export function getAllBusPositions(): Map<string, { position: Cartesian3; routeName: string }> {
  const result = new Map<string, { position: Cartesian3; routeName: string }>()

  busModels.forEach((model, vehicleNumber) => {
    const state = busProgressAnimations.get(vehicleNumber)
    if (model && state) {
      const position = Matrix4.getTranslation(model.modelMatrix, new Cartesian3())
      result.set(vehicleNumber, { position, routeName: state.routeName })
    }
  })

  return result
}

/**
 * 특정 버스의 현재 위치 반환
 */
export function getBusPosition(vehicleNumber: string): Cartesian3 | undefined {
  const model = busModels.get(vehicleNumber)
  if (!model) return undefined
  return Matrix4.getTranslation(model.modelMatrix, new Cartesian3())
}

/**
 * 특정 버스 모델에 시선 이동
 */
export function flyToBusModel(vehicleNumber: string): void {
  const viewer = getViewer()
  const model = busModels.get(vehicleNumber)
  if (!viewer || !model) return

  try {
    const targetPosition = Matrix4.getTranslation(model.modelMatrix, new Cartesian3())

    // 카메라 오프셋 (heading: 0, pitch: -30도, range: 200m)
    const heading = 0
    const pitch = -0.5 // radians (~-30도)
    const range = 200

    viewer.camera.flyTo({
      destination: targetPosition,
      orientation: {
        heading: heading,
        pitch: pitch,
        roll: 0
      },
      duration: 1.5,
      complete: () => {
        // flyTo 완료 후 lookAt으로 정확한 위치 조정
        viewer.camera.lookAt(targetPosition, new HeadingPitchRange(heading, pitch, range))
        viewer.camera.lookAtTransform(Matrix4.IDENTITY)
      }
    })
  } catch (error) {
    console.error(`[flyToBusModel] Failed to fly to bus ${vehicleNumber}:`, error)
  }
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
 * 개별 버스를 특정 위치로 애니메이션 이동 (레거시)
 * @deprecated progress 기반 애니메이션 사용 권장
 */
export async function animateSingleBus(
  vehicleNumber: string,
  targetLongitude: number,
  targetLatitude: number,
  durationSeconds: number = 3
): Promise<boolean> {
  const viewer = getViewer()
  if (!viewer) return false

  const model = busModels.get(vehicleNumber)
  if (!model) {
    console.error(`[animateSingleBus] Bus ${vehicleNumber} not found`)
    return false
  }

  stopSingleBusAnimation(vehicleNumber)

  const currentPos = Matrix4.getTranslation(model.modelMatrix, new Cartesian3())

  const terrainHeight = await getTerrainHeight(targetLongitude, targetLatitude)
  const targetPosition = Cartesian3.fromDegrees(targetLongitude, targetLatitude, terrainHeight)
  const movementHeading = calculateHeading(currentPos, targetPosition)

  const animation: BusAnimation = {
    startPosition: currentPos.clone(),
    targetPosition,
    startTime: Date.now(),
    duration: durationSeconds * 1000
  }

  busAnimations.set(vehicleNumber, animation)

  animation.interval = setInterval(() => {
    const elapsed = Date.now() - animation.startTime
    const progress = Math.min(elapsed / animation.duration, 1.0)

    if (progress >= 1.0) {
      const adjustedHeading = movementHeading - Math.PI / 2
      const hpr = new HeadingPitchRoll(adjustedHeading, 0, 0)
      model.modelMatrix = Transforms.headingPitchRollToFixedFrame(targetPosition, hpr)
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

    const adjustedHeading = movementHeading - Math.PI / 2
    const hpr = new HeadingPitchRoll(adjustedHeading, 0, 0)
    model.modelMatrix = Transforms.headingPitchRollToFixedFrame(currentPosition, hpr)
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
