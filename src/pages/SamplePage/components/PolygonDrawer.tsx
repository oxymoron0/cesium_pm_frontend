import { useState } from 'react'
import { ScreenSpaceEventHandler, ScreenSpaceEventType, defined, Cartographic, Math as CesiumMath, Cartesian2, sampleTerrainMostDetailed } from 'cesium'
import { addPolygon, removeAllPolygons, type PolygonPoint } from '../utils/polygonUtils'

/**
 * 간단한 Polygon 그리기 UI 컴포넌트
 * 클릭으로 꼭짓점을 추가하고 Polygon 생성 (지형 높이 자동 샘플링)
 */
export default function PolygonDrawer() {
  const [isDrawing, setIsDrawing] = useState(false)
  const [points, setPoints] = useState<PolygonPoint[]>([])
  const [handler, setHandler] = useState<ScreenSpaceEventHandler | null>(null)

  const startDrawing = () => {
    const viewer = window.cviewer
    if (!viewer) {
      console.error('[PolygonDrawer] Cesium viewer not found')
      return
    }

    setIsDrawing(true)
    setPoints([])

    // ScreenSpaceEventHandler 생성
    const eventHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)

    // 클릭 이벤트 등록 (비동기 처리)
    eventHandler.setInputAction(async (click: { position: Cartesian2 }) => {
      const pickedPosition = viewer.scene.pickPosition(click.position)

      if (defined(pickedPosition)) {
        const cartographic = Cartographic.fromCartesian(pickedPosition)
        const longitude = CesiumMath.toDegrees(cartographic.longitude)
        const latitude = CesiumMath.toDegrees(cartographic.latitude)

        // 지형 높이 샘플링
        const terrainProvider = viewer.terrainProvider
        const cartographicPosition = Cartographic.fromDegrees(longitude, latitude)

        const sampledPositions = await sampleTerrainMostDetailed(
          terrainProvider,
          [cartographicPosition]
        )

        // 샘플링된 높이를 경도, 위도에도 반영
        const sampledLongitude = CesiumMath.toDegrees(sampledPositions[0].longitude)
        const sampledLatitude = CesiumMath.toDegrees(sampledPositions[0].latitude)
        const sampledHeight = sampledPositions[0].height

        setPoints(prev => [...prev, {
          longitude: sampledLongitude,
          latitude: sampledLatitude,
          height: sampledHeight
        }])
        console.log(`[PolygonDrawer] Point added: [${sampledLongitude.toFixed(6)}, ${sampledLatitude.toFixed(6)}, ${sampledHeight.toFixed(2)}m]`)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    setHandler(eventHandler)
  }

  const finishDrawing = () => {
    if (points.length < 3) {
      alert('폴리곤을 생성하려면 최소 3개의 점이 필요합니다.')
      cancelDrawing()
      return
    }

    const polygonId = addPolygon(points, { color: '#00AAFF' })
    console.log(`[PolygonDrawer] Polygon created: ${polygonId}`)

    cleanup()
  }

  const cancelDrawing = () => {
    console.log('[PolygonDrawer] Drawing cancelled')
    cleanup()
  }

  const cleanup = () => {
    if (handler) {
      handler.destroy()
      setHandler(null)
    }
    setIsDrawing(false)
    setPoints([])
  }

  const clearAllPolygons = () => {
    const count = removeAllPolygons()
    console.log(`[PolygonDrawer] Cleared ${count} polygons`)
  }

  return (
    <div className="p-4 space-y-3 border border-purple-500 rounded-lg bg-gray-900/50">
      <div className="pb-2 text-sm font-semibold border-b text-purple-400 border-purple-400/20">
        Polygon 테스트
      </div>

      {!isDrawing ? (
        <div className="space-y-2">
          <button
            onClick={startDrawing}
            className="w-full px-4 py-2 font-medium text-white transition-colors bg-purple-600 rounded hover:bg-purple-700"
          >
            Polygon 그리기 시작
          </button>
          <button
            onClick={clearAllPolygons}
            className="w-full px-4 py-2 font-medium text-white transition-colors bg-red-600 rounded hover:bg-red-700"
          >
            모든 Polygon 제거
          </button>
          <div className="p-2 text-xs rounded bg-gray-800/50 text-gray-400">
            클릭한 위치의 지형 높이가 자동으로 샘플링됩니다.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="p-2 text-sm rounded bg-purple-900/50">
            <div className="font-medium text-purple-300">
              클릭하여 꼭짓점 추가
            </div>
            <div className="text-gray-400">
              현재 점: {points.length}개
            </div>
          </div>
          <button
            onClick={finishDrawing}
            className="w-full px-4 py-2 font-medium text-white transition-colors bg-green-600 rounded hover:bg-green-700"
            disabled={points.length < 3}
          >
            완료 ({points.length}/3)
          </button>
          <button
            onClick={cancelDrawing}
            className="w-full px-4 py-2 font-medium text-white transition-colors bg-gray-600 rounded hover:bg-gray-700"
          >
            취소
          </button>
        </div>
      )}
    </div>
  )
}
