import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import {
  renderJsonFrame,
  clearJsonPrimitives
} from '@/utils/cesium/jsonRenderer';
import {
  preloadJson,
  getJsonCacheStatus,
  type JsonPreloadProgress
} from '@/utils/cesium/jsonPreloader';

const SimulationProgressIndicatorJson = observer(function SimulationProgressIndicatorJson() {
  const totalFrames = simulationStore.glbCount || 0;
  const delayMs = 500; // JSON 프레임 간격

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState<number>(0);

  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<JsonPreloadProgress | null>(null);

  const playIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentFrame);
    }
  }, [currentFrame, isSeeking]);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
      clearJsonPrimitives();
    };
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentFrame(0);
    setIsSeeking(false);
    setSeekValue(0);
    if (playIntervalRef.current) {
      clearTimeout(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    clearJsonPrimitives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationStore.selectedsimulationQuick?.uuid]);

  const currentTimeSeconds = Math.floor((currentFrame * delayMs) / 1000);
  const totalTimeSeconds = Math.floor(((totalFrames - 1) * delayMs) / 1000);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const shownFrame = isSeeking ? seekValue : currentFrame;
  const progress = totalFrames > 1 ? (shownFrame / (totalFrames - 1)) * 100 : 0;

  const getSimulationParams = () => {
    // 빠른실행 전용
    const { selectedsimulationQuick } = simulationStore;
    if (!selectedsimulationQuick) return null;
    return {
      uuid: selectedsimulationQuick.uuid,
      resultPath: selectedsimulationQuick.result_path,
      totalCount: totalFrames,
      frameIntervalMs: delayMs
    };
  };

  const ensurePreloaded = async (params: ReturnType<typeof getSimulationParams>) => {
    if (!params) return;
    const cacheStatus = getJsonCacheStatus(params.uuid);
    if (!cacheStatus.isCached || cacheStatus.loadedFrames < totalFrames) {
      setIsPreloading(true);
      try {
        await preloadJson(params.uuid, params.resultPath, totalFrames, setPreloadProgress);
      } catch (error) {
        console.error('JSON Preload failed:', error);
      } finally {
        setIsPreloading(false);
      }
    }
  };

  const startAnimationLoop = (fromFrame: number) => {
    if (playIntervalRef.current) {
      window.clearTimeout(playIntervalRef.current);
    }

    let frameIndex = fromFrame;

    const playNextFrame = () => {
      if (!isPlayingRef.current) return;

      frameIndex++;
      if (frameIndex >= totalFrames) {
        handleStop();
        return;
      }

      const params = getSimulationParams();
      if (!params) return;

      renderJsonFrame(params.uuid, frameIndex);

      if (isPlayingRef.current) {
        setCurrentFrame(frameIndex);
        playIntervalRef.current = window.setTimeout(playNextFrame, delayMs);
      }
    };

    playIntervalRef.current = window.setTimeout(playNextFrame, delayMs);
  };

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

      const startFrame = (currentFrame === 0 || currentFrame >= totalFrames - 1) ? 0 : currentFrame;

      if (startFrame === 0) {
        //renderJsonFrameWithFly(params.uuid, 0);
        setCurrentFrame(0);
        startAnimationLoop(0);
      } else {
        startAnimationLoop(startFrame);
      }
    } catch (error) {
      console.error("[handlePlay] Error during play setup:", error);
      setIsPlaying(false);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearTimeout(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearTimeout(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setCurrentFrame(0);

    const params = getSimulationParams();
    if (params) {
      renderJsonFrame(params.uuid, 0);
    }
  };

  const handleSeekStart = () => {
    if (isPlaying) handlePause();
    setIsSeeking(true);
  };

  const handleSeekChange = (val: number) => {
    setSeekValue(val);
  };

  const handleSeekCommit = async (val: number) => {
    if (isPlaying) setIsPlaying(false);
    if (playIntervalRef.current) clearTimeout(playIntervalRef.current);

    setIsSeeking(false);
    setCurrentFrame(val);

    const params = getSimulationParams();
    if (!params) return;

    await ensurePreloaded(params);
    renderJsonFrame(params.uuid, val);
  };

  return (
    <div className="fixed bottom-[64px] left-0 right-0 pointer-events-auto" style={{ zIndex: 2003 }}>
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
            <><Icon name="play" className="w-4 h-4" /><span className="text-black">로딩 중...</span></>
          ) : isPlaying ? (
            <><Icon name="stop" className="w-4 h-4" /><span className="text-black">일시정지</span></>
          ) : (
            <><Icon name="play" className="w-4 h-4" /><span className="text-black">시뮬레이션 재생</span></>
          )}
        </button>
      </div>
    </div>
  );
});

export default SimulationProgressIndicatorJson;
