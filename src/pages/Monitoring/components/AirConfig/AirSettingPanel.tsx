import { memo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import SubTitle from '@/components/basic/SubTitle';
import Divider from '@/components/basic/Divider';
import { airConfigStore } from '@/stores/AirConfigStore';

type SensorType = 'pm10' | 'pm25' | 'vocs';

const basePath = import.meta.env.VITE_BASE_PATH || '/';

interface SensorButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

// #FFD040 색상으로 변환하는 CSS 필터
const YELLOW_FILTER = 'brightness(0) saturate(100%) invert(83%) sepia(47%) saturate(1031%) hue-rotate(358deg) brightness(101%) contrast(101%)';

/**
 * SensorButton Component
 * 대기 항목 선택 버튼
 */
const SensorButton = memo(function SensorButton({
  icon,
  label,
  isActive,
  onClick
}: SensorButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 w-[112px] h-[112px] rounded-lg transition-all duration-200 ease-out"
      style={{
        backgroundColor: isActive ? 'rgba(255, 208, 64, 0.30)' : 'transparent',
        border: isActive ? '1px solid #FFD040' : '1px solid white',
      }}
    >
      <img
        src={`${basePath}icon/${icon}`}
        alt={label}
        className="w-16 h-16"
        style={{
          filter: isActive ? YELLOW_FILTER : 'none',
          willChange: 'filter',
        }}
      />
      <span
        className="text-sm font-semibold whitespace-nowrap transition-colors duration-200 ease-out"
        style={{
          color: isActive ? '#FFD040' : '#FFFFFF',
        }}
      >
        {label}
      </span>
    </button>
  );
});

interface SensorConfig {
  type: SensorType;
  icon: string;
  label: string;
}

const SENSOR_CONFIGS: SensorConfig[] = [
  { type: 'pm10', icon: 'pm10icon.svg', label: '미세먼지' },
  { type: 'pm25', icon: 'pm25icon.svg', label: '초미세먼지' },
  { type: 'vocs', icon: 'vocicon.svg', label: 'VOCs' },
];

/**
 * AirSettingPanel Component
 * 대기 설정 패널 내용
 * - 대기 항목 선택 (PM10, PM2.5, VOCs)
 * - 등급 선택 (추후 구현)
 */
const AirSettingPanel = observer(function AirSettingPanel() {
  const handlePM10Click = useCallback(() => {
    airConfigStore.toggleSensor('pm10');
  }, []);

  const handlePM25Click = useCallback(() => {
    airConfigStore.toggleSensor('pm25');
  }, []);

  const handleVOCsClick = useCallback(() => {
    airConfigStore.toggleSensor('vocs');
  }, []);

  const handlers = [handlePM10Click, handlePM25Click, handleVOCsClick];

  return (
    <div className="flex flex-col w-full">
      {/* 대기 항목 선택 섹션 */}
      <SubTitle>대기 항목 선택</SubTitle>
      <Divider color="bg-white" />

      <div className="flex justify-between gap-4 mt-4">
        {SENSOR_CONFIGS.map((config, index) => (
          <SensorButton
            key={config.type}
            icon={config.icon}
            label={config.label}
            isActive={airConfigStore.isSensorVisible(config.type)}
            onClick={handlers[index]}
          />
        ))}
      </div>

      {/* 등급 선택 섹션 - 추후 구현 */}
    </div>
  );
});

export default AirSettingPanel;
