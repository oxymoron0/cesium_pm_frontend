/**
 * Heatmap 데이터 프리로더
 * (JSON Preloader와 로직은 거의 동일하나, 히트맵 전용 최적화나 데이터 구조 변경을 위해 분리)
 */

import { Cartesian3, Cartographic, Math as CesiumMath } from 'cesium';

export interface HeatmapDataPoint {
  lon: number;
  lat: number;
  value: number; // 0.0 ~ 1.0 (normalized intensity)
}

export interface HeatmapFrameData {
  dataPoints: HeatmapDataPoint[];
  bounds: {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
  };
}

export interface HeatmapCacheEntry {
  data: HeatmapFrameData;
  loaded: boolean;
  canvas?: HTMLCanvasElement; // 렌더링된 canvas 캐싱
}

export interface HeatmapPreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// 히트맵 정규화 설정
export const heatmapNormalizationSettings = {
  usePercentile: true,  // 백분위수 기반 정규화 사용 여부
  maxPercentile: 95,    // 최대값으로 사용할 백분위수 (98 -> 95로 복구하여 고농도 표현력 확보)
  minPercentile: 5,     // 최소값으로 사용할 백분위수 (하위 5% 제외)
  useLogScale: false,   // 로그 스케일 정규화 사용 여부
};

export function updateNormalizationSettings(settings: Partial<typeof heatmapNormalizationSettings>) {
  Object.assign(heatmapNormalizationSettings, settings);
}

export function getNormalizationSettings() {
  return { ...heatmapNormalizationSettings };
}

const heatmapCacheMap = new Map<string, Map<number, HeatmapCacheEntry>>();

/**
 * 백분위수 계산 (정렬된 배열에서)
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * JSON 파싱 및 히트맵 데이터로 변환
 * @param jsonUrl JSON 파일 URL
 * @param sampleRate 샘플링 비율 (1 = 전체, 2 = 1/2, 10 = 1/10 등)
 */
