/**
 * Priority Concentration Renderer
 * 우선순위 조회 결과의 농도 분포를 heatmap으로 시각화
 * SimulationStationHtmlRenderer.tsx의 ensureHeatCanvas 로직 활용
 */

import { Cartesian2, Cartesian3, SceneTransforms, Viewer } from 'cesium';

// --- Types ---
export type ConcentrationPoint = {
  longitude: number;
  latitude: number;
  concentration: number; // PM10 농도값
};

// --- Global State ---
let heatCanvas: HTMLCanvasElement | null = null;
let heatCtx: CanvasRenderingContext2D | null = null;
let heatAccumCanvas: HTMLCanvasElement | null = null;
let heatAccumCtx: CanvasRenderingContext2D | null = null;
let heatBlurCanvas: HTMLCanvasElement | null = null;
let heatBlurCtx: CanvasRenderingContext2D | null = null;
let heatColorCanvas: HTMLCanvasElement | null = null;
let heatColorCtx: CanvasRenderingContext2D | null = null;
let colorLUT: Uint8ClampedArray | null = null;
const dpr: number = 0.05; // 고정 DPR (성능 최적화)
let containerElement: Element | null = null;
let postRenderListener: (() => void) | null = null;
let currentConcentrationPoints: ConcentrationPoint[] = [];

// --- Color LUT (Legend Colors) ---
const LEGEND_COLORS = [
  '#f7fcfd', // 거의 흰색 (0)
  '#e0ecf4', // 옅은 하늘색
  '#bfd3e6', // 하늘색
  '#9ebcda', // 중간 파랑
  '#8c96c6', // 보라빛 파랑
  '#8c6bb1', // 보라
  '#88419d', // 진한 보라
  '#810f7c', // 자주색 (50)
  '#d7301f', // 빨강
  '#fc8d59', // 연한 주황
  '#fdcc8a', // 옅은 주황
  '#fec44f', // 주황
  '#fe9929', // 진한 주황
  '#ec7014', // 붉은 주황
  '#cc4c02', // 짙은 붉은색 (100)
];

const hexToRgb = (hex: string): readonly [number, number, number] => {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255] as const;
};

const ensureColorLUT = () => {
  if (colorLUT) return;
  const stops = LEGEND_COLORS.map(hexToRgb);
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const localT = (t * (stops.length - 1)) - seg;
    const [r1, g1, b1] = stops[seg];
    const [r2, g2, b2] = stops[seg + 1];
    const r = Math.round(r1 + (r2 - r1) * localT);
    const g = Math.round(g1 + (g2 - g1) * localT);
    const b = Math.round(b1 + (b2 - b1) * localT);
    const idx = i * 4;
    lut[idx] = r;
    lut[idx + 1] = g;
    lut[idx + 2] = b;
    lut[idx + 3] = i; // alpha = index
  }
  colorLUT = lut;
};

