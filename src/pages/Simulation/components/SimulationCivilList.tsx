import { useState, Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import Spacer from '@/components/basic/Spacer';
import Icon from '@/components/basic/Icon';
import { simulationStore } from '@/stores/SimulationStore';
// import SimulationDetailRow from '@/pages/Simulation/components/SimulationDetailRow'; // (Civil용 상세 Row가 필요하다면 별도 구현 또는 재사용)

// 유틸리티 함수
const formatPollutant = (pm_type: string) => {
  if (pm_type === 'pm10') return '미세먼지';
  if (pm_type === 'pm25') return '초미세먼지';
  return pm_type;
};

const formatDate = (isoString: string) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${Y}.${M}.${D} ${h}:${m}`;
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
        <div style={{ width: '40px', textAlign: 'center' }}>#</div>
        <div style={{ flex: 1, textAlign: 'center' }}>측정일시</div>
        <div style={{ flex: 1, textAlign: 'center' }}>오염물질</div>
        <div style={{ flex: 1, textAlign: 'center' }}>평균농도</div>
        <div style={{ width: '60px', textAlign: 'center' }}>상세</div>
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
              <div style={{ flex: 1, textAlign: 'center', color: '#FFFFFF' }}>
                {formatDate(sim.measured_at)}
              </div>

              {/* 오염물질 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                {formatPollutant(sim.pm_type)}
              </div>

              {/* 평균농도 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                {sim.average_concentration.toFixed(2)} µg/m³
              </div>

              {/* 상세 버튼 */}
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
               // Civil용 상세 컴포넌트가 필요하면 여기에 추가
               // 예: <SimulationCivilDetailRow data={sim} />
               <div className="p-4 bg-[#222222] text-white text-sm">
                 {/* 임시 상세 내용 */}
                 <div>기상 정보: 풍향 {sim.weather.wind_direction_10m}°, 풍속 {sim.weather.wind_speed_10m}m/s</div>
                 <div className="mt-2">측정소 데이터 ({sim.station_data.length}개):</div>
                 <div className="grid grid-cols-2 gap-2 mt-1">
                   {sim.station_data.slice(0, 4).map(st => (
                     <div key={st.index} className="text-gray-400 text-xs">
                       - {st.station_name}: {st.concentration} ({st.pm_label})
                     </div>
                   ))}
                 </div>
               </div>
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