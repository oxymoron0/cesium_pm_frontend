import { memo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import SubTitle from '@/components/basic/SubTitle';
import Divider from '@/components/basic/Divider';
import { airConfigStore } from '@/stores/AirConfigStore';
import { AIR_QUALITY_COLORS } from '@/utils/airQuality';
import type { AirQualityLevel } from '@/utils/api/types';

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

interface GradeCheckboxProps {
  label: string;
  color: string;
  isChecked: boolean;
  onClick: () => void;
}

/**
 * GradeCheckbox Component
 * 등급 선택 체크박스
 */
const GradeCheckbox = memo(function GradeCheckbox({
  label,
  color,
  isChecked,
  onClick
}: GradeCheckboxProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 transition-opacity duration-200 ease-out"
      style={{ opacity: isChecked ? 1 : 0.5 }}
    >
      {/* 체크박스 */}
      <div
        className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ease-out"
        style={{
          borderColor: isChecked ? color : '#FFFFFF',
          backgroundColor: isChecked ? color : 'transparent',
        }}
      >
        {isChecked && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 5L4.5 8.5L11 1" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {/* 라벨 */}
      <span className="text-sm text-white">{label}</span>
    </button>
  );
});

interface SensorConfig {
  type: SensorType;
  icon: string;
  label: string;
}

interface GradeConfig {
  type: AirQualityLevel;
  label: string;
  color: string;
}

const SENSOR_CONFIGS: SensorConfig[] = [
  { type: 'pm10', icon: 'pm10icon.svg', label: '미세먼지' },
  { type: 'pm25', icon: 'pm25icon.svg', label: '초미세먼지' },
  { type: 'vocs', icon: 'vocicon.svg', label: 'VOCs' },
];

const GRADE_CONFIGS: GradeConfig[] = [
  { type: 'good', label: '좋음', color: AIR_QUALITY_COLORS.good },
  { type: 'normal', label: '보통', color: AIR_QUALITY_COLORS.normal },
  { type: 'bad', label: '나쁨', color: AIR_QUALITY_COLORS.bad },
  { type: 'very_bad', label: '매우 나쁨', color: AIR_QUALITY_COLORS.very_bad },
];

/**
 * AirSettingPanel Component
 * 대기 설정 패널 내용
 * - 대기 항목 선택 (PM10, PM2.5, VOCs)
 * - 등급 선택 (좋음, 보통, 나쁨, 매우 나쁨)
 */
const AirSettingPanel = observer(function AirSettingPanel() {
  // 센서 토글 핸들러
  const handlePM10Click = useCallback(() => {
    airConfigStore.toggleSensor('pm10');
  }, []);

  const handlePM25Click = useCallback(() => {
    airConfigStore.toggleSensor('pm25');
  }, []);

  const handleVOCsClick = useCallback(() => {
    airConfigStore.toggleSensor('vocs');
  }, []);

  const sensorHandlers = [handlePM10Click, handlePM25Click, handleVOCsClick];

  // 등급 토글 핸들러
  const handleGoodClick = useCallback(() => {
    airConfigStore.toggleGrade('good');
  }, []);

  const handleNormalClick = useCallback(() => {
    airConfigStore.toggleGrade('normal');
  }, []);

  const handleBadClick = useCallback(() => {
    airConfigStore.toggleGrade('bad');
  }, []);

  const handleVeryBadClick = useCallback(() => {
    airConfigStore.toggleGrade('very_bad');
  }, []);

  const gradeHandlers = [handleGoodClick, handleNormalClick, handleBadClick, handleVeryBadClick];

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
            onClick={sensorHandlers[index]}
          />
        ))}
      </div>

      {/* 등급 선택 섹션 */}
      <div className="mt-6">
        <SubTitle>등급 선택</SubTitle>
        <Divider color="bg-white" />

        <div className="flex justify-between gap-4 mt-4">
          {GRADE_CONFIGS.map((config, index) => (
            <GradeCheckbox
              key={config.type}
              label={config.label}
              color={config.color}
              isChecked={airConfigStore.isGradeVisible(config.type)}
              onClick={gradeHandlers[index]}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default AirSettingPanel;
