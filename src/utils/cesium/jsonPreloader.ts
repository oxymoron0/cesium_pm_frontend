/**
 * JSON 파티클 데이터 프리로더
 */

import { Cartesian3, Cartographic, Math as CesiumMath } from 'cesium';

export interface JsonParticleDataPoint {
  lon: number;
  lat: number;
  height: number;
  position: Cartesian3;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

export interface JsonFrameData {
  dataPoints: JsonParticleDataPoint[];
  pointSize: number;
}

export interface JsonCacheEntry {
  data: JsonFrameData;
  loaded: boolean;
}

export interface JsonPreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// 시뮬레이션별 JSON 캐시
const jsonCacheMap = new Map<string, Map<number, JsonCacheEntry>>();

/**
 * JSON 파싱
 */
async function parseJson(jsonUrl: string, sampleRate: number = 1): Promise<JsonFrameData> {
  const response = await fetch(jsonUrl);

  if (!response.ok) {
    console.error(` JSON fetch failed: ${response.status} ${response.statusText} for ${jsonUrl}`);
    return { dataPoints: [], pointSize: 1 };
  }

  const data = await response.json();
  const { pointSize, count, positions, color, alpha, colors } = data;

  const dataPoints: JsonParticleDataPoint[] = [];

  // 두 가지 JSON 구조 지원:
  // 1. colors 배열 (RGB per particle): {colors: [r,g,b,r,g,b,...]}
  // 2. color + alpha (single color): {color: [r,g,b], alpha: [...]}
  const hasColorsArray = !!colors;

  for (let i = 0; i < count; i++) {
    // 샘플링: sampleRate가 5이면 5개 중 1개만 표출
    if (i % sampleRate !== 0) continue;

    const posIdx = i * 3;

    const x = positions[posIdx];
    const y = positions[posIdx + 1];
    const z = positions[posIdx + 2];

    const cartesian = new Cartesian3(x, y, z);
    const cartographic = Cartographic.fromCartesian(cartesian);
    const lon = CesiumMath.toDegrees(cartographic.longitude);
    const lat = CesiumMath.toDegrees(cartographic.latitude);
    const height = cartographic.height;

    let r: number, g: number, b: number, a: number;

    if (hasColorsArray) {
      // colors 배열: RGB per particle
      const colorIdx = i * 3;
      r = colors[colorIdx] ?? 1;
      g = colors[colorIdx + 1] ?? 1;
      b = colors[colorIdx + 2] ?? 1;
      a = 1; // colors 배열 구조에는 alpha 없음
    } else {
      // color + alpha: 단일 색상 + 개별 alpha
      r = color?.[0] ?? 1;
      g = color?.[1] ?? 1;
      b = color?.[2] ?? 1;
      a = alpha?.[i] ?? 1;
    }

    dataPoints.push({
      lon,
      lat,
      height,
      position: cartesian,
      color: { r, g, b, a }
    });
  }

  console.log(`✅ Parsed JSON: ${dataPoints.length} points (sampled from ${count}, rate: 1/${sampleRate})`);

  return { dataPoints, pointSize: pointSize || 1 };
}

/**
 * JSON 파일들을 프리로드
 *
 * 경로 구조: ${VITE_SIM_PATH}/${uuid}/Finedust_XXXX.json
 * - Dev: Vite plugin serves from SIM_LOCAL_PATH (e.g., /mnt/nfs)
 * - Prod: nginx serves from mounted path
 */
export async function preloadJson(
  uuid: string,
  _resultPath: string, // deprecated: kept for backward compatibility
  totalFrames: number,
  onProgress?: (progress: JsonPreloadProgress) => void,
  sampleRate: number = 1
): Promise<void> {
  console.log(` [JSON Preloader] Starting preload for ${uuid} (${totalFrames} frames)`);

  // 기존 캐시 확인
  let frameCache = jsonCacheMap.get(uuid);

  // 이미 완전히 로드된 경우 즉시 리턴 (onProgress 호출 없음)
  if (frameCache) {
    let loadedCount = 0;
    frameCache.forEach(entry => {
      if (entry.loaded) loadedCount++;
    });

    if (loadedCount === totalFrames) {
      console.log(` [JSON Preloader] Already fully loaded: ${loadedCount}/${totalFrames} frames`);
      return;
    }
    console.log(` [JSON Preloader] Partially loaded: ${loadedCount}/${totalFrames} frames, continuing...`);
  } else {
    // 캐시가 없으면 새로 생성
    frameCache = new Map<number, JsonCacheEntry>();
    jsonCacheMap.set(uuid, frameCache);
  }

  // Build path using environment variables: VITE_BASE_PATH + VITE_SIM_PATH
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  const simPath = import.meta.env.VITE_SIM_PATH || 'sim';
  const normalizedPath = `${basePath}${simPath}/${uuid}/`;

  console.log("[JSON Preloader] Base path:", normalizedPath);
  console.log("[JSON Preloader] Base path:", basePath);
  console.log("[JSON Preloader] Base path:", simPath);

  // 기존에 로드된 프레임 수 계산
  let loadedCount = 0;
  frameCache.forEach(entry => {
    if (entry.loaded) loadedCount++;
  });

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    // 이미 로드된 프레임은 건너뛰기
    const existingEntry = frameCache.get(frameIndex);
    if (existingEntry && existingEntry.loaded) {
      console.log(` Frame ${frameIndex}: Already cached, skipping`);
      continue;
    }

    const frameNumber = String(frameIndex + 1).padStart(4, '0');
    const jsonUrl = `${normalizedPath}Finedust_${frameNumber}.json`;

    try {
      console.log(`📥 Frame ${frameIndex}: Fetching ${jsonUrl}`);
      const frameData = await parseJson(jsonUrl, sampleRate);

      frameCache.set(frameIndex, {
        data: frameData,
        loaded: true
      });

      loadedCount++;

      if (onProgress) {
        onProgress({
          loaded: loadedCount,
          total: totalFrames,
          percentage: Math.round((loadedCount / totalFrames) * 100)
        });
      }

      console.log(` Frame ${frameIndex}: ${frameData.dataPoints.length} particles loaded from ${jsonUrl}`);
    } catch (error) {
      console.error(` Frame ${frameIndex} load failed (${jsonUrl}):`, error);
      frameCache.set(frameIndex, {
        data: { dataPoints: [], pointSize: 1 },
        loaded: false
      });
    }
  }

