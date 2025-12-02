import { useState, useCallback } from 'react';
import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import AirConfigButton from './AirConfigButton';
import AirSettingPanel from './AirSettingPanel';

type AirConfigType = 'airConfig' | 'nationalSensor' | 'legend' | null;

interface ButtonConfig {
  id: AirConfigType;
  icon: string;
  label: string;
  panelTitle: string;
}

const BUTTON_CONFIGS: ButtonConfig[] = [
  { id: 'airConfig', icon: 'air_config.svg', label: '대기 설정', panelTitle: '대기 설정' },
  { id: 'nationalSensor', icon: 'national_senser.svg', label: '국가 측정망', panelTitle: '국가 측정망' },
  { id: 'legend', icon: 'legend.svg', label: '범례', panelTitle: '범례' },
];

// 버튼 위치 계산 상수
const BUTTON_BOTTOM = 88;
const BUTTON_HEIGHT = 72;
const PANEL_GAP = 14;
const RIGHT_OFFSET = 90;
const PANEL_WIDTH = '408px';

/**
 * AirConfig Component
 * 대기 설정, 국가 측정망, 범례 버튼을 포함하는 컨테이너
 * 우하단 기준 bottom: 88px, right: 90px 위치에 배치
 * 하나의 버튼만 활성화 가능하며, 활성화된 버튼을 다시 클릭하면 비활성화
 */
function AirConfig() {
  const [activeButton, setActiveButton] = useState<AirConfigType>(null);

  const handleAirConfigClick = useCallback(() => {
    setActiveButton(prev => prev === 'airConfig' ? null : 'airConfig');
  }, []);

  const handleNationalSensorClick = useCallback(() => {
    setActiveButton(prev => prev === 'nationalSensor' ? null : 'nationalSensor');
  }, []);

  const handleLegendClick = useCallback(() => {
    setActiveButton(prev => prev === 'legend' ? null : 'legend');
  }, []);

  const handlers = [handleAirConfigClick, handleNationalSensorClick, handleLegendClick];

  const handleClosePanel = useCallback(() => {
    setActiveButton(null);
  }, []);

  const activeConfig = BUTTON_CONFIGS.find(config => config.id === activeButton);

  // 패널 내용 렌더링
  const renderPanelContent = () => {
    switch (activeButton) {
      case 'airConfig':
        return <AirSettingPanel />;
      case 'nationalSensor':
        return null; // 추후 구현
      case 'legend':
        return null; // 추후 구현
      default:
        return null;
    }
  };

  return (
    <>
      {/* 활성화된 버튼의 Panel */}
      {activeButton && activeConfig && (
        <Panel
          position="right"
          offset={RIGHT_OFFSET}
          bottom={BUTTON_BOTTOM + BUTTON_HEIGHT + PANEL_GAP}
          width={PANEL_WIDTH}
        >
          <Title onClose={handleClosePanel}>{activeConfig.panelTitle}</Title>
          {renderPanelContent()}
        </Panel>
      )}

      {/* 버튼 그룹 */}
      <div
        className="fixed flex gap-2 z-10"
        style={{
          bottom: `${BUTTON_BOTTOM}px`,
          right: `${RIGHT_OFFSET}px`,
        }}
      >
        {BUTTON_CONFIGS.map((config, index) => (
          <AirConfigButton
            key={config.id}
            icon={config.icon}
            label={config.label}
            isActive={activeButton === config.id}
            onClick={handlers[index]}
          />
        ))}
      </div>
    </>
  );
}

export default AirConfig;
