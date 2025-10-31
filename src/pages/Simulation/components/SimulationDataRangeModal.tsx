import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { simulationStore } from '@/stores/SimulationStore';
import DatePicker from '@/components/basic/DatePicker';
import Title from '@/components/basic/Title';
import Button from '@/components/basic/Button';
import Spacer from '@/components/basic/Spacer';
import Icon from '@/components/basic/Icon';

/**
 * 날짜 포맷팅 유틸 (YYYY-MM-DD)
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 월 (0부터 시작하므로 +1)
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 날짜 입력 필드 컴포넌트
 */
const DateInputTrigger: React.FC<{ value: string; onClick: () => void; }> = ({ value, onClick }) => {
  return (
    <div className="flex items-center px-3 py-1 rounded-[4px] cursor-pointer bg-black border border-[#696A6A]" onClick={onClick}>
      <Icon name="calendar" className="w-4 h-4" />
      <div
        className="pl-3 pr-3 py-4 bg-black text-white outline-none"
        style={{
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: 'normal',
          colorScheme: 'dark',
        }}
      />
      {value}
    </div>
  );
};

/**
 * 기간 설정 모달
 */
export const SimulationDataRangeModal = observer(() => {
  // 모달 내부에서 사용할 임시 날짜 상태
  // 스토어에 값이 없으면 오늘 날짜로 초기화
  const [tempStartDate, setTempStartDate] = useState(
    simulationStore.startDate ? new Date(simulationStore.startDate) : new Date()
  );
  const [tempEndDate, setTempEndDate] = useState(
    simulationStore.startDate ? new Date(simulationStore.startDate) : new Date()
  );
  const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);

  // 스토어의 날짜가 변경되면 모달의 임시 상태도 동기화
  useEffect(() => {
    setTempStartDate(simulationStore.startDate ? new Date(simulationStore.startDate) : new Date());
    setTempEndDate(simulationStore.endDate ? new Date(simulationStore.endDate) : new Date());
  }, [simulationStore.startDate, simulationStore.endDate]);

  const handleStartDateChange = (date: Date) => {
    setTempStartDate(date);
    setOpenPicker(null);
  };

  const handleEndDateChange = (date: Date) => {
    setTempEndDate(date);
    setOpenPicker(null);
  };

  const handleApply = () => {
    if (tempStartDate > tempEndDate) {
      alert("시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }
    simulationStore.setDateRange(formatDate(tempStartDate), formatDate(tempEndDate));
  };

  const handleReset = () => {
    simulationStore.clearDateRange();
  };

  const handleClose = () => {
    simulationStore.closeDateModal();
  };

  return (
    <div className="absolute top-68 left-51 p-4 z-[9999] bg-black border border-[#696A6A] opacity-90 w-100">
      <Title onClose={handleClose} dividerColor={"bg-white"}>기간 설정</Title>
      <Spacer height={16} />

      <div className="flex flex-col self-stretch">
        <div style={{ 
          fontFamily: 'Pretendard',
          lineHeight: 'normal', 
          fontSize: '18px', 
          fontWeight: '700', 
          color: '#FFFFFF' 
        }}>
          요청기간
        </div>
        <Spacer height={8} />
        <div style={{
          fontFamily: 'Pretendard',
          lineHeight: 'normal', 
          fontSize: '14px',
          fontWeight: '400', 
          color: '#A6A6A6', 
          opacity: 0.8
        }}>
          * 시뮬레이션 실행을 요청한 기간 기준으로 시뮬레이션 목록이 자동 필터링 됩니다.
        </div>
        <Spacer height={24} />
        
        {/* 날짜 선택 영역 */}
        <div className="flex items-center justify-between self-stretch gap-3">
          <div className="relative flex-1">
            <DateInputTrigger
              value={formatDate(tempStartDate)}
              onClick={() => setOpenPicker(openPicker === 'start' ? null : 'start')}
            />
            {openPicker === 'start' && (
              <DatePicker 
                value={tempStartDate}
                onChange={handleStartDateChange}
                onClose={() => setOpenPicker(null)}
              />
            )}
          </div>
          <span style={{ 
            fontFamily: 'Pretendard',
            lineHeight: 'normal', 
            fontSize: '14px', 
            fontWeight: '400', 
            color: '#FFFFFF' 
          }}>
            -
          </span>
          
          <div className="relative flex-1">
            <DateInputTrigger
              value={formatDate(tempEndDate)}
              onClick={() => setOpenPicker(openPicker === 'end' ? null : 'end')}
            />
            {openPicker === 'end' && (
              <DatePicker 
                value={tempEndDate}
                onChange={handleEndDateChange}
                onClose={() => setOpenPicker(null)}
              />
            )}
          </div>
        </div>
        
        <Spacer height={32} />

        {/* 버튼 영역 */}
        <div className="flex gap-2 self-stretch">
          <Button variant="outline" onClick={handleReset} className="flex-1" showIcon={false}>
            설정 초기화
          </Button>
          <Button variant="solid" onClick={handleApply} className="flex-1" showIcon={false}>
            적용
          </Button>
        </div>
      </div>
    </div>
  );
});