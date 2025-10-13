import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Title from '@/components/basic/Title';
import SubTitle from '@/components/basic/SubTitle';
import Spacer from '@/components/basic/Spacer';
import TabNavigation from '@/components/basic/TabNavigation';
import Icon from '@/components/basic/Icon';
import Divider from '@/components/basic/Divider';
import AddressResultList from './AddressResultList';
import { simulationStore } from '@/stores/SimulationStore';

interface SimulationConfigProps {
  onClose?: () => void;
}

const SimulationConfig = observer(function SimulationConfig({ onClose }: SimulationConfigProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [searchInput, setSearchInput] = useState('');

  // 검색어 입력 시 디바운싱 적용하여 검색 수행
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      simulationStore.searchAddress(searchInput);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  const handleSearchClick = () => {
    simulationStore.searchAddress(searchInput);
  };

  return (
    <>
      <Title
        info="시뮬레이션 실행을 위한 설정 페이지입니다."
        onClose={onClose}
      >
        시뮬레이션
      </Title>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={['맞춤실행', '빠른실행']}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Spacer height={16} />

      {/* Button Group */}
      <div className="flex self-stretch gap-4">
        {/* 상세설정 - Gradient Button */}
        <div
          className="flex-1 h-10 flex items-center justify-center gap-1 px-4 py-2.5 cursor-pointer"
          style={{
            background: 'linear-gradient(180deg, #FDF106 0%, #FFD040 100%)',
            borderRadius: '19px'
          }}
          onClick={() => console.log('상세설정')}
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
            상세설정
          </div>
        </div>

        {/* 실행목록 - Gray Button */}
        <div
          className="flex-1 h-10 flex items-center justify-center gap-1 px-4 py-2.5 cursor-pointer"
          style={{
            background: '#696A6A',
            borderRadius: '19px'
          }}
          onClick={() => console.log('실행목록')}
        >
          <div
            style={{
              fontFamily: 'Pretendard',
              fontSize: '16px',
              fontWeight: '500',
              lineHeight: 'normal',
              color: '#000',
              textAlign: 'center'
            }}
          >
            실행목록
          </div>
        </div>
      </div>

      <Spacer height={16} />

      <SubTitle info="주소를 조회하거나 지도를 클릭하여 시뮬레이션할 위치를 지정할 수 있습니다.">주소 조회</SubTitle>
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

            {/* Fixed Address */}
            <div className="flex-1 h-10 flex items-center px-3.5 py-2.5 bg-black rounded-md border border-[#424242]">
              <div
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: '400',
                  lineHeight: 'normal',
                  color: '#FFF'
                }}
              >
                부산광역시 부산진구
              </div>
            </div>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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

      <Spacer height={36} />

      {/* Bottom Button */}
      <div className="flex flex-col pt-9 border-t border-[#696A6A] self-stretch">
        <div
          className="h-10 flex items-center justify-center gap-2 px-4 py-2.5 rounded cursor-pointer border-2"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderColor: '#CFFF40'
          }}
          onClick={() => console.log('직접 위치 지정')}
        >
          <Icon name="saas" className="w-4 h-4" />
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
      </div>
    </>
  );
});

export default SimulationConfig;