async function parseHeatmapJson(jsonUrl: string, sampleRate: number = 1, frameIndex?: number): Promise<HeatmapFrameData> {
  const response = await fetch(jsonUrl);

  if (!response.ok) {
    console.error(` Heatmap fetch failed: ${response.status} ${response.statusText}`);
    return { 
      dataPoints: [], 
      bounds: { minLon: 0, maxLon: 0, minLat: 0, maxLat: 0 } 
    };
  }

  const data = await response.json();
  const { count, positions, alpha, colors } = data;

  console.log(`[Heatmap] Parsing Frame ${frameIndex ?? '?'} from ${jsonUrl}`);
  // console.log(`[Heatmap] Data structure:`, { count, hasAlpha: !!alpha, hasColors: !!colors });

  const dataPoints: HeatmapDataPoint[] = [];

  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;

  const hasColorsArray = !!colors;

  // 중복 좌표 처리를 위한 Map (key: "lon,lat", value: {sum, count})
  const pointMap = new Map<string, { sum: number; count: number; lon: number; lat: number }>();

  let minAlt = Number.MAX_VALUE;
  let maxAlt = Number.MIN_VALUE;

  for (let i = 0; i < count; i++) {
    // 히트맵은 데이터가 많을수록 좋으므로 기본 샘플링은 1(전부 사용)로 설정
    if (i % sampleRate !== 0) continue;

    const posIdx = i * 3;
    const x = positions[posIdx];
    const y = positions[posIdx + 1];
    const z = positions[posIdx + 2];

    const cartesian = new Cartesian3(x, y, z);
    const cartographic = Cartographic.fromCartesian(cartesian);
    const lon = CesiumMath.toDegrees(cartographic.longitude);
    const lat = CesiumMath.toDegrees(cartographic.latitude);
    const alt = cartographic.height;

    // 고도 범위 추적
    if (alt < minAlt) minAlt = alt;
    if (alt > maxAlt) maxAlt = alt;

    // 범위 계산
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;

    // Intensity (Value) 추출
    // alpha 배열이 실제 PM 농도 정규화 값이므로 우선 사용
    // colors는 시각화용 RGB 값이므로 히트맵 값으로 사용하지 않음
    let value = 0;
    if (alpha && alpha[i] !== undefined) {
      // alpha 값 사용 (PM 농도 정규화 값)
      value = alpha[i];
    } else if (hasColorsArray) {
      // alpha가 없는 경우에만 colors의 R 채널 사용
      const colorIdx = i * 3;
      value = colors[colorIdx] ?? 0;
    }

    // 중복 좌표 처리: 같은 lon,lat에 대해 값 누적
    const key = `${lon.toFixed(6)},${lat.toFixed(6)}`; // 소수점 6자리로 반올림하여 키 생성
    const existing = pointMap.get(key);
    if (existing) {
      existing.sum += value;
      existing.count++;
    } else {
      pointMap.set(key, { sum: value, count: 1, lon, lat });
    }
  }

  // Map에서 평균값으로 dataPoints 생성
  for (const point of pointMap.values()) {
    dataPoints.push({
      lon: point.lon,
      lat: point.lat,
      value: point.sum / point.count // 평균값 사용
    });
  }

  // 2. 값 정규화 (Normalization): 0.0 ~ 1.0 사이로 매핑
  let minVal: number;
  let maxVal: number;

  // 값 분포 상세 로깅
  const sortedValues = dataPoints.map(p => p.value).sort((a, b) => a - b);
  const absMin = sortedValues[0];
  const absMax = sortedValues[sortedValues.length - 1];

  // console.log(`[Heatmap] ===== 값 분포 분석 =====`);
  // console.log(`[Heatmap] 전체 범위: ${absMin.toFixed(6)} ~ ${absMax.toFixed(6)}`);
  // console.log(`[Heatmap] 백분위수: 50th=${calculatePercentile(sortedValues, 50).toFixed(6)}, 75th=${calculatePercentile(sortedValues, 75).toFixed(6)}, 90th=${calculatePercentile(sortedValues, 90).toFixed(6)}, 95th=${calculatePercentile(sortedValues, 95).toFixed(6)}, 99th=${calculatePercentile(sortedValues, 99).toFixed(6)}`);

  if (heatmapNormalizationSettings.usePercentile) {
    // 백분위수 기반 정규화
    minVal = calculatePercentile(sortedValues, heatmapNormalizationSettings.minPercentile);
    maxVal = calculatePercentile(sortedValues, heatmapNormalizationSettings.maxPercentile);

    // 안전장치: minVal과 maxVal이 너무 가까우면(데이터가 균일하면) 범위를 강제로 늘림
    if (maxVal - minVal < 0.000001) {
       console.warn(`[Heatmap] Normalization range too small (${minVal}~${maxVal}). Using absolute range.`);
       minVal = absMin;
       maxVal = absMax;
       // 그래도 작으면 0~1 강제 적용
       if (maxVal - minVal < 0.000001) {
         minVal = 0;
         maxVal = 1;
       }
    }

    // console.log(`[Heatmap] 정규화 범위(Pctl): ${minVal.toFixed(6)} ~ ${maxVal.toFixed(6)}`);
  } else {
    // 기존 Min-Max 정규화
    minVal = absMin;
    maxVal = absMax;
    // console.log(`[Heatmap] 정규화 범위(MinMax): ${minVal.toFixed(6)} ~ ${maxVal.toFixed(6)}`);
  }

  const range = maxVal - minVal;
  let sumNormalized = 0;

  if (range > 0) {
    if (heatmapNormalizationSettings.useLogScale) {
       // 로그 스케일 정규화 (생략 - 기존 로직 유지)
       const minPositive = Math.max(minVal, 0.0001);
       const logMin = Math.log(minPositive);
       const logMax = Math.log(maxVal);
       const logRange = logMax - logMin;
 
       for (const p of dataPoints) {
         if (p.value <= 0) {
           p.value = 0;
         } else {
           const clampedValue = Math.max(minPositive, Math.min(maxVal, p.value));
           const logValue = Math.log(clampedValue);
           p.value = Math.max(0, Math.min(1, (logValue - logMin) / logRange));
         }
         sumNormalized += p.value;
       }
    } else {
      // 선형 정규화
      for (const p of dataPoints) {
        // (값 - 최소값) / 범위 -> 0 ~ 1
        // 범위를 벗어나는 값은 0 또는 1로 클램핑
        p.value = Math.max(0, Math.min(1, (p.value - minVal) / range));
        sumNormalized += p.value;
      }
    }

    const meanNormalized = sumNormalized / dataPoints.length;
    console.log(`[Heatmap] Frame ${frameIndex ?? '?'} Normalized Stats: Mean=${meanNormalized.toFixed(3)} (If > 0.5, heatmap will be bright)`);

  } else {
    // 모든 값이 같으면 중간값 0.5로 통일
    console.warn(`[Heatmap] All values are identical (${minVal}), setting to 0.5`);
    for (const p of dataPoints) {
      p.value = 0.5;
    }
  }

  return {
    dataPoints,
    bounds: { minLon, maxLon, minLat, maxLat }
  };
}

