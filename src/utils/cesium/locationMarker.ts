import { createDataSource, removeDataSource } from './datasources';
import {
  Cartesian3,
  Entity,
  BillboardGraphics,
  ConstantProperty,
  ConstantPositionProperty,
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
 * 선택된 위치에 마커 렌더링 또는 업데이트
 * @param longitude - 경도
 * @param latitude - 위도
 * @param height - 높이 (옵션, 기본값 0)
 */
export async function renderLocationMarker(longitude: number, latitude: number, height: number = 0): Promise<void> {
  const viewer = getViewer();
  if (!viewer) return;

  try {
    const basePath = import.meta.env.VITE_BASE_PATH || '/';
    const MARKER_ENTITY_ID = 'simulation_location_marker';

    // 높이 포함한 정확한 3D 좌표 생성
    const position = Cartesian3.fromDegrees(longitude, latitude, height);

    // 기존 DataSource 찾기
    let dataSource = viewer.dataSources.getByName(DATASOURCE_NAME)[0];

    if (!dataSource) {
      // DataSource가 없으면 새로 생성
      dataSource = createDataSource(DATASOURCE_NAME);
    }

    // 기존 마커 Entity 찾기
    let entity = dataSource.entities.getById(MARKER_ENTITY_ID);

    if (entity) {
      // 기존 마커가 있으면 좌표만 업데이트
      entity.position = new ConstantPositionProperty(position);
      entity.description = new ConstantProperty(
        `<div style="font-family: Pretendard;">` +
        `<h3>선택된 위치</h3>` +
        `<p><strong>경도:</strong> ${longitude.toFixed(6)}</p>` +
        `<p><strong>위도:</strong> ${latitude.toFixed(6)}</p>` +
        `<p><strong>높이:</strong> ${height.toFixed(2)}m</p>` +
        `</div>`
      );
      console.log(`[renderLocationMarker] Marker position updated to [${longitude.toFixed(6)}, ${latitude.toFixed(6)}, ${height.toFixed(2)}m]`);
    } else {
      // 마커가 없으면 새로 생성
      entity = new Entity({
        id: MARKER_ENTITY_ID,
        name: '선택된 위치',
        position: position,
        billboard: new BillboardGraphics({
          image: new ConstantProperty(`${basePath}icon/marker.svg`),
          sizeInMeters: new ConstantProperty(false),
          width: new ConstantProperty(32),
          height: new ConstantProperty(32),
          heightReference: new ConstantProperty(HeightReference.NONE),
          verticalOrigin: new ConstantProperty(1), // BOTTOM
          disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY)
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
      console.log(`[renderLocationMarker] Marker created at [${longitude.toFixed(6)}, ${latitude.toFixed(6)}, ${height.toFixed(2)}m]`);
    }

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
