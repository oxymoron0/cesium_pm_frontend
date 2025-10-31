import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import { simulationStore } from '@/stores/SimulationStore';
import {
  generateGlbData,
  renderSimulationGlbsSequentially,
  clearSimulationGlbs,
  getSimulationGlbCount
} from '@/utils/cesium/simulationGlbRenderer';
import {
  renderLocationMarker,
  clearLocationMarker
} from '@/utils/cesium/locationMarker';

interface SimulationResultSummaryProps {
  onClose?: () => void;
}

const SimulationResultSummary = observer(function SimulationResultSummary({ onClose }: SimulationResultSummaryProps) {
  const { simulationDetail } = simulationStore;
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isImpactExpanded, setIsImpactExpanded] = useState(true);
  const [isRenderingGlb, setIsRenderingGlb] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);

  // 시뮬레이션 발생 위치 좌표 (첫 번째 측정소 위치)
  const firstPoint = simulationDetail?.airQualityData?.points[0];
  const centerLng = firstPoint?.location.longitude || 129.0634; // fallback
  const centerLat = firstPoint?.location.latitude || 35.1598;

  // 팝업 열릴 때 마커 렌더링, 닫힐 때 제거
  useEffect(() => {
    if (!simulationDetail) return;

    renderLocationMarker(centerLng, centerLat);
    //handleRenderGlb();
    return () => {
      clearLocationMarker();
      clearSimulationGlbs();
    };
  }, [simulationDetail, centerLng, centerLat]);

  if (!simulationDetail) {
    return null;
  }

  // ISO 8601 날짜를 "YYYY.MM.DD HH:mm" 형식으로 변환
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const mockImpactData = [
    { level: '좋음', count: 18, color: '#FFD040' },
    { level: '보통', count: 32, color: '#FFD040' },
    { level: '나쁨', count: 24, color: '#FFD040' },
    { level: '매우나쁨', count: 35, color: '#FFD040' }
  ];

  // GLB 렌더링 핸들러
  const handleRenderGlb = async () => {
    setIsRenderingGlb(true);
    setRenderProgress({ current: 0, total: 666 });

    try {
      // GLB 데이터 생성
      const glbDataList = generateGlbData(centerLng, centerLat);

      // 순차적으로 렌더링 (10ms 간격)
      await renderSimulationGlbsSequentially(glbDataList, {
        delayMs: 10,
        onProgress: (current, total) => {
          setRenderProgress({ current, total });
        },
        onComplete: () => {
          console.log('[SimulationResultSummary] GLB rendering completed');
          setRenderProgress(null);
        }
      });
    } catch (error) {
      console.error('[SimulationResultSummary] GLB rendering failed:', error);
    } finally {
      setIsRenderingGlb(false);
    }
  };

  return (
    <Panel width="540px" maxHeight="calc(100vh - 160px)" >
      <Title onClose={onClose}>
        시뮬레이션 결과 요약
      </Title>

      <Spacer height={16} />

      {/* GLB Rendering Controls */}
      <div className="flex gap-2 self-stretch">
        <button
          onClick={handleRenderGlb}
          disabled={isRenderingGlb}
          className="flex-1 h-10 px-4 py-2 bg-[#FFD040] text-black rounded font-pretendard text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FFC020] transition-colors"
        >
          {isRenderingGlb
            ? `렌더링 중... (${renderProgress?.current || 0}/${renderProgress?.total || 0})`
            : `GLB 렌더링 테스트(${getSimulationGlbCount()}개)`}
        </button>
      </div>

      <Spacer height={16} />

      {/* Simulation Selection Collapsible */}
      <div className="flex flex-col self-stretch">
        <button
          onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          className="flex items-center justify-between h-[42px] py-[10px] pr-4 border-b border-[#696A6A] cursor-pointer"
        >
          <p className="text-white font-pretendard text-[14px] font-bold">
            {simulationDetail.simulationName}
          </p>
          <div
            className="text-white transform transition-transform"
            style={{
              fontSize: '8px',
              lineHeight: '4px',
              transform: isSummaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            ▼
          </div>
        </button>

        {isSummaryExpanded && (
          <>
            <Spacer height={16} />

            {/* Summary Info Grid */}
            <div className="flex flex-col self-stretch gap-3">
              {/* 요청 일시 */}
              <div className="flex items-center self-stretch justify-between">
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  요청 일시
                </div>
                <div
                  className="flex items-center h-8 px-3 py-1 bg-black rounded border border-[#696A6A]"
                  style={{
                    width: '360px',
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  {formatDateTime(simulationDetail.requestedAt)}
                </div>
              </div>

              {/* 최대 확산 반경 */}
              <div className="flex items-center self-stretch justify-between">
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  최대 확산 반경 (m)
                </div>
                <div
                  className="flex items-center h-8 px-3 py-1 bg-black rounded border border-[#696A6A]"
                  style={{
                    width: '360px',
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  600 m
                </div>
              </div>

              {/* 총 영향 면적 */}
              <div className="flex items-center self-stretch justify-between">
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  총 영향 면적 (m²)
                </div>
                <div
                  className="flex items-center h-8 px-3 py-1 bg-black rounded border border-[#696A6A]"
                  style={{
                    width: '360px',
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  1,130,973 m² (약 1.13 km²)
                </div>
              </div>

              {/* 영향 취약시설 수 */}
              <div className="flex items-center self-stretch justify-between">
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  영향 취약시설 수
                </div>
                <div
                  className="flex items-center h-8 px-3 py-1 bg-black rounded border border-[#696A6A]"
                  style={{
                    width: '360px',
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  102개
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Spacer height={16} />

      {/* Collapsible Section: 등급별 영향 취약시설 수 */}
      <div className="flex flex-col self-stretch">
        <button
          onClick={() => setIsImpactExpanded(!isImpactExpanded)}
          className="flex items-center justify-between h-[42px] py-[10px] pr-4 border-b border-[#696A6A] cursor-pointer"
        >
          <p className="text-white font-pretendard text-[14px] font-bold">
            등급별 영향 취약시설 수
          </p>
          <div
            className="text-white transform transition-transform"
            style={{
              fontSize: '8px',
              lineHeight: '4px',
              transform: isImpactExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            ▼
          </div>
        </button>

        {isImpactExpanded && (
          <>
            <Spacer height={16} />
            <div
              className="flex flex-col self-stretch px-4 py-3"
            >
              {/* Y축 라벨 */}
              <div
                className="self-start"
                style={{
                  color: '#C4C6C6',
                  fontFamily: 'Pretendard',
                  fontSize: '12px',
                  fontWeight: '400',
                  marginBottom: '8px'
                }}
              >
                영향 시설 수
              </div>

              {/* Bar Chart */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={mockImpactData}
                  margin={{ top: 10, right: 10, left: -35, bottom: 0 }}
                  barSize={30}
                >
                  <CartesianGrid stroke="#555" strokeOpacity={0.5} vertical={false} />

                  <XAxis
                    dataKey="level"
                    tick={{
                      fill: '#C4C6C6',
                      fontFamily: 'Pretendard',
                      fontSize: 12
                    }}
                    stroke="none"
                    axisLine={true}
                  />

                  <YAxis
                    tick={{
                      fill: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: 12
                    }}
                    stroke="none"
                    axisLine={false}
                  />

                  <Bar dataKey="count" radius={[25, 25, 0, 0]}>
                    {mockImpactData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
});

export default SimulationResultSummary;
