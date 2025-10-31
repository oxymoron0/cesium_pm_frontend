import { Entity, ModelGraphics, Cartesian3, ColorBlendMode, HeightReference, ConstantPositionProperty, Cartographic, sampleTerrainMostDetailed } from 'cesium'
import { createDataSource, findDataSource, removeDataSource } from './datasources'

const DATASOURCE_NAME = 'simulation_glb_result'

// 터레인 높이 캐시
const terrainHeightCache = new Map<string, number>()

/**
 * GLB 모델 데이터 구조
 */
export interface SimulationGlbData {
  id: string                    // Unique identifier
  glbUrl: string                // GLB file URL
  longitude: number             // WGS84 longitude
  latitude: number              // WGS84 latitude
  height?: number               // Height above ground (default: 0)
  scale?: number                // Model scale (default: 1)
  color?: string                // CSS color string (default: white)
  heading?: number              // Heading in degrees (default: 0)
  pitch?: number                // Pitch in degrees (default: 0)
  roll?: number                 // Roll in degrees (default: 0)
}

/**
 * 순차 렌더링 옵션
 */
export interface SequentialRenderOptions {
  delayMs?: number              // Delay between each model (default: 50ms)
  onProgress?: (current: number, total: number) => void  // Progress callback
  onComplete?: () => void       // Completion callback
}

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

/**
 * 캐시된 터레인 높이 조회
 */
function getCachedTerrainHeight(longitude: number, latitude: number): number {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`
  return terrainHeightCache.get(key) || 0
}

/**
 * 터레인 높이 샘플링 및 캐싱
 */
async function sampleTerrainHeights(glbDataList: SimulationGlbData[]): Promise<void> {
  try {
    const viewer = getViewer()
    if (!viewer?.terrainProvider || glbDataList.length === 0) return

    // 중복 제거된 좌표 목록 생성
    const uniqueCoords = new Map<string, { longitude: number; latitude: number }>()
    glbDataList.forEach(data => {
      const key = `${data.longitude.toFixed(6)}_${data.latitude.toFixed(6)}`
      if (!uniqueCoords.has(key)) {
        uniqueCoords.set(key, { longitude: data.longitude, latitude: data.latitude })
      }
    })

    // Cartographic 변환
    const positions = Array.from(uniqueCoords.values()).map(coord =>
      Cartographic.fromDegrees(coord.longitude, coord.latitude)
    )

    // 터레인 샘플링
    const sampledPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions)

    // 캐시 저장
    sampledPositions.forEach((position, index) => {
      const coord = Array.from(uniqueCoords.values())[index]
      const key = `${coord.longitude.toFixed(6)}_${coord.latitude.toFixed(6)}`
      terrainHeightCache.set(key, position.height || 0)
    })

    console.log(`[simulationGlbRenderer] Sampled terrain heights for ${uniqueCoords.size} unique positions`)
  } catch (error) {
    console.error('[simulationGlbRenderer] Terrain sampling failed:', error)
  }
}

/**
 * 단일 GLB Entity 생성
 */
function createGlbEntity(data: SimulationGlbData): Entity {
  const {
    id,
    glbUrl,
    longitude,
    latitude,
    height,
  } = data

  //샘플 바람길이 잘안보여서 스타일 조정
  return new Entity({
    id: `simulation_glb_${id}`,
    name: `Simulation GLB ${id}`,
    position: new ConstantPositionProperty(Cartesian3.fromDegrees(longitude, latitude, height)),
    model: new ModelGraphics({
      uri: glbUrl,
      scale: 10.0,
      minimumPixelSize: 128,
      maximumScale: 256,
      colorBlendMode: ColorBlendMode.HIGHLIGHT,
      heightReference: HeightReference.NONE,
    })
  })
}

/**
 * GLB 모델을 순차적으로 렌더링 (애니메이션 효과)
 */
export async function renderSimulationGlbsSequentially(
  glbDataList: SimulationGlbData[],
  options: SequentialRenderOptions = {}
): Promise<void> {
  const viewer = getViewer()
  if (!viewer) return

  const { delayMs = 5, onProgress, onComplete } = options

  // 기존 DataSource 제거 후 새로 생성
  removeDataSource(DATASOURCE_NAME)
  const dataSource = createDataSource(DATASOURCE_NAME)

  // 터레인 높이 샘플링 (렌더링 전 일괄 처리)
  await sampleTerrainHeights(glbDataList)

  // 순차적으로 Entity 추가
  for (let i = 0; i < glbDataList.length; i++) {
    const data = glbDataList[i]

    // 터레인 높이 + 추가 높이 (600m) 적용
    const terrainHeight = getCachedTerrainHeight(data.longitude, data.latitude)
    const entityData = {
      ...data,
      height: terrainHeight + 600
    }

    const entity = createGlbEntity(entityData)
    dataSource.entities.add(entity)

    // Progress callback
    if (onProgress) {
      onProgress(i + 1, glbDataList.length)
    }

    // 다음 모델까지 대기 (마지막 모델은 대기 불필요)
    if (i < glbDataList.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  console.log(`[simulationGlbRenderer] Sequentially rendered ${glbDataList.length} GLB models`)

  // Completion callback
  if (onComplete) {
    onComplete()
  }
}

/**
 * 모든 시뮬레이션 GLB 모델 제거
 */
export function clearSimulationGlbs(): void {
  removeDataSource(DATASOURCE_NAME)
  terrainHeightCache.clear()
  console.log('[simulationGlbRenderer] Cleared all simulation GLB models')
}

/**
 * 렌더링된 GLB 모델 수 반환
 */
export function getSimulationGlbCount(): number {
  const dataSource = findDataSource(DATASOURCE_NAME)
  return dataSource ? dataSource.entities.values.length : 0
}


/**
 * 하드코딩된 GLB 데이터 생성 (백엔드 작업 전 임시)
 * public/openfoam/Windroad_0001.glb ~ Windroad_0666.glb
 *
 * @param centerLongitude - 중심 경도 (기본값: 129.0634)
 * @param centerLatitude - 중심 위도 (기본값: 35.1598)
 */
export function generateGlbData(
  centerLongitude: number = 129.0634,
  centerLatitude: number = 35.1598,
): SimulationGlbData[] {
  const basePath = import.meta.env.VITE_BASE_PATH || '/'
  const glbDataList: SimulationGlbData[] = []
  const resultPath = 'openfoam'//simulationStore.simulationDetail?.resultPath;
  const totalCount = 666; //simulationStore.simulationDetail?.glbCount ?
  for (let i = 1; i <= totalCount; i++) {
    const paddedNumber = String(i).padStart(4, '0')

    glbDataList.push({
      id: `windroad_${paddedNumber}`,
      glbUrl: `${basePath}${resultPath}/Windroad_${paddedNumber}.glb`,
      longitude: centerLongitude,
      latitude: centerLatitude,
    })
  }

  return glbDataList
}
