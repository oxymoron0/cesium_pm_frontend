import { simulationStore } from '@/stores/SimulationStore';
import { renderLocationMarker } from './locationMarker';
import {
  Cartographic,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Cartesian2
} from 'cesium';

/**
 * Direct Location Selection Renderer
 * 시뮬레이션 직접 위치 지정을 위한 Cesium 클릭 이벤트 핸들러
 */

let clickEventHandler: ScreenSpaceEventHandler | null = null;
let isClickHandlerActive = false;

/**
 * Cesium viewer 가용성 체크
 */
function getViewer() {
  const viewer = window.cviewer;
  if (!viewer) {
    console.warn('[directLocationRenderer] Cesium viewer not available');
    return null;
  }
  return viewer;
}

/**
 * 직접 위치 지정 모드 활성화
 * 지도 클릭 이벤트 핸들러 등록
 */
export function enableDirectLocationClickHandler(): void {
  if (isClickHandlerActive) {
    console.log('[enableDirectLocationClickHandler] Click handler already active');
    return;
  }

  const viewer = getViewer();
  if (!viewer) return;

  try {
    // ScreenSpaceEventHandler 생성
    clickEventHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    // LEFT_CLICK 이벤트 등록
    clickEventHandler.setInputAction((movement: { position: Cartesian2 }) => {
      try {
        // scene.globe.pick을 사용해서 지구 표면과 ray의 교차점을 직접 계산
        const ray = viewer.camera.getPickRay(movement.position);
        if (!ray) {
          console.warn('[directLocationRenderer] Failed to get pick ray');
          return;
        }

        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);

        if (!defined(cartesian)) {
          console.warn('[directLocationRenderer] Failed to pick position on globe');
          return;
        }

        // Cartesian3 → Cartographic → 경위도 변환
        const cartographic = Cartographic.fromCartesian(cartesian);
        const longitude = CesiumMath.toDegrees(cartographic.longitude);
        const latitude = CesiumMath.toDegrees(cartographic.latitude);
        const height = cartographic.height;

        console.log(`[directLocationRenderer] Clicked location: [${longitude.toFixed(6)}, ${latitude.toFixed(6)}, ${height.toFixed(2)}m]`);

        // SimulationStore에 위치 추가
        simulationStore.addDirectLocationResult(latitude, longitude);

        // 마커 렌더링 (경위도 + 높이 전달)
        renderLocationMarker(longitude, latitude, height);

      } catch (error) {
        console.error('[directLocationRenderer] Click handler error:', error);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    isClickHandlerActive = true;
    console.log('[enableDirectLocationClickHandler] Direct location click handler enabled');

  } catch (error) {
    console.error('[enableDirectLocationClickHandler] Failed to setup click handler:', error);
  }
}

/**
 * 직접 위치 지정 모드 비활성화
 * 클릭 이벤트 핸들러 제거 (마커는 유지)
 */
export function disableDirectLocationClickHandler(): void {
  if (!isClickHandlerActive || !clickEventHandler) {
    console.log('[disableDirectLocationClickHandler] Click handler not active');
    return;
  }

  try {
    // ScreenSpaceEventHandler 정리
    clickEventHandler.destroy();
    clickEventHandler = null;
    isClickHandlerActive = false;

    // 마커는 제거하지 않음 - 화면 전환 시에도 유지되어야 함

    console.log('[disableDirectLocationClickHandler] Direct location click handler disabled');

  } catch (error) {
    console.error('[disableDirectLocationClickHandler] Failed to disable click handler:', error);
  }
}

/**
 * 클릭 핸들러 활성화 상태 확인
 */
export function isClickHandlerEnabled(): boolean {
  return isClickHandlerActive;
}
