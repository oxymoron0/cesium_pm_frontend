import { Entity, ModelGraphics, Cartesian3, HeightReference, ConstantPositionProperty, Cartographic, sampleTerrainMostDetailed, Color, CustomDataSource, ColorBlendMode, ConstantProperty } from 'cesium'
import { createDataSource, removeDataSource, clearDataSource } from './datasources'
import { flyToStationSmooth } from './cameraUtils'

const DATASOURCE_NAME = 'simulation_glb_result'

/**
 * 시뮬레이션 GLB 렌더링 컨텍스트
 * - entity0, entity1: 크로스 페이드를 위한 두 개의 Entity (핑퐁 방식)
 * - currentEntityIndex: 현재 표시 중인 Entity (0 또는 1)
 */
type PreparedContext = {
  centerLongitude: number
  centerLatitude: number
  terrainHeight: number
  resultPath: string
  basePath: string
  normalizedPath: string
  dataSource: CustomDataSource
  totalCount: number
  entity0: Entity | null
  entity1: Entity | null
  currentEntityIndex: 0 | 1
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
 * 모든 GLB 리소스 정리 및 애니메이션 중단
 */
export function clearSimulationGlbs(): void {
  if (fadeAnimationId !== null) {
    cancelAnimationFrame(fadeAnimationId)
    fadeAnimationId = null
  }

  clearDataSource(DATASOURCE_NAME)
  removeDataSource(DATASOURCE_NAME)
  preparedCtx = null
}

/**
 * 시뮬레이션 재생 준비
 * - DataSource 생성
 * - 지형 높이 샘플링
 * - 크로스 페이드용 Entity 2개 생성 (entity0, entity1)
 */
export async function prepareSimulationGlbSequence(params: {
  centerLongitude: number
  centerLatitude: number
  resultPath: string
  totalCount: number
  frameIntervalMs: number
}): Promise<void> {
  const viewer = getViewer()
  if (!viewer) return

  const { centerLongitude, centerLatitude, resultPath, totalCount, frameIntervalMs } = params

  if (!totalCount || totalCount <= 0) {
    console.warn('[simulationGlbRenderer] Invalid totalCount:', totalCount)
    return
  }

  // 카메라 이동
  flyToStationSmooth(centerLongitude, centerLatitude, 3500, 0)

  // 이미 준비된 컨텍스트와 동일하면 스킵
  if (preparedCtx &&
      preparedCtx.centerLongitude === centerLongitude &&
      preparedCtx.centerLatitude === centerLatitude &&
      preparedCtx.resultPath === resultPath &&
      preparedCtx.totalCount === totalCount &&
      preparedCtx.frameIntervalMs === frameIntervalMs) {
    return
  }

  // GLB 파일 경로 정규화
  const basePath = import.meta.env.VITE_BASE_PATH || '/'
  const normalizedPath = basePath.endsWith('/') && resultPath.startsWith('/')
    ? basePath + resultPath.slice(1)
    : basePath + resultPath

  // DataSource 초기화 및 생성
  clearDataSource(DATASOURCE_NAME)
  removeDataSource(DATASOURCE_NAME)
  const dataSource = createDataSource(DATASOURCE_NAME)

  // 지형 높이 샘플링
  let terrainHeight = 0
  try {
    const position = Cartographic.fromDegrees(centerLongitude, centerLatitude)
    const [sampled] = await sampleTerrainMostDetailed(viewer.terrainProvider, [position])
    terrainHeight = sampled.height || 0
  } catch (error) {
    console.error('[simulationGlbRenderer] Terrain sampling failed:', error)
  }

  // 크로스 페이드용 Entity 2개 생성
  const position = new ConstantPositionProperty(Cartesian3.fromDegrees(centerLongitude, centerLatitude, terrainHeight))

  const entity0 = new Entity({
    id: 'simulation_glb_frame_0',
    name: 'Simulation GLB Frame 0',
    position,
    model: new ModelGraphics({
      uri: '',
      scale: 1.0,
      color: new Color(2.2, 0.0, 0.0, 1.0),
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.9,  // 컬러 블렌딩 강도 (0-1)
      heightReference: HeightReference.NONE,
    }),
    show: true
  })

  const entity1 = new Entity({
    id: 'simulation_glb_frame_1',
    name: 'Simulation GLB Frame 1',
    position,
    model: new ModelGraphics({
      uri: '',
      scale: 1.0,
      color: new Color(2.2, 0.0, 0.0, 0.0),
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.9,  // 컬러 블렌딩 강도 (0-1)
      heightReference: HeightReference.NONE,
    }),
    show: false
  })

  dataSource.entities.add(entity0)
  dataSource.entities.add(entity1)

  preparedCtx = {
    centerLongitude,
    centerLatitude,
    terrainHeight,
    resultPath,
    basePath,
    normalizedPath,
    dataSource,
    totalCount,
    entity0,
    entity1,
    currentEntityIndex: 0,
    isTransitioning: false,
    frameIntervalMs
  }
}

/**
 * 크로스 페이드 애니메이션 실행
 *
 * 동작 원리:
 * - fromEntity: alpha 1.0 → 0.0 (페이드 아웃)
 * - toEntity: alpha 0.0 → 1.0 (페이드 인)
 * - Sine ease-in-out 곡선으로 자연스러운 전환
 *
 * @param fromEntity - 사라지는 Entity
 * @param toEntity - 나타나는 Entity
 * @param toGlbUrl - 다음 프레임 GLB URL
 * @param duration - 전환 시간 (ms)
 */
function executeCrossFade(
  fromEntity: Entity,
  toEntity: Entity,
  toGlbUrl: string,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    // 기존 애니메이션 중단
    if (fadeAnimationId !== null) {
      cancelAnimationFrame(fadeAnimationId)
      fadeAnimationId = null
    }

    // 다음 Entity에 GLB 로드
    if (toEntity.model) {
      toEntity.model.uri = new ConstantProperty(toGlbUrl)
    }
    toEntity.show = true

    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1.0)

      // 1. Linear (직선)
      // const easedProgress = progress
      // → 일정한 속도로 전환 (가장 단순)

      // 2. Ease-in (시작 느림 → 끝 빠름)
      // const easedProgress = progress * progress
      // → 점점 빨라지는 느낌

      // 3. Ease-out (시작 빠름 → 끝 느림)
      // const easedProgress = 1 - (1 - progress) * (1 - progress)
      // → 점점 느려지는 느낌

      // 4. Ease-in-out Sine (현재 사용 중)
      // const easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2
      // → 부드럽고 자연스러움

      // 5. Ease-in-out Cubic (더 강한 곡선)
      // const easedProgress = progress < 0.5
      //   ? 4 * progress * progress * progress
      //   : 1 - Math.pow(-2 * progress + 2, 3) / 2
      // → 시작/끝이 매우 느리고, 중간이 매우 빠름

      // 6. Ease-in-out Expo (극단적)
      // const easedProgress = progress === 0 ? 0
      //   : progress === 1 ? 1
      //   : progress < 0.5 ? Math.pow(2, 20 * progress - 10) / 2
      //   : (2 - Math.pow(2, -20 * progress + 10)) / 2
      // → 매우 부드럽게 시작/끝, 중간에 급격한 변화

      // Ease-in-out Expo (극단적)
      const easedProgress = progress === 0 ? 0
        : progress === 1 ? 1
        : progress < 0.5 ? Math.pow(2, 20 * progress - 10) / 2
        : (2 - Math.pow(2, -20 * progress + 10)) / 2

      // 알파값 동시 변경 (크로스 페이드)
      if (fromEntity.model) {
        fromEntity.model.color = new ConstantProperty(new Color(2.2, 0.0, 0.0, 1.0 - easedProgress))
      }
      if (toEntity.model) {
        toEntity.model.color = new ConstantProperty(new Color(2.2, 0.0, 0.0, easedProgress))
      }

      // 전환 진행 중
      if (progress < 1.0) {
        fadeAnimationId = requestAnimationFrame(animate)
      }
      // 전환 완료
      else {
        fromEntity.show = false
        if (fromEntity.model) {
          fromEntity.model.color = new ConstantProperty(new Color(2.2, 0.0, 0.0, 0.0))
        }
        if (toEntity.model) {
          toEntity.model.color = new ConstantProperty(new Color(2.2, 0.0, 0.0, 1.0))
        }
        fadeAnimationId = null
        resolve()
      }
    }

    fadeAnimationId = requestAnimationFrame(animate)
  })
}

