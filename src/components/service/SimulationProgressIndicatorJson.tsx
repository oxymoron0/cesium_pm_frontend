import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import {
  renderJsonFrame,
  clearJsonPrimitives,
  updateParticleSettings,
  getParticleSettings
} from '@/utils/cesium/jsonRenderer';
import {
  preloadJson,
  getJsonCacheStatus,
  type JsonPreloadProgress
} from '@/utils/cesium/jsonPreloader';

const SimulationProgressIndicatorJson = observer(function SimulationProgressIndicatorJson() {
  const totalFrames = simulationStore.glbCount || 0;
  const delayMs = 50; // JSON 프레임 간격

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState<number>(0);

  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<JsonPreloadProgress | null>(null);

  // 파티클 설정 상태
  const [showSettings, setShowSettings] = useState(false);
  const [opacity, setOpacity] = useState(0.005);
  const [minScale, setMinScale] = useState(5);
  const [maxScale, setMaxScale] = useState(50);
  const [contrast, setContrast] = useState(2.0); // jsonRenderer.ts의 기본값
  const [sizeSensitivity, setSizeSensitivity] = useState(2.0); // jsonRenderer.ts의 기본값
  const [alphaMultiplier, setAlphaMultiplier] = useState(5.0); // jsonRenderer.ts의 기본값
  const [threshold, setThreshold] = useState(0.1); // jsonRenderer.ts의 기본값
  const [cameraHeight, setCameraHeight] = useState<number>(0);

  const playIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 초기 설정값 로드
  useEffect(() => {
    const currentSettings = getParticleSettings();
    setOpacity(currentSettings.opacity);
    setMinScale(currentSettings.farScale);  // farScale = 멀 때 = 작게 = minScale
    setMaxScale(currentSettings.nearScale); // nearScale = 가까울 때 = 크게 = maxScale
    // 새로 추가된 설정값 로드
    setContrast(currentSettings.contrast);
    setSizeSensitivity(currentSettings.sizeSensitivity);
    setAlphaMultiplier(currentSettings.alphaMultiplier);
    setThreshold(currentSettings.threshold);
  }, []);

  // 카메라 높이 실시간 업데이트
  useEffect(() => {
    const updateCameraHeight = () => {
      const viewer = window.cviewer;
      if (viewer && viewer.camera) {
        const position = viewer.camera.positionCartographic;
        if (position) {
          setCameraHeight(Math.round(position.height));
        }
      }
    };

    const interval = setInterval(updateCameraHeight, 100);
    return () => clearInterval(interval);
  }, []);

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

  const currentSimulationUuid = simulationStore.selectedsimulationQuick?.uuid || simulationStore.simulationDetail?.uuid;

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

  }, [currentSimulationUuid]);

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
    const { selectedsimulationQuick, simulationDetail } = simulationStore;
    if (selectedsimulationQuick) { // 빠른 실행
      return {
        uuid: selectedsimulationQuick.uuid,
        resultPath: selectedsimulationQuick.result_path,
        totalCount: totalFrames,
        frameIntervalMs: delayMs
      };
    } else if (simulationDetail) { // 맞춤 실행
      return {
        uuid: simulationDetail.uuid,
        resultPath: simulationDetail.resultPath,
        totalCount: totalFrames,
        frameIntervalMs: delayMs
      };
    }
    return null;
  };

  const ensurePreloaded = async (params: ReturnType<typeof getSimulationParams>) => {
    if (!params || !params.uuid || !params.resultPath) return;

    const cacheStatus = getJsonCacheStatus(params.uuid);

    // 이미 완전히 로드된 경우 즉시 리턴 (setIsPreloading 호출 없음)
    if (cacheStatus.isCached && cacheStatus.loadedFrames === totalFrames) {
      return;
    }

    // 실제로 로드가 필요한 경우에만 로딩 상태 설정
    setIsPreloading(true);
    try {
      await preloadJson(params.uuid, params.resultPath, totalFrames, setPreloadProgress);
    } catch (error) {
      console.error('JSON Preload failed:', error);
    } finally {
      setIsPreloading(false);
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

    // ensurePreloaded 내부에서 캐시 체크 및 로딩 상태 관리
    await ensurePreloaded(params);

    renderJsonFrame(params.uuid, val);
  };

  // 파티클 설정 적용 및 재렌더링
  const handleApplySettings = () => {
    updateParticleSettings({
      opacity,
      nearScale: maxScale,
      farScale: minScale,
      contrast,
      sizeSensitivity,
      alphaMultiplier,
      threshold
    });

    // 현재 프레임 재렌더링
    const params = getSimulationParams();
    if (params) {
      renderJsonFrame(params.uuid, currentFrame);
    }
  };

  return (
    <div className="fixed bottom-[64px] left-0 right-0 pointer-events-auto" style={{ zIndex: 2003 }}>
      {/* 파티클 설정 패널 */}
      {showSettings && (
        <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 w-[450px] bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-bold text-sm">파티클 설정</h3>
              <div className="text-xs text-gray-400">
                카메라 높이: <span className="text-[#FFD040] font-mono">{cameraHeight.toLocaleString()}m</span>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {/* Opacity */}
            <div>
              <label className="text-white text-xs mb-1 block">
                Opacity: <span className="text-[#FFD040] font-mono">{opacity.toFixed(3)}</span>
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Min Scale (멀 때) */}
            <div>
              <label className="text-white text-xs mb-1 block">
                Min Scale (멀 때): <span className="text-[#FFD040] font-mono">{minScale.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={minScale}
                onChange={(e) => setMinScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Max Scale (가까울 때) */}
            <div>
              <label className="text-white text-xs mb-1 block">
                Max Scale (가까울 때): <span className="text-[#FFD040] font-mono">{maxScale.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={maxScale}
                onChange={(e) => setMaxScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Contrast */}
            <div>
              <label className="text-white text-xs mb-1 block">
                대비 (Contrast): <span className="text-[#FFD040] font-mono">{contrast.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Size Sensitivity */}
            <div>
              <label className="text-white text-xs mb-1 block">
                크기 민감도 (Size Sensitivity): <span className="text-[#FFD040] font-mono">{sizeSensitivity.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="5.0"
                step="0.1"
                value={sizeSensitivity}
                onChange={(e) => setSizeSensitivity(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Alpha Multiplier */}
            <div>
              <label className="text-white text-xs mb-1 block">
                알파 부스트 (Alpha Multiplier): <span className="text-[#FFD040] font-mono">{alphaMultiplier.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={alphaMultiplier}
                onChange={(e) => setAlphaMultiplier(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Threshold */}
            <div>
              <label className="text-white text-xs mb-1 block">
                최소 투명도 임계값 (Threshold): <span className="text-[#FFD040] font-mono">{threshold.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          <button
            onClick={handleApplySettings}
            className="w-full mt-4 px-4 py-2 bg-[#FFD040] text-black text-sm font-bold rounded-md hover:bg-[#FFE060] transition-colors"
          >
            적용 및 재렌더링
          </button>
        </div>
      )}

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
              .slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #FFD040;
                cursor: pointer;
              }
              .slider::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #FFD040;
                cursor: pointer;
                border: none;
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center w-10 h-10 bg-gray-700 text-white rounded-md border-0 cursor-pointer hover:bg-gray-600 transition-colors"
            title="파티클 설정"
          >
            ⚙️
          </button>
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
    </div>
  );
});

export default SimulationProgressIndicatorJson;
