import { Entity, ModelGraphics, Cartesian3, HeightReference, ConstantPositionProperty, Cartographic, sampleTerrainMostDetailed, Color, CustomDataSource, ColorBlendMode, ConstantProperty } from 'cesium'
import { createDataSource, removeDataSource, clearDataSource } from './datasources'
import { flyToStationSmooth } from './cameraUtils'

const DATASOURCE_NAME = 'simulation_glb_result'

/**
 * Cesium viewer 가용성 체크
 */
function getViewer() {
  const viewer = window.cviewer
  if (!viewer) {
    console.error('[simulationGlbRenderer] Cesium viewer not available')
    return null
  }
  return viewer
}

/** ─────────────────────────────────────────────────────────────
 * 재생(Play/Pause) UI를 위한 API
 * ───────────────────────────────────────────────────────────── */

type PreparedContext = {
  centerLongitude: number
  centerLatitude: number
  terrainHeight: number
  resultPath: string
  basePath: string
  normalizedPath: string
  dataSource: CustomDataSource
  totalCount: number
  entity: Entity | null
} | null

let preparedCtx: PreparedContext = null

/**
 * 모든 시뮬레이션 GLB 리소스 정리
 */
export function clearSimulationGlbs(): void {
  clearDataSource(DATASOURCE_NAME)
  removeDataSource(DATASOURCE_NAME)
  preparedCtx = null
  console.log('[simulationGlbRenderer] Cleared all simulation GLB resources')
}

/**
 * 재생 시퀀스 준비: 데이터소스/카메라/지형높이
 */
export async function prepareSimulationGlbSequence(params: {
  centerLongitude: number
  centerLatitude: number
  resultPath: string
  totalCount: number
}): Promise<void> {
  const viewer = getViewer()
  if (!viewer) return

  const { centerLongitude, centerLatitude, resultPath, totalCount } = params

  if (!totalCount || totalCount <= 0) {
    console.warn('[simulationGlbRenderer] Invalid totalCount:', totalCount)
    return
  }

  flyToStationSmooth(centerLongitude, centerLatitude, 3500, 0)

  if (preparedCtx &&
      preparedCtx.centerLongitude === centerLongitude &&
      preparedCtx.centerLatitude === centerLatitude &&
      preparedCtx.resultPath === resultPath &&
      preparedCtx.totalCount === totalCount) {
    console.log('[simulationGlbRenderer] Already prepared, skipping')
    return
  }
  
  // (중략) ... 기존 코드와 동일 ...

  const basePath = import.meta.env.VITE_BASE_PATH || '/'
  const normalizedPath = basePath.endsWith('/') && resultPath.startsWith('/')
    ? basePath + resultPath.slice(1)
    : basePath + resultPath
  clearDataSource(DATASOURCE_NAME)
  removeDataSource(DATASOURCE_NAME)
  const dataSource = createDataSource(DATASOURCE_NAME)
  let terrainHeight = 0
  try {
    const position = Cartographic.fromDegrees(centerLongitude, centerLatitude)
    const [sampled] = await sampleTerrainMostDetailed(viewer.terrainProvider, [position])
    terrainHeight = sampled.height || 0
    console.log(`[simulationGlbRenderer] Sampled terrain height: ${terrainHeight}m`)
  } catch (error) {
    console.error('[simulationGlbRenderer] Terrain sampling failed:', error)
  }
  const entity = new Entity({
    id: 'simulation_glb_frame',
    name: 'Simulation GLB Frame',
    position: new ConstantPositionProperty(Cartesian3.fromDegrees(centerLongitude, centerLatitude, terrainHeight)),
    model: new ModelGraphics({
      uri: '',
      scale: 1.0,
      color: Color.fromCssColorString('#888888'),
      colorBlendMode: ColorBlendMode.REPLACE,
      heightReference: HeightReference.NONE
    })
  })
  dataSource.entities.add(entity)

  preparedCtx = {
    centerLongitude,
    centerLatitude,
    terrainHeight,
    resultPath,
    basePath,
    normalizedPath,
    dataSource,
    totalCount,
    entity
  }

  console.log('[simulationGlbRenderer] Prepared GLB sequence context', preparedCtx)
}

/**
 * [수정됨] 지정 프레임 1장만 렌더링 (0-based index 사용)
 * @param index - 렌더링할 프레임의 0-based 인덱스 (0부터 totalCount - 1 까지)
 */
export function renderSimulationGlbFrame(index: number): void {
  if (!preparedCtx) {
    console.warn('[simulationGlbRenderer] Call prepareSimulationGlbSequence() first.')
    return
  }
  const {
    normalizedPath,
    totalCount,
    entity
  } = preparedCtx

  // [수정] 0-based 인덱스 유효성 검사
  if (index < 0 || index >= totalCount) {
    console.warn(`[simulationGlbRenderer] Frame index out of range: ${index} (total: ${totalCount})`)
    return
  }

  if (!entity || !entity.model) {
    console.error('[simulationGlbRenderer] Entity or model not found')
    return
  }

  // [수정] 파일명 생성을 위해 0-based index에 1을 더해 1-based 숫자로 변환
  const fileNumber = index + 1
  const paddedNumber = String(fileNumber).padStart(4, '0')
  const glbUrl = `${normalizedPath}Finedust_${paddedNumber}.glb`

  // Entity 재사용: URI만 업데이트
  entity.model.uri = new ConstantProperty(glbUrl)
}