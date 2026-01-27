import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import {
  renderJsonFrame,
  clearJsonPrimitives,
  updateParticleSettings,
  getParticleSettings,
  initializeParticleSettings
} from '@/utils/cesium/jsonRenderer';
import {
  preloadJson,
  getJsonCacheStatus,
  type JsonPreloadProgress
} from '@/utils/cesium/jsonPreloader';

const SimulationCivilProgressIndicatorJson = observer(function SimulationCivilProgressIndicatorJson() {
  // 시민용 시뮬레이션 데이터에서 프레임 수 가져오기 (없으면 100)
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
  const [opacity, setOpacity] = useState(0);
  const [minScale, setMinScale] = useState(0);
  const [maxScale, setMaxScale] = useState(0);
  const [cameraHeight, setCameraHeight] = useState<number>(0);

  const playIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);

  // 데이터 소스: selectedCivilSimulation 참조
  const simData = simulationStore.selectedCivilSimulation;
  const currentSimulationUuid = simData?.uuid;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 초기 설정값 로드
  useEffect(() => {
    console.log('[SimulationCivilProgressIndicatorJson] currentView:', simulationStore.currentView);

    // particleSettings를 currentView에 맞게 초기화
    initializeParticleSettings();

    const currentSettings = getParticleSettings();
    console.log('[SimulationProgressIndicatorJson] Loaded settings:', currentSettings);

    setOpacity(currentSettings.opacity);
    setMinScale(currentSettings.farScale);
    setMaxScale(currentSettings.nearScale);
  }, []);

  // 설정값 변경 시 실시간 적용
  useEffect(() => {
    if (!showSettings) return;

    updateParticleSettings({
      opacity,
      nearScale: maxScale,
      farScale: minScale,
    });

    const params = getSimulationParams();
    if (params && currentFrame >= 0) {
      renderJsonFrame(params.uuid, currentFrame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opacity, maxScale, minScale, showSettings]);

  // 카메라 높이 업데이트
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

  // 데이터 변경 시 초기화
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

  // 실제 체감 시간 (delayMs 50ms + 렌더링 오버헤드 약 50ms 가정)
  const estimatedRealTimePerFrame = 100;
  
  const currentTimeSeconds = currentFrame === 0 ? 0 : Math.max(1, Math.ceil((currentFrame * estimatedRealTimePerFrame) / 1000));
  const totalTimeSeconds = totalFrames > 0 ? Math.max(1, Math.ceil(((totalFrames - 1) * estimatedRealTimePerFrame) / 1000)) : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const shownFrame = isSeeking ? seekValue : currentFrame;
  const progress = totalFrames > 1 ? (shownFrame / (totalFrames - 1)) * 100 : 0;

  // 파라미터 추출 로직: Civil 데이터 구조 사용
  const getSimulationParams = () => {
    if (simData?.uuid) {
      return {
        uuid: simData.uuid,
        totalCount: totalFrames,
        frameIntervalMs: delayMs
      };
    }
    return null;
  };

  const ensurePreloaded = async (params: ReturnType<typeof getSimulationParams>) => {
    if (!params || !params.uuid) return;

    const cacheStatus = getJsonCacheStatus(params.uuid);

    if (cacheStatus.isCached && cacheStatus.loadedFrames === totalFrames) {
      return;
    }

    setIsPreloading(true);
    try {
      await preloadJson(params.uuid, '', totalFrames, setPreloadProgress);
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
      {/* 파티클 설정 패널 (기존 코드 유지) */}
      {showSettings && (
        // ... (설정 패널 UI 동일)
        <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 w-[450px] bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-gray-600">
           {/* ... 설정 패널 내용 생략 ... */}
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-3">
                 <h3 className="text-white font-bold text-sm">파티클 설정</h3>
                 <div className="text-xs text-gray-400">
                   카메라 높이: <span className="text-[#FFD040] font-mono">{cameraHeight.toLocaleString()}m</span>
                 </div>
               </div>
               <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
             </div>
             <div className="space-y-3">
              {/* Opacity 슬라이더 */}
                <div>
                    <label className="text-white text-xs mb-1 block">
                      투명도 (Opacity): <span className="text-[#FFD040] font-mono">{opacity.toFixed(2)}</span></label>
                    <input
                      type="range"
                      min="0.005"
                      max="1.0"
                      step="0.005"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                </div>

                {/* 안내 문구 */}
                <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-600">
                  <p className="text-gray-300 text-xs leading-relaxed">
                    <span className="text-[#FFD040] font-semibold">※ 안내사항</span><br />
                    본 설정 기능은 시뮬레이션 결과의 단순 가시성 향상을 위한 표시 옵션으로 서비스 활용 시 참고 부탁드립니다.
                  </p>
                </div>
             </div>
        </div>
      )}

      {/* 로딩 표시 */}
      {isPreloading && preloadProgress && (
        <div className="absolute bottom-[65px] left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-black/80 text-white text-sm rounded-lg">
          시뮬레이션 재생 준비 중... {preloadProgress.percentage}% ({preloadProgress.loaded}/{preloadProgress.total})
        </div>
      )}

      {/* 플레이어 컨트롤러 */}
      <div className="flex items-center w-full h-[65px] px-14 gap-6 bg-black/65">
        {/* 시간 표시 */}
        <div className="min-w-[90px] px-3 py-1.5 text-center text-white text-[13px] font-pretendard tracking-wide rounded-[14px]"
          style={{ backgroundColor: 'rgba(134, 134, 134, 0.43)' }}>
          { totalFrames > 0 ? formatTime(currentTimeSeconds) + '/' + formatTime(totalTimeSeconds) : '0:00/0:00' }
        </div>
        
        {/* 슬라이더 및 버튼 */}
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
            <button onClick={handlePause} disabled={!isPlaying || totalFrames <= 0 || isPreloading} className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_stop" className="w-4 h-4" />
            </button>
            <button onClick={handlePlay} disabled={isPlaying || totalFrames <= 0 || isPreloading} className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_start" className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* 설정 버튼 및 메인 버튼 */}
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

export default SimulationCivilProgressIndicatorJson;