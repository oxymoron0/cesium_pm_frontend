import { useEffect, useRef, useCallback } from 'react';
import { Cartesian2, Cartesian3, Viewer } from 'cesium';
import { observer } from 'mobx-react-lite';
import { simulationStore } from '@/stores/SimulationStore';
import { MOCK_GLB_DATA } from '@/utils/mockData/simulationQuickGlbDetail';
import { getGlbCacheStatus } from '@/utils/cesium/glbPreloader';

/**
 * GLB 샘플 데이터 기반 히트맵 렌더러
 *
 * SimulationProgressIndicator의 프레임과 동기화하여 히트맵 렌더링
 * Store의 currentGlbFrame을 구독하여 해당 GLB의 50개 포인트로 히트맵 갱신
 */
const SimulationGlbHeatmapRender = observer(function SimulationGlbHeatmapRender() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef<number>(1);

  const heatAccumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatAccumCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const heatBlurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatBlurCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const heatColorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatColorCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colorLUTRef = useRef<Uint8ClampedArray | null>(null);

  const lastUpdateTime = useRef<number>(0);

  // ===== 히트맵 숨김 높이 임계값 =====
  const HEATMAP_HIDE_HEIGHT = 40000; // 21000m 이상에서 히트맵 숨김

  // ===== 색상 설정 =====
  const LEGEND_COLORS = [
    '#253494', '#2c7fb8', '#41b6c4', '#a1dab4', '#ffffcc',
    '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02',
  ];

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // ===== HEX -> RGB / LUT =====
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255] as const;
  };

  const ensureColorLUT = useCallback(() => {
    if (colorLUTRef.current) return;
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
      lut[idx] = r; lut[idx + 1] = g; lut[idx + 2] = b; lut[idx + 3] = i;
    }
    colorLUTRef.current = lut;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 캔버스 준비 =====
  const ensureHeatCanvas = useCallback(() => {
    if (!containerRef.current) return;

    let canvas = heatCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      heatCanvasRef.current = canvas;
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '100';
      canvas.style.mixBlendMode = 'multiply';
      canvas.style.opacity = '0.8';
      containerRef.current.appendChild(canvas);
    }

    const dpr = 0.5;
    dprRef.current = dpr;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const dw = Math.floor(w * dpr);
    const dh = Math.floor(h * dpr);

    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    heatCtxRef.current = ctx;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Offscreen canvases
    let acc = heatAccumCanvasRef.current;
    if (!acc) { acc = document.createElement('canvas'); heatAccumCanvasRef.current = acc; }
    if (acc.width !== dw || acc.height !== dh) { acc.width = dw; acc.height = dh; }
    heatAccumCtxRef.current = acc.getContext('2d', { willReadFrequently: false });

    let blur = heatBlurCanvasRef.current;
    if (!blur) { blur = document.createElement('canvas'); heatBlurCanvasRef.current = blur; }
    if (blur.width !== dw || blur.height !== dh) { blur.width = dw; blur.height = dh; }
    heatBlurCtxRef.current = blur.getContext('2d', { willReadFrequently: false });

    let col = heatColorCanvasRef.current;
    if (!col) { col = document.createElement('canvas'); heatColorCanvasRef.current = col; }
    if (col.width !== dw || col.height !== dh) { col.width = dw; col.height = dh; }
    heatColorCtxRef.current = col.getContext('2d', { willReadFrequently: false });

    ensureColorLUT();
  }, [ensureColorLUT]);

  useEffect(() => {
    ensureHeatCanvas();
    const onResize = () => ensureHeatCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ensureHeatCanvas]);

  // ===== 지상 픽 =====
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

  const getCameraHeight = (viewer: Viewer): number => {
    try {
      const carto = viewer.scene.globe.ellipsoid.cartesianToCartographic(viewer.camera.position);
      return carto?.height ?? 0;
    } catch {
      return 0;
    }
  };

  // ===== 히트맵 드로잉 =====
  type HeatPoint = { x: number; y: number; value: number };

  const drawHeatmap = useCallback((points: HeatPoint[], effectiveDistance: number) => {
    const viewCtx = heatCtxRef.current;
    const viewCanvas = heatCanvasRef.current;
    const accCtx = heatAccumCtxRef.current;
    const accCanvas = heatAccumCanvasRef.current;
    const blurCtx = heatBlurCtxRef.current;
    const blurCanvas = heatBlurCanvasRef.current;
    const colorCtx = heatColorCtxRef.current;
    const colorCanvas = heatColorCanvasRef.current;
    const lut = colorLUTRef.current;

    if (!viewCtx || !viewCanvas || !accCtx || !accCanvas || !blurCtx || !blurCanvas || !colorCtx || !colorCanvas || !lut) return;

    const dpr = dprRef.current || 1;
    const MPP = Math.max(0.01, effectiveDistance);
    const GROUND_RADIUS_M = 420;
    const FEATHER_RATIO = 1.0;
    const BLUR_RATIO = 1.0;

    let PX_RADIUS = GROUND_RADIUS_M / MPP;
    let PX_BLUR_R = PX_RADIUS * FEATHER_RATIO;
    let PX_BLUR_PX = PX_RADIUS * BLUR_RATIO;

    const MIN_PX = 60;
    const MAX_PX = 420;
    PX_RADIUS = Math.max(MIN_PX, Math.min(MAX_PX, PX_RADIUS));
    PX_BLUR_R = Math.max(MIN_PX * FEATHER_RATIO, Math.min(MAX_PX * FEATHER_RATIO, PX_BLUR_R));
    PX_BLUR_PX = Math.max(8, Math.min(120, PX_BLUR_PX)); // 블러 최대값 원복

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

    // 1) 누적
    accCtx.setTransform(1, 0, 0, 1, 0, 0);
    accCtx.clearRect(0, 0, accCanvas.width, accCanvas.height);
    accCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    accCtx.globalCompositeOperation = 'source-over';

    points.forEach(({ x, y, value }) => {
      const v01 = clamp01(value / 100);
      const a = (ALPHA_BASE + ALPHA_GAIN * v01) * alphaBoost;
      const V = Math.round(v01 * 255);
      const grd = accCtx.createRadialGradient(x, y, 0, x, y, BLUR_R);
      grd.addColorStop(0, `rgba(${V},${V},${V},${a})`);
      grd.addColorStop(BASE_R / BLUR_R, `rgba(${V},${V},${V},${a * 0.6})`);
      grd.addColorStop(1, `rgba(0,0,0,0)`);
      accCtx.fillStyle = grd;
      accCtx.beginPath();
      accCtx.arc(x, y, BLUR_R, 0, Math.PI * 2);
      accCtx.fill();
    });

    // 2) 블러
    blurCtx.setTransform(1, 0, 0, 1, 0, 0);
    blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
    blurCtx.filter = `blur(${Math.round(PX_BLUR_PX * dpr)}px)`;
    blurCtx.drawImage(accCanvas, 0, 0);

    // 3) LUT 색상화
    colorCtx.setTransform(1, 0, 0, 1, 0, 0);
    colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);

    const img = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
    const out = colorCtx.createImageData(img.width, img.height);
    const src = img.data;
    const dst = out.data;

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i];
      const a = src[i + 3];
      if (a === 0) continue;
      const lutIdx = (r & 255) << 2;
      dst[i] = lut[lutIdx];
      dst[i + 1] = lut[lutIdx + 1];
      dst[i + 2] = lut[lutIdx + 2];
      dst[i + 3] = a;
    }
    colorCtx.putImageData(out, 0, 0);

    // 4) 메인 캔버스
    viewCtx.save();
    const cssW = viewCanvas.width / dpr;
    const cssH = viewCanvas.height / dpr;
    viewCtx.clearRect(0, 0, cssW, cssH);
    viewCtx.globalCompositeOperation = 'source-over';
    viewCtx.globalAlpha = 1.0;
    viewCtx.drawImage(colorCanvas, 0, 0, cssW, cssH);
    viewCtx.restore();
  }, []);

  // ===== 목업 데이터 → 히트맵 포인트 변환 =====
  const updateHeatmapFromMockData = useCallback(() => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return; // ~60fps
    lastUpdateTime.current = now;

    try {
      const viewer = window.cviewer;
      if (!viewer?.scene || !viewer?.clock) return;

      const canvas = heatCanvasRef.current;

      // GLB 캐시 상태 확인
      const currentView = simulationStore.currentView;
      const uuid = currentView === 'quickResult'
        ? simulationStore.selectedsimulationQuick?.uuid
        : simulationStore.selectedSimulationUuid;
      const totalFrames = simulationStore.glbCount || 0;

      // GLB가 프리로드되지 않았으면 히트맵 숨김
      if (!uuid) {
        if (canvas && canvas.style.display !== 'none') {
          canvas.style.display = 'none';
        }
        return;
      }

      const cacheStatus = getGlbCacheStatus(uuid);
      if (!cacheStatus.isCached || cacheStatus.loadedFrames < totalFrames) {
        if (canvas && canvas.style.display !== 'none') {
          canvas.style.display = 'none';
        }
        return;
      }

      // 카메라 높이 체크 및 히트맵 표시/숨김
      const cameraHeight = getCameraHeight(viewer);
      const currentFrame = simulationStore.currentGlbFrame;

      if (cameraHeight >= HEATMAP_HIDE_HEIGHT) {
        // 높이가 임계값 이상이면 히트맵 숨김
        if (canvas && canvas.style.display !== 'none') {
          canvas.style.display = 'none';
        }
        return;
      } else {
        // 높이가 임계값 미만이면 히트맵 표시
        if (canvas && canvas.style.display !== 'block') {
          canvas.style.display = 'block';
        }
      }

      const glbData = MOCK_GLB_DATA[currentFrame];
      if (!glbData) return;

      const heatPoints: HeatPoint[] = [];

      // 50개 포인트 변환
      glbData.points.forEach((point) => {
        try {
          // 경위도 → Cartesian3
          const position = Cartesian3.fromDegrees(point.x, point.y);

          // Cartesian3 → 화면 좌표
          const screenPos = viewer.scene.cartesianToCanvasCoordinates(position);

          if (
            screenPos &&
            screenPos.x >= -100 && screenPos.x <= window.innerWidth + 100 &&
            screenPos.y >= -50 && screenPos.y <= window.innerHeight - 100
          ) {
            heatPoints.push({
              x: screenPos.x,
              y: screenPos.y,
              value: point.pm10
            });
          }
        } catch (err) {
          // 개별 포인트 변환 실패 무시
          console.log("error 발생 : ", err)
        }
      });

      // 히트맵 그리기
      ensureHeatCanvas();
      const metersPerPixel = getMetersPerPixel(viewer);
      drawHeatmap(heatPoints, metersPerPixel);

      console.log(`[GLB Render] Frame: ${currentFrame}, Points: ${heatPoints.length}/50, CameraHeight: ${Math.round(cameraHeight)}m`);
    } catch (error) {
      console.error('[SimulationGlbHeatmapRender] Update error:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureHeatCanvas, drawHeatmap]);

  // ===== Cesium postRender 등록 =====
  useEffect(() => {
    const viewer = window.cviewer;
    if (!viewer?.scene?.postRender) return;

    viewer.scene.postRender.addEventListener(updateHeatmapFromMockData);

    return () => {
      const currentViewer = window.cviewer;
      if (currentViewer?.scene?.postRender) {
        currentViewer.scene.postRender.removeEventListener(updateHeatmapFromMockData);
      }

      if (heatCanvasRef.current) {
        heatCanvasRef.current.remove();
        heatCanvasRef.current = null;
      }
      heatCtxRef.current = null;
      heatAccumCanvasRef.current = null;
      heatAccumCtxRef.current = null;
      heatBlurCanvasRef.current = null;
      heatBlurCtxRef.current = null;
      heatColorCanvasRef.current = null;
      heatColorCtxRef.current = null;
      colorLUTRef.current = null;
    };
  }, [updateHeatmapFromMockData]);

  // ===== 범례 ===== (주석처리)
  // useEffect(() => {
  //   if (!containerRef.current) return;
  //   const legend = document.createElement('div');
  //   legend.style.position = 'absolute';
  //   legend.style.right = '12px';
  //   legend.style.bottom = '12px';
  //   legend.style.padding = '8px 10px';
  //   legend.style.background = 'rgba(20,20,20,0.7)';
  //   legend.style.borderRadius = '6px';
  //   legend.style.color = '#fff';
  //   legend.style.fontSize = '12px';
  //   legend.style.zIndex = '1400';
  //   legend.style.pointerEvents = 'none';
  //   legend.style.lineHeight = '1.2';
  //   legend.innerHTML = `
  //     <div style="font-weight:700;margin-bottom:6px;">PM10 (μg/m³) - GLB ${String(simulationStore.currentGlbFrame + 1).padStart(4, '0')}</div>
  //     <div style="display:flex;gap:4px;align-items:flex-end;">
  //       ${LEGEND_COLORS.map((c, i) => `
  //         <div title="${i * 10}–${i === 9 ? 100 : (i * 10 + 9)}" style="width:16px;height:12px;background:${c};border-radius:2px;"></div>
  //       `).join('')}
  //     </div>
  //     <div style="display:flex;justify-content:space-between;margin-top:4px;">
  //       <span>0</span><span>50</span><span>100</span>
  //     </div>
  //   `;
  //   containerRef.current.appendChild(legend);
  //   return () => legend.remove();
  // }, [simulationStore.currentGlbFrame]);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 z-[5] w-full h-full overflow-visible pointer-events-none"
    />
  );
});

export default SimulationGlbHeatmapRender;
