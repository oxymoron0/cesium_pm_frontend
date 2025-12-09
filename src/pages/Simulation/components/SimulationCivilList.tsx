import { useState, Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import Spacer from '@/components/basic/Spacer';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
import Button from '@/components/basic/Button';
import SimulationCivilDetailRow from '../SimulationCivilDetailRow';
// import SimulationDetailRow from '@/pages/Simulation/components/SimulationDetailRow'; // (Civil용 상세 Row가 필요하다면 별도 구현 또는 재사용)

const formatDate = (isoString: string) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${Y}.${M}.${D} ${h}시`;
};

/**
 * 시민용 시뮬레이션 목록 컴포넌트
 */
const SimulationCivilList = observer(function SimulationCivilList() {
  const { 
    simulationCivilList, 
    paginationCivil, 
    isLoadingCivilList,
    civilConcentration
  } = simulationStore;

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleToggleExpand = (index: number) => {
    setExpandedId(prevId => (prevId === index ? null : index));
  };

  // 페이지 변경 함수
  const handlePageChange = (newPage: number) => {
    // 스토어에 저장된 현재 농도 값(civilConcentration)을 유지하면서 페이지 번호만 변경
    simulationStore.loadSimulationCivilList(civilConcentration, newPage);
  };

  const renderPagination = () => {
    if (!paginationCivil || isLoadingCivilList) return <div className="h-[32px]" />;

    const { page, total_pages } = paginationCivil;
    const pageNumbers = Array.from({ length: total_pages }, (_, i) => i + 1);

    return (
      <div
        className="flex justify-center items-center gap-4 self-stretch"
        style={{ fontFamily: 'Pretendard', fontSize: '14px', fontWeight: '600' }}
      >
        <Icon 
          name="chevron-left" 
          className={`w-4 h-4 ${page > 1 ? 'cursor-pointer' : 'opacity-50'}`}
          onClick={() => page > 1 && handlePageChange(page - 1)} // 수정됨
        />
        
        {pageNumbers.map(number => (
          <span
            key={number}
            className="cursor-pointer"
            style={{ color: number === page ? '#FFD040' : 'white' }}
            onClick={() => handlePageChange(number)} // 수정됨
          >
            {number}
          </span>
        ))}

        <Icon 
          name="chevron-right" 
          className={`w-4 h-4 ${page < total_pages ? 'cursor-pointer' : 'opacity-50'}`}
          onClick={() => page < total_pages && handlePageChange(page + 1)} // 수정됨
        />
      </div>
    );
  };

  // 폰트 스타일
  const fontPretendard = { fontFamily: 'Pretendard', lineHeight: 'normal' };
  const headerStyle = { ...fontPretendard, fontSize: '14px', fontWeight: '400', color: '#FFFFFF' };
  const rowStyle = { ...fontPretendard, fontSize: '14px', fontWeight: '400', color: '#A6A6A6' };

  return (
    <>
      <Spacer height={16} />
      
      {/* 리스트 헤더 */}
      <div
        className="flex items-center self-stretch px-4 h-10 border-y border-[#696A6A]"
        style={headerStyle}
      >
        {/* className='relative right-5' */}
        <div style={{ width: '40px', textAlign: 'center' }}>#</div>
        <div className='flex flex-1 cursor-pointer'>
          <div style={{ flex: 1.1, textAlign: 'center' }}>측정일시</div>
          <Icon name='arrow_updown' className='relative right-5'/>
        </div>
        <div className='flex flex-1 cursor-pointer'>
          <div style={{ flex: 0.8, textAlign: 'center' }}>농도</div>
          <Icon name='arrow_updown' className='relative right-6'/>
        </div>
        <div className='flex flex-1 cursor-pointer'>
          <div style={{ flex: 0.5, textAlign: 'center' }}>풍향</div>
          <Icon name='arrow_updown' className='relative right-2'/>
        </div>
        <div className='flex flex-1 cursor-pointer'>
          <div style={{ flex: 0.3, textAlign: 'center' }}>풍속</div>
          <Icon name='arrow_updown'/>
        </div>
        <div className='flex flex-1'>
          <div style={{ flex: 0.6, textAlign: 'center' }}>실행</div>
        </div>
        <div style={{ flex: 0.5}} />
      </div>

      {/* 리스트 바디 */}
      <div className="flex flex-col self-stretch">
        {isLoadingCivilList && (
          <div className="flex items-center justify-center h-20 text-white text-sm">
            데이터를 불러오는 중입니다...
          </div>
        )}
        
        {!isLoadingCivilList && simulationCivilList.map((sim) => (
          <Fragment key={sim.index}>
            <div
              className="flex items-center self-stretch px-4 h-[56px] border-b border-[#696A6A]"
              style={rowStyle}
            >
              {/* # (Index) */}
              <div style={{ width: '40px', textAlign: 'center' }}>
                {sim.index}
              </div>

              {/* 측정일시 */}
              <div style={{ flex: 1.1, textAlign: 'center', color: '#FFFFFF' }}>
                {formatDate(sim.measured_at)}
              </div>

              {/* 농도 */}
              <div style={{ flex: 1, textAlign: 'center', color: '#FFFFFF' }}>
                {sim.average_concentration.toFixed(1)} µg/m³
              </div>

              {/* 풍향 */}
              <div style={{ flex: 1, textAlign: 'center', color: '#FFFFFF' }}>
                {sim.weather.wind_direction_1m} °
              </div>

              {/* 풍속 */}
              <div style={{ flex: 1, textAlign: 'center', color: '#FFFFFF' }}>
                {sim.weather.wind_speed_1m} m/s
              </div>

              {/* 시뮬레이션 실행 */}
              <div className="flex flex-col pt-2 self-stretch">
                <Button
                  variant='solid_civil'
                  iconName={"excute"}
                  iconPos="right"
                  onClick={() => alert('실행')}
                >
                  시뮬레이션 실행
                </Button>
              </div>
              {/* 상세 */}
              <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                <Icon 
                  name="dropmenubtn" 
                  className={`w-4 h-4 cursor-pointer transition-transform duration-200 ${
                    expandedId === sim.index ? 'rotate-180' : ''
                  }`}
                  onClick={() => handleToggleExpand(sim.index)} 
                />
              </div>
            </div>

            {/* 상세 정보 (확장 영역) */}
            {expandedId === sim.index && (
               <SimulationCivilDetailRow data={sim} />
            )}
          </Fragment>
        ))}
        
        {!isLoadingCivilList && simulationCivilList.length === 0 && (
           <div className="flex items-center justify-center h-20 text-gray-500 text-sm">
             데이터가 없습니다.
           </div>
        )}
      </div>

      <Spacer height={16} />

      {/* 페이지네이션 */}
      {renderPagination()}
    </>
  );
});

export default SimulationCivilList;