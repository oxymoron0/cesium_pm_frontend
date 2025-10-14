import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import SubTitle from '@/components/basic/SubTitle';
import Spacer from '@/components/basic/Spacer';
import Select from '@/components/basic/Select';
import Icon from '@/components/basic/Icon';
import Info from '@/components/basic/Info';
import Divider from '@/components/basic/Divider';
import DatePicker from '@/components/basic/DatePicker';
import TimePicker from '@/components/basic/TimePicker';
import { priorityStore } from '@/stores/PriorityStore';

interface PriorityCustomConfigProps {
  onBack: () => void;
  onSearch: () => void;
}

const PriorityCustomConfig = observer(function PriorityCustomConfig({ onBack, onSearch }: PriorityCustomConfigProps) {
  const config = priorityStore.config;
  const [locationMode, setLocationMode] = useState<'address' | 'point'>('address');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  if (!config) {
    return null;
  }

  // config.date 문자열을 Date 객체로 변환
  const parseDate = (dateStr: string): Date => {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  };

  const handleDateChange = (date: Date) => {
    const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    priorityStore.updateDate(dateStr);
  };

  const handleTimeChange = (time: string) => {
    priorityStore.updateTime(time);
  };

  // 옵션 데이터
  const cityOptions = [
    { value: '부산시', label: '부산시' }
  ];

  const districtOptions = [
    { value: '부산진구', label: '부산진구' },
    { value: '해운대구', label: '해운대구' },
    { value: '동래구', label: '동래구' }
  ];

  const dongOptions = priorityStore.getDongOptions();

  return (
    <>
      <Title onBack={onBack}>
        맞춤설정으로 조회
      </Title>

      <Spacer height={16} />

      {/* 캡션 */}
      <div className="self-stretch">
        <p
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: 'normal',
            opacity: 0.8
          }}
        >
          * 원하는 날짜, 시간, 행정구역을 직접 선택하여 취약시설 중심의 살수차 우선 투입 순위를 확인해 보세요.
        </p>
      </div>

      <Spacer height={16} />
      <SubTitle>조건 설정</SubTitle>
      <Divider />

      <Spacer height={16} />

      {/* 관찰일시 섹션 */}
      <div className="flex flex-col gap-3 pb-4 border-b border-[#696A6A] self-stretch" style={{ overflow: 'visible' }}>
        {/* 관찰일시 제목 */}
        <div className="flex items-center gap-[5px] self-stretch">
          <div
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            관찰일시
          </div>
          <Info>
            시뮬레이션을 실행할 시점을 선택합니다.
            날짜와 시간대를 지정하여 해당 시점의 대기질 상태를 시뮬레이션할 수 있습니다.
          </Info>
        </div>

        {/* 날짜와 시간 입력 */}
        <div className="flex w-full gap-3" style={{ overflow: 'visible' }}>
          <div className="flex flex-1 gap-[7px] h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFFFFF',
                width: '48px',
                flexShrink: 0
              }}
            >
              날짜
            </p>
            <div className="flex-1 relative">
              <div
                className="flex items-center gap-1 px-3 py-1 bg-black rounded border border-[#696A6A] cursor-pointer"
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{ height: '32px' }}
              >
                <Icon name="calendar" className="w-4 h-4" />
                <p
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: config.date ? '#FFFFFF' : '#A6A6A6'
                  }}
                >
                  {config.date || '날짜 선택'}
                </p>
              </div>
              {showDatePicker && (
                <DatePicker
                  value={parseDate(config.date || '')}
                  onChange={handleDateChange}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>
          </div>
          <div className="flex flex-1 gap-[7px] h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '13px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFFFFF',
                width: '48px',
                flexShrink: 0
              }}
            >
              시간
            </p>
            <div className="flex-1 relative">
              <div
                className="flex items-center gap-1 px-3 py-1 bg-black rounded border border-[#696A6A] cursor-pointer"
                onClick={() => setShowTimePicker(!showTimePicker)}
                style={{ height: '32px' }}
              >
                <Icon name="time" className="w-4 h-4" />
                <p
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: config.time ? '#FFFFFF' : '#A6A6A6'
                  }}
                >
                  {config.time || '시간 선택'}
                </p>
              </div>
              {showTimePicker && (
                <TimePicker
                  value={config.time || '00시 ~ 01시'}
                  onChange={handleTimeChange}
                  onClose={() => setShowTimePicker(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Spacer height={16} />

      {/* 행정구역 섹션 */}
      <div className="flex flex-col self-stretch gap-4">
        {/* 행정구역 제목 */}
        <div className="flex items-center gap-[5px] self-stretch">
          <div
            style={{
              color: '#FFF',
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal'
            }}
          >
            행정구역
          </div>
          <Info>
            <SubTitle>행정구역</SubTitle>
            <Divider height='h-[2px]' />
            우선순위를 조회할 행정구역을 선택합니다.
            시/도, 군/구, 읍/면/동 단위로 지역을 지정할 수 있습니다.
          </Info>
        </div>

        {/* 주소 조회 / 위치 지정 토글 버튼 */}
        <div className="flex gap-3 h-10 self-stretch">
          <button
            className={`flex-1 rounded-[19px] flex items-center justify-center px-4 py-[10px] cursor-pointer ${
              locationMode === 'address'
                ? 'bg-gradient-to-b from-[#FDF106] to-[#FFD040]'
                : 'bg-[#696A6A]'
            }`}
            onClick={() => setLocationMode('address')}
          >
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: locationMode === 'address' ? '700' : '400',
                lineHeight: 'normal',
                color: '#000000'
              }}
            >
              주소 조회
            </p>
          </button>
          <button
            className={`flex-1 rounded-[19px] flex items-center justify-center px-4 py-[10px] cursor-pointer ${
              locationMode === 'point'
                ? 'bg-gradient-to-b from-[#FDF106] to-[#FFD040]'
                : 'bg-[#696A6A]'
            }`}
            onClick={() => setLocationMode('point')}
          >
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: locationMode === 'point' ? '700' : '400',
                lineHeight: 'normal',
                color: '#000000'
              }}
            >
              위치 지정
            </p>
          </button>
        </div>

        {/* 행정구역 Select - 한 줄에 3개 */}
        <div className="flex gap-3 items-center self-stretch">
          <div className="flex flex-1 gap-2 h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#FFFFFF'
              }}
            >
              시/도
            </p>
            <Select
              value={config.city}
              options={cityOptions}
              onChange={(value) => priorityStore.updateCity(value)}
              className="flex-1"
              hideLabel
            />
          </div>
          <div className="flex flex-1 gap-[7px] h-8 items-center">
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#FFFFFF'
              }}
            >
              군/구
            </p>
            <Select
              value={config.district}
              options={districtOptions}
              onChange={(value) => priorityStore.updateDistrict(value)}
              className="flex-1"
              hideLabel
            />
          </div>
          <div className="flex gap-[7px] h-8 items-center" style={{ width: '170px' }}>
            <p
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#FFFFFF'
              }}
            >
              읍/면/동
            </p>
            <Select
              value={config.dong}
              options={dongOptions}
              onChange={(value) => priorityStore.updateDong(value)}
              className="flex-1"
              hideLabel
            />
          </div>
        </div>
      </div>

      <Spacer height={36} />

      {/* 버튼 영역 */}
      <div className="flex flex-col pt-9 border-t border-[#696A6A] self-stretch">
        <button
          className="bg-[#696A6A] h-10 rounded flex items-center justify-center px-4 py-[10px] cursor-pointer w-full"
          onClick={onSearch}
        >
          <p
            style={{
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal',
              color: '#000000'
            }}
          >
            우선순위 조회
          </p>
        </button>
      </div>
    </>
  );
});

export default PriorityCustomConfig;
