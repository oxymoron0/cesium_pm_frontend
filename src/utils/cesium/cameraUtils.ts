import { Cartesian3, HeadingPitchRange, Math as CesiumMath, Model, PerspectiveFrustum } from 'cesium';

/**
 * Camera Utilities
 * Cesium 카메라 제어 전용 유틸리티
 */

/**
 * 정류장 선택 시 카메라를 해당 위치로 즉시 이동
 * @param longitude - 경도
 * @param latitude - 위도
 * @param height - 지면으로부터의 높이 (기본값: 250m)
 */
export function flyToStation(longitude: number, latitude: number, height: number = 250): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: any }).cviewer;
    if (!viewer || !viewer.camera) {
      console.warn('[flyToStation] Cesium viewer or camera not available');
      return;
    }

    // 목표 위치 설정 (지면에서 250m 위)
    const destination = Cartesian3.fromDegrees(longitude, latitude, height);

    // 즉시 이동 (duration: 0)
    viewer.camera.flyTo({
      destination: destination,
      duration: 0, // 즉시 이동
      complete: () => {
        console.log(`[flyToStation] Camera moved to station at (${longitude}, ${latitude}) height: ${height}m`);
      }
    });

  } catch (error) {
    console.error('[flyToStation] Failed to move camera:', error);
  }
}

/**
 * 정류장 위치로 부드럽게 이동 (애니메이션 있음)
 * @param longitude - 경도
 * @param latitude - 위도
 * @param height - 지면으로부터의 높이 (기본값: 250m)
 * @param duration - 이동 시간 (초, 기본값: 2초)
 */
export function flyToStationSmooth(
  longitude: number,
  latitude: number,
  height: number = 250,
  duration: number = 2
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: any }).cviewer;
    if (!viewer || !viewer.camera) {
      console.warn('[flyToStationSmooth] Cesium viewer or camera not available');
      return;
    }

    const destination = Cartesian3.fromDegrees(longitude, latitude, height);

    viewer.camera.flyTo({
      destination: destination,
      duration: duration,
      complete: () => {
        console.log(`[flyToStationSmooth] Camera animated to station at (${longitude}, ${latitude}) height: ${height}m`);
      }
    });

  } catch (error) {
    console.error('[flyToStationSmooth] Failed to animate camera:', error);
  }
}

/**
 * 검색 정류장 Feature에서 위치 추출하여 카메라 이동
 * @param stationFeatures - 검색 결과 정류장 Features
 * @param stationId - 이동할 정류장 ID
 * @param height - 지면으로부터의 높이 (기본값: 250m)
 */
export function flyToSearchStation(
  stationFeatures: Array<{ properties: { station_id: string }; geometry: { coordinates: [number, number] } }>,
  stationId: string,
  height: number = 250
): void {
  try {
    const targetStation = stationFeatures.find(
      feature => feature.properties.station_id === stationId
    );

    if (!targetStation) {
      console.warn(`[flyToSearchStation] Station not found: ${stationId}`);
      return;
    }

    const [longitude, latitude] = targetStation.geometry.coordinates;
    flyToStation(longitude, latitude, height);

  } catch (error) {
    console.error('[flyToSearchStation] Failed to find and fly to station:', error);
  }
}

/**
 * 취약시설 선택 시 카메라를 해당 위치로 부드럽게 이동
 * @param longitude - 경도
 * @param latitude - 위도
 * @param height - 지면으로부터의 높이 (기본값: 300m)
 * @param duration - 이동 시간 (초, 기본값: 1초)
 */
export function flyToFacility(
  longitude: number,
  latitude: number,
  height: number = 300,
  duration: number = 1
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: any }).cviewer;
    if (!viewer || !viewer.camera) {
      console.warn('[flyToFacility] Cesium viewer or camera not available');
      return;
    }

    const destination = Cartesian3.fromDegrees(longitude, latitude, height);

    viewer.camera.flyTo({
      destination: destination,
      duration: duration,
      complete: () => {
        console.log(`[flyToFacility] Camera moved to facility at (${longitude}, ${latitude}) height: ${height}m`);
      }
    });

  } catch (error) {
    console.error('[flyToFacility] Failed to move camera:', error);
  }
}

/**
 * 모델의 BoundingSphere를 기반으로 최적의 뷰로 비행하는 내부 함수.
 * 코드 중복을 방지하고 Model.ready 상태에 따라 호출됩니다.
 */
export function flyToBoundingSphere(model: Model, duration: number, pitch: number, rangeMultiplier: number, minRange: number): void {
    const viewer = window.cviewer;
    
    if (!viewer || !viewer.camera) {
      console.warn('[flyToBoundingSphere] Cesium viewer or camera not available');
      return;
    }
  if (!model.boundingSphere) {
    console.warn('[GLB Camera] 모델의 BoundingSphere가 없습니다. 카메라 이동을 스킵합니다.');
    return;
  }

  const { boundingSphere } = model;
  const radius = boundingSphere.radius;

  // 1. 모델을 화면에 꽉 채우기 위한 최소 거리 계산 (삼각법)
  let fov: number;

  // 타입 가드(Type Guard) 추가
  // 카메라의 frustum이 PerspectiveFrustum 타입인지 확인합니다.
  if (viewer.camera.frustum instanceof PerspectiveFrustum) {
    fov = viewer.camera.frustum.fov;
  } else {
    // 만약 2D 뷰와 같이 다른 모드일 경우, 기본값(e.g., 60도)을 사용합니다.
    // 이는 런타임 에러를 방지하는 안전장치입니다.
    console.warn("[GLB Camera] 카메라가 Perspective 모드가 아닙니다. 기본 FOV(60도)를 사용합니다.");
    fov = CesiumMath.toRadians(60.0);
  }
  const distance = radius / Math.sin(fov / 2);

  // 2. 계산된 거리에 배율을 적용하고, 최소 거리를 보장하여 최종 range 결정
  const range = Math.max(distance * rangeMultiplier, minRange);

  console.log(`[GLB Camera] 동적 거리 계산 완료. 최종 Range: ${range.toFixed(2)}m`);

  // 3. camera.flyToBoundingSphere를 사용하여 정밀하게 비행
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: duration,
    offset: new HeadingPitchRange(
      0, // Heading: 북쪽 방향에서 바라봄 (0도)
      CesiumMath.toRadians(pitch), // Pitch: 지정된 각도로 기울임
      range // Range: 동적으로 계산된 최종 거리
    ),
  });
}