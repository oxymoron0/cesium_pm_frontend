/**
 * Heatmap 렌더러
 * canvas를 사용하여 히트맵 텍스처를 생성하고 Cesium Rectangle에 매핑합니다.
 */

import { Rectangle, ImageMaterialProperty, Entity, CallbackProperty, ClassificationType } from 'cesium';
import { getCachedHeatmapEntry, cacheHeatmapCanvas } from './heatmapPreloader';
import type { HeatmapFrameData } from './heatmapPreloader';

const HEATMAP_ENTITY_ID = 'simulation_heatmap_entity';
let currentEntity: Entity | null = null;
let currentFrameCanvas: HTMLCanvasElement | null = null; // 현재 프레임의 canvas를 저장
let currentRectangle: Rectangle | undefined; // 현재 프레임의 Rectangle 저장

// 히트맵 설정
export const heatmapSettings = {
  resolutionScale: 0.25, // 캔버스 해상도 배율
  radius: 25,           // 포인트 영향 반경 (px)
  blur: 0.9,            // 블러 강도 (0~1)
  maxOpacity: 0.5,      // 최대 불투명도
  minOpacity: 0.0,      // 최소 불투명도
  intensityScale: 0.05  // 값 강조 배율 (0.05 -> 0.12로 상향 조정하여 색상 표현력 회복)
};

export function updateHeatmapSettings(settings: Partial<typeof heatmapSettings>) {
  Object.assign(heatmapSettings, settings);
}

export function getHeatmapSettings() {
  return { ...heatmapSettings };
}

/**
 * 캔버스에 히트맵 그리기
 * @returns HTMLCanvasElement (재사용을 위해 data URL 대신 캔버스 반환)
 */