  console.log(` [JSON Preloader] Preload complete: ${loadedCount}/${totalFrames} frames`);
}

/**
 * 단일 JSON 프레임 로드 (우선순위 조회용)
 *
 * @param uuid - 시뮬레이션 UUID
 * @param frameIndex - 로드할 프레임 인덱스 (0부터 시작)
 * @param sampleRate - 샘플링 비율
 */
export async function preloadSingleJsonFrame(
  uuid: string,
  frameIndex: number,
  sampleRate: number = 5
): Promise<void> {
  console.log(`[JSON Preloader] Loading single frame ${frameIndex} for ${uuid}`);

  // 캐시 확인/생성
  let frameCache = jsonCacheMap.get(uuid);
  if (!frameCache) {
    frameCache = new Map<number, JsonCacheEntry>();
    jsonCacheMap.set(uuid, frameCache);
  }

  // 이미 로드된 프레임이면 스킵
  const existingEntry = frameCache.get(frameIndex);
  if (existingEntry && existingEntry.loaded) {
    console.log(`[JSON Preloader] Frame ${frameIndex} already cached`);
    return;
  }

  // 경로 구성
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  const simPath = import.meta.env.VITE_SIM_PATH || 'sim';
  const normalizedPath = `${basePath}${simPath}/${uuid}/`;

  const frameNumber = String(frameIndex + 1).padStart(4, '0');
  const jsonUrl = `${normalizedPath}Finedust_${frameNumber}.json`;

  try {
    console.log(`📥 Loading frame ${frameIndex}: ${jsonUrl}`);
    const frameData = await parseJson(jsonUrl, sampleRate);

    frameCache.set(frameIndex, {
      data: frameData,
      loaded: true
    });

    console.log(`✅ Frame ${frameIndex} loaded: ${frameData.dataPoints.length} particles`);
  } catch (error) {
    console.error(`❌ Frame ${frameIndex} load failed (${jsonUrl}):`, error);
    frameCache.set(frameIndex, {
      data: { dataPoints: [], pointSize: 1 },
      loaded: false
    });
    throw error;
  }
}

/**
 * 캐시된 프레임 데이터 가져오기
 */
export function getCachedJsonFrameData(uuid: string, frameIndex: number): JsonFrameData | null {
  const frameCache = jsonCacheMap.get(uuid);
  if (!frameCache) return null;

  const entry = frameCache.get(frameIndex);
  if (!entry || !entry.loaded) return null;

  return entry.data;
}

/**
 * 캐시 상태 확인
 */
export function getJsonCacheStatus(uuid: string): { isCached: boolean; loadedFrames: number } {
  const frameCache = jsonCacheMap.get(uuid);
  if (!frameCache) {
    return { isCached: false, loadedFrames: 0 };
  }

  let loadedFrames = 0;
  frameCache.forEach(entry => {
    if (entry.loaded) loadedFrames++;
  });

  return {
    isCached: loadedFrames > 0,
    loadedFrames
  };
}

/**
 * 캐시 제거
 */
export function clearJsonCache(uuid?: string): void {
  if (uuid) {
    jsonCacheMap.delete(uuid);
    console.log(` [JSON Preloader] Cache cleared for ${uuid}`);
  } else {
    jsonCacheMap.clear();
    console.log(' [JSON Preloader] All caches cleared');
  }
}
