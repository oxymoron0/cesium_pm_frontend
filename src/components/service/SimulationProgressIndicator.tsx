import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import {
  prepareSimulationGlbSequence,
  renderSimulationGlbFrame, // 0-based 인덱스를 받도록 수정된 함수
  clearSimulationGlbs
} from '@/utils/cesium/simulationGlbRenderer';

const SimulationProgressIndicator = observer(function SimulationProgressIndicator() {
  // TODO: API에서 totalFrames 받아오도록 수정 필요
  const totalFrames = 101; // 총 프레임의 '개수'
  // 총 재생 시간: 101프레임 × 300ms ≈ 30초
  const delayMs = 300;

  const [isPlaying, setIsPlaying] = useState(false);
  // currentFrame: 항상 0-based index (0부터 totalFrames - 1 까지)
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState<number>(0);
  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentFrame);
    }
  }, [currentFrame, isSeeking]);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
      clearSimulationGlbs();
    };
  }, []);

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
    const { simulationDetail } = simulationStore;
    if (!simulationDetail) return null;

    const firstPoint = simulationDetail.airQualityData?.points[0];
    return {
      centerLongitude: firstPoint?.location.longitude || 129.0634,
      centerLatitude: firstPoint?.location.latitude || 35.1598,
      resultPath: simulationDetail.resultPath || '',
      totalCount: totalFrames,
      frameIntervalMs: delayMs
    };
  };

  const playSimulation = async (startFrame: number, skipInitialFade: boolean = false) => {
    setIsPlaying(true);
    // 첫 프레임은 페이드 없이 즉시 표시
    await renderSimulationGlbFrame(startFrame, skipInitialFade);

    if (playIntervalRef.current) window.clearInterval(playIntervalRef.current);

    playIntervalRef.current = window.setInterval(() => {
      setCurrentFrame((prevFrame) => {
        const nextFrame = prevFrame + 1;
        if (nextFrame >= totalFrames) {
          handleStop();
          return totalFrames - 1;
        }
        // 재생 중에는 크로스 페이드 전환 적용
        renderSimulationGlbFrame(nextFrame, false);
        return nextFrame;
      });
    }, delayMs);
  };

  const handlePlay = async () => {
    if (isPlaying || totalFrames <= 0) return;

    const params = getSimulationParams();
    if (!params) return;

    await prepareSimulationGlbSequence(params);

    if (currentFrame >= totalFrames - 1) {
      setCurrentFrame(0);
      // 처음부터 재생 시에는 첫 프레임을 페이드 없이 즉시 표시
      playSimulation(0, true);
    } else {
      // 이어서 재생 시에는 페이드 적용
      playSimulation(currentFrame, false);
    }
  };

  const handlePause = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentFrame(0);
    clearSimulationGlbs();
  };
  
  const handleSeekStart = () => {
    if (isPlaying) handlePause();
    setIsSeeking(true);
  };

  const handleSeekChange = (val: number) => {
    setSeekValue(val);
  };

  const handleSeekCommit = async (val: number) => {
    setIsSeeking(false);
    setCurrentFrame(val);

    const params = getSimulationParams();
    if (!params) return;

    await prepareSimulationGlbSequence(params);

    // Seek 시에는 페이드 없이 즉시 전환
    await renderSimulationGlbFrame(val, true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
      <div className="flex items-center w-full h-[65px] px-14 gap-6 bg-black/65">
        <div className="min-w-[90px] px-3 py-1.5 text-center text-white text-[13px] font-pretendard tracking-wide rounded-[14px]"
          style={{ backgroundColor: 'rgba(134, 134, 134, 0.43)' }}>
          { totalFrames > 0 ? formatTime(currentTimeSeconds) + '/' + formatTime(totalTimeSeconds) : '0:00/0:00' }
        </div>

        <div className="flex-1 flex flex-col -mt-2">
          <div className="relative h-4">
            <input
              type="range"
              min={0}
              max={totalFrames > 0 ? totalFrames - 1 : 0}
              step={1}
              value={shownFrame}
              disabled={totalFrames <= 0}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={(e) => handleSeekChange(Number(e.target.value))}
              onMouseUp={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
              style={{
                WebkitAppearance: 'none',
                appearance: 'none',
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, #FFD040 0%, #FFD040 ${progress}%, #808080 ${progress}%, #808080 100%)`,
                outline: 'none',
                cursor: totalFrames <= 0 ? 'not-allowed' : 'pointer',
                opacity: totalFrames <= 0 ? 0.5 : 1
              }}
            />
            <style>{`
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #FFD040;
                box-shadow: 0 0 6px rgba(0,0,0,0.4);
                cursor: pointer;
              }
              input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #FFD040;
                box-shadow: 0 0 6px rgba(0,0,0,0.4);
                cursor: pointer;
              }
            `}</style>
          </div>

          <div className="flex items-center gap-0.5 mt-2.5">
            <button
              onClick={handlePause}
              disabled={!isPlaying || totalFrames <= 0}
              className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_stop" className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlay}
              disabled={isPlaying || totalFrames <= 0}
              className="p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50">
              <Icon name="player_start" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={totalFrames <= 0}
          className="flex items-center justify-center gap-2 min-w-[160px] px-4 py-2 bg-[#CFFF40] text-black text-sm font-bold font-pretendard rounded-md border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          {isPlaying ? (
            <>
              <Icon name="stop" className="w-4 h-4" /> 
              <span>일시정지</span>
            </>
          ) : (
            <>
              <Icon name="play" className="w-4 h-4" />
              <span>시뮬레이션 재생</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default SimulationProgressIndicator;