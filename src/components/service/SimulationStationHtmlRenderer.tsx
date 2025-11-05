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
    if (value <= 30) return '#18A274';
    if (value <= 80) return '#FFD040';
    if (value <= 150) return '#F70';
    return '#D32F2D';
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
    '#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8',
    '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027',
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
    console.log(`[Heatmap] Low-res mode: ${dw}x${dh} (DPR: ${dpr})`);

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
              destination: Cartesian3.fromDegrees(lon, lat, 500),
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
  //const drawHeatmap = useCallback((points: HeatPoint[]) => {
  const drawHeatmap = useCallback((points: HeatPoint[], emph: number) => {
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
    
    // const viewer = (window as any).cviewer;
    // const cameraHeight = viewer?.camera?.positionCartographic?.height || 1000;

    // === 🔸 줌 레벨 보정 ===
    // (높을수록 작게, 낮을수록 크게. 500m~10km 구간 보정)
    //const scale = Math.min(3, Math.max(0.3, 2000 / cameraHeight));

    // (★) 히트맵 크기/강도 조절 포인트
    const BASE_RADIUS = 80;     // 내부 코어 반경 (CSS px)
    const BLUR_RADIUS = 120;    // 그라디언트 반경 (CSS px)
    const BLUR_PX = 60;         // 블러 강도(px, dpr 전)
    const ALPHA_BASE = 0.45;    // 최소 알파
    const ALPHA_GAIN = 0.85;    // 값에 따른 알파 가중
    
    // === 줌인 시 강조: 가까울수록 더 진하고(알파↑), 흐림↓, 반경↓(또렷) ===
    // emph: 0(멀리) ~ 1(가깝게)
    const radiusScale = lerp(1.0, 0.65, emph);           // 가까울수록 반경 65%까지 축소 → 또렷
    const blurScale   = lerp(1.0, 0.55, emph);           // 가까울수록 블러 55%
    const alphaBoost  = lerp(1.0, 1.8, emph);            // 가까울수록 알파 1.8배
    const gamma       = lerp(1.0, 0.75, emph);           // 가까울수록 색 대비(감마<1)↑

    const BASE_R = BASE_RADIUS * radiusScale;
    const BLUR_R = BLUR_RADIUS * radiusScale;


    // 1) 누적 레이어 초기화
    accCtx.setTransform(1, 0, 0, 1, 0, 0);
    accCtx.clearRect(0, 0, accCanvas.width, accCanvas.height);
    accCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    accCtx.globalCompositeOperation = 'source-over';

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
      const v01 = clamp01(value / 100);
      const a = (ALPHA_BASE + ALPHA_GAIN * v01) * alphaBoost;
      const grd = accCtx.createRadialGradient(x, y, 0, x, y, BLUR_R);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(BASE_R / BLUR_R, `rgba(255,255,255,${a * 0.6})`);
      grd.addColorStop(1, `rgba(255,255,255,0)`);
      accCtx.fillStyle = grd;
      accCtx.beginPath();
      accCtx.arc(x, y, BLUR_R, 0, Math.PI * 2);
      accCtx.fill();
    });

    // 2) 블러
    blurCtx.setTransform(1, 0, 0, 1, 0, 0);
    blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
    //blurCtx.filter = `blur(${Math.round(BLUR_PX * dpr)}px)`;
    blurCtx.filter = `blur(${Math.round(BLUR_PX * blurScale * dpr)}px)`;
    blurCtx.drawImage(accCanvas, 0, 0);
    blurCtx.filter = 'none';

    // 3) LUT 색상화
    colorCtx.setTransform(1, 0, 0, 1, 0, 0);
    colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);

    const img = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
    const out = colorCtx.createImageData(img.width, img.height);
    const src = img.data;
    const dst = out.data;

    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3];
      if (a === 0) continue;

      //const lutIdx = a << 2;
      // 감마 보정: 가까울수록 하이라이트쪽으로(감마<1)
      const na = Math.pow(a / 255, gamma) * 255;
      const lutIdx = (na & 255) << 2;

      dst[i] = lut[lutIdx];
      dst[i + 1] = lut[lutIdx + 1];
      dst[i + 2] = lut[lutIdx + 2];
      dst[i + 3] = Math.min(255, na);
    }
    colorCtx.putImageData(out, 0, 0);

    // 4) 메인 캔버스에 그리기 (줌인 시 약간 더 강하게 보이도록 globalAlpha로 미세 조정)
    viewCtx.save();
    const cssW = viewCanvas.width / dpr;
    const cssH = viewCanvas.height / dpr;
    viewCtx.clearRect(0, 0, cssW, cssH);
    viewCtx.globalCompositeOperation = 'source-over';
    viewCtx.globalAlpha = lerp(1.0, 1.15, emph); // 가까울수록 15% 더 강하게
    viewCtx.drawImage(colorCanvas, 0, 0, cssW, cssH);
    viewCtx.restore();
  }, []);

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
      console.log('[DEBUG] Station elements:', stationElementsRef.current.size);
      console.log('[DEBUG] Sensor elements:', sensorElementsRef.current.size);

      for (let i = 0; i < viewer.dataSources.length; i++) {
        const dataSource = viewer.dataSources.get(i);

        if (dataSource?.name === 'simulation_result_stations' && dataSource.show && dataSource.entities) {
          const entities = dataSource.entities.values;
          if (!entities) continue;

          console.log('[DEBUG] Entities count:', entities.length);

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
      drawHeatmap(heatPoints, emph);

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
