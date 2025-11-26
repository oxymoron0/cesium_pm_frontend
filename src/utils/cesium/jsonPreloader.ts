/* eslint-disable */
// @ts-nocheck
// JSON 파티클 데이터 프리로더

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
  const { pointSize, count, positions, colors } = data;

  const dataPoints: JsonParticleDataPoint[] = [];
  const colorStride = Array.isArray(colors) && colors.length >= count * 4 ? 4 : 3;

  let sampleCounter = 0;

  for (let i = 0; i < count; i++) {
    if (sampleCounter % sampleRate !== 0) {
      sampleCounter++;
      continue;
    }
    sampleCounter++;

    const posIdx = i * 3;
    const colorIdx = i * colorStride;

    const x = positions[posIdx];
    const y = positions[posIdx + 1];
    const z = positions[posIdx + 2];

    const cartesian = new Cartesian3(x, y, z);
    const cartographic = Cartographic.fromCartesian(cartesian);
    const lon = CesiumMath.toDegrees(cartographic.longitude);
    const lat = CesiumMath.toDegrees(cartographic.latitude);
    const height = cartographic.height;

    const r = colors?.[colorIdx] ?? 1;
    const g = colors?.[colorIdx + 1] ?? 1;
    const b = colors?.[colorIdx + 2] ?? 1;
    const a = colorStride === 4 && colors?.[colorIdx + 3] !== undefined ? colors[colorIdx + 3] : 1;

    dataPoints.push({
      lon,
      lat,
      height,
      position: cartesian,
      color: { r, g, b, a }
    });
  }

  console.log(`✅ Parsed JSON: ${dataPoints.length} points (sample rate: 1/${sampleRate})`);

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
  sampleRate: number = 1
): Promise<void> {
  console.log(` [JSON Preloader] Starting preload for ${uuid} (${totalFrames} frames)`);

  const frameCache = new Map<number, JsonCacheEntry>();
  jsonCacheMap.set(uuid, frameCache);

  let loadedCount = 0;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const frameNumber = String(frameIndex + 1).padStart(4, '0');
    const jsonUrl = `${resultPath}Finedust_${frameNumber}.json`;

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
