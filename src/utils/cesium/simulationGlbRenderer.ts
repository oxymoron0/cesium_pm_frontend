import { Color, ColorBlendMode, Matrix4, Model } from 'cesium'
import { flyToBoundingSphere } from './cameraUtils'
import { getCachedGlbUrl, clearGlbCache } from './glbPreloader'
import { createPrimitiveGroup, addPrimitive, removePrimitive, removePrimitiveGroup, clearPrimitiveGroup, getPrimitiveGroupInfo } from './primitives'
import { getBasePath } from '@/utils/env'

const PRIMITIVE_GROUP_NAME = 'simulation_glb_result'

/**
 * 시뮬레이션 GLB 렌더링 컨텍스트
 * - currentModel: 현재 표시 중인 Model
 * - previousModel: 크로스 페이드용 이전 Model
 * - uuid: 시뮬레이션 UUID (캐싱 키)
 */
type PreparedContext = {
  uuid: string
  normalizedPath: string
  totalCount: number
  currentModel: Model | null
  previousModel: Model | null
  isTransitioning: boolean
  frameIntervalMs: number
} | null

let preparedCtx: PreparedContext = null
let fadeAnimationId: number | null = null

function getViewer() {
  const viewer = window.cviewer
  if (!viewer) {
    console.error('[simulationGlbRenderer] Cesium viewer not available')
  }
  return viewer
}

/**
 * Primitive 리소스 정리 (캐시는 유지)
 */
function clearPrimitives(): void {
  console.log('[GLB Clear] Primitives 정리 시작')

  // 애니메이션 중단
  if (fadeAnimationId !== null) {
    cancelAnimationFrame(fadeAnimationId)
    fadeAnimationId = null
    console.log('[GLB Clear] 애니메이션 중단')
  }

  // Primitive 그룹 제거 (모든 Model 자동 제거)
  removePrimitiveGroup(PRIMITIVE_GROUP_NAME)
  console.log('[GLB Clear] Primitive 그룹 제거')

  preparedCtx = null
  console.log('[GLB Clear] Primitives 정리 완료')
}

/**
 * 모든 GLB 리소스 정리 (캐시 포함)
 */
export function clearSimulationGlbs(): void {
  console.log('[GLB Clear] 전체 정리 시작 (캐시 포함)')

  // Primitive 정리
  clearPrimitives()

  // GLB 캐시 정리
  clearGlbCache()
  console.log('[GLB Clear] 캐시 정리')
  console.log('[GLB Clear] 전체 정리 완료')
}

/**
 * 시뮬레이션 GLB 모델로 카메라를 동적으로 이동시킵니다.
 * 모델의 크기에 맞춰 카메라 거리를 자동으로 조절하는 가장 안정적인 버전입니다.
 *
 * @param duration - 이동 시간 (초, 기본값: 0초)
 * @param pitch - 카메라 피치(기울기) 각도 (도, 기본값: -45도)
 * @param rangeMultiplier - 자동 계산된 거리 대비 추가 배율 (기본값: 1.5, 클수록 멀리서 봄)
 * @param minRange - 아무리 모델이 작아도 유지할 최소 거리 (미터, 기본값: 500m)
 */
export function flyToSimulationGlb(
  duration: number = 0,
  pitch: number = -45,
  rangeMultiplier: number = 1.5,
  minRange: number = 500
): void {
  console.log('[GLB Camera] flyToSimulationGlb 호출됨 (camera.flyToBoundingSphere 사용)');

  if (!preparedCtx || !preparedCtx.currentModel) {
    console.warn('[GLB Camera] 렌더링된 모델이 없습니다.');
    return;
  }

  const { currentModel: model } = preparedCtx;

  if (model.ready) {
    // 모델이 이미 준비되었으면 즉시 실행
    flyToBoundingSphere(model, duration, pitch, rangeMultiplier, minRange);
  } else {
    // 모델이 아직 로드되지 않았으면 readyEvent를 기다렸다가 실행
    model.readyEvent.addEventListener(() => {
      flyToBoundingSphere(model, duration, pitch, rangeMultiplier, minRange);
    });
  }
}

