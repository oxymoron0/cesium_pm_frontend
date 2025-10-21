import { createDataSource, removeDataSource } from './datasources';
import {
  Cartesian3,
  Entity,
  BillboardGraphics,
  ConstantProperty,
  HeightReference
} from 'cesium';

/**
 * Location Marker Renderer
 * 시뮬레이션 위치 선택 시 마커 표시 (주소 검색 및 직접 위치 지정 공통 사용)
 */

const DATASOURCE_NAME = 'simulation_location_marker';

/**
 * Cesium viewer 가용성 체크
 */
function getViewer() {
  const viewer = window.cviewer;
  if (!viewer) {
    console.warn('[locationMarker] Cesium viewer not available');
    return null;
  }
  return viewer;
}

/**
 * 선택된 위치에 마커 렌더링
 * @param longitude - 경도
 * @param latitude - 위도
 * @param height - 높이 (옵션, 기본값 0)
 */
export async function renderLocationMarker(longitude: number, latitude: number, height: number = 0): Promise<void> {
  const viewer = getViewer();
  if (!viewer) return;

  try {
    // 기존 마커 제거
    removeDataSource(DATASOURCE_NAME);

    // 새 DataSource 생성
    const dataSource = createDataSource(DATASOURCE_NAME);

    const basePath = import.meta.env.VITE_BASE_PATH || '/';

    // 높이 포함한 정확한 3D 좌표 생성
    const position = Cartesian3.fromDegrees(longitude, latitude, height);

    // 마커 Entity 생성 (marker.svg 아이콘 사용)
    const entity = new Entity({
      id: 'simulation_location_marker',
      name: '선택된 위치',
      position: position,
      billboard: new BillboardGraphics({
        image: new ConstantProperty(`${basePath}icon/marker.svg`),
        sizeInMeters: new ConstantProperty(false),
        width: new ConstantProperty(32),
        height: new ConstantProperty(32),
        heightReference: new ConstantProperty(HeightReference.NONE), // NONE - 전달받은 높이 그대로 사용
        verticalOrigin: new ConstantProperty(1), // BOTTOM
        disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY) // 항상 보이도록
      }),
      description: new ConstantProperty(
        `<div style="font-family: Pretendard;">` +
        `<h3>선택된 위치</h3>` +
        `<p><strong>경도:</strong> ${longitude.toFixed(6)}</p>` +
        `<p><strong>위도:</strong> ${latitude.toFixed(6)}</p>` +
        `<p><strong>높이:</strong> ${height.toFixed(2)}m</p>` +
        `</div>`
      )
    });

    dataSource.entities.add(entity);

    console.log(`[renderLocationMarker] Marker rendered at [${longitude.toFixed(6)}, ${latitude.toFixed(6)}, ${height.toFixed(2)}m]`);

  } catch (error) {
    console.error('[renderLocationMarker] Failed to render marker:', error);
  }
}

/**
 * 위치 마커 제거
 */
export function clearLocationMarker(): void {
  try {
    removeDataSource(DATASOURCE_NAME);
    console.log('[clearLocationMarker] Location marker cleared');
  } catch (error) {
    console.error('[clearLocationMarker] Failed to clear marker:', error);
  }
}
