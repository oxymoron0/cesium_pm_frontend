/**
 * JSON 프레임별 렌더러 (Cloud/Density Style - Safe Mode)
 */
import { Color, Cartesian3, PointPrimitiveCollection, NearFarScalar } from 'cesium';
import { getCachedJsonFrameData } from './jsonPreloader';
import { createPrimitiveGroup, addPrimitive, removePrimitiveGroup, clearPrimitiveGroup, findPrimitiveGroup } from './primitives';
import { simulationStore } from '@/stores/SimulationStore';

const JSON_PRIMITIVE_GROUP_NAME = 'simulation_json_result';

// 맞춤실행용 설정 (작은 영역, 고밀도)
export const customParticleSettings = {
  opacity: 0.005,
  autoScale: true,
  nearDistance: 0,
  nearScale: 1.5,
  farDistance: 10000,
  farScale: 0.1,
};

// 빠른실행용 설정 (넓은 영역, 저밀도)
export const quickParticleSettings = {
  opacity: 0.05,
  autoScale: true,
  nearDistance: 0,
  nearScale: 1.5,
  farDistance: 10000,
  farScale: 0.5,
};

// 현재 활성 설정 (UI 컨트롤용)
export const particleSettings = { ...customParticleSettings };


/**
 * currentView에 따라 파티클 설정 초기화
 */
export function initializeParticleSettings(): void {
  const baseSettings = simulationStore.currentView === 'result'
    ? customParticleSettings
    : quickParticleSettings;

  Object.assign(particleSettings, baseSettings);
}

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

  // 그룹 확인 (없으면 생성)
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

  // PointPrimitiveCollection 사용 (안전함)
  const primitiveCollection = new PointPrimitiveCollection();

  for (const point of dataPoints) {
    const position = point.position;

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

  // 장면에 추가
  addPrimitive(JSON_PRIMITIVE_GROUP_NAME, primitiveCollection);

  console.log(`✅ Frame ${frameIndex}: ${dataPoints.length} points rendered`);
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