// --- Canvas Setup ---
const ensureHeatCanvas = () => {
  const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
  if (!viewer?.container) {
    console.warn('[ensureHeatCanvas] Viewer container not found');
    return;
  }

  if (!containerElement) {
    containerElement = viewer.container;
    console.log('[ensureHeatCanvas] Container element set');
  }

  // Main canvas
  if (!heatCanvas) {
    heatCanvas = document.createElement('canvas');
    heatCanvas.style.position = 'absolute';
    heatCanvas.style.left = '0';
    heatCanvas.style.top = '0';
    heatCanvas.style.width = '100%';
    heatCanvas.style.height = '100%';
    heatCanvas.style.pointerEvents = 'none';
    heatCanvas.style.zIndex = '1000';
    containerElement.appendChild(heatCanvas);
    console.log('[ensureHeatCanvas] Canvas created and appended to container');
  }

  // 히트맵 전용 낮은 해상도 (성능 최적화)
  const w = containerElement.clientWidth;
  const h = containerElement.clientHeight;
  const dw = Math.floor(w * dpr);
  const dh = Math.floor(h * dpr);

  console.log('[ensureHeatCanvas] Container size:', w, 'x', h, 'Canvas size:', dw, 'x', dh);

  if (heatCanvas.width !== dw || heatCanvas.height !== dh) {
    heatCanvas.width = dw;
    heatCanvas.height = dh;
    console.log('[ensureHeatCanvas] Canvas resized');
  }
  heatCtx = heatCanvas.getContext('2d', { willReadFrequently: false });
  if (heatCtx) heatCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Offscreen canvases
  if (!heatAccumCanvas) {
    heatAccumCanvas = document.createElement('canvas');
  }
  if (heatAccumCanvas.width !== dw || heatAccumCanvas.height !== dh) {
    heatAccumCanvas.width = dw;
    heatAccumCanvas.height = dh;
  }
  heatAccumCtx = heatAccumCanvas.getContext('2d', { willReadFrequently: false });

  if (!heatBlurCanvas) {
    heatBlurCanvas = document.createElement('canvas');
  }
  if (heatBlurCanvas.width !== dw || heatBlurCanvas.height !== dh) {
    heatBlurCanvas.width = dw;
    heatBlurCanvas.height = dh;
  }
  heatBlurCtx = heatBlurCanvas.getContext('2d', { willReadFrequently: false });

  if (!heatColorCanvas) {
    heatColorCanvas = document.createElement('canvas');
  }
  if (heatColorCanvas.width !== dw || heatColorCanvas.height !== dh) {
    heatColorCanvas.width = dw;
    heatColorCanvas.height = dh;
  }
  heatColorCtx = heatColorCanvas.getContext('2d', { willReadFrequently: false });

  ensureColorLUT();
};

// --- Heatmap Drawing ---
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type HeatPoint = { x: number; y: number; value: number };

