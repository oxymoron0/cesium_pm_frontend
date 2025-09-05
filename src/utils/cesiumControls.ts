import { Color, Cartesian3, Cartesian2, HeightReference, LabelStyle, VerticalOrigin } from 'cesium';

/**
 * Cesium Viewer 제어 함수들
 * window.cviewer를 인자로 받아 다양한 Cesium 조작 수행
 */

/**
 * 테스트 마커 추가 및 카메라 이동
 * @param viewer - Cesium Viewer 인스턴스 (window.cviewer)
 */
export const addTestMarker = (viewer: any) => {
  try {
    console.log('[PM Frontend] 테스트 마커 추가 시작');

    // 부산 좌표에 테스트 마커 추가
    const entity = viewer.entities.add({
      name: 'PM Frontend Test Marker',
      position: Cartesian3.fromDegrees(129.0756, 35.1796, 0), // 부산 좌표
      point: {
        pixelSize: 10,
        color: Color.YELLOW,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND
      },
      label: {
        text: 'PM Frontend Connected!',
        font: '12pt sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 1,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -10)
      }
    });

    console.log('[PM Frontend] 테스트 마커 추가 성공:', entity);

    // 해당 위치로 카메라 이동
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(129.0756, 35.1796, 1000)
    });

    return entity;
  } catch (error) {
    console.error('[PM Frontend] 테스트 마커 추가 실패:', error);
    throw error;
  }
};

/**
 * 특정 좌표로 카메라 이동
 * @param viewer - Cesium Viewer 인스턴스
 * @param longitude - 경도
 * @param latitude - 위도
 * @param height - 고도
 */
export const flyToLocation = (viewer: any, longitude: number, latitude: number, height: number = 1000) => {
  try {
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(longitude, latitude, height)
    });
    console.log(`[PM Frontend] 카메라 이동: ${longitude}, ${latitude}, ${height}`);
  } catch (error) {
    console.error('[PM Frontend] 카메라 이동 실패:', error);
    throw error;
  }
};

/**
 * 마커 추가
 * @param viewer - Cesium Viewer 인스턴스
 * @param options - 마커 옵션
 */
export const addMarker = (viewer: any, options: {
  name: string;
  longitude: number;
  latitude: number;
  height?: number;
  color?: any;
  text?: string;
}) => {
  try {
    const entity = viewer.entities.add({
      name: options.name,
      position: Cartesian3.fromDegrees(options.longitude, options.latitude, (options.height || 0) + 20),
      point: {
        pixelSize: 10,
        color: options.color || Color.YELLOW,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND
      },
      label: options.text ? {
        text: options.text,
        font: '12pt sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 1,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -10)
      } : undefined
    });

    console.log(`[PM Frontend] 마커 추가 성공: ${options.name}`);
    return entity;
  } catch (error) {
    console.error('[PM Frontend] 마커 추가 실패:', error);
    throw error;
  }
};

/**
 * 모든 엔티티 제거
 * @param viewer - Cesium Viewer 인스턴스
 */
export const clearAllEntities = (viewer: any) => {
  try {
    viewer.entities.removeAll();
    console.log('[PM Frontend] 모든 엔티티 제거 완료');
  } catch (error) {
    console.error('[PM Frontend] 엔티티 제거 실패:', error);
    throw error;
  }
};

// 중복 초기화 방지 플래그
let isInitialized = false;

/**
 * PM Frontend 초기화 - 부모/자식 환경 감지 및 테스트 마커 추가
 * @param delay - 초기화 지연 시간 (ms)
 */
export const initializePMFrontend = (delay: number = 1000) => {
  if (isInitialized) {
    console.log('[PM Frontend] 이미 초기화됨, 중복 실행 방지');
    return;
  }

  setTimeout(() => {
    const viewer = (window as any).cviewer;
    if (viewer) {
      console.log('[PM Frontend] Cesium Viewer 감지됨, 초기화 시작');
      addTestMarker(viewer);
      isInitialized = true;
    } else {
      console.warn('[PM Frontend] window.cviewer가 아직 준비되지 않음');
    }
  }, delay);
};