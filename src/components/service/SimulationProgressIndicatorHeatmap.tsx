import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import {
  renderHeatmapFrame,
  clearHeatmap,
  updateHeatmapSettings,
  getHeatmapSettings
} from '@/utils/cesium/heatmapRenderer';
import {
  preloadHeatmap,
  getHeatmapCacheStatus,
  getNormalizationSettings,
  updateNormalizationSettings,
  clearHeatmapCache,
  type HeatmapPreloadProgress
} from '@/utils/cesium/heatmapPreloader';

const SimulationProgressIndicatorHeatmap = observer(function SimulationProgressIndicatorHeatmap() {
  const totalFrames = simulationStore.glbCount || 0;
  const delayMs = 200; // 히트맵은 렌더링이 무거울 수 있으므로 간격을 약간 늘림

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState<number>(0);

  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<HeatmapPreloadProgress | null>(null);

  // 히트맵 설정 상태
  const [showSettings, setShowSettings] = useState(false);
  const [resolutionScale, setResolutionScale] = useState(0.3);
  const [radius, setRadius] = useState(15);
  const [blur, setBlur] = useState(0.8);
  const [maxOpacity, setMaxOpacity] = useState(0.8);
  const [minOpacity, setMinOpacity] = useState(0.0);
  const [intensityScale, setIntensityScale] = useState(1.0);

  // 정규화 설정 상태
  const [usePercentile, setUsePercentile] = useState(true);
  const [minPercentile, setMinPercentile] = useState(10);
  const [maxPercentile, setMaxPercentile] = useState(90);
  const [useLogScale, setUseLogScale] = useState(false);

  const playIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 초기 설정값 로드
  useEffect(() => {
    const s = getHeatmapSettings();
    setResolutionScale(s.resolutionScale);
    setRadius(s.radius);
    setBlur(s.blur);
    setMaxOpacity(s.maxOpacity);
    setMinOpacity(s.minOpacity);
    setIntensityScale(s.intensityScale);

    const n = getNormalizationSettings();
    setUsePercentile(n.usePercentile);
    setMinPercentile(n.minPercentile);
    setMaxPercentile(n.maxPercentile);
    setUseLogScale(n.useLogScale);
  }, []);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentFrame);
    }
  }, [currentFrame, isSeeking]);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        window.cancelAnimationFrame(playIntervalRef.current);
      }
      clearHeatmap();
    };
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentFrame(0);
    setIsSeeking(false);
    setSeekValue(0);
    if (playIntervalRef.current) {
      window.cancelAnimationFrame(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    clearHeatmap();
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
    const { selectedsimulationQuick } = simulationStore;
    if (!selectedsimulationQuick?.uuid) return null;
    return {
      uuid: selectedsimulationQuick.uuid,
      totalCount: totalFrames,
    };
  };

  const ensurePreloaded = async (params: ReturnType<typeof getSimulationParams>) => {
    if (!params) return;

    const cacheStatus = getHeatmapCacheStatus(params.uuid);

    if (cacheStatus.isCached && cacheStatus.loadedFrames === totalFrames) {
      // 이미 캐시됨, 렌더링은 호출자가 처리
      return;
    }

    setIsPreloading(true);
    try {
      await preloadHeatmap(params.uuid, '', totalFrames, setPreloadProgress);
      // 렌더링은 호출자(handlePlay)가 처리
    } catch (error) {
      console.error('Heatmap Preload failed:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  const startAnimationLoop = (fromFrame: number) => {
    if (playIntervalRef.current) {
      window.cancelAnimationFrame(playIntervalRef.current);
    }

    let frameIndex = fromFrame;
    let lastFrameTime = performance.now();

    const playNextFrame = (currentTime: number) => {
      if (!isPlayingRef.current) return;

      // delayMs 간격으로 프레임 업데이트
      const elapsed = currentTime - lastFrameTime;
      if (elapsed < delayMs) {
        playIntervalRef.current = window.requestAnimationFrame(playNextFrame);
        return;
      }

      lastFrameTime = currentTime;
      frameIndex++;

      if (frameIndex >= totalFrames) {
        handleStop();
        return;
      }

      const params = getSimulationParams();
      if (!params) return;

      // 렌더링 성능 측정
      const renderStart = performance.now();
      renderHeatmapFrame(params.uuid, frameIndex);
      const renderTime = performance.now() - renderStart;

      if (renderTime > 50) {
        console.warn(`[Heatmap] Frame ${frameIndex} rendering took ${renderTime.toFixed(2)}ms`);
      }

      if (isPlayingRef.current) {
        setCurrentFrame(frameIndex);
        playIntervalRef.current = window.requestAnimationFrame(playNextFrame);
      }
    };

    playIntervalRef.current = window.requestAnimationFrame(playNextFrame);
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
        setCurrentFrame(0);
        renderHeatmapFrame(params.uuid, 0);
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
      window.cancelAnimationFrame(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      window.cancelAnimationFrame(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setCurrentFrame(0);

    const params = getSimulationParams();
    if (params) {
      renderHeatmapFrame(params.uuid, 0);
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
    if (playIntervalRef.current) {
      window.cancelAnimationFrame(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    setIsSeeking(false);
    setCurrentFrame(val);

    const params = getSimulationParams();
    if (!params) return;

    await ensurePreloaded(params);
    renderHeatmapFrame(params.uuid, val);
  };

  // 설정 적용
  const handleApplySettings = async () => {
    // 렌더링 설정 업데이트
    updateHeatmapSettings({
      resolutionScale,
      radius,
      blur,
      maxOpacity,
      minOpacity,
      intensityScale
    });

    // 정규화 설정 업데이트
    const normSettingsChanged =
      usePercentile !== getNormalizationSettings().usePercentile ||
      minPercentile !== getNormalizationSettings().minPercentile ||
      maxPercentile !== getNormalizationSettings().maxPercentile ||
      useLogScale !== getNormalizationSettings().useLogScale;

    updateNormalizationSettings({
      usePercentile,
      minPercentile,
      maxPercentile,
      useLogScale
    });

    const params = getSimulationParams();
    if (!params) return;

    // 정규화 설정이 바뀌었으면 캐시 초기화하고 재로드
    if (normSettingsChanged) {
      clearHeatmapCache(params.uuid);
      setIsPreloading(true);
      try {
        await preloadHeatmap(params.uuid, '', totalFrames, setPreloadProgress);
      } catch (error) {
        console.error('Heatmap reload failed:', error);
      } finally {
        setIsPreloading(false);
      }
    }

    // 현재 프레임 재렌더링
    renderHeatmapFrame(params.uuid, currentFrame);
  };

  return (
    <div className="fixed bottom-[64px] left-0 right-0 pointer-events-auto" style={{ zIndex: 2003 }}>
      {/* 히트맵 설정 패널 */}
      {showSettings && (
        <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 w-[450px] bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">히트맵 설정</h3>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
          </div>

          {/* 색상 정규화 설정 */}
          <div className="mb-4 pb-3 border-b border-gray-600">
            <h4 className="text-white text-xs font-semibold mb-2">색상 범위 설정</h4>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="usePercentile"
                checked={usePercentile}
                onChange={(e) => setUsePercentile(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="usePercentile" className="text-white text-xs cursor-pointer">
                백분위수 기반 정규화 (극값 제외)
              </label>
            </div>

            {usePercentile && (
              <div className="mb-3 space-y-3">
                <div>
                  <label className="text-white text-xs mb-1 block">
                    최소값 백분위수: <span className="text-[#FFD040]">{minPercentile}%</span>
                    <span className="text-gray-400 text-[10px] ml-2">(하위 {minPercentile}% 제외)</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={minPercentile}
                    onChange={(e) => setMinPercentile(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg cursor-pointer slider"
                  />
                </div>
                <div>
                  <label className="text-white text-xs mb-1 block">
                    최대값 백분위수: <span className="text-[#FFD040]">{maxPercentile}%</span>
                    <span className="text-gray-400 text-[10px] ml-2">(상위 {100 - maxPercentile}% 제외)</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={maxPercentile}
                    onChange={(e) => setMaxPercentile(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg cursor-pointer slider"
                  />
                </div>
                <div className="text-[10px] text-gray-400 bg-gray-800/50 p-2 rounded">
                  💡 권장: 10%~90% (양극단 10%씩 제외)
                  <br/>범위가 좁을수록 색상 분포가 넓어지지만 극값은 단색으로 표시됩니다
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useLogScale"
                checked={useLogScale}
                onChange={(e) => setUseLogScale(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="useLogScale" className="text-white text-xs cursor-pointer">
                로그 스케일 정규화 (값이 한쪽에 몰린 경우)
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-white text-xs mb-1 block">해상도 배율: <span className="text-[#FFD040]">{resolutionScale}</span></label>
              <input type="range" min="0.1" max="1.0" step="0.1" value={resolutionScale} onChange={(e) => setResolutionScale(parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg cursor-pointer slider" />
            </div>
            <div>
              <label className="text-white text-xs mb-1 block">반경 (Radius): <span className="text-[#FFD040]">{radius}px</span></label>
              <input type="range" min="5" max="50" step="1" value={radius} onChange={(e) => setRadius(parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg cursor-pointer slider" />
            </div>
            <div>
              <label className="text-white text-xs mb-1 block">블러 (Blur): <span className="text-[#FFD040]">{blur}</span></label>
              <input type="range" min="0" max="1" step="0.05" value={blur} onChange={(e) => setBlur(parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg cursor-pointer slider" />
            </div>
            <div>
              <label className="text-white text-xs mb-1 block">최소 투명도: <span className="text-[#FFD040]">{minOpacity}</span></label>
              <input type="range" min="0" max="0.3" step="0.01" value={minOpacity} onChange={(e) => setMinOpacity(parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg cursor-pointer slider" />
            </div>
            <div>
              <label className="text-white text-xs mb-1 block">강도 스케일: <span className="text-[#FFD040]">{intensityScale.toFixed(1)}</span></label>
              <input type="range" min="0.1" max="3.0" step="0.1" value={intensityScale} onChange={(e) => setIntensityScale(parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg cursor-pointer slider" />
            </div>
          </div>

          <button onClick={handleApplySettings} className="w-full mt-4 px-4 py-2 bg-[#FFD040] text-black text-sm font-bold rounded-md hover:bg-[#FFE060] transition-colors">
            적용 및 재렌더링
          </button>
        </div>
      )}

      {isPreloading && preloadProgress && (
        <div className="absolute bottom-[65px] left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-black/80 text-white text-sm rounded-lg">
          히트맵 데이터 로딩 중... {preloadProgress.percentage}%
        </div>
      )}
      
      <div className="flex items-center w-full h-[65px] px-14 gap-6 bg-black/65">
        {/* 타임스탬프 등 컨트롤 UI (기존과 동일) */}
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
          </div>
          <div className="flex items-center gap-0.5 mt-2.5">
            <button onClick={handlePause} disabled={!isPlaying} className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_stop" className="w-4 h-4" />
            </button>
            <button onClick={handlePlay} disabled={isPlaying} className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_start" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-center w-10 h-10 bg-gray-700 text-white rounded-md border-0 cursor-pointer hover:bg-gray-600 transition-colors" title="히트맵 설정">
            ⚙️
          </button>
          <button onClick={isPlaying ? handlePause : handlePlay} disabled={totalFrames <= 0 || isPreloading} className="flex items-center justify-center gap-2 min-w-[160px] px-4 py-2 bg-[#CFFF40] text-black text-sm font-bold font-pretendard rounded-md border-0 cursor-pointer disabled:opacity-50">
            {isPreloading ? '로딩 중...' : isPlaying ? '일시정지' : '히트맵 재생'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default SimulationProgressIndicatorHeatmap;