/**
 * 시뮬레이션 재생 준비
 * - Primitive API 사용 (Model)
 * - 지형 높이 샘플링
 * - Primitive 그룹 생성
 * - UUID 기반 캐싱 컨텍스트 설정
 */
export async function prepareSimulationGlb(params: {
  uuid: string
  resultPath?: string  // deprecated: kept for backward compatibility
  totalCount: number
  frameIntervalMs: number
}): Promise<void> {
  const viewer = getViewer()
  if (!viewer) return

  const { uuid, totalCount, frameIntervalMs } = params

  if (!totalCount || totalCount <= 0) {
    console.warn('[simulationGlbRenderer] Invalid totalCount:', totalCount)
    return
  }

  console.log('[GLB Prepare] 시작')

  // Build path using environment variables: VITE_BASE_PATH + VITE_SIM_PATH
  const basePath = getBasePath()
  const simPath = import.meta.env.VITE_SIM_PATH || 'sim'
  const normalizedPath = `${basePath}${simPath}/${uuid}/`

  // 이미 준비된 컨텍스트와 동일하면 스킵
  if (preparedCtx &&
      preparedCtx.uuid === uuid &&
      preparedCtx.normalizedPath === normalizedPath &&
      preparedCtx.totalCount === totalCount &&
      preparedCtx.frameIntervalMs === frameIntervalMs) {
    console.log('[GLB Prepare] 이미 준비됨 - 스킵')
    return
  }

  // 기존 Primitives 정리 (캐시는 유지)
  clearPrimitives()

  console.log('[GLB Prepare] normalizedPath:', normalizedPath)

  // Primitive 그룹 생성
  try {
    createPrimitiveGroup(PRIMITIVE_GROUP_NAME)
    console.log('[GLB Prepare] Primitive 그룹 생성 완료')
  } catch (error) {
    // 이미 존재하는 경우 (비정상 상태)
    console.warn('[GLB Prepare] Primitive group already exists - 정리 후 재생성 : ', error)
    removePrimitiveGroup(PRIMITIVE_GROUP_NAME)
    createPrimitiveGroup(PRIMITIVE_GROUP_NAME)
  }

  // Context 설정
  preparedCtx = {
    uuid,
    normalizedPath,
    totalCount,
    currentModel: null,
    previousModel: null,
    isTransitioning: false,
    frameIntervalMs
  }

  console.log('[GLB Prepare] 완료')
}

/**
 * 지정된 프레임 렌더링
 *
 * 동작 방식:
 * 1. skipFade=true: 이전 모든 프레임 제거 후 즉시 표시 (첫 프레임, Seek 시)
 * 2. skipFade=false: 크로스 페이드 전환 (재생 중)
 *
 * @param index - 프레임 인덱스 (0-based)
 * @param skipFade - true면 즉시 전환, false면 크로스 페이드
 */
