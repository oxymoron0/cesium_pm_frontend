/**
 * JSON 프레임별 렌더러 (Cloud/Density Style - Safe Mode)
 */
import { Color, Cartesian3, PointPrimitiveCollection, NearFarScalar } from 'cesium';
import { getCachedJsonFrameData } from './jsonPreloader';
import { createPrimitiveGroup, addPrimitive, removePrimitiveGroup, clearPrimitiveGroup, findPrimitiveGroup } from './primitives';

const JSON_PRIMITIVE_GROUP_NAME = 'simulation_json_result';

// 파티클 설정
export const particleSettings = {
  opacity: 0.8,         // [TEST] 0.01 → 0.8: 선명하게 보이도록 불투명도 증가
  autoScale: false,     // [TEST] true → false: 거리별 크기 조정 비활성화
  nearDistance: 0,
  nearScale: 1.0,       // [TEST] 비활성화됨
  farDistance: 8000,
  farScale: 1.0,        // [TEST] 비활성화됨
  // 시각적 효과 개선을 위한 추가 설정
  contrast: 1.5,        // [TEST] 4.0 → 1.5: 선명도 위해 대비 완화
  sizeSensitivity: 0.0, // [TEST] 1.0 → 0.0: 크기 변화 없음 (고정 크기)
  sizeMultiplier: 0.3,  // [TEST] 기본 크기 배율 (1.0 = 원본, 0.3 = 30% 크기)
  alphaMultiplier: 1.0, // [TEST] 2.0 → 1.0: 부스트 제거
  threshold: 0.1,       // 렌더링 최소 임계값 (이 값 이하의 alpha를 가진 데이터는 렌더링 안함)

  // 스파클(Sparkle) 효과 설정: 고농도 지역이 반짝거림
  sparkleEnabled: false, // [TEST] true → false: 반짝임 비활성화
  sparkleThreshold: 0.4, // 이 값 이상의 농도에서만 반짝임 (0.0 ~ 1.0)
  sparkleSpeed: 0.4,     // 반짝임 속도
  sparkleIntensity: 0.05  // 반짝임 강도 (알파값 변화폭 +/-)
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
    // 임계값 처리
    if (point.color.a < particleSettings.threshold) {
      continue;
    }

    const position = point.position ?? Cartesian3.fromDegrees(point.lon, point.lat, point.height);
    const intensity = point.color.a; // 0.0 ~ 1.0
    
    // 1. 불투명도 대비(Contrast) 적용: 강한 신호는 더 진하게, 약한 신호는 더 흐리게 (Power curve)
    // contrast가 1보다 크면 낮은 값은 더 급격히 줄어듦
    const contrastAlpha = Math.pow(intensity, particleSettings.contrast);
    
    // 2. 최종 알파값 계산 (기본 opacity * 대비 적용된 알파 * 부스팅)
    // clamp to 0.0 ~ 1.0
    let finalAlpha = Math.min(1.0, contrastAlpha * particleSettings.opacity * particleSettings.alphaMultiplier);

    // 스파클(Sparkle) 효과 적용
    if (particleSettings.sparkleEnabled && intensity >= particleSettings.sparkleThreshold) {
      // 모든 입자가 동시에 반짝이도록 위치 기반 오프셋 제거
      const wave = Math.sin(frameIndex * particleSettings.sparkleSpeed);
      
      // 강도 조절: 1.0을 기준으로 +/- sparkleIntensity 만큼 변동
      // 예: 0.4 강도면 0.6 ~ 1.4 배율 적용
      const sparkleFactor = 1.0 + (wave * particleSettings.sparkleIntensity);
      
      finalAlpha *= sparkleFactor;
      finalAlpha = Math.min(1.0, Math.max(0.0, finalAlpha)); // 클램핑
    }

    // JSON에서 제공된 색상 사용 (RGB + alpha)
    const color = new Color(
      1.0,//point.color.r,
      1.0,//point.color.g,
      1.0,//point.color.b,
      finalAlpha
    );

    // 3. 크기 가중치 적용: 강도가 높을수록 점을 더 크게 그림
    // sizeSensitivity가 0이면 원래 pointSize 사용
    const scaleFactor = 1.0 + (intensity * particleSettings.sizeSensitivity);
    const finalPixelSize = pointSize * scaleFactor * particleSettings.sizeMultiplier;

    primitiveCollection.add({
      position: position,
      pixelSize: finalPixelSize,
      color: color,
      // alpha가 높을수록 윤곽선을 더 뚜렷하게
      outlineColor: Color.BLACK.withAlpha(finalAlpha * 0.8),
      outlineWidth: finalAlpha > 0.3 ? 1 : 0,
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

  console.log(`✅ Frame ${frameIndex} (Fog): ${dataPoints.length} points rendered`);
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