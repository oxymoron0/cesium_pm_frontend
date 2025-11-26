/* eslint-disable */
// @ts-nocheck
// CSV 파티클 데이터 프리로더

import proj4 from 'proj4';

export interface ParticleDataPoint {
  lon: number;
  lat: number;
  height: number;
  pm10_micro: number;
}

export interface Pm10RangeInfo {
  min: number;
  max: number;
}

export interface CsvCacheEntry {
  data: ParticleDataPoint[];
  loaded: boolean;
}

export interface CsvPreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// 시뮬레이션별 CSV 캐시
const csvCacheMap = new Map<string, Map<number, CsvCacheEntry>>();

// 시뮬레이션별 PM10 범위 정보
const pm10RangeMap = new Map<string, Pm10RangeInfo>();

// EPSG:5186 정의
proj4.defs("EPSG:5186",
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 " + 
  "+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);

// 좌표 변환 로그 플래그
let coordTransformLogged = false;

// EPSG:5186 → WGS84 변환
function epsg5186ToWgs84(x: number, y: number): [number, number] {
  try {
    const [lon, lat] = proj4('EPSG:5186', 'EPSG:4326', [x, y]);
    if (!coordTransformLogged) {
      console.log(` proj4 사용 중`);
      coordTransformLogged = true;
    }
    return [lon, lat];
  } catch (e) {
    console.error(' proj4 변환 실패:', e);
    // fallback은 제거 (에러 시 [0, 0] 반환)
    return [0, 0];
  }
}

/**
 * PM10 범위 계산 (첫 번째 CSV에서 min/max 찾기)
 */
function calculatePm10Range(dataPoints: ParticleDataPoint[]): Pm10RangeInfo {
  if (dataPoints.length === 0) {
    return { min: 0, max: 100 };
  }

  // spread operator는 큰 배열에서 call stack 초과 → 반복문 사용
  let min = dataPoints[0].pm10_micro;
  let max = dataPoints[0].pm10_micro;

  for (const point of dataPoints) {
    if (point.pm10_micro < min) min = point.pm10_micro;
    if (point.pm10_micro > max) max = point.pm10_micro;
  }

  console.log(` [PM10 Range] min: ${min.toFixed(2)}, max: ${max.toFixed(2)}`);

  return { min, max };
}

// CSV 파싱 (샘플링)
async function parseCSV(
  csvUrl: string,
  sampleRate: number = 5,
  minPm10: number = 0
): Promise<ParticleDataPoint[]> {
  const response = await fetch(csvUrl);

  if (!response.ok) {
    console.error(` CSV fetch failed: ${response.status} ${response.statusText} for ${csvUrl}`);
    return [];
  }

  const csvText = await response.text();
  console.log(` CSV loaded: ${csvText.length} bytes, first 200 chars: ${csvText.substring(0, 200)}`);

  const lines = csvText.trim().split('\n');
  console.log(` CSV has ${lines.length} lines`);

  const dataPoints: ParticleDataPoint[] = [];
  let filteredByPm10 = 0;
  let firstCoordLogged = false;

  for (let i = 1; i < lines.length; i++) {
    //if (i % sampleRate !== 0) continue;  // 샘플링 비활성화 - 모든 데이터 표출

    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    if (values.length < 4) continue;

    const pm10_raw = parseFloat(values[0]);
    const x_5186 = parseFloat(values[1]);
    const y_5186 = parseFloat(values[2]);
    const z = parseFloat(values[3]);

    if (isNaN(pm10_raw) || isNaN(x_5186) || isNaN(y_5186)) continue;

    const pm10_micro = pm10_raw * 1e9;

    if (pm10_micro < minPm10) {
      filteredByPm10++;
      continue;
    }

    const [lon, lat] = epsg5186ToWgs84(x_5186, y_5186);

    // 첫 좌표만 로그 출력 (디버깅용)
    if (!firstCoordLogged) {
      console.log(` 첫 번째 좌표: EPSG:5186(${x_5186}, ${y_5186}) → WGS84(경도: ${lon.toFixed(6)}, 위도: ${lat.toFixed(6)}), PM10: ${pm10_micro.toFixed(2)}`);
      firstCoordLogged = true;
    }

    dataPoints.push({
      lon,
      lat,
      height: z || 0,
      pm10_micro,
    });
  }

  console.log(` Parsed: ${dataPoints.length} points (filtered ${filteredByPm10} by PM10 < ${minPm10})`);

  return dataPoints;
}

/**
 * CSV 파일들을 프리로드
 */
export async function preloadCsv(
  uuid: string,
  resultPath: string,
  totalFrames: number,
  onProgress?: (progress: CsvPreloadProgress) => void,
  sampleRate: number = 5,
  minPm10: number = 45,
): Promise<void> {
  console.log(` [CSV Preloader] Starting preload for ${uuid} (${totalFrames} frames)`);

  // 캐시 초기화
  const frameCache = new Map<number, CsvCacheEntry>();
  csvCacheMap.set(uuid, frameCache);

  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  resultPath = `/results/aabc67b9-1ff3-40b1-92c4-1a32676565eb/`;
  const normalizedPath = basePath.endsWith('/') && resultPath.startsWith('/')
  ? basePath + resultPath.slice(1)
  : basePath + resultPath
  console.log("실제 api 경로 : ", normalizedPath)

  let loadedCount = 0;

  // 순차 로딩
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const frameNumber = String(frameIndex + 1).padStart(4, '0');
    const csvUrl = `${normalizedPath}Finedust_${frameNumber}.csv`;

    try {
      console.log(` Frame ${frameIndex}: Fetching ${csvUrl}`);
      const dataPoints = await parseCSV(csvUrl, sampleRate, minPm10);

      // 첫 번째 프레임에서 PM10 범위 계산
      if (frameIndex === 0 && dataPoints.length > 0) {
        const rangeInfo = calculatePm10Range(dataPoints);
        pm10RangeMap.set(uuid, rangeInfo);
        console.log(` [PM10 Range] Calculated for ${uuid}:`, rangeInfo);
      }

      frameCache.set(frameIndex, {
        data: dataPoints,
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

      console.log(` Frame ${frameIndex}: ${dataPoints.length} particles loaded from ${csvUrl}`);
    } catch (error) {
      console.error(` Frame ${frameIndex} load failed (${csvUrl}):`, error);
      frameCache.set(frameIndex, {
        data: [],
        loaded: false
      });
    }
  }

  console.log(` [CSV Preloader] Preload complete: ${loadedCount}/${totalFrames} frames`);
}

/**
 * 캐시된 프레임 데이터 가져오기
 */
export function getCachedFrameData(uuid: string, frameIndex: number): ParticleDataPoint[] | null {
  const frameCache = csvCacheMap.get(uuid);
  if (!frameCache) return null;

  const entry = frameCache.get(frameIndex);
  if (!entry || !entry.loaded) return null;

  return entry.data;
}

/**
 * 캐시 상태 확인
 */
export function getCsvCacheStatus(uuid: string): { isCached: boolean; loadedFrames: number } {
  const frameCache = csvCacheMap.get(uuid);
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
 * PM10 범위 정보 가져오기
 */
export function getPm10RangeInfo(uuid: string): Pm10RangeInfo | null {
  return pm10RangeMap.get(uuid) || null;
}

/**
 * 캐시 제거
 */
export function clearCsvCache(uuid?: string): void {
  if (uuid) {
    csvCacheMap.delete(uuid);
    pm10RangeMap.delete(uuid);
    console.log(` [CSV Preloader] Cache cleared for ${uuid}`);
  } else {
    csvCacheMap.clear();
    pm10RangeMap.clear();
    console.log(' [CSV Preloader] All caches cleared');
  }
}