/**
 * JSON 파일들을 프리로드
 *
 * 경로 구조: ${VITE_SIM_PATH}/${uuid}/Finedust_XXXX.json
 * - Dev: Vite plugin serves from SIM_LOCAL_PATH (e.g., /mnt/nfs)
 * - Prod: nginx serves from mounted path
 */
export async function preloadHeatmap(
  uuid: string,
  _resultPath: string, // deprecated: kept for backward compatibility
  totalFrames: number,
  onProgress?: (progress: HeatmapPreloadProgress) => void
): Promise<void> {
  let frameCache = heatmapCacheMap.get(uuid);

  if (frameCache) {
    let loadedCount = 0;
    frameCache.forEach(entry => { if (entry.loaded) loadedCount++; });
    if (loadedCount === totalFrames) return;
  } else {
    frameCache = new Map<number, HeatmapCacheEntry>();
    heatmapCacheMap.set(uuid, frameCache);
  }

  // Build path using environment variables: VITE_BASE_PATH + VITE_SIM_PATH
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  const simPath = import.meta.env.VITE_SIM_PATH || 'sim';
  const normalizedPath = `${basePath}${simPath}/${uuid}/`;

  let loadedCount = 0;
  frameCache.forEach(entry => { if (entry.loaded) loadedCount++; });

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (frameCache.get(frameIndex)?.loaded) continue;

    const frameNumber = String(frameIndex + 1).padStart(4, '0');
    const jsonUrl = `${normalizedPath}Finedust_${frameNumber}.json`;

    try {
      const frameData = await parseHeatmapJson(jsonUrl, 15, frameIndex); // 1/15 샘플링으로 속도 향상
      frameCache.set(frameIndex, { data: frameData, loaded: true });
      loadedCount++;
      onProgress?.({ loaded: loadedCount, total: totalFrames, percentage: Math.round((loadedCount / totalFrames) * 100) });
    } catch (error) {
      console.error(`Heatmap load failed: ${jsonUrl}`, error);
    }
  }
}

export function getCachedHeatmapEntry(uuid: string, frameIndex: number): HeatmapCacheEntry | null {
  return heatmapCacheMap.get(uuid)?.get(frameIndex) || null;
}

export function cacheHeatmapCanvas(uuid: string, frameIndex: number, canvas: HTMLCanvasElement): void {
  const entry = heatmapCacheMap.get(uuid)?.get(frameIndex);
  if (entry) {
    entry.canvas = canvas;
  }
}

export function getHeatmapCacheStatus(uuid: string) {
  const cache = heatmapCacheMap.get(uuid);
  if (!cache) return { isCached: false, loadedFrames: 0 };
  let loaded = 0;
  cache.forEach(e => { if (e.loaded) loaded++; });
  return { isCached: loaded > 0, loadedFrames: loaded };
}

export function clearHeatmapCache(uuid?: string) {
  if (uuid) heatmapCacheMap.delete(uuid);
  else heatmapCacheMap.clear();
}
