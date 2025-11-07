import { useEffect, useRef, useCallback, useState } from 'react';
import { Entity, Cartesian2, Cartesian3, Viewer } from 'cesium';
import { setSelectedSimulationStationId } from '@/utils/cesium/simulationResultRenderer';
import { simulationStore } from "@/stores/SimulationStore";
import type { StationData } from '@/types/simulation_request_types';

const SimulationStationHtmlRenderer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stationElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const sensorElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastUpdateTime = useRef<number>(0);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // ===== Heatmap refs =====
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

  useEffect(() => {
    setSelectedSimulationStationId(selectedStationId);
  }, [selectedStationId]);

  // helpers
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const smoothstep = (e0: number, e1: number, x: number) => {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };

  /** 카메라 높이를 이용해 줌강조(0=멀리, 1=아주 가까이) */
  const getZoomEmphasis = (viewer: Viewer) => {
    try {
      const carto = viewer.scene.globe.ellipsoid.cartesianToCartographic(viewer.camera.position);
      const h = carto?.height ?? 0;
      // 높이 기준은 상황에 맞게 조절: 300m 이하면 강하게, 3000m 이상이면 거의 없음
      const EMPHASIS_NEAR = 300;   // 근거리 기준(m)
      const EMPHASIS_FAR  = 3000;  // 원거리 기준(m)
      // 가까울수록 1에 가깝도록
      return clamp01(1 - smoothstep(EMPHASIS_NEAR, EMPHASIS_FAR, h));
    } catch { return 0; }
  };

  // ===== 스토어 기반 선택 스테이션 조회 =====
  const getStationFromStoreBySelectedId = (id: string | null) => {
    if (!id) return null;
    const idx = Number(String(id).replace(/\D+/g, '')); // 'station_38' -> 38
    const data = simulationStore.selectedsimulationQuick?.station_data;
    if (!data || !Number.isFinite(idx)) return null;

    let found = data.find((s: StationData) => s.index === idx);
    if (!found) {
      found = data.find((s: StationData) => s.station_id === id || s.station_name === id);
    }
    return found ?? null;
  };

  // ===== 유틸 =====
  const formatTime = useCallback((timeStr: string): string => {
    try {
      const parts = timeStr.split(' ');
      if (parts.length !== 2) return timeStr;
      const timePart = parts[1]; // "15:00"
      const [hourStr, minute] = timePart.split(':');
      const hour = parseInt(hourStr, 10);
      if (isNaN(hour)) return timeStr;
      const isPM = hour >= 12;
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      const period = isPM ? '오후' : '오전';
      return `${period} ${String(displayHour).padStart(2, '0')}:${minute}`;
    } catch {
      return timeStr;
    }
  }, []);

  const getPM10Color = useCallback((value: number): string => {
    const LEGEND_COLORS = [
      '#253494', // 짙은 파랑 (0)
      '#2c7fb8', // 밝은 파랑
      '#41b6c4', // 청록
      '#a1dab4', // 연한 청록
      '#ffffcc', // 연노랑
      '#fee391', // 노랑
      '#fec44f', // 주황
      '#fe9929', // 진한 주황
      '#ec7014', // 붉은 주황
      '#cc4c02', // 짙은 붉은색 (100)
    ];

    // PM10 값을 0~100으로 클램프
    const v = Math.max(0, Math.min(100, value));

    // 색상 구간 계산 (10등분)
    const idx = Math.min(
      LEGEND_COLORS.length - 1,
      Math.floor((v / 100) * (LEGEND_COLORS.length - 1))
    );

    return LEGEND_COLORS[idx];
  }, []);

  const createPM10HTML = useCallback((pm10Value: string, timeValue: string) => {
    const numericValue = parseFloat(pm10Value.replace(' μg/m³', ''));
    const pm10Color = isNaN(numericValue) ? '#999' : getPM10Color(numericValue);
    const displayValue = isNaN(numericValue) ? '---' : numericValue.toString();
    const formattedTime = formatTime(timeValue);

    return `
      <div style="display:flex;padding:8px;flex-direction:column;justify-content:center;align-items:center;gap:8px;border-radius:4px;background:rgba(30,30,30,0.90);">
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="color:#FFF;text-align:center;font-family:Pretendard;font-size:17px;font-weight:400;">미세먼지</div>
          <div style="color:#A6A6A6;text-align:center;font-family:Pretendard;font-size:12px;font-weight:400;">${formattedTime}</div>
          <div style="color:${pm10Color};text-align:center;font-family:Pretendard;font-size:36px;font-weight:800;letter-spacing:-0.8px;">${displayValue}</div>
        </div>
        <button data-role="run-sim" style="display:flex;height:40px;padding:5px 8px;justify-content:center;align-items:center;gap:4px;align-self:stretch;border-radius:4px;background:#CFFF40;border:none;cursor:pointer;">
          <div style="color:#000;text-align:center;font-family:Pretendard;font-size:16px;font-weight:700;line-height:normal;">정류장 시뮬레이션 실행</div>
        </button>
      </div>
    `;
  }, [getPM10Color, formatTime]);

  const createStationIdHTML = useCallback((displayText: string, isSelected: boolean) => {
    const backgroundColor = isSelected ? 'black' : 'white';
    return `
      <div class="station-tag-container" style="display: inline-flex; justify-content: center; align-items: center; gap: 4px; border-radius: 26.87px; border: 1px solid #F12124; background: ${backgroundColor}; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); padding: 2px 6px 2px 8px; transition: all 0.3s ease; cursor: pointer; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
        <span class="station-name" style="color: #DC5449; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard; font-size: 12px; font-weight: 700; line-height: normal;">
          ${displayText}
        </span>
      </div>
    `;
  }, []);

  // ===== HEX -> RGB / LUT =====
  const LEGEND_COLORS = [
    '#253494', // 짙은 파랑 (0)
    '#2c7fb8', // 밝은 파랑
    '#41b6c4', // 청록
    '#a1dab4', // 연한 청록
    '#ffffcc', // 연노랑 (중간)
    '#fee391', // 노랑
    '#fec44f', // 주황
    '#fe9929', // 진한 주황
    '#ec7014', // 붉은 주황
    '#cc4c02', // 짙은 붉은색 (100)
  ];
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255] as const;
  };
  const ensureColorLUT = () => {
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
      lut[idx] = r; lut[idx + 1] = g; lut[idx + 2] = b; lut[idx + 3] = i; // alpha = index
    }
    colorLUTRef.current = lut;
  };

  // ===== 캔버스 준비/리사이즈 =====
  const ensureHeatCanvas = useCallback(() => {
    if (!containerRef.current) return;

    // main
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
      canvas.style.zIndex = '1000';
      containerRef.current.appendChild(canvas);
    }

    // 히트맵 전용 낮은 해상도 (성능 최적화)
    const dpr = 0.05;  // 고정 DPR (원래 devicePixelRatio 무시)
    dprRef.current = dpr;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const dw = Math.floor(w * dpr);
    const dh = Math.floor(h * dpr);
    // console.log(`[Heatmap] Low-res mode: ${dw}x${dh} (DPR: ${dpr})`);

    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw; canvas.height = dh;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    heatCtxRef.current = ctx;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // offscreens
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
  }, []);

  useEffect(() => {
    ensureHeatCanvas();
    const onResize = () => ensureHeatCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ensureHeatCanvas]);

  // ===== PM10 팝업 생성/업데이트 (버튼 flyTo 포함) =====
  const createOrUpdateSensorElement = useCallback((
    entityId: string,
    pm10Value: string,
    timeValue: string,
    left: number,
    top: number
  ) => {
    let element = sensorElementsRef.current.get(entityId);

    if (!element) {
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto';
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.style.zIndex = '1520';
      element.innerHTML = createPM10HTML(pm10Value, timeValue);

      // 버튼 핸들러 등록
      const runBtn = element.querySelector('[data-role="run-sim"]') as HTMLButtonElement | null;
      if (runBtn) {
        runBtn.addEventListener('click', () => {
          try {
            const station = getStationFromStoreBySelectedId(entityId);
            if (!station) return;
            const [lon, lat] = station.location.coordinates; // [lon, lat]
            const viewer = window.cviewer;
            if (!viewer?.camera) return;
            viewer.camera.flyTo({
              destination: Cartesian3.fromDegrees(lon, lat, 1000),
              duration: 1.2,
            });
          } catch (err) {
            console.error('flyTo (store) error:', err);
          }
        });
      }

      sensorElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    }

    element.style.left = `${left + 1}px`;
    element.style.top = `${top + 30}px`;
  }, [createPM10HTML]);

  // ===== 정류장 태그 생성/업데이트 =====
  const createOrUpdateStationElement = useCallback((
    entityId: string,
    stationId: string,
    stationName: string,
    left: number,
    top: number
  ) => {
    let element = stationElementsRef.current.get(entityId);
    const isSelected = selectedStationId === entityId;
    const displayText = isSelected ? stationName : stationId;

    if (!element) {
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.pointerEvents = 'auto';
      element.style.transform = 'translateX(-50%)';
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'visible';
      element.style.zIndex = '1500';
      element.innerHTML = createStationIdHTML(displayText, isSelected);
      element.addEventListener('click', () => {
        setSelectedStationId(prev => prev === entityId ? null : entityId);
      });
      stationElementsRef.current.set(entityId, element);
      containerRef.current?.appendChild(element);
    } else {
      const currentIsSelected = element.innerHTML.includes('background: black');
      if (currentIsSelected !== isSelected) {
        element.innerHTML = createStationIdHTML(displayText, isSelected);
      }
    }

    element.style.left = `${left + 1}px`;
    element.style.top = `${top}px`;
  }, [createStationIdHTML, selectedStationId]);

  // ===== 히트맵 드로잉 =====
  type HeatPoint = { x: number; y: number; value: number };
  const drawHeatmap = useCallback((points: HeatPoint[], emph: number, effectiveDistance: number) => {
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

    // === 🔸 실제 거리 기반 반경 스케일링 ===
    // effectiveDistance: 카메라에서 지면까지의 실제 거리 (pitch 고려)
    // 300m에서 최대, 50km에서 최소로 로그 스케일 적용
    const MPP = Math.max(0.01, effectiveDistance); // effectiveDistance를 MPP로 사용

    // 원하는 '지상 반경'(미터) — 줌 아웃하면 픽셀 반경이 자연스럽게 줄어듦
    const GROUND_RADIUS_M = 420;  // 핵심 영향 반경(예: 80m)
    const FEATHER_RATIO   = 1.0; // 외곽 그라디언트 반경 비율
    const BLUR_RATIO      = 1.0; // 이미지 블러 강도 비율

    // px로 환산 (기존 그대로)
    let PX_RADIUS  = GROUND_RADIUS_M / MPP;
    let PX_BLUR_R  = PX_RADIUS * FEATHER_RATIO;
    let PX_BLUR_PX = PX_RADIUS * BLUR_RATIO;

    // 가드 (기존 그대로)
    const MIN_PX = 60;
    const MAX_PX = 420;
    PX_RADIUS  = Math.max(MIN_PX, Math.min(MAX_PX, PX_RADIUS));
    PX_BLUR_R  = Math.max(MIN_PX * FEATHER_RATIO, Math.min(MAX_PX * FEATHER_RATIO, PX_BLUR_R));
    PX_BLUR_PX = Math.max(8, Math.min(120, PX_BLUR_PX));

    // === 🔸 추가: 화면 밀도 보정 계수 (줌아웃할수록 ↓)
    // PX_RADIUS가 기준 픽셀(REF_PX)보다 작아질수록 덜 진하게 그리기
    const REF_PX = 80; // 기준 두께(취향대로 80~120)
    const densityK = Math.min(1.75, Math.max(0.6, REF_PX / PX_RADIUS)); // 0.6~1.75

    const NEAR_REF = 250; // 근접 기준 픽셀 두께(80~160 사이에서 취향대로)
    const nearK = Math.max(0.35, Math.min(1, Math.pow(NEAR_REF / PX_RADIUS, 0.7))); 

    const alphaK = densityK * nearK; // 최종 알파 스케일

    // 기존 변수에 매핑
    const BASE_R = PX_RADIUS;
    const BLUR_R = PX_BLUR_R;

    // 알파/강조: 줌 영향 제거 + 밀도 보정
    const ALPHA_BASE = 0.9 * alphaK; // 👈 밀도에 따라 알파 낮춤
    const ALPHA_GAIN = 1.0 * alphaK; // 👈 밀도에 따라 알파 낮춤
    const alphaBoost  = 1.0;

    // 1) 누적 레이어 초기화
    accCtx.setTransform(1, 0, 0, 1, 0, 0);
    accCtx.clearRect(0, 0, accCanvas.width, accCanvas.height);
    accCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    accCtx.globalCompositeOperation = 'source-over';
    // accCtx.globalCompositeOperation = 'lighten'; // 겹칠 때 큰 값 유지

    // points.forEach(({ x, y, value }) => {
    //   const a = ALPHA_BASE + ALPHA_GAIN * Math.max(0, Math.min(1, value / 100));
    //   const grd = accCtx.createRadialGradient(x, y, 0, x, y, BLUR_RADIUS);
    //   grd.addColorStop(0, `rgba(255,255,255,${a})`);
    //   grd.addColorStop(BASE_RADIUS / BLUR_RADIUS, `rgba(255,255,255,${a * 0.6})`);
    //   grd.addColorStop(1, `rgba(255,255,255,0)`);
    //   accCtx.fillStyle = grd;
    //   accCtx.beginPath();
    //   accCtx.arc(x, y, BLUR_RADIUS, 0, Math.PI * 2);
    //   accCtx.fill();
    // });
    points.forEach(({ x, y, value }) => {
      // const v01 = clamp01(value / 100);
      // const a = (ALPHA_BASE + ALPHA_GAIN * v01) * alphaBoost;
      // const grd = accCtx.createRadialGradient(x, y, 0, x, y, BLUR_R);
      // grd.addColorStop(0, `rgba(255,255,255,${a})`);
      // grd.addColorStop(BASE_R / BLUR_R, `rgba(255,255,255,${a * 0.6})`);
      // grd.addColorStop(1, `rgba(255,255,255,0)`);
      // accCtx.fillStyle = grd;
      
      const v01 = clamp01(value / 100);
      const a = (ALPHA_BASE + ALPHA_GAIN * v01) * alphaBoost; // 기존 불투명도 로직 유지
      const V   = Math.round(v01 * 255); // 이 픽셀의 '값'을 밝기로 인코딩
      const grd = accCtx.createRadialGradient(x, y, 0, x, y, BLUR_R);
      grd.addColorStop(0, `rgba(${V},${V},${V},${a})`);          // 값은 RGB, 알파는 기존
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
    //blurCtx.filter = `blur(${Math.round(BLUR_PX * dpr)}px)`;
    blurCtx.filter = `blur(${Math.round(PX_BLUR_PX * dpr)}px)`;
    
    blurCtx.drawImage(accCanvas, 0, 0);
    // blurCtx.filter = 'none';

    // 3) LUT 색상화
    colorCtx.setTransform(1, 0, 0, 1, 0, 0);
    colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);

    const img = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
    const out = colorCtx.createImageData(img.width, img.height);
    const src = img.data;
    const dst = out.data;

    for (let i = 0; i < src.length; i += 4) {
      // const a = src[i + 3];
      // if (a === 0) continue;

      //const lutIdx = a << 2;
      // 감마 보정: 가까울수록 하이라이트쪽으로(감마<1)
      // const na = Math.pow(a / 255, gamma) * 255;
      // const lutIdx = (na & 255) << 2;

      const r = src[i];         // 값(0~255)
      const a = src[i + 3];     // 기존 알파 유지
      if (a === 0) continue;
      const lutIdx = (r & 255) << 2;

      dst[i] = lut[lutIdx];
      dst[i + 1] = lut[lutIdx + 1];
      dst[i + 2] = lut[lutIdx + 2];
      // dst[i + 3] = Math.min(255, na);
      dst[i + 3] = a;
    }
    colorCtx.putImageData(out, 0, 0);

    // 4) 메인 캔버스에 그리기 (줌인 시 약간 더 강하게 보이도록 globalAlpha로 미세 조정)
    viewCtx.save();
    const cssW = viewCanvas.width / dpr;
    const cssH = viewCanvas.height / dpr;
    viewCtx.clearRect(0, 0, cssW, cssH);
    viewCtx.globalCompositeOperation = 'source-over';
    viewCtx.globalAlpha = 1.0;
    viewCtx.drawImage(colorCanvas, 0, 0, cssW, cssH);
    viewCtx.restore();
  }, []);

  const pickGround = (viewer: Viewer, x: number, y: number): Cartesian3 | null => {
    const ray = viewer.camera.getPickRay(new Cartesian2(x, y));
    if (!ray) return null;
    const hit = viewer.scene.globe.pick(ray, viewer.scene);
    return hit ?? null;
  };

  /** 화면 중앙 기준 1px이 지상에서 몇 m인지(MPP: meters per pixel) */
  const getMetersPerPixel = (viewer: Viewer): number => {
    try {
      const { canvas } = viewer;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const p0 = pickGround(viewer, cx, cy);
      const p1 = pickGround(viewer, cx + 1, cy); // x방향 1px
      if (p0 && p1) return Cartesian3.distance(p0, p1);
      // 못 맞추면 카메라 고도로 대체(대략치)
      const carto = viewer.scene.globe.ellipsoid.cartesianToCartographic(viewer.camera.position);
      return Math.max(1, carto?.height ?? 1000);
    } catch {
      return 1000;
    }
  };

  // ===== 포지션 업데이트(히트맵 포인트 수집 포함) =====
  const updateStationPositions = useCallback(() => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return; // ~60fps
    lastUpdateTime.current = now;

    try {
      const viewer = window.cviewer;
      if (!viewer?.scene || !viewer?.clock || !containerRef.current) return;

      const heatPoints: HeatPoint[] = [];
      const currentEntityIds = new Set<string>();
      const currentSensorIds = new Set<string>();

      // 디버깅: 메모리 누적 체크
      // console.log('[DEBUG] Station elements:', stationElementsRef.current.size);
      // console.log('[DEBUG] Sensor elements:', sensorElementsRef.current.size);

      for (let i = 0; i < viewer.dataSources.length; i++) {
        const dataSource = viewer.dataSources.get(i);

        if (dataSource?.name === 'simulation_result_stations' && dataSource.show && dataSource.entities) {
          const entities = dataSource.entities.values;
          if (!entities) continue;

          // console.log('[DEBUG] Entities count:', entities.length);

          entities.forEach((entity: Entity) => {
            try {
              if (entity.id?.startsWith('station_') && entity.billboard) {
                const entityPosition = entity.position?.getValue(viewer.clock.currentTime);
                if (!entityPosition) return;

                const sp: Cartesian2 | undefined = viewer.scene.cartesianToCanvasCoordinates(entityPosition);
                if (
                  sp &&
                  sp.x >= -100 && sp.x <= window.innerWidth + 100 &&
                  sp.y >= -50 && sp.y <= window.innerHeight - 100
                ) {
                  const stationId = entity.name || entity.id.replace('station_', '');
                  const stationName = entity.properties?.stationName?.getValue() || stationId;

                  currentEntityIds.add(entity.id);
                  createOrUpdateStationElement(entity.id, stationId, stationName, sp.x, sp.y);

                  // 히트맵 값 수집 (0..100 스케일)
                  const rawPm10 = entity.properties?.pm10?.getValue?.();
                  if (rawPm10 != null) {
                    let v = typeof rawPm10 === 'number'
                      ? rawPm10
                      : parseFloat(String(rawPm10).replace(' μg/m³', '').trim());
                    if (!isNaN(v)) {
                      // 필요 시 스케일링 로직 조정: 예) v = Math.min(100, v / 150 * 100)
                      v = Math.max(0, Math.min(100, v));
                      heatPoints.push({ x: sp.x, y: sp.y, value: v });
                    }
                  }

                  if (selectedStationId === entity.id && entity.properties) {
                    const pm10Value = entity.properties.pm10?.getValue?.();
                    const timeValue = entity.properties.time?.getValue?.();
                    if (pm10Value && timeValue) {
                      currentSensorIds.add(entity.id);
                      createOrUpdateSensorElement(entity.id, pm10Value, timeValue, sp.x, sp.y);
                    }
                  }
                }
              }
            } catch {
              // 개별 Entity 오류 무시
            }
          });
        }
      }

      // 히트맵 그리기
      ensureHeatCanvas();
      const viewerAny = window.cviewer;
      const emph = viewerAny ? getZoomEmphasis(viewerAny) : 0; // 0~1

      const metersPerPixel = getMetersPerPixel(viewer);

      // drawHeatmap의 세 번째 인자는 이제 MPP로 전달
      drawHeatmap(heatPoints, emph, metersPerPixel);
      // 정리
      stationElementsRef.current.forEach((element, entityId) => {
        if (!currentEntityIds.has(entityId)) {
          element.remove();
          stationElementsRef.current.delete(entityId);
        }
      });
      sensorElementsRef.current.forEach((element, entityId) => {
        if (!currentSensorIds.has(entityId)) {
          element.remove();
          sensorElementsRef.current.delete(entityId);
        }
      });

    } catch (error) {
      console.error('[SimulationStationHtmlRenderer] Position update error:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    createOrUpdateStationElement,
    createOrUpdateSensorElement,
    selectedStationId,
    ensureHeatCanvas,
    drawHeatmap,
  ]);

  useEffect(() => {
    const viewer = window.cviewer;
    if (!viewer?.scene?.postRender) return;

    try {
      viewer.scene.postRender.addEventListener(updateStationPositions);
      // console.log('[SimulationStationHtmlRenderer] PostRender callback registered');
    } catch (error) {
      console.error('[SimulationStationHtmlRenderer] Failed to register postRender:', error);
    }

    return () => {
      const currentViewer = window.cviewer;
      if (currentViewer?.scene?.postRender) {
        try {
          currentViewer.scene.postRender.removeEventListener(updateStationPositions);
        } catch (error) {
          console.error('[SimulationStationHtmlRenderer] Failed to remove postRender:', error);
        }
      }

      stationElementsRef.current.forEach(element => element.remove());
      stationElementsRef.current.clear();
      sensorElementsRef.current.forEach(element => element.remove());
      sensorElementsRef.current.clear();

      if (heatCanvasRef.current) {
        heatCanvasRef.current.remove();
        heatCanvasRef.current = null;
        heatCtxRef.current = null;
      }
      heatAccumCanvasRef.current = null;
      heatAccumCtxRef.current = null;
      heatBlurCanvasRef.current = null;
      heatBlurCtxRef.current = null;
      heatColorCanvasRef.current = null;
      heatColorCtxRef.current = null;
      colorLUTRef.current = null;
    };
  }, [updateStationPositions]);

  // ===== 우측 하단 범례 =====
  useEffect(() => {
    if (!containerRef.current) return;
    const legend = document.createElement('div');
    legend.style.position = 'absolute';
    legend.style.right = '12px';
    legend.style.bottom = '12px';
    legend.style.padding = '8px 10px';
    legend.style.background = 'rgba(20,20,20,0.7)';
    legend.style.borderRadius = '6px';
    legend.style.color = '#fff';
    legend.style.fontSize = '12px';
    legend.style.zIndex = '1400';
    legend.style.pointerEvents = 'none';
    legend.style.lineHeight = '1.2';
    legend.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;">PM10 (μg/m³)</div>
      <div style="display:flex;gap:4px;align-items:flex-end;">
        ${LEGEND_COLORS.map((c, i) => `
          <div title="${i*10}–${i===9?100:(i*10+9)}" style="width:16px;height:12px;background:${c};border-radius:2px;"></div>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <span>0</span><span>50</span><span>100</span>
      </div>
    `;
    containerRef.current.appendChild(legend);
    return () => legend.remove();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 z-10 w-full h-full overflow-visible pointer-events-none whitespace-nowrap"
      style={{ overflow: 'visible' }}
    />
  );
};

SimulationStationHtmlRenderer.displayName = 'SimulationStationHtmlRenderer';
export default SimulationStationHtmlRenderer;