const drawHeatmap = (points: HeatPoint[], effectiveDistance: number) => {
  console.log('[drawHeatmap] Called with', points.length, 'points, MPP:', effectiveDistance);

  if (!heatCtx || !heatCanvas || !heatAccumCtx || !heatAccumCanvas || !heatBlurCtx || !heatBlurCanvas || !heatColorCtx || !heatColorCanvas || !colorLUT) {
    console.warn('[drawHeatmap] Missing canvas contexts or LUT');
    return;
  }

  const MPP = Math.max(0.01, effectiveDistance);

  // 원하는 지상 반경(미터)
  const GROUND_RADIUS_M = 420;
  const FEATHER_RATIO = 1.0;
  const BLUR_RATIO = 1.0;

  // px로 환산
  let PX_RADIUS = GROUND_RADIUS_M / MPP;
  let PX_BLUR_R = PX_RADIUS * FEATHER_RATIO;
  let PX_BLUR_PX = PX_RADIUS * BLUR_RATIO;

  // 가드
  const MIN_PX = 60;
  const MAX_PX = 420;
  PX_RADIUS = Math.max(MIN_PX, Math.min(MAX_PX, PX_RADIUS));
  PX_BLUR_R = Math.max(MIN_PX * FEATHER_RATIO, Math.min(MAX_PX * FEATHER_RATIO, PX_BLUR_R));
  PX_BLUR_PX = Math.max(8, Math.min(120, PX_BLUR_PX));

  // 화면 밀도 보정 계수
  const REF_PX = 80;
  const densityK = Math.min(1.75, Math.max(0.6, REF_PX / PX_RADIUS));

  const NEAR_REF = 250;
  const nearK = Math.max(0.35, Math.min(1, Math.pow(NEAR_REF / PX_RADIUS, 0.7)));

  const alphaK = densityK * nearK;

  const BASE_R = PX_RADIUS;
  const BLUR_R = PX_BLUR_R;

  const ALPHA_BASE = 0.9 * alphaK;
  const ALPHA_GAIN = 1.0 * alphaK;
  const alphaBoost = 1.0;

  // 1) 누적 레이어 초기화
  heatAccumCtx.setTransform(1, 0, 0, 1, 0, 0);
  heatAccumCtx.clearRect(0, 0, heatAccumCanvas.width, heatAccumCanvas.height);
  heatAccumCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  heatAccumCtx.globalCompositeOperation = 'source-over';

  points.forEach(({ x, y, value }) => {
    const v01 = clamp01(value / 200); // PM10 기준 0-200
    const a = (ALPHA_BASE + ALPHA_GAIN * v01) * alphaBoost;
    const V = Math.round(v01 * 255);
    const grd = heatAccumCtx!.createRadialGradient(x, y, 0, x, y, BLUR_R);
    grd.addColorStop(0, `rgba(${V},${V},${V},${a})`);
    grd.addColorStop(BASE_R / BLUR_R, `rgba(${V},${V},${V},${a * 0.6})`);
    grd.addColorStop(1, `rgba(0,0,0,0)`);
    heatAccumCtx!.fillStyle = grd;
    heatAccumCtx!.beginPath();
    heatAccumCtx!.arc(x, y, BLUR_R, 0, Math.PI * 2);
    heatAccumCtx!.fill();
  });

  // 2) 블러
  heatBlurCtx.setTransform(1, 0, 0, 1, 0, 0);
  heatBlurCtx.clearRect(0, 0, heatBlurCanvas.width, heatBlurCanvas.height);
  heatBlurCtx.filter = `blur(${Math.round(PX_BLUR_PX * dpr)}px)`;
  heatBlurCtx.drawImage(heatAccumCanvas, 0, 0);

  // 3) LUT 색상화
  heatColorCtx.setTransform(1, 0, 0, 1, 0, 0);
  heatColorCtx.clearRect(0, 0, heatColorCanvas.width, heatColorCanvas.height);

  const img = heatBlurCtx.getImageData(0, 0, heatBlurCanvas.width, heatBlurCanvas.height);
  const out = heatColorCtx.createImageData(img.width, img.height);
  const src = img.data;
  const dst = out.data;

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const a = src[i + 3];
    if (a === 0) continue;
    const lutIdx = (r & 255) << 2;

    dst[i] = colorLUT[lutIdx];
    dst[i + 1] = colorLUT[lutIdx + 1];
    dst[i + 2] = colorLUT[lutIdx + 2];
    dst[i + 3] = a;
  }
  heatColorCtx.putImageData(out, 0, 0);

  // 4) 메인 캔버스에 그리기
  heatCtx.save();
  const cssW = heatCanvas.width / dpr;
  const cssH = heatCanvas.height / dpr;
  heatCtx.clearRect(0, 0, cssW, cssH);
  heatCtx.globalCompositeOperation = 'source-over';
  heatCtx.globalAlpha = 1.0;
  heatCtx.drawImage(heatColorCanvas, 0, 0, cssW, cssH);
  heatCtx.restore();

  console.log('[drawHeatmap] Draw complete, canvas size:', cssW, 'x', cssH);
};

// --- Helper Functions ---
const pickGround = (viewer: Viewer, x: number, y: number): Cartesian3 | null => {
  const ray = viewer.camera.getPickRay(new Cartesian2(x, y));
  if (!ray) return null;
  const hit = viewer.scene.globe.pick(ray, viewer.scene);
  return hit ?? null;
};

const getMetersPerPixel = (viewer: Viewer): number => {
  try {
    const { canvas } = viewer;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const p0 = pickGround(viewer, cx, cy);
    const p1 = pickGround(viewer, cx + 1, cy);
    if (p0 && p1) return Cartesian3.distance(p0, p1);
    const carto = viewer.scene.globe.ellipsoid.cartesianToCartographic(viewer.camera.position);
    return Math.max(1, carto?.height ?? 1000);
  } catch {
    return 1000;
  }
};

