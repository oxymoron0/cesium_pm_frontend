import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
// import Title from '@/components/basic/Title';
// import TabNavigation from '@/components/basic/TabNavigation';
import SubTitle from '@/components/basic/SubTitle';
import Divider from '@/components/basic/Divider';
import Spacer from '@/components/basic/Spacer';
import Icon from '@/components/basic/Icon';
import Info from '@/components/basic/Info';
import Checkbox from './Checkbox';
import { simulationStore } from '@/stores/SimulationStore';
import { renderLocationMarker } from '@/utils/cesium/locationMarker';
import type { PMType, SimulationRequest } from '@/types/simulation_request_types';
import { userStore } from '@/stores/UserStore';

interface SimulationDetailConfigProps {
  onBack?: () => void;
  onExecute?: () => void;
}

const SimulationDetailConfig = observer(function SimulationDetailConfig({ onBack, onExecute }: SimulationDetailConfigProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [pollutant, setPollutant] = useState('');
  const [concentration, setConcentration] = useState('');
  //const [altitude, setAltitude] = useState('1.5');
  const [windDirection, setWindDirection] = useState('270');
  const [windSpeed, setWindSpeed] = useState('2.31');
  const [useCurrentWeather, setUseCurrentWeather] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  // Validation: Check if all required fields are filled
  const isFormValid = title.trim() !== '' && pollutant !== '' && concentration.trim() !== '';

  // Options
  const pollutantOptions = [
    { value: '', label: '오염물질 선택' },
    { value: 'PM10', label: 'PM10' },
    { value: 'PM25', label: 'PM2.5' },
    { value: 'SO2', label: 'SO2' },
    { value: 'NO2', label: 'NO2' }
  ];

  // Get selected location from store
  const selectedLocation = simulationStore.selectedAddress;

  // 선택된 위치(selectedLocation)에 따라 마커 표시
  useEffect(() => {
    const dispose = reaction(
      () => simulationStore.selectedLocation,
      (selectedLocation) => {
        if (selectedLocation) {
          renderLocationMarker(selectedLocation.lng, selectedLocation.lat);
        }
      },
      { fireImmediately: true }
    );

    return () => {
      dispose();
    };
  }, []);

  return (
    <>
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Icon
          name="chevron-left"
          className="w-5 h-5 cursor-pointer"
          onClick={onBack}
        />
        <SubTitle info="시뮬레이션 실행에 필요한 세부 설정을 입력해주세요.">
          상세설정
        </SubTitle>
      </div>
      <Divider color="bg-[#C3C3C3]" />

      <Spacer height={16} />

      {/* Form Fields */}
      <div className="flex flex-col self-stretch gap-3">
        {/* 시뮬레이션 제목 */}
        <div className="flex items-center self-stretch justify-between">
          <div className="flex items-center gap-[5px]">
            <div
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFF'
              }}
            >
              시뮬레이션 제목
            </div>
            <Info>
              <>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  시뮬레이션 제목
                </div>
                <div style={{ width: '100%', height: '1px', background: '#C4C6C6' }} />
                <div className="flex gap-[2px] items-start" style={{ fontFamily: 'Pretendard', fontSize: '14px', fontWeight: '400', lineHeight: '18px', color: '#A6A6A6' }}>
                  <span style={{ fontWeight: '500', flexShrink: 0 }}>※</span>
                  <span style={{ flex: '1 0 0' }}>시뮬레이션 구분용 제목을 입력하세요.</span>
                </div>
              </>
            </Info>
          </div>
          <div className="relative" style={{ width: '360px' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                if (e.target.value.length <= 20) {
                  setTitle(e.target.value);
                }
              }}
              placeholder="시뮬레이션 제목 입력"
              className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] text-white outline-none"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: 'normal'
              }}
            />
            <div
              className="absolute transform -translate-y-1/2 right-3 top-1/2"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#A6A6A6'
              }}
            >
              {title.length}/20
            </div>
          </div>
        </div>

        {/* 오염물질 */}
        <div className="flex items-center self-stretch justify-between">
          <div className="flex items-center gap-[5px]">
            <div
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFF'
              }}
            >
              오염 물질
            </div>
            <Info>
              <>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  오염 물질
                </div>
                <div style={{ width: '100%', height: '1px', background: '#C4C6C6' }} />
                <div className="flex gap-[2px] items-start" style={{ fontFamily: 'Pretendard', fontSize: '14px', fontWeight: '400', lineHeight: '18px', color: '#A6A6A6' }}>
                  <span style={{ fontWeight: '500', flexShrink: 0 }}>※</span>
                  <span style={{ flex: '1 0 0' }}>시뮬레이션할 오염물질을 선택하고 해당 물질의 예상 농도를 입력하세요.</span>
                </div>
              </>
            </Info>
          </div>
          <div className="flex gap-3" style={{ width: '360px' }}>
            {/* 항목 */}
            <div className="flex-1 flex items-center gap-[10px] h-8">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '32px',
                  fontFamily: 'Pretendard',
                  fontSize: '13px',
                  fontWeight: '700',
                  lineHeight: 'normal',
                  color: '#FFF',
                  flexShrink: 0
                }}
              >
                항목
              </div>
              <div className="relative flex-1">
                <select
                  value={pollutant}
                  onChange={(e) => setPollutant(e.target.value)}
                  className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] text-white outline-none cursor-pointer appearance-none"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: pollutant ? '#FFF' : '#A6A6A6'
                  }}
                >
                  {pollutantOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div
                  className="absolute text-white transform -translate-y-1/2 pointer-events-none right-3 top-1/2"
                  style={{
                    fontSize: '8px',
                    lineHeight: '4px'
                  }}
                >
                  ▼
                </div>
              </div>
            </div>

            {/* 농도 */}
            <div className="flex-1 flex items-center gap-[10px] h-8">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '32px',
                  fontFamily: 'Pretendard',
                  fontSize: '13px',
                  fontWeight: '700',
                  lineHeight: 'normal',
                  color: '#FFF',
                  flexShrink: 0
                }}
              >
                농도
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                  placeholder="농도 값 입력"
                  className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] text-white outline-none"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 발생 위치 */}
        <div className="flex items-center self-stretch justify-between">
          <div className="flex items-center gap-[5px]">
            <div
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFF'
              }}
            >
              발생 위치
            </div>
            <Info>
              <>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  발생 위치
                </div>
                <div style={{ width: '100%', height: '1px', background: '#C4C6C6' }} />
                <div className="flex gap-[2px] items-start" style={{ fontFamily: 'Pretendard', fontSize: '14px', fontWeight: '400', lineHeight: '18px', color: '#A6A6A6' }}>
                  <span style={{ fontWeight: '500', flexShrink: 0 }}>※</span>
                  <span style={{ flex: '1 0 0' }}>선택한 위치를 기준으로 측정이 진행됩니다. <br /> 위치를 변경하려면 이전 단계로 돌아가 주세요.</span>
                </div>
              </>
            </Info>
          </div>
          <div
            className="flex flex-col gap-1 px-3 py-2 bg-black rounded border border-[#696A6A]"
            style={{ width: '360px' }}
          >
            {selectedLocation?.roadAddress && (
              <div className="flex items-center gap-1">
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '13px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF',
                    width: '52.648px',
                    flexShrink: 0
                  }}
                >
                  도로명
                </div>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: '#A6A6A6'
                  }}
                >
                  {selectedLocation.roadAddress}
                </div>
              </div>
            )}
            {selectedLocation?.jibunAddress && (
              <div className="flex items-center gap-1">
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '13px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF',
                    width: '52.648px',
                    flexShrink: 0
                  }}
                >
                  지번
                </div>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    color: '#A6A6A6'
                  }}
                >
                  {selectedLocation.jibunAddress}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 발생 고도 */}
        {/* <div className="flex items-center self-stretch justify-between">
          <div className="flex items-center gap-[5px]">
            <div
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFF'
              }}
            >
              발생 고도
            </div>
            <Info>
              <>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  발생 고도
                </div>
                <div style={{ width: '100%', height: '1px', background: '#C4C6C6' }} />
                <div className="flex gap-[2px] items-start" style={{ fontFamily: 'Pretendard', fontSize: '14px', fontWeight: '400', lineHeight: '18px', color: '#A6A6A6' }}>
                  <span style={{ fontWeight: '500', flexShrink: 0 }}>※</span>
                  <span style={{ flex: '1 0 0' }}>측정 위치의 고도를 입력해 주세요. <br /> 센서가 설치된 높이인 1.5m로 입력하면 가장 정확한 예측이 가능합니다.</span>
                </div>
              </>
            </Info>
          </div>
          <div className="relative" style={{ width: '360px' }}>
            <input
              type="text"
              value={altitude}
              onChange={(e) => setAltitude(e.target.value)}
              placeholder="예: 1.5"
              className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] text-white outline-none"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: 'normal'
              }}
            />
            <div
              className="absolute transform -translate-y-1/2 right-3 top-1/2"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: 'normal',
                color: '#A6A6A6'
              }}
            >
              m
            </div>
          </div>
        </div> */}

        {/* 기상 조건 */}
        <div className="flex items-center self-stretch justify-between">
          <div className="flex items-center gap-[5px]">
            <div
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFF'
              }}
            >
              기상 조건
            </div>
            <Info>
              <>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  기상 조건
                </div>
                <div style={{ width: '100%', height: '1px', background: '#C4C6C6' }} />
                <div className="flex gap-[2px] items-start" style={{ fontFamily: 'Pretendard', fontSize: '14px', fontWeight: '400', lineHeight: '18px', color: '#A6A6A6' }}>
                  <span style={{ fontWeight: '500', flexShrink: 0 }}>※</span>
                  <span style={{ flex: '1 0 0' }}>시뮬레이션 시점의 기상 조건을 직접 입력하거나, 현재 기상 정보를 적용할 수 있습니다.</span>
                </div>
              </>
            </Info>
          </div>
          <div className="flex flex-col gap-1" style={{ width: '360px' }}>
            <div className="flex gap-3">
              {/* 풍향 */}
              <div className="flex-1 flex items-center gap-[7px] h-8">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '32px',
                    fontFamily: 'Pretendard',
                    fontSize: '13px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF',
                    flexShrink: 0
                  }}
                >
                  풍향
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={windDirection}
                    onChange={(e) => setWindDirection(e.target.value)}
                    placeholder="예 : 270"
                    className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] text-white outline-none"
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: '400',
                      lineHeight: 'normal'
                    }}
                  />
                  <div
                    className="absolute transform -translate-y-1/2 right-3 top-1/2"
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '15px',
                      fontWeight: '400',
                      lineHeight: 'normal',
                      color: '#9C9C9C'
                    }}
                  >
                    º
                  </div>
                </div>
              </div>

              {/* 풍속 */}
              <div className="flex-1 flex items-center gap-[7px] h-8">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '32px',
                    fontFamily: 'Pretendard',
                    fontSize: '13px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF',
                    flexShrink: 0
                  }}
                >
                  풍속
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(e.target.value)}
                    placeholder="예 : 2.31"
                    className="w-full h-8 px-3 py-1 bg-black rounded border border-[#696A6A] text-white outline-none"
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: '400',
                      lineHeight: 'normal'
                    }}
                  />
                  <div
                    className="absolute transform -translate-y-1/2 right-3 top-1/2"
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '11px',
                      fontWeight: '400',
                      lineHeight: 'normal',
                      color: '#9C9C9C'
                    }}
                  >
                    m/s
                  </div>
                </div>
              </div>
            </div>
            <Checkbox
              checked={useCurrentWeather}
              onChange={setUseCurrentWeather}
              label={simulationStore.weatherInfoLabel}
            />
          </div>
        </div>

        {/* 공개 설정 */}
        <div className="flex items-center self-stretch justify-between">
          <div className="flex items-center gap-[5px]">
            <div
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#FFF'
              }}
            >
              공개 설정
            </div>
            <Info>
              <>
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#FFF'
                  }}
                >
                  공개 설정
                </div>
                <div style={{ width: '100%', height: '1px', background: '#C4C6C6' }} />
                <div className="flex gap-[2px] items-start" style={{ fontFamily: 'Pretendard', fontSize: '14px', fontWeight: '400', lineHeight: '18px', color: '#A6A6A6' }}>
                  <span style={{ fontWeight: '500', flexShrink: 0 }}>※</span>
                  <span style={{ flex: '1 0 0' }}>공개 설정 시 시뮬레이션 설정값이 다른 사용자에게도 공유됩니다. <br /> [실행목록 &gt; 맞춤실행 &gt; 내 시뮬레이션] 에서 언제든 수정할 수 있습니다.</span>
                </div>
              </>
            </Info>
          </div>
          <div className="flex gap-3" style={{ width: '360px' }}>
            {/* 공개 버튼 */}
            <div
              className="flex items-center justify-center px-4 py-2.5 cursor-pointer"
              style={{
                width: '82px',
                height: '32px',
                background: isPublic ? '#CFFF40' : 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: isPublic ? 'none' : '1px solid #C4C6C6'
              }}
              onClick={() => setIsPublic(true)}
            >
              <div
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '13px',
                  fontWeight: isPublic ? '700' : '400',
                  lineHeight: 'normal',
                  color: isPublic ? '#000' : '#A6A6A6'
                }}
              >
                공개
              </div>
            </div>

            {/* 비공개 버튼 */}
            <div
              className="flex items-center justify-center px-2 py-1.5 cursor-pointer"
              style={{
                width: '87px',
                height: '32px',
                background: !isPublic ? '#CFFF40' : 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                border: !isPublic ? 'none' : '1px solid #C4C6C6'
              }}
              onClick={() => setIsPublic(false)}
            >
              <div
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '13px',
                  fontWeight: !isPublic ? '700' : '400',
                  lineHeight: 'normal',
                  color: !isPublic ? '#000' : '#A6A6A6'
                }}
              >
                비공개
              </div>
            </div>
          </div>
        </div>

        {/* 안내 텍스트 */}
        <div
          style={{
            fontFamily: 'Pretendard',
            fontSize: '12px',
            fontWeight: '400',
            lineHeight: 'normal',
            color: '#A6A6A6'
          }}
        >
          * 맞춤 실행 결과는 약 1~2시간 후 확인할 수 있습니다.
        </div>
      </div>

      <Spacer height={16} />

      {/* 시뮬레이션 실행 버튼 */}
      <div className="flex flex-col pt-9 border-t border-[#696A6A] self-stretch">
        <div
          className="h-10 flex items-center justify-center gap-2 px-4 py-2.5 rounded"
          style={{
            background: isFormValid ? '#CFFF40' : '#696A6A',
            borderRadius: '4px',
            cursor: isFormValid ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (!isFormValid) return;

            const selectedPmType: PMType | undefined =
              pollutant === 'PM10' ? 'pm10' :
              pollutant === 'PM25' ? 'pm25' :
              undefined;
            if (!selectedPmType) return alert('오염 물질 타입 유효하지 않음')// 오염물질 타입 유효성 검사

            const concentrationValue = parseFloat(concentration);
            if (isNaN(concentrationValue)) return alert('농도 값 유효하지 않음') // 농도 값 유효성 검사

            const executionData: SimulationRequest = {
              simulation_name: title,
              user: userStore.currentUser || '',
              is_private: !isPublic,
              timestamp: new Date().toISOString(),
              lot: selectedLocation?.jibunAddress ?? '',
              road_name: selectedLocation?.roadAddress ?? '',
              // location: simulationStore.selectedDistrict?.name ?? '부산진구',
              location: '부산진구', // 임시값

              // weather 객체
              weather: {
                wind_direction_10m: parseFloat(windDirection) || 0,
                wind_speed_10m: parseFloat(windSpeed) || 0,
                wind_direction_1m: parseFloat(windDirection) || 0, // 임시로 10m값 사용
                wind_speed_1m: parseFloat(windSpeed) || 0, // 임시로 10m값 사용
                humidity: 60, // 임시값
                sea_level_pressure: 1013, // 임시값
                temperature: 20, // 임시값
              },

              // air_quality 객체
              air_quality: {
                pm_type: selectedPmType,
                points: [
                  {
                    name: selectedLocation?.detailAddress || selectedLocation?.jibunAddress || '',
                    location: {
                      longitude: selectedLocation?.geometry?.coordinates[0] ?? 0,
                      latitude: selectedLocation?.geometry?.coordinates[1] ?? 0,
                    },
                    concentration: concentrationValue, // 숫자 값 사용
                  },
                ],
              },
            };

            console.log('시뮬레이션 실행:', executionData);
            simulationStore.setPendingData(executionData);
            simulationStore.openModal();
            onExecute?.();
          }}
        >
          <Icon name="saas" className="w-4 h-4" />
          <div
            style={{
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: 'normal',
              color: '#000',
              textAlign: 'center'
            }}
          >
            시뮬레이션 실행
          </div>
        </div>
      </div>
    </>
  );
});

export default SimulationDetailConfig;