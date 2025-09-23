import { Cartesian3, Math as CesiumMath } from 'cesium';

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