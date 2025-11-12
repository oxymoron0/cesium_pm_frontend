/**
 * GLB 프리로더 및 캐싱 시스템
 *
 * UUID 기반 캐싱으로 시뮬레이션 GLB 파일을 사전 로드하여
 * 네트워크 지연 없이 부드러운 재생 제공
 */

/**
 * 캐시 엔트리 타입
 */
type GlbCacheEntry = {
  url: string;          // 원본 URL
  blob: Blob;           // 다운로드된 파일 데이터
  objectUrl: string;    // blob:// URL (Cesium에서 사용)
}

/**
 * 프리로드 진행 상태
 */
export type PreloadProgress = {
  loaded: number;       // 로드 완료된 파일 수
  total: number;        // 전체 파일 수
  percentage: number;   // 진행률 (0-100)
  currentFrame: number; // 현재 로딩 중인 프레임
}

/**
 * 현재 캐시된 시뮬레이션 UUID
 */
let currentCachedUuid: string | null = null;

/**
 * GLB 프레임 캐시 (단일 시뮬레이션)
 */
const frameCache = new Map<number, GlbCacheEntry>();

/**
 * 현재 진행 중인 프리로드 작업
 * 팝업 닫기 시 fetch 중단용
 */
let currentAbortController: AbortController | null = null;

/**
 * 시뮬레이션 GLB 파일 일괄 프리로드
 *
 * @param uuid - 시뮬레이션 UUID
 * @param resultPath - GLB 파일 디렉토리 경로 (예: /api/simulation/result/...)
 * @param totalFrames - 총 프레임 개수
 * @param onProgress - 진행 상황 콜백 (optional)
 * @returns Promise (모든 프레임 로드 완료 시 resolve)
 */
export async function preloadSimulationGlbs(
  uuid: string,
  resultPath: string,
  totalFrames: number,
  onProgress?: (progress: PreloadProgress) => void
): Promise<void> {
  // 이미 캐시되어 있으면 스킵
  if (currentCachedUuid === uuid && frameCache.size === totalFrames) {
    console.log(`[glbPreloader] Already cached: ${uuid}`);
    return;
  }

  // 다른 시뮬레이션이 캐시되어 있으면 제거
  if (currentCachedUuid && currentCachedUuid !== uuid) {
    console.log(`[glbPreloader] Clearing previous cache: ${currentCachedUuid}`);
    clearGlbCache();
  }

  // AbortController 생성
  const abortController = new AbortController();
  currentAbortController = abortController;

  // UUID 설정
  currentCachedUuid = uuid;

  // GLB 파일 경로 정규화
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  const normalizedPath = basePath.endsWith('/') && resultPath.startsWith('/')
    ? basePath + resultPath.slice(1)
    : basePath + resultPath;

  console.log(`[glbPreloader] Starting preload: ${uuid} (${totalFrames} frames)`);

  let loadedCount = 0;

  try {
    // 병렬 로드 (청크 단위로 분할하여 브라우저 부담 완화)
    const CHUNK_SIZE = 10; // 동시에 10개씩 로드

    for (let chunkStart = 0; chunkStart < totalFrames; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalFrames);
      const chunkPromises: Promise<void>[] = [];

      for (let i = chunkStart; i < chunkEnd; i++) {
        const frameIndex = i;
        const fileNumber = String(frameIndex + 1).padStart(4, '0');
        const glbUrl = `${normalizedPath}Finedust_${fileNumber}.glb`;

        const loadPromise = fetch(glbUrl, { signal: abortController.signal })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${glbUrl}: ${response.status}`);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            frameCache.set(frameIndex, {
              url: glbUrl,
              blob,
              objectUrl
            });

            loadedCount++;

            // 진행 상황 콜백
            if (onProgress) {
              onProgress({
                loaded: loadedCount,
                total: totalFrames,
                percentage: Math.round((loadedCount / totalFrames) * 100),
                currentFrame: frameIndex
              });
            }
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              console.log(`[glbPreloader] Aborted: Frame ${frameIndex}`);
            } else {
              console.error(`[glbPreloader] Failed to load frame ${frameIndex}:`, error);
            }
          });

        chunkPromises.push(loadPromise);
      }

      // 청크 단위로 대기
      await Promise.all(chunkPromises);
    }

    console.log(`[glbPreloader] Completed: ${uuid} (${loadedCount}/${totalFrames} frames)`);

  } catch (error) {
    console.error(`[glbPreloader] Preload failed for ${uuid}:`, error);

    // 실패 시 부분 캐시도 정리
    clearGlbCache();

    throw error;
  } finally {
    if (currentAbortController === abortController) {
      currentAbortController = null;
    }
  }
}

/**
 * 캐시에서 GLB ObjectURL 가져오기
 *
 * @param uuid - 시뮬레이션 UUID
 * @param frameIndex - 프레임 인덱스 (0-based)
 * @returns ObjectURL (캐시 미스 시 null)
 */
export function getCachedGlbUrl(uuid: string, frameIndex: number): string | null {
  // UUID가 다르면 캐시 미스
  if (currentCachedUuid !== uuid) {
    return null;
  }

  const entry = frameCache.get(frameIndex);
  return entry?.objectUrl || null;
}

/**
 * 캐시 정리 및 메모리 해제
 */
export function clearGlbCache(): void {
  // ObjectURL 메모리 해제
  frameCache.forEach((entry) => {
    URL.revokeObjectURL(entry.objectUrl);
  });
  frameCache.clear();

  // 진행 중인 프리로드 작업 중단 (팝업 닫을 때 fetch 중단)
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  currentCachedUuid = null;

  console.log('[glbPreloader] Cleared cache');
}

/**
 * 캐시 상태 확인
 *
 * @param uuid - 시뮬레이션 UUID
 * @returns 캐시 여부 및 로드된 프레임 수
 */
export function getGlbCacheStatus(uuid: string): {
  isCached: boolean;
  loadedFrames: number;
} {
  if (currentCachedUuid !== uuid) {
    return { isCached: false, loadedFrames: 0 };
  }

  return {
    isCached: true,
    loadedFrames: frameCache.size
  };
}

