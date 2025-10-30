import { observer } from 'mobx-react-lite';
import { simulationStore } from '@/stores/SimulationStore';
import Panel from '@/components/basic/Panel';

/**
 * 시뮬레이션 상세 정보 패널 컴포넌트
 * 닫을 수 있는 독립적인 패널로 표시됩니다.
 */
const SimulationDetailPanel = observer(function SimulationDetailPanel() {
  if (!simulationStore.isDetailPanelOpen) {
    return null;
  }

  const detail = simulationStore.simulationDetail;

  return (
    <Panel position="right" offset={96} width="640px" className="!p-0">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-gray-800 border-gray-700">
          <div className="text-lg font-semibold text-blue-400">
            시뮬레이션 상세 정보
          </div>
          <button
            onClick={() => simulationStore.closeSimulationDetail()}
            className="px-3 py-1 text-sm transition-colors rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
          >
            닫기
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 px-6 py-4 space-y-4 overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#60A5FA transparent'
          }}
        >
          {/* Loading State */}
          {simulationStore.isLoadingDetail && (
            <div className="py-12 text-center text-gray-400">
              로딩 중...
            </div>
          )}

          {/* Error State */}
          {simulationStore.detailError && (
            <div className="p-4 rounded bg-red-900/30 text-red-300">
              오류: {simulationStore.detailError}
            </div>
          )}

          {/* Detail Content */}
          {detail && !simulationStore.isLoadingDetail && (
            <>
              {/* Basic Info */}
              <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
                <div className="pb-2 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">
                  기본 정보
                </div>
                <DetailRow label="시뮬레이션명" value={detail.simulationName} />
                <DetailRow label="UUID" value={detail.uuid} mono />
                <DetailRow label="사용자" value={detail.userID} />
                <DetailRow label="비공개" value={detail.isPrivate ? '예' : '아니오'} />
                <DetailRow
                  label="상태"
                  value={detail.status}
                  valueColor={getStatusColor(detail.status)}
                />
              </div>

              {/* Timestamps */}
              <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
                <div className="pb-2 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">
                  시간 정보
                </div>
                <DetailRow label="요청 시간" value={formatDate(detail.requestedAt)} />
                <DetailRow label="시작 시간" value={detail.startedAt ? formatDate(detail.startedAt) : '-'} />
                <DetailRow label="완료 시간" value={detail.completedAt ? formatDate(detail.completedAt) : '-'} />
                <DetailRow label="재시도 횟수" value={detail.retryCount?.toString() ?? '0'} />
              </div>

              {/* Location */}
              <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
                <div className="pb-2 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">
                  위치 정보
                </div>
                <DetailRow label="도시" value={detail.location} />
                <DetailRow label="지번 주소" value={detail.lot} />
                <DetailRow label="도로명 주소" value={detail.roadName} />
              </div>

              {/* Weather */}
              {detail.weatherData && (
                <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
                  <div className="pb-2 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">
                    기상 정보
                  </div>
                  <DetailRow label="온도" value={`${detail.weatherData.temperature}°C`} />
                  <DetailRow label="습도" value={`${detail.weatherData.humidity}%`} />
                  <DetailRow label="해면 기압" value={`${detail.weatherData.sea_level_pressure} hPa`} />
                  <DetailRow label="풍속 (1m)" value={`${detail.weatherData.wind_speed_1m} m/s`} />
                  <DetailRow label="풍향 (1m)" value={`${detail.weatherData.wind_direction_1m}°`} />
                  <DetailRow label="풍속 (10m)" value={`${detail.weatherData.wind_speed_10m} m/s`} />
                  <DetailRow label="풍향 (10m)" value={`${detail.weatherData.wind_direction_10m}°`} />
                </div>
              )}

              {/* Air Quality */}
              {detail.airQualityData && (
                <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
                  <div className="pb-2 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">
                    대기질 정보
                  </div>
                  <DetailRow label="PM 타입" value={detail.pmtype?.toUpperCase() ?? '-'} />
                  <DetailRow label="측정소" value={detail.firstStationName ?? '-'} />
                  <DetailRow label="농도" value={detail.firstStationConcentration !== undefined ? `${detail.firstStationConcentration} μg/m³` : '-'} />
                  <div className="pt-2 text-xs text-gray-500">
                    총 {detail.airQualityData.points.length}개 측정소
                  </div>
                </div>
              )}

              {/* Results */}
              {detail.resultPath && (
                <div className="p-3 space-y-2 rounded-lg bg-gray-900/50">
                  <div className="pb-2 text-sm font-semibold border-b text-cyan-400 border-cyan-400/20">
                    결과 파일
                  </div>
                  <DetailRow label="경로" value={detail.resultPath} mono />
                </div>
              )}

              {/* Error Message */}
              {detail.errorMessage && (
                <div className="p-3 space-y-2 rounded-lg bg-red-900/30">
                  <div className="pb-2 text-sm font-semibold border-b text-red-400 border-red-400/20">
                    오류 메시지
                  </div>
                  <div className="text-sm text-red-300">{detail.errorMessage}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
});

/**
 * 상세 정보 행 컴포넌트
 */
function DetailRow({
  label,
  value,
  mono = false,
  valueColor = 'text-white',
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start space-x-2 text-xs">
      <span className="text-gray-400 min-w-[100px]">{label}:</span>
      <span className={`break-all ${mono ? 'font-mono' : ''} ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * 상태별 색상 반환
 */
function getStatusColor(status: string): string {
  switch (status) {
    case '완료':
      return 'text-green-400';
    case '진행중':
      return 'text-blue-400';
    case '대기':
      return 'text-yellow-400';
    case '실패':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * 날짜 포맷팅
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default SimulationDetailPanel;
