import React from 'react';
import Spacer from '@/components/basic/Spacer';
import { type SimulationCivilQuickData } from '@/types/simulation_request_types';

interface SimulationCivilDetailRowProps {
  data: SimulationCivilQuickData;
}

// 날짜 포맷터 (YYYY.MM.DD 오전/오후 HH:MM)
const formatDateTime = (isoString: string) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const ampm = hour >= 12 ? '오후' : '오전';
  
  hour = hour % 12;
  hour = hour ? hour : 12;
  
  return `${year}.${month}.${day} ${ampm} ${String(hour).padStart(2, '0')}:${minute}`;
};

// 시간만 추출 (HH:MM)
const formatTimeOnly = (isoString: string) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${minute}`;
};

const SimulationCivilDetailRow = ({ data }: SimulationCivilDetailRowProps) => {
  const { weather, station_data, pm_type } = data;

  const fontPretendard = { fontFamily: 'Pretendard', lineHeight: 'normal' };
  const labelStyle = { ...fontPretendard, fontSize: '14px', fontWeight: '700', color: '#FFFFFF' };
  const valueBoxStyle = {
    ...fontPretendard,
    fontSize: '14px',
    fontWeight: '400',
    color: '#FFFFFF',
    backgroundColor: 'black',
    border: '1px solid #696A6A',
    borderRadius: '4px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    height: '40px'
  };

  const pollutantLabel = pm_type === 'pm10' ? '미세먼지(PM-10)' : pm_type === 'pm25' ? '초미세먼지(PM-2.5)' : pm_type;

  return (
    <div className="w-full bg-[#2C2C2C] p-4 border-t border-[#696A6A]">
      {/* 1. 측정 환경 정보 섹션 */}
      <div className="flex flex-col w-full rounded overflow-hidden border border-[#696A6A]">
        {/* 헤더 */}
        <div className="w-full bg-[#464646] py-2 px-4 text-white font-bold text-sm">
          측정 환경 정보
        </div>
        
        {/* 내용 */}
        <div className="p-4 bg-[#222222] flex flex-col gap-3">
          {/* 측정 시간 */}
          <div className="flex items-center">
            <div className="w-24 flex-shrink-0">
              <span style={labelStyle}>측정 시간</span>
            </div>
            <div className="flex-1" style={valueBoxStyle}>
              {formatDateTime(data.measured_at)}
            </div>
          </div>

          {/* 기상 상황 */}
          <div className="flex items-center">
            <div className="w-24 flex-shrink-0">
              <span style={labelStyle}>기상 상황</span>
            </div>
            <div className="flex-1" style={valueBoxStyle}>
              (풍향) {weather.wind_direction_1m}° &nbsp;&nbsp; (풍속) {weather.wind_speed_1m} m/s
            </div>
          </div>
        </div>
      </div>

      <Spacer height={16} />

      {/* 2. 정류장 측정 목록 섹션 */}
      <div className="flex flex-col w-full rounded overflow-hidden border border-[#696A6A]">
        {/* 헤더 */}
        <div className="w-full bg-[#464646] py-2 px-4 text-white font-bold text-sm">
          정류장 측정 목록 ({station_data.length})
        </div>

        {/* 테이블 */}
        <div className="bg-[#222222] p-4 pt-2">
          {/* 테이블 헤더 */}
          <div className="flex items-center py-2 border-b border-[#696A6A] text-white text-sm font-bold">
            <div className="w-12 text-center">No</div>
            <div className="flex-1 text-center">정류장</div>
            <div className="w-40 text-center">측정시간</div>
            <div className="w-32 text-center">{pollutantLabel}</div>
          </div>

          {/* 테이블 바디 (스크롤 가능) */}
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
            {station_data.map((station, index) => (
              <div 
                key={index} 
                className="flex items-center py-3 border-b border-[#444444] text-[#A6A6A6] text-sm hover:bg-[#2C2C2C] transition-colors"
              >
                <div className="w-12 text-center">{index + 1}</div>
                <div className="flex-1 text-center text-white">{station.station_name}</div>
                <div className="w-40 text-center">{formatTimeOnly(station.measured_at)}</div>
                <div className="w-32 text-center text-white font-bold">
                  {station.concentration} µg/m³
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationCivilDetailRow;