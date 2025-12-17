import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx';
import { useState, useEffect, useMemo } from 'react';
import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import SimulationProgressIndicatorJson from '@/components/service/SimulationProgressIndicatorJson';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { simulationStore } from '@/stores/SimulationStore';
import {
  renderLocationMarker,
  clearLocationMarker
} from '@/utils/cesium/locationMarker';
import { clearSimulationGlbs } from '@/utils/cesium/simulationGlbRenderer';

interface SimulationResultSummaryProps {
  onClose?: () => void;
}

const SimulationResultSummary = observer(function SimulationResultSummary({ onClose }: SimulationResultSummaryProps) {
  const { simulationDetail, isResultPopupMinimized, vulnerableFacilities } = simulationStore;
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isImpactExpanded, setIsImpactExpanded] = useState(true);

  // API 응답을 차트 배열로 변환
  const chartData = useMemo(() => {
    if (!vulnerableFacilities) return [];

    const facilities = toJS(vulnerableFacilities.facilities_by_grade);

    return [
      { grade: 'good', count: facilities.good.length },
      { grade: 'moderate', count: facilities.moderate.length },
      { grade: 'bad', count: facilities.bad.length },
      { grade: 'very_bad', count: facilities.very_bad.length }
    ];
  }, [vulnerableFacilities]);

  const firstPoint = simulationDetail?.airQualityData?.points[0];
  const centerLng = firstPoint?.location.longitude || 129.0634;
  const centerLat = firstPoint?.location.latitude || 35.1598;

  useEffect(() => {
    if (!simulationDetail) return;
    renderLocationMarker(centerLng, centerLat, 0);
    return () => {
      clearLocationMarker();
      clearSimulationGlbs();
    };
  }, [simulationDetail, centerLng, centerLat]);

  if (!simulationDetail) {
    return null;
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  // 등급별 한글 레이블 매핑
  const gradeLabels: Record<string, string> = {
    good: '좋음',
    moderate: '보통',
    bad: '나쁨',
    very_bad: '매우나쁨'
  };

  // 총 영향 면적 포맷 (m² -> km²)
  const formatArea = (sqm: number) => {
    const sqkm = (sqm / 1_000_000).toFixed(2);
    return `${sqm.toLocaleString()} m² (약 ${sqkm} km²)`;
  };

  return (
    <>
      <Panel width="540px" maxHeight="calc(100vh - 160px)" >
        <Title
          onClose={onClose}
          onMinimize={() => simulationStore.toggleResultPopupMinimize()}
          infoTitle="시뮬레이션 결과 요약"
          info="※ 시뮬레이션 요청 일시와 오염물질 최대 확산 반경, 총 영향 면적, 영향 시설물 수를 확인할 수 있습니다. 영향 시설물 수의 경우 나쁨 등급 이상 면적에 포함된 취약시설 수를 의미합니다."
        >
          시뮬레이션 결과 요약
        </Title>

        <div style={{ display: isResultPopupMinimized ? 'none' : 'contents' }}>
          <Spacer height={16} />

          <div className="flex flex-col self-stretch">
        <button
          onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
          className="flex items-center justify-between h-[42px] py-[10px] pr-4 border-b border-[#696A6A] cursor-pointer"
        >
          <p className="text-white font-pretendard text-sm font-bold">
            {simulationDetail.simulationName}
          </p>
          <div
            className="text-white text-[8px] leading-[4px] transform transition-transform"
            style={{ transform: isSummaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▼
          </div>
        </button>

        {isSummaryExpanded && (
          <>
            <Spacer height={16} />

            <div className="flex flex-col self-stretch gap-3">
              <div className="flex items-center self-stretch justify-between">
                <div className="text-white font-pretendard text-sm font-bold">
                  요청 일시
                </div>
                <div className="flex items-center h-8 px-3 py-1 w-[360px] bg-black rounded border border-[#696A6A] text-white font-pretendard text-sm">
                  {vulnerableFacilities?.requested_at || formatDateTime(simulationDetail.requestedAt)}
                </div>
              </div>

              <div className="flex items-center self-stretch justify-between">
                <div className="text-white font-pretendard text-sm font-bold">
                  최대 확산 반경 (m)
                </div>
                <div className="flex items-center h-8 px-3 py-1 w-[360px] bg-black rounded border border-[#696A6A] text-white font-pretendard text-sm">
                  600 m
                </div>
              </div>

              <div className="flex items-center self-stretch justify-between">
                <div className="text-white font-pretendard text-sm font-bold">
                  총 영향 면적 (m²)
                </div>
                <div className="flex items-center h-8 px-3 py-1 w-[360px] bg-black rounded border border-[#696A6A] text-white font-pretendard text-sm">
                  {vulnerableFacilities ? formatArea(vulnerableFacilities.convex_hull_area_sqm) : '-'}
                </div>
              </div>

              <div className="flex items-center self-stretch justify-between">
                <div className="text-white font-pretendard text-sm font-bold">
                  영향 취약시설 수
                </div>
                <div className="flex items-center h-8 px-3 py-1 w-[360px] bg-black rounded border border-[#696A6A] text-white font-pretendard text-sm">
                  {vulnerableFacilities ? `${vulnerableFacilities.total_affected_facilities}개` : '-'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Spacer height={16} />

      <div className="flex flex-col self-stretch">
        <button
          onClick={() => setIsImpactExpanded(!isImpactExpanded)}
          className="flex items-center justify-between h-[42px] py-[10px] pr-4 border-b border-[#696A6A] cursor-pointer"
        >
          <p className="text-white font-pretendard text-sm font-bold">
            등급별 영향 취약시설 수
          </p>
          <div
            className="text-white text-[8px] leading-[4px] transform transition-transform"
            style={{ transform: isImpactExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▼
          </div>
        </button>

        {isImpactExpanded && (
          <>
            <Spacer height={16} />
            {vulnerableFacilities && chartData.length > 0 ? (
              <div className="flex flex-col self-stretch px-4 py-3">
                <div className="self-start text-[#C4C6C6] font-pretendard text-xs mb-2">
                  영향 시설 수
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -35, bottom: 0 }}
                    barSize={30}
                  >
                    <CartesianGrid stroke="#555" strokeOpacity={0.5} vertical={false} />

                    <XAxis
                      dataKey="grade"
                      tickFormatter={(grade) => gradeLabels[grade]}
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

                    <Bar dataKey="count" fill="#FFD040" radius={[25, 25, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-[#C4C6C6] font-pretendard text-sm">
                데이터 로딩 중...
              </div>
            )}
          </>
        )}
        </div>
        </div>
      </Panel>

      <SimulationProgressIndicatorJson />
    </>
  );
});

export default SimulationResultSummary;
