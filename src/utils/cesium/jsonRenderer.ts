/**
 * JSON 프레임별 렌더러
 */
import { Color, Cartesian3, PointPrimitiveCollection, NearFarScalar } from 'cesium';
import { getCachedJsonFrameData } from './jsonPreloader';
import { createPrimitiveGroup, addPrimitive, removePrimitiveGroup, clearPrimitiveGroup, findPrimitiveGroup } from './primitives';

const JSON_PRIMITIVE_GROUP_NAME = 'simulation_json_result';

// 파티클 설정
export const particleSettings = {
  opacity: 0.036,
  autoScale: true,
  nearDistance: 0,
  nearScale: 45.0,
  farDistance: 8000,
  farScale: 2.7
};

/**
 * 파티클 설정 업데이트
 */
export function updateParticleSettings(newSettings: Partial<typeof particleSettings>): void {
  Object.assign(particleSettings, newSettings);
}

/**
 * 현재 파티클 설정 가져오기
 */
export function getParticleSettings(): typeof particleSettings {
  return { ...particleSettings };
}

/**
 * 특정 프레임 렌더링
 */
export function renderJsonFrame(uuid: string, frameIndex: number): boolean {
  const viewer = window.cviewer;
  if (!viewer) {
    console.error('❌ Cesium viewer not found');
    return false;
  }

  // 그룹 확인 및 정리
  if (!findPrimitiveGroup(JSON_PRIMITIVE_GROUP_NAME)) {
    try {
      createPrimitiveGroup(JSON_PRIMITIVE_GROUP_NAME);
    } catch (e) {
      console.warn('Failed to create primitive group:', e);
    }
  } else {
    clearPrimitiveGroup(JSON_PRIMITIVE_GROUP_NAME);
  }

  const frameData = getCachedJsonFrameData(uuid, frameIndex);
  if (!frameData || frameData.dataPoints.length === 0) {
    console.warn(`⚠️ No data for frame ${frameIndex}`);
    return false;
  }

  const { dataPoints, pointSize } = frameData;

  const primitiveCollection = new PointPrimitiveCollection();

  for (const point of dataPoints) {
    const position = point.position ?? Cartesian3.fromDegrees(point.lon, point.lat, point.height);

    // JSON에서 제공된 색상 사용 (RGB + alpha)
    const color = new Color(
      point.color.r,
      point.color.g,
      point.color.b,
      point.color.a * particleSettings.opacity
    );

    primitiveCollection.add({
      position: position,
      pixelSize: pointSize,
      color: color,
      outlineColor: Color.BLACK.withAlpha(color.alpha * 0.5),
      outlineWidth: color.alpha > 0.7 ? 1 : 0,
      scaleByDistance: particleSettings.autoScale
        ? new NearFarScalar(
            particleSettings.nearDistance,
            particleSettings.nearScale,
            particleSettings.farDistance,
            particleSettings.farScale
          )
        : undefined,
      disableDepthTestDistance: 0
    });
  }

  // Primitives 유틸리티를 사용하여 추가
  addPrimitive(JSON_PRIMITIVE_GROUP_NAME, primitiveCollection);

  console.log(`✅ Frame ${frameIndex}: ${dataPoints.length} primitives rendered`);
  return true;
}

/**
 * Primitives 제거
 */
export function clearJsonPrimitives(): void {
  removePrimitiveGroup(JSON_PRIMITIVE_GROUP_NAME);
}

/**
 * 첫 프레임 렌더링 및 카메라 이동
 */
export function renderJsonFrameWithFly(uuid: string, frameIndex: number): boolean {
  const viewer = window.cviewer;
  if (!viewer) return false;

  const frameData = getCachedJsonFrameData(uuid, frameIndex);
  if (!frameData || frameData.dataPoints.length === 0) return false;

  const success = renderJsonFrame(uuid, frameIndex);
  if (!success) return false;

  const dataPoints = frameData.dataPoints;

  // 카메라 이동 (bounding box 계산)
  let minLon = dataPoints[0].lon;
  let maxLon = dataPoints[0].lon;
  let minLat = dataPoints[0].lat;
  let maxLat = dataPoints[0].lat;

  for (const point of dataPoints) {
    if (point.lon < minLon) minLon = point.lon;
    if (point.lon > maxLon) maxLon = point.lon;
    if (point.lat < minLat) minLat = point.lat;
    if (point.lat > maxLat) maxLat = point.lat;
  }

  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const widthDegrees = maxLon - minLon;
  const heightDegrees = maxLat - minLat;
  const distance = Math.max(widthDegrees, heightDegrees) * 111000 * 2;

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(centerLon, centerLat, distance),
    duration: 2
  });

  return true;
}
