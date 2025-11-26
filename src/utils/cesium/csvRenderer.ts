/* eslint-disable */
// @ts-nocheck
// CSV 프레임별 렌더러

import { Color, Cartesian3, PointPrimitiveCollection, NearFarScalar } from 'cesium';
import {
  getCachedFrameData,
  getPm10RangeInfo,
  type ParticleDataPoint
} from './csvPreloader';

let primitiveCollection: PointPrimitiveCollection | null = null;

// PM10 색상 매핑 (5단계, 동적 구간)
function getPM10Color(pm10Value: number, uuid: string): Color {
  const veryGood = Color.fromBytes(102, 179, 255, 255);  // 하늘색
  const good = Color.fromBytes(51, 255, 128, 255);       // 연두색
  const moderate = Color.fromBytes(255, 255, 51, 255);   // 노란색
  const bad = Color.fromBytes(255, 128, 0, 255);         // 주황색
  const veryBad = Color.fromBytes(255, 26, 51, 255);     // 빨간색

  let color: Color;

  // 범위 정보 가져오기
  const rangeInfo = getPm10RangeInfo(uuid);

  let min: number, max: number;
  if (rangeInfo) {
    min = rangeInfo.min;
    max = rangeInfo.max;
  } else {
    // fallback: 고정 범위
    min = 40;
    max = 60;
  }

  // 5단계 구간 계산
  const range = max - min;
  const step1 = min + range * 0.1;  // 10%
  const step2 = min + range * 0.3;  // 30%
  const step3 = min + range * 0.6;  // 60%
  const step4 = min + range * 0.9;  // 90%

  // 색상 lerp
  if (pm10Value < step1) {
    const t = (pm10Value - min) / (step1 - min);
    color = Color.lerp(veryGood, good, t, new Color());
  } else if (pm10Value < step2) {
    const t = (pm10Value - step1) / (step2 - step1);
    color = Color.lerp(good, moderate, t, new Color());
  } else if (pm10Value < step3) {
    const t = (pm10Value - step2) / (step3 - step2);
    color = Color.lerp(moderate, bad, t, new Color());
  } else if (pm10Value < step4) {
    const t = (pm10Value - step3) / (step4 - step3);
    color = Color.lerp(bad, veryBad, t, new Color());
  } else {
    color = veryBad.clone();
  }

  // 농도에 따른 알파값 (조정된 스타일)
  const normalizedValue = Math.min((pm10Value - min) / range, 1.0);

  // 알파 범위 설정
  const minAlpha = 0.5;  // 낮은 농도
  const maxAlpha = 0.9;  // 높은 농도
  const opacity = 0.6;   // 전역 투명도 (CSV에 적합하게 조정)

  const alphaRange = maxAlpha - minAlpha;
  const alpha = minAlpha + (normalizedValue * alphaRange);
  color.alpha = alpha * opacity;  // 0.3 ~ 0.54

  return color;
}

/**
 * 특정 프레임 렌더링
 */
export function renderCsvFrame(uuid: string, frameIndex: number): boolean {
  const viewer = window.cviewer;
  if (!viewer) {
    console.error(' Cesium viewer not found');
    return false;
  }

  // 기존 primitives 제거
  clearCsvPrimitives();

  // 캐시된 데이터 가져오기
  const dataPoints = getCachedFrameData(uuid, frameIndex);
  if (!dataPoints || dataPoints.length === 0) {
    console.warn(` No data for frame ${frameIndex}`);
    return false;
  }

  // PointPrimitiveCollection 생성
  primitiveCollection = new PointPrimitiveCollection();

  for (const point of dataPoints) {
    const color = getPM10Color(point.pm10_micro, uuid);

    const position = Cartesian3.fromDegrees(
      point.lon,
      point.lat,
      point.height
    );

    primitiveCollection.add({
      position: position,
      pixelSize: 25,
      color: color,
      outlineWidth: 0.0,
      scaleByDistance: new NearFarScalar(0, 20, 5000, 0.6),
      disableDepthTestDistance: 0
    });
  }

  viewer.scene.primitives.add(primitiveCollection);

  console.log(` Frame ${frameIndex}: ${dataPoints.length} primitives rendered`);
  return true;
}

/**
 * Primitives 제거
 */
export function clearCsvPrimitives(): void {
  const viewer = window.cviewer;
  if (!viewer || !primitiveCollection) return;

  viewer.scene.primitives.remove(primitiveCollection);
  primitiveCollection = null;
}

/**
 * 첫 프레임 렌더링 및 카메라 이동
 */
export function renderCsvFrameWithFly(uuid: string, frameIndex: number): boolean {
  const viewer = window.cviewer;
  if (!viewer) return false;

  const dataPoints = getCachedFrameData(uuid, frameIndex);
  if (!dataPoints || dataPoints.length === 0) return false;

  const success = renderCsvFrame(uuid, frameIndex);
  if (!success) return false;

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
