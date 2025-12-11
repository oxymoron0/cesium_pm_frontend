import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Divider from '@/components/basic/Divider';
import Checkbox from './Checkbox';
import { simulationStore } from '@/stores/SimulationStore';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';
import Info from '@/components/basic/Info';
import SimulationCivilRealTimeWeather from './SimulationCivilRealTimeWeather';
import SimulationCivilList from './SimulationCivilList';
import Icon from '@/components/basic/Icon';

interface SimulationCivilConfigProps {
  onBack?: () => void;
}

const SimulationCivilConfig = observer(function SimulationCivilConfig({ onBack } : SimulationCivilConfigProps)  {
  // Form state
  const [pollutant, setPollutant] = useState('PM10');
  const [concentration, setConcentration] = useState('');
  const [windDirection, setWindDirection] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [useCurrentWeather, setUseCurrentWeather] = useState(false);

  // 에러 표시 상태 관리
  const [showError, setShowError] = useState(false);
  const isInputDisabled = simulationStore.currentView !== 'civilConfig';

  // Options
  const pollutantOptions = [
    { value: 'PM10', label: '미세먼지(PM-10)' },
    // { value: 'PM25', label: '초미세먼지(PM-2.5)' },
  ];

  // 입력된 값이 있는지 확인하는 함수
  const hasInputValues = () => {
    return (
      concentration.trim() !== '' ||
      windDirection.trim() !== '' ||
      windSpeed.trim() !== '' ||
      useCurrentWeather === true
    );
  };

  // Store에 Dirty 상태 동기화
  useEffect(() => {
    const isDirty = hasInputValues();
    // 값이 변경될 때마다 Store에 상태 업데이트
    if (simulationStore.isCivilInputDirty !== isDirty) {
      simulationStore.setIsCivilInputDirty(isDirty);
    }
  }, [concentration, windDirection, windSpeed, useCurrentWeather]); // 의존성 배열: 입력값들

  // 컴포넌트 언마운트 시 Dirty 상태 해제
  useEffect(() => {
    return () => {
      simulationStore.setIsCivilInputDirty(false);
    };
  }, []);

  // 1. 부산 행정구역 데이터 로드 및 '부산진구' 자동 선택
  useEffect(() => {
    const loadBusanDistricts = async () => {
      // 부산 시도 선택 (코드 26)
      await administrativeStore.selectProvince('26'); 

      // 부산진구 찾기 (코드 26230)
      const busanjingu = administrativeStore.districts.find(
        district => district.name === '부산진구' || district.full_name.includes('부산진구') || district.code === '26230'
      );

      if (busanjingu) {
        // API는 short code 요구 (26230 → 230)
        const shortCode = busanjingu.code.substring(2);
        administrativeStore.selectedDistrictCode = shortCode;
        console.log('[SimulationCiviConfig] 부산진구 자동 선택 완료');
      }
    };
    
    loadBusanDistricts();

    // 컴포넌트 언마운트 시 경계 제거
    return () => {
      clearAdministrativeBoundary();
    };
  }, []);

  
  // 2. 선택된 시군구(부산진구) 경계 렌더링
  useEffect(() => {
    const renderBoundary = async () => {
      const districtCode = administrativeStore.selectedDistrictCode;

      if (!districtCode) {
        clearAdministrativeBoundary();
        return;
      }

      const params = administrativeStore.currentGeometryParams;
      if (!params) return;

      const districtParams = {
        province_code: params.province_code,
        district_code: params.district_code
      };

      try {
        // 경계 데이터(Geometry) 로드
        const response = await administrativeStore.loadGeometry(districtParams);
        
        // 경계 렌더링
        if (isGeometrySuccess(response)) {
          renderAdministrativeBoundary(response.geom, response.full_name);
          console.log('[SimulationCiviConfig] 경계 렌더링 완료:', response.full_name);
        }
      } catch (error) {
        console.error('[SimulationCiviConfig] 경계 렌더링 실패:', error);
      }
    };

    renderBoundary();
  }, [administrativeStore.selectedDistrictCode]); // districtCode가 설정되면 실행

  // --- 초기화 및 기상 정보 로드 ---
  useEffect(() => {
    simulationStore.loadWeatherInfo();
  }, []);

  // --- 기상 정보 동기화 ---
useEffect(() => {
    const { currentWeather } = simulationStore;
    if (useCurrentWeather && currentWeather) {
      setWindDirection(String(currentWeather.wind_direction_1m));
      setWindSpeed(String(currentWeather.wind_speed_1m));
    } else if (!useCurrentWeather) {
      setWindDirection(windDirection);
      setWindSpeed(windSpeed);
    }
  }, [useCurrentWeather, simulationStore.currentWeather]);

  
  const ERROR_COLOR = '#FF3333';
  const DEFAULT_BORDER = '#696A6A';
  const DEFAULT_TEXT = '#FFFFFF';

  const getInputStyle = (isInvalid: boolean) => ({
    fontFamily: 'Pretendard', 
    lineHeight: 'normal',
    fontSize: '14px',
    fontWeight: '400',
    backgroundColor: 'black',
    border: `1px solid ${isInvalid ? ERROR_COLOR : DEFAULT_BORDER}`,
    color: isInvalid ? ERROR_COLOR : DEFAULT_TEXT,
    transition: 'all 0.2s ease',
  });

  // --- 유효성 검사 ---
  const isConcentrationInvalid = showError && concentration.trim() === '';
  const isWindDirectionInvalid = showError && !useCurrentWeather && windDirection.trim() === '';
  const isWindSpeedInvalid = showError && !useCurrentWeather && windSpeed.trim() === '';
  
  const checkValidity = () => {
    const validConc = concentration.trim() !== '';
    const validWindDir = useCurrentWeather || windDirection.trim() !== '';
    const validWindSpd = useCurrentWeather || windSpeed.trim() !== '';
    return validConc && validWindDir && validWindSpd;
  };

  const isFormValid = checkValidity(); // input 상태 전달 값

  const handleShowList = () => {
    if (!checkValidity()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    simulationStore.setCivilConcentration(concentration)
    simulationStore.loadSimulationCivilList(concentration, 1)
    simulationStore.setCurrentView('civilList')
  };

  return (
    <>
      {/* 2. 섹션 타이틀 */}
      <div className="flex items-center gap-2">
        {simulationStore.currentView !== 'civilConfig' && (
          <Icon name="chevron-left" className="w-5 h-5 cursor-pointer" onClick={onBack}/>
        )}
        <div className="text-lg font-bold text-white mb-2">실시간 정류장 오염물질 시뮬레이션</div>
      </div>
      <Divider color="bg-[#C3C3C3]" />
      
      {/* 3. 안내 문구 */}
      <div className="mt-3 mb-6 text-sm text-[#A6A6A6]" style={{fontFamily: 'Pretendard', lineHeight: 'normal'}}>
        * 부산진구에서 발생한 오염물질의 확산을 시뮬레이션하고, 실행 목록을 확인할 수 있습니다.
      </div>

      {/* 4. 상세 설정 섹션 */}
      <div className="flex flex-col w-full">
        {/* 헤더 */}
        <div className="w-full bg-[#464646] py-2 px-4 text-white font-bold text-sm">
          상세 설정
        </div>
        
        {/* 에러 메시지 표시 영역 */}
        {showError && (
          <div className="w-full px-4 pt-3 pb-1 text-xs font-bold" style={{ color: ERROR_COLOR, fontFamily: 'Pretendard', lineHeight: 'normal' }}>
            * 필수 입력값이 누락되었습니다. 모든 항목을 입력해 주세요.
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex flex-col gap-4 py-4">
          
          {/* Row 1: 오염물질 */}
          <div className="flex items-center justify-between">
            <div className="w-24 flex items-center gap-1">
              <span style={{fontFamily: 'Pretendard', lineHeight: 'normal', fontSize: '15px', fontWeight: '700', color: '#FFFFFF'}}>오염물질</span>
              <Info infoTitle="오염물질">* 미세먼지(PM-10)의 시뮬레이션 예상 농도를 입력해주세요. 19개소 정류장의 평균값으로 입력됩니다.</Info>
            </div>
            
            <div className={`flex gap-4 items-center ${simulationStore.currentView === 'civilConfig' && 'flex-1'}`}>
              {/* 항목 */}
              <div className="flex items-center px-left gap-2">
                <span className="text-white text-sm font-bold w-8">항목</span>
                <div className="relative w-36 h-8">
                  <select
                    value={pollutant}
                    onChange={(e) => setPollutant(e.target.value)}
                    className="w-full h-full px-3 appearance-none rounded focus:outline-none bg-black text-white border border-[#696A6A]"
                    style={{ fontFamily: 'Pretendard', lineHeight: 'normal', fontSize: '14px' }}
                  >
                    {pollutantOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 농도 */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-white text-sm font-bold w-8">농도</span>
                <div className={`relative ${simulationStore.currentView === 'civilConfig' && 'flex-1'} h-8`}>
                  <input
                    type="text"
                    value={concentration}
                    onChange={(e) => {
                      setConcentration(e.target.value);
                      if(e.target.value) setShowError(false);
                    }}
                    disabled={isInputDisabled}
                    placeholder="예 : 100"
                    className={`w-full h-full px-3 rounded text-justify focus:outline-none ${isConcentrationInvalid ? 'placeholder-[#FF3333]' : 'placeholder-[#696A6A]'}`}
                    style={getInputStyle(isConcentrationInvalid)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2" 
                    style={{fontFamily: 'Pretendard', lineHeight: 'normal', fontSize: '15px', fontWeight: '400', color: '#FFFFFF'}}>µg/m³</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 기상 조건 */}
          <div className="flex items-center justify-between">
            <div className="w-24 flex items-center gap-1">
              <span style={{fontFamily: 'Pretendard', lineHeight: 'normal', fontSize: '15px', fontWeight: '700', color: '#FFFFFF'}}>기상 조건</span>
              <Info infoTitle="기상 조건">* 시뮬레이션 시점의 기상 조건을 직접 입력하거나, 현재 기상정보를 적용할 수 있습니다.</Info>
            </div>
            
            <div className={`flex gap-4 items-center ${simulationStore.currentView === 'civilConfig' && 'flex-1'}`}>
              {/* 풍향 */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-bold w-8">풍향</span>
                <div className="relative w-36 h-8">
                  <input
                    type="text"
                    value={windDirection}
                    onChange={(e) => setWindDirection(e.target.value)}
                    placeholder="예 : 270"
                    disabled={useCurrentWeather || isInputDisabled}
                    className={`w-full h-full px-3 rounded focus:outline-none ${isWindDirectionInvalid ? 'placeholder-[#FF3333]' : 'placeholder-[#696A6A]'}`}
                    style={getInputStyle(isWindDirectionInvalid)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2" 
                  style={{fontFamily: 'Pretendard', lineHeight: 'normal', fontSize: '15px', fontWeight: '400', color: '#FFFFFF'}}>°</span>
                </div>
              </div>

              {/* 풍속 */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-white text-sm font-bold w-8">풍속</span>
                <div className={`relative ${simulationStore.currentView === 'civilConfig' && 'flex-1'} h-8`}>
                   <input
                    type="text"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(e.target.value)}
                    placeholder="예 : 2.31"
                    disabled={useCurrentWeather || isInputDisabled}
                    className={`w-full h-full px-3 rounded focus:outline-none ${isWindSpeedInvalid ? 'placeholder-[#FF3333]' : 'placeholder-[#696A6A]'}`}
                    style={getInputStyle(isWindSpeedInvalid)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2" 
                  style={{fontFamily: 'Pretendard', lineHeight: 'normal', fontSize: '15px', fontWeight: '400', color: '#FFFFFF'}}>m/s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: 체크박스 */}
          {simulationStore.isLoadingCurrentWeather ? (<>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontFamily: 'Pretendard',
              fontSize: '14px'
            }}>
              기상청 데이터 로딩 중...
            </div>
          </>) : 
          (<>
            <div className="flex justify-center">
              {!isInputDisabled && (
              <Checkbox
                checked={useCurrentWeather}
                onChange={setUseCurrentWeather}
                label={simulationStore.weatherInfoLabel}
              />
              )}
            </div>
          </>)}
        </div>
      </div>
      
      {simulationStore.currentView === 'civilConfig' && (<SimulationCivilRealTimeWeather onShowListClick={handleShowList} hasError={!isFormValid} />)}
      {simulationStore.currentView === 'civilList' && <SimulationCivilList />}
    </>
  );
});

export default SimulationCivilConfig;