// --- PostRender Update ---
let lastUpdateTime = 0;

const updateHeatmap = () => {
  const now = performance.now();
  if (now - lastUpdateTime < 16) return; // ~60fps
  lastUpdateTime = now;

  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer?.scene || !viewer?.clock || !containerElement) {
      console.warn('[updateHeatmap] Viewer or container not ready');
      return;
    }

    const heatPoints: HeatPoint[] = [];

    // Convert world coordinates to screen coordinates
    currentConcentrationPoints.forEach(point => {
      const cartesian = Cartesian3.fromDegrees(point.longitude, point.latitude);
      const screenPos = SceneTransforms.wgs84ToWindowCoordinates(
        viewer.scene,
        cartesian,
        new Cartesian2()
      );

      if (screenPos) {
        heatPoints.push({
          x: screenPos.x,
          y: screenPos.y,
          value: point.concentration
        });
      }
    });

    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) { // 1% of frames
      console.log('[updateHeatmap] Heat points:', heatPoints.length, 'Concentration points:', currentConcentrationPoints.length);
    }

    if (heatPoints.length > 0) {
      ensureHeatCanvas();
      const metersPerPixel = getMetersPerPixel(viewer);
      drawHeatmap(heatPoints, metersPerPixel);
    }
  } catch (error) {
    console.error('[priorityConcentrationRenderer] Update error:', error);
  }
};

// --- Public API ---

/**
 * 우선순위 농도 분포 렌더링 시작
 * @param concentrationPoints - 농도 데이터 포인트 배열
 */
export function renderPriorityConcentration(concentrationPoints: ConcentrationPoint[]): void {
  try {
    console.log('[renderPriorityConcentration] Called with', concentrationPoints.length, 'points');

    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.error('[renderPriorityConcentration] Cesium viewer not found');
      return;
    }

    currentConcentrationPoints = concentrationPoints;
    console.log('[renderPriorityConcentration] Sample point:', concentrationPoints[0]);

    // Setup canvas
    ensureHeatCanvas();
    console.log('[renderPriorityConcentration] Canvas setup complete');

    // Register postRender listener
    if (!postRenderListener) {
      postRenderListener = updateHeatmap;
      viewer.scene.postRender.addEventListener(updateHeatmap);
      console.log('[renderPriorityConcentration] PostRender listener registered');
    } else {
      console.log('[renderPriorityConcentration] PostRender listener already exists');
    }

    // Initial render
    console.log('[renderPriorityConcentration] Calling initial updateHeatmap');
    updateHeatmap();
  } catch (error) {
    console.error('[renderPriorityConcentration] Failed to render:', error);
  }
}

/**
 * 우선순위 농도 분포 렌더링 제거
 */
export function clearPriorityConcentration(): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (viewer && postRenderListener) {
      viewer.scene.postRender.removeEventListener(postRenderListener);
      postRenderListener = null;
      console.log('[clearPriorityConcentration] PostRender listener removed');
    }

    // Clear canvas
    if (heatCanvas && heatCtx) {
      const cssW = heatCanvas.width / dpr;
      const cssH = heatCanvas.height / dpr;
      heatCtx.clearRect(0, 0, cssW, cssH);
    }

    // Remove canvas from DOM
    if (heatCanvas && containerElement) {
      containerElement.removeChild(heatCanvas);
      heatCanvas = null;
      heatCtx = null;
    }

    // Reset state
    currentConcentrationPoints = [];
    containerElement = null;
  } catch (error) {
    console.error('[clearPriorityConcentration] Failed to clear:', error);
  }
}

/**
 * 농도 데이터 업데이트 (재렌더링 트리거)
 * @param concentrationPoints - 새로운 농도 데이터 포인트 배열
 */
export function updatePriorityConcentration(concentrationPoints: ConcentrationPoint[]): void {
  currentConcentrationPoints = concentrationPoints;
  updateHeatmap();
}
