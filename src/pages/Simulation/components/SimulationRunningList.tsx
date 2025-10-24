import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import Spacer from '@/components/basic/Spacer';
import Button from '@/components/basic/Button';
import Icon from '@/components/basic/Icon';

// API 명세 기반 Mock 데이터
const mockSimulationList = [
  { uuid: 'uuid-01', simulation_name: '250807 오전 테스트 1', pm_type: 'pm10', requested_at: '2024-08-07T10:24:00Z', status: '대기', is_private: true },
  { uuid: 'uuid-02', simulation_name: '250807 오전 테스트 2', pm_type: 'pm10', requested_at: '2024-08-07T09:30:00Z', status: '대기', is_private: true },
  { uuid: 'uuid-03', simulation_name: '250807 오전 테스트 3', pm_type: 'pm25', requested_at: '2024-08-05T09:20:00Z', status: '진행중', is_private: true },
  { uuid: 'uuid-04', simulation_name: '부전동 미세먼지 테스트', pm_type: 'pm10', requested_at: '2024-08-05T10:24:00Z', status: '완료', is_private: false },
  { uuid: 'uuid-05', simulation_name: '부전동 초미세먼지 테스트', pm_type: 'pm25', requested_at: '2024-08-04T11:00:00Z', status: '완료', is_private: false },
  { uuid: 'uuid-06', simulation_name: '부전동 VOCs 테스트', pm_type: 'vocs', requested_at: '2024-08-03T15:00:00Z', status: '완료', is_private: false },
  { uuid: 'uuid-07', simulation_name: '미세먼지 고농도 시나리오', pm_type: 'pm10', requested_at: '2024-08-02T16:50:00Z', status: '완료', is_private: false },
];

// 3. 유틸리티 함수 (데이터 포맷팅)
const formatPollutant = (pm_type: string) => {
  if (pm_type === 'pm10') return '미세먼지';
  if (pm_type === 'pm25') return '초미세먼지';
  if (pm_type === 'vocs') return 'VOCs'; // 이미지에서 확인됨
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
  // '상세설정' / '실행목록' 탭 상태
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'list'>('list');
  // 필터 상태
  const [pollutantFilter, setPollutantFilter] = useState('all');
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  // 목 데이터
  const simulations = mockSimulationList;
  const totalPages = 2;

  // 폰트 스타일 정의 (CLAUDE_FIGMA.md)
  const fontStyles = {
    fontFamily: 'Pretendard',
    lineHeight: 'normal',
  };

  const text14_400 = { ...fontStyles, fontSize: '14px', fontWeight: '400', color: '#FFFFFF' };
  const text12_400 = { ...fontStyles, fontSize: '12px', fontWeight: '400' };
  

  return (
    // 1. Panel: 기본 컨테이너 (너비는 760px로 추정)
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
          {/* Select: Figma 가이드의 Select 패턴 적용 */}
          <div className="relative h-8">
            <select
              value={pollutantFilter}
              onChange={(e) => setPollutantFilter(e.target.value)}
              className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] appearance-none" //
              style={text14_400}
            >
              <option value="all">오염 물질 전체</option>
              <option value="pm10">미세먼지</option>
              <option value="pm25">초미세먼지</option>
              <option value="vocs">VOCs</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            </div>
          </div>
              <Icon name="dropmenubtn" className="w-4 h-4" /> {/* 가상 아이콘 */}
          <Button variant="dark" showIcon={true} iconName="filterbtn" iconPos='right'>
            기간 설정
          </Button>
        </div>
        <button> {/* 가상 아이콘 */}
           <span>
            <Icon name="delete" className="w-4 h-4" /> {/* 가상 아이콘 */}
            삭제
           </span>
        </button>
      </div>
      <Spacer height={16} />

      {/* 6. List Header */}
      <div
        className="flex items-center self-stretch px-4 h-10 border-y border-[#696A6A]" //
        style={text14_400} // 보조 텍스트 색상 및 폰트
      >
        <div style={{ width: '40px' }}>#</div>
        <div style={{ flex: 2, textAlign: 'start' }}>시뮬레이션 제목</div>
        <div style={{ flex: 1, textAlign: 'start' }}>오염물질</div>
        <div style={{ flex: 2, textAlign: 'start' }}>요청일시</div>
        <div style={{ flex: 1, textAlign: 'start' }}>진행상태</div>
        <div style={{ flex: 1, textAlign: 'start' }}>상세</div>
      </div>

      {/* 7. List Body */}
      <div className="flex flex-col self-stretch">
        {simulations.map((sim, index) => (
          <div
            key={sim.uuid}
            className="flex items-center self-stretch px-4 h-[56px] border-b border-[#696A6A]" //
            style={text14_400} // 기본 텍스트 폰트
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
                    style={{ ...text12_400, backgroundColor: 'rgba(20, 184, 166, 0.3)', color: '#6EE7B7' }} // Mocked colors
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
              {sim.status === '진행중' && <span style={{ color: '#FFD040' }}>진행중</span>}
              {sim.status === '완료' && <span style={{ color: '#6EE7B7' }}>완료</span>}
            </div>

            {/* 상세 */}
            <div style={{ flex: 1 }} className="flex justify-center items-center">
              {sim.status === '진행중' && (
                <div 
                  className="text-center w-[80px] h-[40px] cursor-pointer font-[700] text-[10px] py-[10px] px-[19px] rounded-[4px] text-[#FFD040] border border-[#FFD040]"
                  onClick={() => {}}
                >
                  분석 중지
                </div>
              )}
              {sim.status === '완료' && (
                <Button iconName={'excute'} iconPos='right'>
                  실행
                </Button>
              )}
            </div>
              <Icon name="dropmenubtn" className="w-2 h-2" />
          </div>
        ))}
      </div>

      <Spacer height={16} />

      {/* 8. Pagination */}
      <div
        className="flex justify-center items-center gap-4 self-stretch"
        style={{ ...fontStyles, fontSize: '14px', fontWeight: '600' }}
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