export async function renderSimulationGlbFrame(index: number, skipFade: boolean = false): Promise<void> {
  console.log(`[GLB Render] ===== 함수 호출 ===== index: ${index}, skipFade: ${skipFade}`)

  if (!preparedCtx) {
    console.warn('[GLB Render] prepareSimulationGlb() 먼저 호출 필요')
    return
  }

  const viewer = getViewer()
  if (!viewer) return

  const { uuid, totalCount } = preparedCtx

  // 유효성 검사
  if (index < 0 || index >= totalCount) {
    console.warn(`[GLB Render] Frame ${index} out of range (0-${totalCount - 1})`)
    return
  }

  // 캐시에서 GLB URL 가져오기
  const glbUrl = getCachedGlbUrl(uuid, index)
  if (!glbUrl) {
    console.error(`[GLB Render] Cache miss for frame ${index}`)
    return
  }

  console.log(`[GLB Render] Frame ${index + 1}/${totalCount} | skipFade: ${skipFade}`)

  try {

    // //콘솔용
    //         console.log('[INSPECTION] Loading temporary model without modelMatrix to check original coordinates...');
        
    //     const tempModel = await Model.fromGltfAsync({ url: glbUrl });
    //     tempModel.show = true; // 화면에 보이지 않게
    //     viewer.scene.primitives.add(tempModel);
    //     setTimeout(()=> {
    //       if (tempModel.boundingSphere && tempModel.boundingSphere.center) {
    //           const originalCenter = tempModel.boundingSphere.center;
    //           const originalCarto = Cartographic.fromCartesian(originalCenter);
  
    //           console.log('--- [BEFORE AXIS SWAP] ---');
    //           console.log('Original Center from GLB (ECEF):', {
    //               x: originalCenter.x.toFixed(2),
    //               y: originalCenter.y.toFixed(2),
    //               z: originalCenter.z.toFixed(2)
    //           });
    //           console.log('Original Center from GLB (WGS84):', {
    //               longitude: CesiumMath.toDegrees(originalCarto.longitude).toFixed(6),
    //               latitude: CesiumMath.toDegrees(originalCarto.latitude).toFixed(6),
    //               height: originalCarto.height.toFixed(2)
    //           });
    //           console.log('----------------------------');

    //              // 2. GLB의 X, Y, Z에서 5186 좌표와 높이 추출
    //     const pseudoCoords = tempModel.boundingSphere.center;
    //     const easting = pseudoCoords.y;  // Y -> 5186 X
    //     const northing = pseudoCoords.z; // Z -> 5186 Y
    //     const height = pseudoCoords.x;   // X -> 높이(m)

    //     console.log(`--- [EPSG:5186 Data Extracted] ---`);
    //     console.log(`Easting(X): ${easting}, Northing(Y): ${northing}, Height: ${height}`);

    //     // 3. Proj4js를 사용하여 EPSG:5186 -> WGS84(경위도) 변환
    //     const [longitude, latitude] = transform5186to4326([easting, northing]);

    //     console.log(`--- [WGS84 Conversion Result] ---`);
    //     console.log(`Longitude: ${longitude}, Latitude: ${latitude}`);

    //     // 4. 변환된 경위도와 높이로 최종 ECEF 위치 계산
    //     const finalPositionEcef = Cartesian3.fromDegrees(longitude, latitude, height);
    //     console.log("final : ", finalPositionEcef)
    //       } else {
    //           console.error('[INSPECTION] Could not read boundingSphere from temporary model.');
    //       }
    //       const boundingSphere = newModel.boundingSphere;
    //     if (boundingSphere) {
    //       // 3. viewer.camera.flyToBoundingSphere를 사용하여 카메라를 이동시킵니다.
    //       viewer.camera.flyToBoundingSphere(boundingSphere, {
    //         duration: 2.0, // 2초 동안 비행
    //         offset: new HeadingPitchRange(0, CesiumMath.toRadians(-45), 0) // 추가 옵션: 모델을 45도 각도에서 내려다보도록 설정
    //       });
    //     }
    //     }, 3000)
    //     return;


    // 축 재조립 행렬: (X, Y, Z) → (Y, Z, X)
    const axisSwapMatrix = new Matrix4(
      0, 1, 0, 0,  // X' = Y
      0, 0, 1, 0,  // Y' = Z
      1, 0, 0, 0,  // Z' = X
      0, 0, 0, 1
    )

    console.log('[GLB Render] Reassembled Matrix (axisSwapMatrix):', axisSwapMatrix)

    // 새 Model 생성
    const newModel = await Model.fromGltfAsync({
      url: glbUrl,
      modelMatrix: axisSwapMatrix,
      color: Color.fromCssColorString('#CCCCCC').withAlpha(skipFade ? 1.0 : 0.0),
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.9
    })


    if (skipFade) {
      // ========== 즉시 전환 (첫 프레임, Seek) ==========
      console.log('[GLB Render] 즉시 전환 모드')

      // 기존 모든 프레임 정리
      clearPrimitiveGroup(PRIMITIVE_GROUP_NAME)
      console.log('[GLB Render] 이전 프레임 모두 제거')

      // Model 상태 확인
      console.log('[GLB Render] Model 상태 확인:')
      console.log('  - show:', newModel.show)
      console.log('  - ready:', newModel.ready)
      console.log('  - color:', newModel.color)
      console.log('  - modelMatrix:', newModel.modelMatrix)

      // 새 Model 추가
      const addResult = addPrimitive(PRIMITIVE_GROUP_NAME, newModel)
      console.log('[GLB Render] 새 Model 추가 결과:', addResult)

      // scene.primitives에 실제로 추가되었는지 확인
      const inScene = viewer.scene.primitives.contains(newModel)
      console.log('[GLB Render] scene.primitives에 포함 여부:', inScene)

      preparedCtx.currentModel = newModel
      preparedCtx.previousModel = null

    } else {
      // ========== 크로스 페이드 전환 (재생 중) ==========
      console.log('[GLB Render] 크로스 페이드 모드')

      // 그룹 상태 확인 (추가 전)
      const groupInfo = getPrimitiveGroupInfo(PRIMITIVE_GROUP_NAME)
      console.log('[GLB Render] 현재 그룹 상태 (추가 전):', groupInfo)

      // 새 Model 추가 (알파 0으로 시작)
      addPrimitive(PRIMITIVE_GROUP_NAME, newModel)
      console.log('[GLB Render] 새 Model 추가 (알파 0)')

      const previousModel = preparedCtx.currentModel
      console.log('[GLB Render] previousModel 존재:', !!previousModel)

      // 크로스 페이드 애니메이션
      const transitionDuration = preparedCtx.frameIntervalMs + 50
      preparedCtx.isTransitioning = true

      await executeCrossFade(previousModel, newModel, transitionDuration)

      preparedCtx.isTransitioning = false

      // 이전 Model을 그룹에서 제거
      if (previousModel) {
        const removeResult = removePrimitive(PRIMITIVE_GROUP_NAME, previousModel)
        console.log('[GLB Render] 이전 Model 제거 결과:', removeResult)

        // 그룹 상태 확인 (제거 후)
        const groupInfoAfter = getPrimitiveGroupInfo(PRIMITIVE_GROUP_NAME)
        console.log('[GLB Render] 현재 그룹 상태 (제거 후):', groupInfoAfter)
      } else {
        console.warn('[GLB Render] previousModel이 없음 - 첫 프레임일 가능성')
      }

      // Context 업데이트
      preparedCtx.currentModel = newModel
      preparedCtx.previousModel = null
    }

    console.log('[GLB Render] 완료')

  } catch (error) {
    console.error('[GLB Render] Failed to load model:', error)
  }
}