function drawHeatmapOnCanvas(data: HeatmapFrameData): HTMLCanvasElement | null {
  const { dataPoints, bounds } = data;
  const width = 1024 * heatmapSettings.resolutionScale;
  const height = 1024 * heatmapSettings.resolutionScale;


  
  // 깜빡임 방지를 위해 매번 새로운 캔버스 생성 (Double Buffering 효과)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);

  // 좌표 매핑을 위한 스케일 계산
  const lonRange = bounds.maxLon - bounds.minLon;
  const latRange = bounds.maxLat - bounds.minLat;
  
  // 그림자(포인트) 그리기 (Alpha 채널만 사용)
  // 1. 먼저 흑백으로 강도(Intensity)를 그림
  
  // 최적화: 포인트 이미지를 미리 생성 (Shadow Template)
  const r = heatmapSettings.radius;
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = r * 2;
  shadowCanvas.height = r * 2;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grd = sCtx.createRadialGradient(r, r, r * (1 - heatmapSettings.blur), r, r, r);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grd;
    sCtx.fillRect(0, 0, 2 * r, 2 * r);
  }

  // 각 포인트를 그림
  for (const p of dataPoints) {
    const x = ((p.lon - bounds.minLon) / lonRange) * width;
    const y = (1 - (p.lat - bounds.minLat) / latRange) * height; // Canvas Y는 아래로 갈수록 증가하므로 반전

    // 값에 따라 투명도 조절
    let alpha = p.value * heatmapSettings.intensityScale;

    // 최소 투명도 적용 (0 초과 값은 최소한 minOpacity 이상으로 표시)
    if (alpha > 0 && alpha < heatmapSettings.minOpacity) {
      alpha = heatmapSettings.minOpacity;
    }

    // 최대 투명도 제한
    alpha = Math.min(1, alpha);

    // 최종 투명도 적용
    const finalAlpha = alpha * heatmapSettings.maxOpacity;

    ctx.globalAlpha = finalAlpha;
    ctx.drawImage(shadowCanvas, x - r, y - r);
  }



  // 2. 컬러화 (Colorization) - 최적화 버전
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // 디버깅: 채도 분포 확인
  let maxAlphaFound = 0;
  let pixelCount = 0;
  let saturatedCount = 0;
  let redCount = 0;

  // 색상 팔레트 미리 계산 (256 단계)
  const palette = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const ratio = i / 255;
    let r, g, b, a;

    if (ratio < 0.40) { // Blue: 40%
      // 파랑 (0.0) -> 하늘색 (0.40)
      const t = ratio / 0.40;
      r = Math.floor(0 * (1 - t) + 0 * t);
      g = Math.floor(0 * (1 - t) + 255 * t);
      b = Math.floor(255 * (1 - t) + 255 * t);
      a = Math.floor(ratio * 255);
    } else if (ratio < 0.50) { // Sky Blue: 10%
      // 하늘색 (0.40) -> 진한 초록 (0.50) : G값을 160으로 낮춰 어둡게
      const t = (ratio - 0.40) / 0.10;
      r = 0;
      g = Math.floor(255 * (1 - t) + 160 * t); 
      b = Math.floor(255 * (1 - t) + 0 * t);
      a = 255;
    } else if (ratio < 0.70) { // Green: 20%
      // 진한 초록 (0.50) -> 노랑 (0.70) : G값을 다시 255로 올려 노랑으로
      const t = (ratio - 0.50) / 0.20;
      r = Math.floor(0 * (1 - t) + 255 * t);
      g = Math.floor(160 * (1 - t) + 255 * t);
      b = 0;
      a = 255;
    } else if (ratio < 0.97) { // Yellow: 27% (0.70 -> 0.97)
      // 노랑 (0.70) -> 빨강 (0.97)
      const t = (ratio - 0.70) / 0.27;
      r = 255;
      g = Math.floor(255 * (1 - t) + 0 * t);
      b = 0;
      a = 255;
    } else { // Red: 3% (0.97 -> 1.0)
      // 순수 빨강
      r = 255;
      g = 0;
      b = 0;
      a = 255;
    }

    palette[i * 4] = r;
    palette[i * 4 + 1] = g;
    palette[i * 4 + 2] = b;
    palette[i * 4 + 3] = a;
  }

  // 픽셀에 색상 적용 (빠른 룩업)
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha > 0) {
      if (alpha > maxAlphaFound) maxAlphaFound = alpha;
      pixelCount++;
      if (alpha >= 250) saturatedCount++;
      
      // 0.97 이상이면 노랑->빨강 구간 (Palette 로직 기준)
      if (alpha >= 255 * 0.97) redCount++;

      const offset = alpha * 4;
      pixels[i] = palette[offset];
      pixels[i + 1] = palette[offset + 1];
      pixels[i + 2] = palette[offset + 2];
      pixels[i + 3] = palette[offset + 3];
    }
  }

  if (pixelCount > 0) {
    console.log(`[HeatmapRenderer] Frame Stats: Px=${pixelCount}, MaxAlpha=${maxAlphaFound}, Saturated=${((saturatedCount/pixelCount)*100).toFixed(1)}%, RedZone=${((redCount/pixelCount)*100).toFixed(1)}%`);
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * 특정 프레임 렌더링 (캔버스 재사용으로 깜빡임 최소화)
 */
export function renderHeatmapFrame(uuid: string, frameIndex: number) {
  const viewer = window.cviewer;
  if (!viewer) {
    console.error('[Heatmap] Cesium viewer not available');
    return;
  }

  // 캐시 엔트리 가져오기
  const entry = getCachedHeatmapEntry(uuid, frameIndex);
  if (!entry || !entry.data) {
    console.warn(`[Heatmap] Frame ${frameIndex} not cached yet`);
    return;
  }

  console.log(`[Heatmap] Rendering frame ${frameIndex}`);

  // 캐시된 canvas가 있으면 재사용, 없으면 생성
  let canvas: HTMLCanvasElement | null;
  if (entry.canvas) {
    console.log(`[Heatmap] Using cached canvas for frame ${frameIndex}`);
    canvas = entry.canvas;
  } else {
    console.log(`[Heatmap] Creating new canvas for frame ${frameIndex}`);
    canvas = drawHeatmapOnCanvas(entry.data);
    if (!canvas) {
      console.error('[Heatmap] Canvas creation failed');
      return;
    }
    // canvas를 캐시에 저장
    cacheHeatmapCanvas(uuid, frameIndex, canvas);
  }

  // 현재 프레임의 canvas 저장 (CallbackProperty가 참조)
  currentFrameCanvas = canvas;

  // 현재 프레임의 Rectangle 계산 및 저장 (CallbackProperty가 참조)
  const bounds = entry.data.bounds;
  currentRectangle = Rectangle.fromDegrees(bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat);

  // Entity 방식으로 렌더링 (CallbackProperty로 깜빡임 완전 제거)
  if (!currentEntity) {
    // 첫 프레임: Entity 생성
    currentEntity = viewer.entities.add({
      id: HEATMAP_ENTITY_ID,
      show: true,
      rectangle: {
        // CallbackProperty: Cesium이 필요할 때마다 현재 Rectangle을 가져감
        coordinates: new CallbackProperty(() => currentRectangle, false),
        material: new ImageMaterialProperty({
          // CallbackProperty: Cesium이 필요할 때마다 현재 canvas를 가져감
          image: new CallbackProperty(() => currentFrameCanvas, false),
          transparent: true
        }),
        fill: true,
        outline: false,
        classificationType: ClassificationType.TERRAIN
      }
    });
  }
  // 이미 Entity가 존재하면 currentFrameCanvas와 currentRectangle만 업데이트하면 됨 (CallbackProperty가 처리)
}

export function clearHeatmap() {
  const viewer = window.cviewer;
  if (viewer) {
    // Entity 제거
    viewer.entities.removeById(HEATMAP_ENTITY_ID);
  }
  currentEntity = null;
  currentFrameCanvas = null;
  currentRectangle = undefined;
}
