import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import SubTitle from '@/components/basic/SubTitle';
import Spacer from '@/components/basic/Spacer';
import Icon from '@/components/basic/Icon';
import Divider from '@/components/basic/Divider';
import AddressResultList from './AddressResultList';
import { simulationStore } from '@/stores/SimulationStore';
import { enableDirectLocationClickHandler,disableDirectLocationClickHandler } from '@/utils/cesium/directLocationRenderer';
import { renderLocationMarker, clearLocationMarker } from '@/utils/cesium/locationMarker';
import { administrativeStore } from '@/stores/AdministrativeStore';
import { renderAdministrativeBoundary, clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { isGeometrySuccess } from '@/types/administrative';

interface SimulationConfigProps {
  onClose?: () => void;
  onLocationComplete?: () => void;
}

const SimulationConfig = observer(function SimulationConfig({ onLocationComplete }: SimulationConfigProps) {

  // 부산 행정구역 시군구 정보 조회
  useEffect(() => {
    const loadBusanDistricts = async () => {
      await administrativeStore.selectProvince('26'); // 부산 시도 선택 및 시군구 데이터 로딩
      console.log('[SimulationConfig] 부산 시군구 조회 완료:', administrativeStore.districts);

      // 부산진구 자동 선택
      const busanjingu = administrativeStore.districts.find(
        district => district.name === '부산진구' || district.full_name.includes('부산진구') || district.code === '26230'
      );

      if (busanjingu) {
        // API는 short code 요구 (26230 → 230)
        const shortCode = busanjingu.code.substring(2);
        administrativeStore.selectedDistrictCode = shortCode;
        console.log('[SimulationConfig] 부산진구 자동 선택 완료:', busanjingu);
        simulationStore.searchAddress(simulationStore.searchQuery);
      }
    };
    loadBusanDistricts();
  }, []);

  // 시군구 선택 시 행정구역 경계 렌더링
  useEffect(() => {
    const renderBoundary = async () => {
      const districtCode = administrativeStore.selectedDistrictCode;

      // 시군구 선택되지 않았으면 경계 제거
      if (!districtCode) {
        clearAdministrativeBoundary();
        return;
      }

      const params = administrativeStore.currentGeometryParams;
      if (!params) return;

      // 시군구 경계만 렌더링 (읍면동 제외)
      const districtParams = {
        province_code: params.province_code,
        district_code: params.district_code
      };

      try {
        const response = await administrativeStore.loadGeometry(districtParams);
        if (isGeometrySuccess(response)) {
          renderAdministrativeBoundary(response.geom, response.full_name);
          console.log('[SimulationConfig] 행정구역 경계 렌더링 완료:', response.full_name);
        }
      } catch (error) {
        console.error('[SimulationConfig] 행정구역 경계 렌더링 실패:', error);
      }
    };

    renderBoundary();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [administrativeStore.selectedDistrictCode]);  

  // 직접 위치 지정 모드에 따라 클릭 핸들러 활성화/비활성화
  useEffect(() => {
    simulationStore.selectedAddressId = null;
    simulationStore.selectedLocation = null;

    if (simulationStore.isDirectLocationMode) {
      enableDirectLocationClickHandler();
    } else {
      disableDirectLocationClickHandler();
    }

    // Cleanup: 컴포넌트 언마운트 시 핸들러 비활성화
    return () => {
      disableDirectLocationClickHandler();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationStore.isDirectLocationMode]);


  // 선택된 위치(selectedLocation)에 따라 마커 표시/제거
  useEffect(() => {
    const dispose = reaction(
      () => simulationStore.selectedLocation,
      (selectedLocation) => {
        if (selectedLocation) {
          // 위치가 선택되면 마커 렌더링
          renderLocationMarker(selectedLocation.lng, selectedLocation.lat);
        } else {
          // 위치 선택이 해제되면 마커 제거
          clearLocationMarker();
        }
      },
      { fireImmediately: true }
    );

    return () => {
      dispose();
      clearLocationMarker(); // 상세설정 화면으로 이동해도 마커 유지
    };
  }, []);

  // 검색어 입력 시 디바운싱 적용하여 검색 수행
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      simulationStore.searchAddress(simulationStore.searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationStore.searchQuery]);

  const handleSearchClick = () => {
    simulationStore.searchAddress(simulationStore.searchQuery);
  };

  return (
    <>
      {/* 조건부 렌더링: 주소 조회 vs 직접 위치 지정 */}
      {simulationStore.isDirectLocationMode ? (
        <>
          {/* 직접 위치 지정 섹션 */}
          <div className="flex items-center gap-2">
            <Icon
              name="chevron-left"
              className="w-5 h-5 cursor-pointer"
              onClick={() => simulationStore.disableDirectLocationMode()}
            />
            <SubTitle info="※ 지도를 클릭하여 시뮬레이션할 위치를 직접 지정할 수 있습니다." infoTitle="직접 위치 지정">
              직접 위치 지정
            </SubTitle>
          </div>
          <Divider color="bg-[#C3C3C3]" />

          <Spacer height={16} />

          {/* Caption */}
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
            * 지도를 클릭하여 시뮬레이션할 위치를 지정해주세요.
          </div>

          <Spacer height={16} />

          {/* Direct Location Results (shared with address search) */}
          {simulationStore.hasSearchResults && (
            <>
              <AddressResultList />
              <Spacer height={16} />
            </>
          )}
        </>
      ) : (
        <>
          {/* 주소 조회 섹션 */}
          <SubTitle info="※ 주소를 조회하거나 지도를 클릭하여 시뮬레이션할 위치를 지정할 수 있습니다." infoTitle="주소 조회">주소 조회</SubTitle>
          <Divider color="bg-[#C3C3C3]" />

          <Spacer height={16} />

          {/* Caption */}
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
            * 먼저, 주소를 조회하거나 지도를 클릭하여 시뮬레이션할 위치를 지정해주세요.
          </div>

          <Spacer height={16} />

          {/* Address Search Section */}
          <div className="flex flex-col self-stretch gap-3">
            {/* Row 1: Address Dropdown + Search Button */}
            <div className="flex items-center self-stretch h-10 gap-3">
              {/* Address Dropdown Container */}
              <div className="flex items-center flex-1 h-10 gap-3">
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: '800',
                    lineHeight: 'normal',
                    color: '#FFF',
                    width: '43px',
                    flexShrink: 0
                  }}
                >
                  주소
                </div>

                {/* Address Select */}
                <select
                  value={administrativeStore.selectedDistrictCode || ''}
                  onChange={(e) => administrativeStore.selectDistrict(e.target.value)}
                  disabled={administrativeStore.loading}
                  className="flex-1 h-10 px-3.5 py-2.5 bg-black rounded-md border border-[#424242] text-white outline-none cursor-pointer"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: 'normal',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  }}
                >
                  {administrativeStore.districts.map(district => {
                    const shortCode = district.code.substring(2);
                    return (
                      <option key={district.code} value={shortCode}>
                        {district.full_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search Button (Disabled) */}
              <div
                className="flex items-center justify-center px-4 py-2.5 rounded"
                style={{
                  width: '86px',
                  height: '40px',
                  background: 'transparent'
                }}
              >
              </div>
            </div>

            {/* Row 2: Text Input + Search Button */}
            <div className="flex items-center self-stretch gap-3">
              {/* Text Input */}
              <div className="relative flex-1 h-10">
                <input
                  type="text"
                  value={simulationStore.searchQuery}
                  onChange={(e) => simulationStore.setSearchQuery(e.target.value)}
                  placeholder="지번, 도로명 입력"
                  className="w-full h-10 px-3.5 py-2.5 bg-black rounded-md border border-[#ADADAD] text-white outline-none"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: 'normal'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchClick();
                    }
                  }}
                />
              </div>

              {/* Search Button (Yellow) */}
              <div
                className="flex items-center justify-center px-4 py-2.5 rounded cursor-pointer"
                style={{
                  width: '86px',
                  height: '40px',
                  background: '#FFD040'
                }}
                onClick={handleSearchClick}
              >
                <div
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: '700',
                    lineHeight: 'normal',
                    color: '#000',
                    textAlign: 'center',
                    width: '58px'
                  }}
                >
                  검색
                </div>
              </div>
            </div>
          </div>

          {/* Address Search Results */}
          {simulationStore.hasSearchResults && (
            <>
              <Spacer height={16} />
              <AddressResultList />
            </>
          )}
        </>
      )}

      <Spacer height={36} />

      {/* Bottom Buttons */}
      <div className="flex flex-col gap-3 pt-9 border-t border-[#696A6A] self-stretch">
        {/* 직접 위치 지정 버튼 */}
        {!simulationStore.isDirectLocationMode && (
          <div
            className="h-10 flex items-center justify-center gap-2 px-4 py-2.5 cursor-pointer border"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderColor: '#CFFF40',
              borderRadius: '4px'
            }}
            onClick={() => simulationStore.enableDirectLocationMode()}
          >
            <div
              style={{
                filter: 'brightness(0) saturate(100%) invert(89%) sepia(97%) saturate(447%) hue-rotate(24deg) brightness(104%) contrast(102%)'
              }}
            >
              <Icon name="saas" className="w-4 h-4" />
            </div>
            <div
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: '700',
                lineHeight: 'normal',
                color: '#CFFF40',
                textAlign: 'center'
              }}
            >
              직접 위치 지정
            </div>
          </div>
        )}

        {/* 위치 설정 완료 버튼 - 위치 선택 후에만 표시 */}
        {simulationStore.hasSelectedLocation && (
          <div
            className="h-10 flex items-center justify-center px-4 py-2.5 cursor-pointer"
            style={{
              background: '#CFFF40',
              borderRadius: '4px'
            }}
            onClick={async () => {
              const result = await simulationStore.openModal('locStart');
              if (result === 'confirm') {
                const geometry = simulationStore.selectedLocationGeometry;
                console.log('위치 설정 완료:', geometry);
                onLocationComplete?.();
              }
            }}
          >
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
              위치 설정 완료
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export default SimulationConfig;
