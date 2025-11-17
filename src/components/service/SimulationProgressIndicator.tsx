import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import {
  prepareSimulationGlb,
  renderSimulationGlbFrame,
  clearSimulationGlbs,
  flyToSimulationGlb
} from '@/utils/cesium/simulationGlbRenderer';
import { preloadSimulationGlbs, getGlbCacheStatus, type PreloadProgress } from '@/utils/cesium/glbPreloader';

const SimulationProgressIndicator = observer(function SimulationProgressIndicator() {
  const totalFrames = 18;
  const delayMs = 300;
  
  // 프레임당 실제 소요 시간을 기반으로 시간 표시를 위한 계산
  const crossFadeDurationMs = delayMs + 50;
  const actualFrameIntervalMs = crossFadeDurationMs + delayMs;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState<number>(0);
  
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress | null>(null);

  // 애니메이션 루프 제어를 위한 핵심 Ref들
  const playIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);

  // isPlaying state가 변경될 때마다 isPlayingRef.current 값을 동기화
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // isSeeking 상태에 따라 seekValue 동기화
  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentFrame);
    }
  }, [currentFrame, isSeeking]);

  // 컴포넌트 언마운트 시 모든 리소스 정리
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
      clearSimulationGlbs();
    };
  }, []);

  const currentTimeSeconds = Math.floor((currentFrame * actualFrameIntervalMs) / 1000);
  const totalTimeSeconds = Math.floor(((totalFrames - 1) * actualFrameIntervalMs) / 1000);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const shownFrame = isSeeking ? seekValue : currentFrame;
  const progress = totalFrames > 1 ? (shownFrame / (totalFrames - 1)) * 100 : 0;

  const getSimulationParams = () => {
    const { simulationDetail } = simulationStore;
    if (!simulationDetail) return null;
    const firstPoint = simulationDetail.airQualityData?.points[0];
    return {
      uuid: simulationDetail.uuid,
      centerLongitude: firstPoint?.location.longitude || 129.0634,
      centerLatitude: firstPoint?.location.latitude || 35.1598,
      resultPath: simulationDetail.resultPath || '',
      totalCount: totalFrames,
      frameIntervalMs: delayMs
    };
  };

  const ensurePreloaded = async (params: ReturnType<typeof getSimulationParams>) => {
    if (!params) return;
    const cacheStatus = getGlbCacheStatus(params.uuid);
    if (!cacheStatus.isCached || cacheStatus.loadedFrames < totalFrames) {
      setIsPreloading(true);
      try {
        await preloadSimulationGlbs(params.uuid, params.resultPath, totalFrames, setPreloadProgress);
      } catch (error) {
        console.error('Preload failed:', error);
      } finally {
        setIsPreloading(false);
      }
    }
  };

  /**
   * 지정된 프레임부터 애니메이션 루프를 시작하는 함수.
   */
  const startAnimationLoop = (fromFrame: number) => {
    if (playIntervalRef.current) {
      window.clearTimeout(playIntervalRef.current);
    }

    let frameIndex = fromFrame;

    const playNextFrame = async () => {
      if (!isPlayingRef.current) return;
      
      frameIndex++;
      if (frameIndex >= totalFrames) {
        handleStop();
        return;
      }

      await renderSimulationGlbFrame(frameIndex, false);
      
      if (isPlayingRef.current) {
        setCurrentFrame(frameIndex);
        playIntervalRef.current = window.setTimeout(playNextFrame, delayMs);
      }
    };

    playIntervalRef.current = window.setTimeout(playNextFrame, delayMs);
  };

  /**
   * 재생 버튼 클릭 핸들러
   */
  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      const params = getSimulationParams();
      if (!params) {
        setIsPlaying(false);
        return;
      }

      await ensurePreloaded(params);
      await prepareSimulationGlb(params);
      
      const startFrame = (currentFrame === 0 || currentFrame >= totalFrames - 1) ? 0 : currentFrame;
      
      if (startFrame === 0) {
        // 1. 첫 프레임 렌더링을 'await'하여 완료 보장
        await renderSimulationGlbFrame(0, true);
        setCurrentFrame(0);

        // 2. 렌더링 완료 후 flyTo 호출 (currentModel 보장됨)
        flyToSimulationGlb();

        // 3. 0프레임부터 애니메이션 루프 시작
        startAnimationLoop(0);
      } else {
        // 이어서 재생
        startAnimationLoop(startFrame);
      }
    } catch (error) {
      console.error("[handlePlay] Error during play setup:", error);
      setIsPlaying(false); // 에러 발생 시 상태 원복
    }
  };

  /**
   * 일시정지 버튼 클릭 핸들러
   */
  const handlePause = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearTimeout(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  /**
   * 정지 버튼 클릭 핸들러
   */
  const handleStop = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearTimeout(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setCurrentFrame(0);
    renderSimulationGlbFrame(0, true);
  };
  
  /**
   * 프로그레스 바 드래그 시작 핸들러
   */
  const handleSeekStart = () => {
    if (isPlaying) handlePause();
    setIsSeeking(true);
  };

  /**
   * 프로그레스 바 값 변경 핸들러
   */
  const handleSeekChange = (val: number) => {
    setSeekValue(val);
  };

  /**
   * 프로그레스 바 드래그 완료 핸들러
   */
  const handleSeekCommit = async (val: number) => {
    if (isPlaying) setIsPlaying(false);
    if (playIntervalRef.current) clearTimeout(playIntervalRef.current);

    setIsSeeking(false);
    setCurrentFrame(val);

    const params = getSimulationParams();
    if (!params) return;

    await ensurePreloaded(params);
    await prepareSimulationGlb(params);
    await renderSimulationGlbFrame(val, true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
      {isPreloading && preloadProgress && (
        <div className="absolute bottom-[65px] left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-black/80 text-white text-sm rounded-lg">
          시뮬레이션 재생 준비 중... {preloadProgress.percentage}% ({preloadProgress.loaded}/{preloadProgress.total})
        </div>
      )}
      <div className="flex items-center w-full h-[65px] px-14 gap-6 bg-black/65">
        <div className="min-w-[90px] px-3 py-1.5 text-center text-white text-[13px] font-pretendard tracking-wide rounded-[14px]"
          style={{ backgroundColor: 'rgba(134, 134, 134, 0.43)' }}>
          { totalFrames > 0 ? formatTime(currentTimeSeconds) + '/' + formatTime(totalTimeSeconds) : '0:00/0:00' }
        </div>
        <div className="flex-1 flex flex-col -mt-2">
          <div className="relative h-4">
            <input
              type="range" min={0} max={totalFrames > 0 ? totalFrames - 1 : 0} step={1} value={shownFrame}
              disabled={totalFrames <= 0 || isPreloading}
              onMouseDown={handleSeekStart} onTouchStart={handleSeekStart}
              onChange={(e) => handleSeekChange(Number(e.target.value))}
              onMouseUp={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
              style={{
                WebkitAppearance: 'none', appearance: 'none', width: '100%', height: '6px',
                borderRadius: '3px', background: `linear-gradient(to right, #FFD040 0%, #FFD040 ${progress}%, #808080 ${progress}%, #808080 100%)`,
                outline: 'none', cursor: totalFrames <= 0 || isPreloading ? 'not-allowed' : 'pointer',
                opacity: totalFrames <= 0 || isPreloading ? 0.5 : 1
              }}
            />
            <style>{`
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%;
                background: #FFD040; box-shadow: 0 0 6px rgba(0,0,0,0.4); cursor: pointer;
              }
              input[type="range"]::-moz-range-thumb {
                width: 16px; height: 16px; border-radius: 50%; background: #FFD040;
                box-shadow: 0 0 6px rgba(0,0,0,0.4); cursor: pointer;
              }
            `}</style>
          </div>
          <div className="flex items-center gap-0.5 mt-2.5">
            <button
              onClick={handlePause}
              disabled={!isPlaying || totalFrames <= 0 || isPreloading}
              className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_stop" className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlay}
              disabled={isPlaying || totalFrames <= 0 || isPreloading}
              className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_start" className="w-5 h-5" />
            </button>
          </div>
        </div>
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={totalFrames <= 0 || isPreloading}
          className="flex items-center justify-center gap-2 min-w-[160px] px-4 py-2 bg-[#CFFF40] text-black text-sm font-bold font-pretendard rounded-md border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          {isPreloading ? (
            <><Icon name="play" className="w-4 h-4" /><span>로딩 중...</span></>
          ) : isPlaying ? (
            <><Icon name="stop" className="w-4 h-4" /><span>일시정지</span></>
          ) : (
            <><Icon name="play" className="w-4 h-4" /><span>시뮬레이션 재생</span></>
          )}
        </button>
      </div>
    </div>
  );
});

export default SimulationProgressIndicator;