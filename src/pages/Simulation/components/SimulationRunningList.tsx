import { useState, Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import Icon from '@/components/basic/Icon';
import SimulationDetailRow from '@/pages/Simulation/components/SimulationDetailRow';

export interface Simulation {
  index: number;
  uuid: string;
  simulation_name: string;
  pm_type: 'pm10' | 'pm25' | 'vocs';
  requested_at: string;
  status: '대기' | '진행중' | '완료';
  concentration: number;
  station_name: string;
  road_name: string;
  lot: string;
  weather: any;
  
  // --- UI 구현에 필요한 추가 필드 ---
  is_private: boolean; 
  height: number | null; 
}

// API 명세 기반 Mock 데이터
const mockSimulationList: Simulation[] = [
  { 
    index: 1, 
    uuid: 'uuid-01', 
    simulation_name: '250807 오전 테스트 1', 
    pm_type: 'pm10', 
    requested_at: '2024-08-07T10:24:00Z', 
    status: '대기', 
    concentration: 56,
    station_name: '부전동', 
    road_name: '부산광역시 부산진구 중앙대로 지하730',
    lot: '부산광역시 부산진구 부전동 573-1',
    weather: {
      wind_direction_10m: 200, 
      wind_speed_10m: 3.41,
    },
    is_private: true, 
    height: 1.5
  },
  { 
    index: 2, 
    uuid: 'uuid-02', 
    simulation_name: '250807 오전 테스트 2', 
    pm_type: 'pm10', 
    requested_at: '2024-08-07T09:30:00Z', 
    status: '대기', 
    concentration: 45, 
    station_name: '부전동', 
    road_name: '', 
    lot: '', 
    weather: {},
    is_private: true, 
    height: null
  },
  { 
    index: 3, 
    uuid: 'uuid-03', 
    simulation_name: '250807 오전 테스트 3', 
    pm_type: 'pm25', 
    requested_at: '2024-08-05T09:20:00Z', 
    status: '진행중', 
    concentration: 22, 
    station_name: '연산동', 
    road_name: '', 
    lot: '', 
    weather: {},
    is_private: true, 
    height: 10
  },
  { 
    index: 4,
    uuid: 'uuid-04', 
    simulation_name: '부전동 미세먼지 테스트', 
    pm_type: 'pm10', 
    requested_at: '2024-08-05T10:24:00Z', 
    status: '완료', 
    concentration: 50, 
    station_name: '부전동', 
    road_name: '', 
    lot: '', 
    weather: {},
    is_private: false, 
    height: 10
  },
  { 
    index: 5,
    uuid: 'uuid-05', 
    simulation_name: '부전동 초미세먼지 테스트', 
    pm_type: 'pm25', 
    requested_at: '2024-08-04T11:00:00Z', 
    status: '완료', 
    concentration: 25, 
    station_name: '부전동', 
    road_name: '', 
    lot: '', 
    weather: {},
    is_private: false, 
    height: 10 
  },
  { 
    index: 6,
    uuid: 'uuid-06', 
    simulation_name: '부전동 VOCs 테스트', 
    pm_type: 'vocs',
    requested_at: '2024-08-03T15:00:00Z', 
    status: '완료', 
    concentration: 30, 
    station_name: '부전동', 
    road_name: '', 
    lot: '', 
    weather: {},
    is_private: false, 
    height: 10 
  },
  { 
    index: 7,
    uuid: 'uuid-07', 
    simulation_name: '미세먼지 고농도 시나리오', 
    pm_type: 'pm10', 
    requested_at: '2024-08-02T16:50:00Z', 
    status: '완료', 
    concentration: 120, 
    station_name: '문현동', 
    road_name: '', 
    lot: '', 
    weather: {},
    is_private: false, 
    height: 10
  },
];

// 3. 유틸리티 함수 (데이터 포맷팅)
const formatPollutant = (pm_type: string) => {
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
  const [pollutantFilter, setPollutantFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const simulations: Simulation[] = mockSimulationList;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = (uuid: string) => {
    setExpandedId(prevId => (prevId === uuid ? null : uuid));
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
              onChange={(e) => setPollutantFilter(e.target.value)}
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
              <option value="pm10">미세먼지</option>
              <option value="pm25">초미세먼지</option>
              <option value="vocs">VOCs</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/4 pointer-events-none">
              <Icon name="dropmenubtn" className="w-4 h-4" />
            </div>
          </div>
            <Button variant="dark" showIcon={true} iconName="filterbtn" iconPos='right'>
              기간 설정
            </Button>
        </div>
        <Button 
          variant="noStyle"
          showIcon={true} 
          iconName="delete"
          onClick={() => console.log('삭제')}
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
        <div style={{ width: '40px' }}>#</div>
        <div style={{ flex: 2, textAlign: 'start' }}>시뮬레이션 제목</div>
        <div style={{ flex: 1, textAlign: 'start' }}>오염물질</div>
        <div style={{ flex: 2, textAlign: 'start' }} className="flex items-center gap-1">
          <span>요청일시</span>
          <Icon name="sortbtn" className="w-4 h-4 cursor-pointer" onClick={() => {}}/>
        </div>
        <div style={{ flex: 1, textAlign: 'start' }}>진행상태</div>
        <div style={{ flex: 2, textAlign: 'center' }}>상세</div>
      </div>

      {/* 7. List Body */}
      <div className="flex flex-col self-stretch">
        {simulations.map((sim, index) => (
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
            {/* # */}
            <div style={{ width: '40px', color: '#A6A6A6' }}>
              {String(index + 1).padStart(2, '0')}
            </div>

            {/* 시뮬레이션 제목 */}
            <div style={{ flex: 2 }} className="flex items-center gap-2">
              {sim.is_private ? (
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
                <span>{sim.simulation_name}</span>
              }
            </div>

            {/* 오염물질 */}
            <div style={{ flex: 1 }}>{formatPollutant(sim.pm_type)}</div>

            {/* 요청일시 */}
            <div style={{ flex: 2, color: '#A6A6A6' }}>{formatDate(sim.requested_at)}</div>

            {/* 진행상태 */}
            <div style={{ flex: 1 }}>
              {sim.status === '대기' && <span>대기</span>}
              {sim.status === '진행중' && <span>진행중</span>}
              {sim.status === '완료' && <span>완료</span>}
            </div>

            {/* 상세 */}
            <div style={{ flex: 2 }} className="flex justify-between items-center">
              <div className="flex-1 flex justify-center items-center">
                {sim.status === '진행중' && (
                  <div 
                    className="flex items-center justify-center w-auto h-8 cursor-pointer py-1 px-3 rounded-[4px] text-[#FFD040] border border-[#FFD040] bg-black"
                    onClick={() => {}}
                  >
                    분석 중지
                  </div>
                )}
                {sim.status === '완료' && (
                  <Button iconName={'excute'} iconPos='right' onClick={() => console.log('시뮬레이션 실행')}>
                    실행
                  </Button>
                )}
                {sim.status === '대기' && <div className="h-8" />}
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
      <div
        className="flex justify-center items-center gap-4 self-stretch"
        style={{ 
          fontFamily: 'Pretendard',
          lineHeight: 'normal', 
          fontSize: '14px', 
          fontWeight: '600' 
        }}
      >
        <Icon name="chevron-left" className="w-4 h-4 cursor-pointer" />
        <span
          className="cursor-pointer"
          style={{ color: currentPage === 1 ? '#FFD040' : 'white' }} //
          onClick={() => setCurrentPage(1)}
        >
          1
        </span>
        <span
          className="cursor-pointer"
          style={{ color: currentPage === 2 ? '#FFD040' : 'white' }}
          onClick={() => setCurrentPage(2)}
        >
          2
        </span>
        <Icon name="chevron-right" className="w-4 h-4 cursor-pointer" />
      </div>
    </>
  );
});

export default SimulationRunningList