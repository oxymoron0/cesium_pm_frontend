import { Entity, ModelGraphics, Cartesian3, ColorBlendMode, HeightReference, ConstantPositionProperty, Cartographic, sampleTerrainMostDetailed, Color } from 'cesium'
import { createDataSource, findDataSource, removeDataSource } from './datasources'
import { flyToStationSmooth } from './cameraUtils'

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
  totalCount: number            // Total number of GLB files
  centerLongitude: number       // Center longitude
  centerLatitude: number        // Center latitude
  resultPath: string            // Result path (e.g., 'finedust')
  delayMs?: number              // Delay between each model (default: 500ms)
  signal?: AbortSignal          // AbortSignal for cancellation
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
    color = '#888888', // 기본값: 회색
  } = data

  //샘플 바람길이 잘안보여서 스타일 조정
  return new Entity({
    id: `simulation_glb_${id}`,
    name: `Simulation GLB ${id}`,
    position: new ConstantPositionProperty(Cartesian3.fromDegrees(longitude, latitude, height)),
    model: new ModelGraphics({
      uri: glbUrl,
      scale: 1.0,
      //minimumPixelSize: 128,
      //maximumScale: 256,
      color: Color.fromCssColorString(color),
      colorBlendMode: ColorBlendMode.REPLACE,
      heightReference: HeightReference.NONE,
    })
  })
}

/**
 * GLB 모델을 순차적으로 렌더링 (애니메이션 효과)
 */
export async function renderSimulationGlbsSequentially(
  options: SequentialRenderOptions
): Promise<void> {
  const viewer = getViewer()
  if (!viewer) return

  const {
    totalCount,
    centerLongitude,
    centerLatitude,
    resultPath,
    delayMs = 500,
    signal,
    onProgress,
    onComplete
  } = options

  const basePath = import.meta.env.VITE_BASE_PATH || '/'

  // 카메라를 GLB 위치로 이동
  flyToStationSmooth(centerLongitude, centerLatitude, 4000, 0)

  // 기존 DataSource 제거 후 새로 생성
  removeDataSource(DATASOURCE_NAME)
  const dataSource = createDataSource(DATASOURCE_NAME)

  // 터레인 높이 샘플링 (한 번만 수행)
  let terrainHeight = 0
  const key = `${centerLongitude.toFixed(6)}_${centerLatitude.toFixed(6)}`

  // 캐시 확인
  if (terrainHeightCache.has(key)) {
    terrainHeight = terrainHeightCache.get(key) || 0
  } else {
    // 터레인 샘플링
    const dummyData = { longitude: centerLongitude, latitude: centerLatitude }
    await sampleTerrainHeights([dummyData as SimulationGlbData])
    terrainHeight = getCachedTerrainHeight(centerLongitude, centerLatitude)
  }

  // 순차적으로 Entity 교체 (즉석 생성)
  for (let i = 1; i <= totalCount; i++) {
    // 취소 신호 확인
    if (signal?.aborted) {
      console.log(`[simulationGlbRenderer] Rendering aborted at ${i}/${totalCount}`)
      return
    }

    const paddedNumber = String(i).padStart(4, '0')
    const glbUrl = `${basePath}${resultPath}/Finedust_${paddedNumber}.glb`

    // GLB 데이터 즉석 생성
    const glbData: SimulationGlbData = {
      id: `windroad_${paddedNumber}`,
      glbUrl: glbUrl,
      longitude: centerLongitude,
      latitude: centerLatitude,
      height: terrainHeight + 100,
      color: '#888888',
    }

    // 이전 entity 모두 제거
    dataSource.entities.removeAll()

    // 새로운 entity 추가
    const entity = createGlbEntity(glbData)
    dataSource.entities.add(entity)

    // 렌더링 중인 GLB 파일명 출력
    console.log(`[simulationGlbRenderer] Rendering ${i}/${totalCount}: ${glbUrl}`)

    // Progress callback (실시간 업데이트)
    if (onProgress) {
      onProgress(i, totalCount)
    }

    // delay가 0이 아닐 때만 대기
    if (delayMs > 0 && i < totalCount) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  console.log(`[simulationGlbRenderer] Sequentially rendered ${totalCount} GLB models`)

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