/**
 * 지정된 프레임 렌더링
 *
 * 동작 방식:
 * 1. skipFade=true: entity0에 즉시 로드 (첫 프레임, Seek 시)
 * 2. skipFade=false: entity0 ↔ entity1 핑퐁하며 크로스 페이드
 *
 * 프레임 간격(300ms) < 전환 시간(350ms) → 50ms 오버랩
 * → 두 프레임이 동시에 보이는 구간 발생 = 부드러운 보간 효과
 *
 * @param index - 프레임 인덱스 (0-based)
 * @param skipFade - true면 즉시 전환, false면 크로스 페이드
 */
export async function renderSimulationGlbFrame(index: number, skipFade: boolean = false): Promise<void> {
  if (!preparedCtx) {
    console.warn('[simulationGlbRenderer] Call prepareSimulationGlbSequence() first')
    return
  }

  const { normalizedPath, totalCount, entity0, entity1, currentEntityIndex } = preparedCtx

  // 유효성 검사
  if (index < 0 || index >= totalCount) {
    console.warn(`[simulationGlbRenderer] Frame ${index} out of range (0-${totalCount - 1})`)
    return
  }

  if (!entity0 || !entity1 || !entity0.model || !entity1.model) {
    console.error('[simulationGlbRenderer] Entities not initialized')
    return
  }

  // GLB 파일명 생성 (0001.glb, 0002.glb, ...)
  const fileNumber = String(index + 1).padStart(4, '0')
  const glbUrl = `${normalizedPath}Finedust_${fileNumber}.glb`

  // 즉시 전환 (첫 프레임 or Seek)
  if (skipFade) {
    entity0.model.uri = new ConstantProperty(glbUrl)
    entity0.model.color = new ConstantProperty(new Color(2.2, 0.0, 0.0, 1.0))
    entity0.show = true
    entity1.show = false
    preparedCtx.currentEntityIndex = 0
    return
  }

  // 크로스 페이드 전환
  const fromEntity = currentEntityIndex === 0 ? entity0 : entity1
  const toEntity = currentEntityIndex === 0 ? entity1 : entity0

  // Entity 인덱스를 먼저 교체 (비동기 처리 중 다음 프레임 호출 대비)
  preparedCtx.currentEntityIndex = currentEntityIndex === 0 ? 1 : 0

  // 전환 시간 = 프레임 간격 + 50ms (오버랩 효과)
  const transitionDuration = preparedCtx.frameIntervalMs + 50

  preparedCtx.isTransitioning = true
  await executeCrossFade(fromEntity, toEntity, glbUrl, transitionDuration)
  preparedCtx.isTransitioning = false
}