/**
 * Model 크로스 페이드 애니메이션
 * - fromModel: 알파 1.0 → 0.0 (페이드 아웃)
 * - toModel: 알파 0.0 → 1.0 (페이드 인)
 */
async function executeCrossFade(
  fromModel: Model | null,
  toModel: Model,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    // 기존 애니메이션 중단
    if (fadeAnimationId !== null) {
      cancelAnimationFrame(fadeAnimationId)
      fadeAnimationId = null
    }

    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1.0)

      // Ease-in-out Expo
      const easedProgress = progress === 0 ? 0
        : progress === 1 ? 1
        : progress < 0.5 ? Math.pow(2, 20 * progress - 10) / 2
        : (2 - Math.pow(2, -20 * progress + 10)) / 2

      // 알파값 동시 변경 (크로스 페이드)
      if (fromModel) {
        fromModel.color = Color.fromCssColorString('#CCCCCC').withAlpha(1.0 - easedProgress)
      }
      toModel.color = Color.fromCssColorString('#CCCCCC').withAlpha(easedProgress)

      // 전환 진행 중
      if (progress < 1.0) {
        fadeAnimationId = requestAnimationFrame(animate)
      }
      // 전환 완료
      else {
        if (fromModel) {
          fromModel.color = Color.fromCssColorString('#CCCCCC').withAlpha(0.0)
        }
        toModel.color = Color.fromCssColorString('#CCCCCC').withAlpha(1.0)
        fadeAnimationId = null
        resolve()
      }
    }

    fadeAnimationId = requestAnimationFrame(animate)
  })
}
