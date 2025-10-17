import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { simulationStore } from '@/stores/SimulationStore';

/**
 * API 기반 시뮬레이션 목록 표시 컴포넌트
 * GET /api/v1/simulation/list로 데이터를 조회하여 표시합니다.
 */
const SimulationList = observer(function SimulationList() {
  // 컴포넌트 마운트 시 목록 로드
  useEffect(() => {
    simulationStore.loadSimulationList();
  }, []);

  const simulations = simulationStore.simulationList;
  const pagination = simulationStore.pagination;

  return (
    <div className="p-3 space-y-3 rounded-lg bg-gray-900/50">
      <div className="flex items-center justify-between pb-2 border-b text-green-400 border-green-400/20">
        <div className="text-sm font-semibold">
          시뮬레이션 목록
          {pagination && (
            <span className="ml-2 text-xs text-gray-400">
              (총 {pagination.total}개)
            </span>
          )}
        </div>
        <button
          onClick={() => simulationStore.loadSimulationList()}
          disabled={simulationStore.isLoadingList}
          className={`px-2 py-1 text-xs transition-colors rounded ${
            simulationStore.isLoadingList
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300'
          }`}
        >
          {simulationStore.isLoadingList ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* Error State */}
      {simulationStore.listError && (
        <div className="p-3 text-sm rounded bg-red-900/30 text-red-300">
          오류: {simulationStore.listError}
        </div>
      )}

      {/* Loading State */}
      {simulationStore.isLoadingList && simulations.length === 0 && (
        <div className="py-6 text-sm text-center text-gray-500">
          목록을 불러오는 중...
        </div>
      )}

      {/* Empty State */}
      {!simulationStore.isLoadingList && simulations.length === 0 && !simulationStore.listError && (
        <div className="py-6 text-sm text-center text-gray-500">
          시뮬레이션이 없습니다.
        </div>
      )}

      {/* List Content */}
      {simulations.length > 0 && (
        <div
          className="space-y-2 max-h-[400px] overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#4ADE80 transparent',
          }}
        >
          {simulations.map((simulation) => (
            <button
              key={simulation.uuid}
              onClick={() => simulationStore.selectSimulation(simulation.uuid)}
              className="w-full p-3 space-y-1 text-left transition-colors border rounded-lg bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-cyan-400">
                  #{simulation.index}
                </div>
                <div
                  className={`px-2 py-0.5 text-xs rounded ${getStatusStyle(
                    simulation.status
                  )}`}
                >
                  {simulation.status}
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-start space-x-2">
                  <span className="text-gray-400 min-w-[60px]">이름:</span>
                  <span className="text-white break-all">
                    {simulation.simulation_name}
                  </span>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-gray-400 min-w-[60px]">측정소:</span>
                  <span className="text-green-300">{simulation.station_name}</span>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-gray-400 min-w-[60px]">PM 타입:</span>
                  <span className="text-blue-300">{simulation.pm_type.toUpperCase()}</span>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-gray-400 min-w-[60px]">농도:</span>
                  <span className="text-yellow-300">
                    {simulation.concentration} μg/m³
                  </span>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-gray-400 min-w-[60px]">요청:</span>
                  <span className="text-gray-500">
                    {formatDate(simulation.requested_at)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination Info */}
      {pagination && pagination.total > 0 && (
        <div className="pt-2 text-xs text-center border-t text-gray-500 border-gray-700">
          {pagination.page} / {pagination.total_pages} 페이지
        </div>
      )}
    </div>
  );
});

/**
 * 상태별 스타일 반환
 */
function getStatusStyle(status: string): string {
  switch (status) {
    case '완료':
      return 'bg-green-900/30 text-green-300';
    case '진행중':
      return 'bg-blue-900/30 text-blue-300';
    case '대기':
      return 'bg-yellow-900/30 text-yellow-300';
    case '실패':
      return 'bg-red-900/30 text-red-300';
    default:
      return 'bg-gray-900/30 text-gray-300';
  }
}

/**
 * 날짜 포맷팅 (간단 버전)
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default SimulationList;
