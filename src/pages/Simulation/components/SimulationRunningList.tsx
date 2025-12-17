import { useState, Fragment, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import { userStore } from '@/stores/UserStore';
import type { PMType } from '@/types/simulation_request_types';
import SimulationDetailRow from '@/pages/Simulation/components/SimulationDetailRow';
import Checkbox from './Checkbox';
import { SimulationDataRangeModal } from './SimulationDataRangeModal';

const POLLING_INTERVAL = 5000; // 5초


// 3. 유틸리티 함수 (데이터 포맷팅)
const formatPollutant = (pm_type: PMType) => {
  if (pm_type === 'pm10') return '미세먼지';
  if (pm_type === 'pm25') return '초미세먼지';
  if (pm_type === 'vocs') return 'VOCs';
  return pm_type;
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${Y}.${M}.${D} ${h}:${m}`;
};

/**
 * 시뮬레이션 패널 전체 컴포넌트
 * 이미지에 표시된 모든 UI 요소를 포함합니다.
 */
const SimulationRunningList = observer(function SimulationRunningList() {
  const { 
    simulationList, 
    pagination, 
    isLoadingList, 
    currentPage, 
    totalPages, 
    pollutantFilter, 
    sortOrder, 
    isDeleteMode,
    itemsToDelete,
    isDateModalOpen, } = simulationStore;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialLoadRef = useRef(true);

  // 현재 페이지 데이터 로드 함수 (폴링용 - silent 모드)
  const loadCurrentPageData = useCallback(async (silent: boolean = false) => {
    await simulationStore.loadSimulationList(currentPage, 7, undefined, silent);
  }, [currentPage]);

  // 최초 로드
  useEffect(() => {
    simulationStore.loadSimulationList(1);
    isInitialLoadRef.current = false;
  }, []);

  // 5초마다 폴링 (currentPage 변경 시 interval 재설정)
  useEffect(() => {
    // 최초 로드 완료 후에만 폴링 시작
    if (isInitialLoadRef.current) return;

    // 기존 interval 정리
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // 5초마다 현재 페이지 데이터 갱신 (silent 모드로 로딩 UI 깜빡임 방지)
    pollingIntervalRef.current = setInterval(() => {
      console.log(`[SimulationRunningList] Polling page ${currentPage}...`);
      loadCurrentPageData(true);
    }, POLLING_INTERVAL);

    // cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentPage, loadCurrentPageData]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      simulationStore.clearSimulationList();
    };
  }, []);

  const handleToggleExpand = (uuid: string) => {
    setExpandedId(prevId => (prevId === uuid ? null : uuid));
  };

  const renderPagination = () => {
    if (!pagination || isLoadingList) return <div className="h-[32px]" />; // 로딩 중 또는 데이터 없을 때 빈 공간

    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
      <div
        className="flex justify-center items-center gap-4 self-stretch"
        style={{ 
          fontFamily: 'Pretendard',
          lineHeight: 'normal', 
          fontSize: '14px', 
          fontWeight: '600' 
        }}
       >
         <Icon 
           name="chevron-left" 
           className={`w-4 h-4 ${currentPage > 1 ? 'cursor-pointer' : 'opacity-50'}`}
           onClick={() => simulationStore.setPage(currentPage - 1)}
         />
         
         {pageNumbers.map(number => (
           <span
             key={number}
             className="cursor-pointer"
             style={{ color: number === currentPage ? '#FFD040' : 'white' }}
             onClick={() => simulationStore.setPage(number)}
           >
             {number}
           </span>
         ))}

         <Icon 
           name="chevron-right" 
           className={`w-4 h-4 ${currentPage < totalPages ? 'cursor-pointer' : 'opacity-50'}`}
           onClick={() => simulationStore.setPage(currentPage + 1)}
         />
       </div>
    );
  };

  return (
    <>
      <Spacer height={16} />
      <div
        className="self-stretch"
        style={{
          color: '#A6A6A6',
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: 'normal',
          opacity: 0.8
        }}
      >
        * 맞춤 설정한 시뮬레이션의 대기 현황과 완료 이력을 확인할 수 있습니다. (최대 6개월 보관)
      </div>
      <Spacer height={16} />
      {/* 5. Toolbar (Filters & Actions) */}
      <div className="flex justify-between items-center self-stretch">
        <div className="flex gap-2">
          <div className="relative h-8">
            <select
              value={pollutantFilter}
              onChange={(e) => simulationStore.setPollutantFilter(e.target.value as PMType | 'all')}
              className="w-full h-10 pl-3 pr-10 py-1 bg-black rounded border border-[#696A6A] appearance-none" //
              style={{
                fontFamily: 'Pretendard',
                lineHeight: 'normal',
                fontSize: '14px', 
                fontWeight: '400', 
                color: '#FFFFFF'
              }}
            >
              <option value="all">오염 물질 전체</option>
              <option value="pm10">미세먼지 (PM-10)</option>
              <option value="pm25">초미세먼지 (PM-2.5)</option>
              <option value="vocs">휘발성유기화합물 (VOCs)</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/4 pointer-events-none">
              <Icon name="dropmenubtn" className="w-4 h-4" />
            </div>
          </div>
            <Button variant="dark" showIcon={true} iconName="filterbtn" iconPos='right'onClick={() => simulationStore.openDateModal()}>
              기간 설정
            </Button>
        </div>
        <Button 
          variant="noStyle"
          showIcon={true} 
          iconName="delete"
          onClick={async () => {
            if (isDeleteMode && itemsToDelete.size > 0) {
            const result = await simulationStore.openModal('delSim');
            if (result === 'confirm') {
              simulationStore.deleteSelectedSimulations();
            }
            } else {
              simulationStore.toggleDeleteMode();
            }
          }}
        >
          삭제
        </Button>
      </div>
      <Spacer height={16} />

      {/* 6. List Header */}
      <div
        className="flex items-center self-stretch px-4 h-10 border-y border-[#696A6A]" //
        style={{
          fontFamily: 'Pretendard',
          lineHeight: 'normal',
          fontSize: '14px', 
          fontWeight: '400', 
          color: '#FFFFFF'
        }}
      >
        {isDeleteMode && (
          <div style={{ width: '40px' }}>
            <Checkbox checked={simulationStore.isAllSelectedOnPage} onChange={() => simulationStore.toggleSelectAllOnPage()} />
          </div>
        )}
        <div style={{ width: '40px' }}>#</div>
        <div style={{ flex: 2, textAlign: 'start' }}>시뮬레이션 제목</div>
        <div style={{ flex: 1, textAlign: 'start' }}>오염물질</div>
        <div style={{ flex: 2, textAlign: 'start' }} className="flex items-center gap-2">
          <span>요청일시</span>
          <Icon name="sortbtn" 
            className={`w-4 h-4 cursor-pointer transition-transform duration-200 ${
              sortOrder === 'oldest' ? 'rotate-180' : ''
            }`} 
             onClick={() => {simulationStore.toggleSortOrder()}}/>
        </div>
        <div style={{ flex: 1, textAlign: 'start' }}>진행상태</div>
        <div style={{ flex: 2, textAlign: 'center' }}>상세</div>
      </div>

      {/* 7. List Body */}
      <div className="flex flex-col self-stretch">
        {isLoadingList && (
          <div className="flex items-center justify-center h-full" 
            style={{
              fontFamily: 'Pretendard',
              lineHeight: 'normal',
              fontSize: '14px', 
              fontWeight: '400', 
              color: '#FFFFFF'
            }}
          >
            데이터를 불러오는 중입니다...
          </div>
        )}
        {!isLoadingList && simulationList.map((sim) => (
          <Fragment key={sim.uuid}>
          <div
            className="flex items-center self-stretch px-4 h-[56px] border-b border-[#696A6A]" //
            style={{
                fontFamily: 'Pretendard',
                lineHeight: 'normal',
                fontSize: '14px', 
                fontWeight: '400', 
                color: '#A6A6A6'
            }}
          >
            {isDeleteMode && (
              <div style={{ width: '40px' }}>
                {sim.user_id === userStore.currentUser && (
                  <Checkbox checked={itemsToDelete.has(sim.uuid)} onChange={() => simulationStore.toggleItemForDelete(sim.uuid)} />
                )}
              </div>
            )}
            {/* # */}
            <div style={{ width: '40px', color: '#A6A6A6' }}>
              {String(sim.index).padStart(2, '0')}
            </div>

            {/* 시뮬레이션 제목 */}
            <div style={{ flex: 2 }} className="flex items-center gap-2">
              {sim.user_id === userStore.currentUser ? (
                <div className="flex flex-col items-start">
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{
                      fontFamily: 'Pretendard',
                      lineHeight: 'normal',
                      fontSize: '12px',
                      fontWeight: '400',
                      backgroundColor: 'rgba(20, 184, 166, 0.3)',
                      color: '#6EE7B7' }}
                  >
                    내 시뮬레이션
                  </span>
                  <span>{sim.simulation_name}</span>
                </div>
              ) :
                <span style={{ color: '#A6A6A6' }}>{sim.simulation_name}</span>
              }
            </div>

            {/* 오염물질 */}
            <div style={{ flex: 1 }}>{formatPollutant(sim.pm_type)}</div>

            {/* 요청일시 */}
            <div style={{ flex: 2, color: '#A6A6A6' }}>{formatDate(sim.requested_at)}</div>

            {/* 진행상태 */}
            <div style={{ flex: 1 }}>
              {sim.status}
            </div>

            {/* 상세 */}
            <div style={{ flex: 2 }} className="flex justify-between items-center">
              <div className="flex-1 flex justify-center items-center">
                {sim.status === '진행중' && sim.user_id === userStore.currentUser && (
                  <div
                    className="flex items-center justify-center w-auto h-8 cursor-pointer py-1 px-3 rounded-[4px] text-[#FFD040] border border-[#FFD040] bg-black"
                    onClick={async () => {
                      const result = await simulationStore.openModal('stopSim');
                      if (result === 'confirm') {
                        await simulationStore.killSimulation();
                      }
                    }}
                  >
                    분석 중지
                  </div>
                )}
                {sim.status === '완료' && (
                  <Button iconName={'excute'} iconPos='right' 
                    onClick={async () => {
                      simulationStore.setSelectedStartSimulation(sim)
                      const result = await simulationStore.openModal('runList');
                      if (result === 'confirm') {
                        //TODO 실행로직 추가해야함
                      }
                    }}
                  >
                    실행
                  </Button>
                )}
              </div>
              <Icon 
                  name="dropmenubtn" 
                  className={`w-4 h-4 cursor-pointer transition-transform duration-200 ${
                    expandedId === sim.uuid ? 'rotate-180' : ''
                  }`}
                  onClick={() => handleToggleExpand(sim.uuid)} 
                />
            </div>
          </div>
            {expandedId === sim.uuid && (
              <SimulationDetailRow sim={sim} />
            )}
            </Fragment>
        ))}
      </div>

      <Spacer height={16} />

      {/* 8. Pagination */}
      {renderPagination()}

      {/* DateModal */}
      {isDateModalOpen && <SimulationDataRangeModal />}
    </>
  );
});

export default SimulationRunningList