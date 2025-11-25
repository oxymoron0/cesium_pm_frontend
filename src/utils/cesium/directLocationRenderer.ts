import { simulationStore } from '@/stores/SimulationStore';
import {
  Cartographic,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Cartesian2,
  Cartesian3
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
    // 깊이 테스트 활성화
    if (!viewer.scene.globe.depthTestAgainstTerrain) {
      viewer.scene.globe.depthTestAgainstTerrain = true;
    }

    // ScreenSpaceEventHandler 생성
    clickEventHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    clickEventHandler.setInputAction((movement: { position: Cartesian2 }) => {
      try {
        let cartesian: Cartesian3 | undefined;

        // 1. 마우스 위치에 3D 객체(건물, 모델 등)가 있는지 먼저 확인
        const pickedObject = viewer.scene.pick(movement.position);

        if (defined(pickedObject)) {
          // Case A: 3D 건물/모델을 클릭함 -> pickPosition 사용
          // pickPosition은 화면 픽셀의 깊이값을 사용하므로 건물 선택에 유리합니다.
          cartesian = viewer.scene.pickPosition(movement.position);
        } else {
          // Case B: 맨땅(지형)을 클릭함 -> Ray Casting 사용
          // 카메라에서 광선을 쏘아 지형과 만나는 점을 수학적으로 계산합니다.
          // 줌 레벨이나 카메라 각도에 상관없이 항상 지형 표면을 정확히 잡아냅니다.
          const ray = viewer.camera.getPickRay(movement.position);
          if (ray) {
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          }
        }

        // Case C: 위 방법들이 실패했을 경우 (허공 등) -> 타원체 기준 (Fallback)
        if (!defined(cartesian)) {
          cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
        }

        // 최종 좌표 변환 및 저장
        if (defined(cartesian)) {
          const cartographic = Cartographic.fromCartesian(cartesian);
          const longitude = CesiumMath.toDegrees(cartographic.longitude);
          const latitude = CesiumMath.toDegrees(cartographic.latitude);
          
          // 높이(Height) 값은 로그로 확인 가능 (검증용)
          // console.log(`[DirectLocation] Height: ${cartographic.height.toFixed(2)}m`);

          simulationStore.addDirectLocationResult(latitude, longitude);
        }
      } catch (error) {
        console.error('[directLocationRenderer] Click error:', error);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    isClickHandlerActive = true;
    console.log('[directLocationRenderer] Handler Enabled');

  } catch (error) {
    console.error('[directLocationRenderer] Failed to enable:', error);
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
    
    // 지형 깊이 테스트 끄기
    const viewer = getViewer();
    if(viewer) {
      viewer.scene.globe.depthTestAgainstTerrain = false;
      console.log('[directLocationRenderer] DepthTest disabled');
    }

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
