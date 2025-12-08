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
async function parseJson(jsonUrl: string, sampleRate: number = 5): Promise<JsonFrameData> {
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
 */
export async function preloadJson(
  uuid: string,
  resultPath: string,
  totalFrames: number,
  onProgress?: (progress: JsonPreloadProgress) => void,
  sampleRate: number = 5
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

  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  // TODO: 실제 경로에 맞게 수정 필요. 현재는 CSV Preloader와 동일한 로직 적용
  resultPath = `/results/convert/aabc67b9-1ff3-40b1-92c4-1a32676565eb/`; // 테스트용 하드코딩이 필요하다면 여기에

  const normalizedPath = basePath.endsWith('/') && resultPath.startsWith('/')
    ? basePath + resultPath.slice(1)
    : basePath + resultPath;

  console.log("실제 api 경로 : ", normalizedPath);

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
