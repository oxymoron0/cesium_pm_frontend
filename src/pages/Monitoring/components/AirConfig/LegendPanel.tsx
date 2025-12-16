import { useState, memo, useCallback } from 'react';
import TabNavigation from '@/components/basic/TabNavigation';
import { AIR_QUALITY_STANDARDS, AIR_QUALITY_COLORS } from '@/utils/airQuality';
import { getBasePath } from '@/utils/env';

const basePath = getBasePath();

type AirQualityLevel = 'good' | 'normal' | 'bad' | 'very_bad';

/**
 * PM10 등급별 범위 텍스트 생성
 */
function getPM10RangeText(level: AirQualityLevel): string {
  const standards = AIR_QUALITY_STANDARDS.pm10;
  switch (level) {
    case 'good':
      return `~${standards.good.max}`;
    case 'normal':
      return `~${standards.normal.max}`;
    case 'bad':
      return `~${standards.bad.max}`;
    case 'very_bad':
      return `${standards.bad.max + 1}~`;
  }
}

/**
 * PM25 등급별 범위 텍스트 생성
 */
function getPM25RangeText(level: AirQualityLevel): string {
  const standards = AIR_QUALITY_STANDARDS.pm25;
  switch (level) {
    case 'good':
      return `~${standards.good.max}`;
    case 'normal':
      return `~${standards.normal.max}`;
    case 'bad':
      return `~${standards.bad.max}`;
    case 'very_bad':
      return `${standards.bad.max + 1}~`;
  }
}

interface QualityLevelBarProps {
  level: 'good' | 'normal' | 'bad' | 'very_bad';
  label: string;
  color: string;
  rangeText: string;
}

/**
 * QualityLevelBar Component
 * 등급별 색상 바 및 라벨 표시
 */
const QualityLevelBar = memo(function QualityLevelBar({ label, color, rangeText }: QualityLevelBarProps) {
  return (
    <div className="flex flex-col gap-1 flex-1 items-center">
      {/* 범위 텍스트 */}
      <span
        className="text-[10px] w-full"
        style={{
          color: '#A6A6A6',
          fontFamily: 'Pretendard',
          fontWeight: 400,
        }}
      >
        {rangeText}
      </span>
      {/* 색상 바 */}
      <div
        className="h-[2px] w-full rounded-[15px]"
        style={{ backgroundColor: color }}
      />
      {/* 등급 라벨 */}
      <span
        className="text-[12px] text-white text-center w-full font-bold"
        style={{ fontFamily: 'Pretendard' }}
      >
        {label}
      </span>
    </div>
  );
});

/**
 * PM10Content Component
 * 미세먼지 탭 콘텐츠
 */
const PM10Content = memo(function PM10Content() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 미세먼지 설명 섹션 */}
      <div className="flex flex-col gap-1 w-full">
        {/* 타이틀 */}
        <div className="flex items-center gap-1">
          <img
            src={`${basePath}icon/pm10icon.svg`}
            alt="미세먼지"
            className="w-6 h-6"
          />
          <span
            className="text-[16px] text-white font-bold flex-1"
            style={{ fontFamily: 'Pretendard' }}
          >
            미세먼지 (PM-10)
          </span>
        </div>
        {/* 설명 텍스트 */}
        <p
          className="text-[14px] text-white w-full"
          style={{
            fontFamily: 'Pretendard',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          PM10은 1000분의 10mm보다 작은 먼지이며, 공기 중 고체상태와 액체상태의 입자의 혼합물로 배출됩니다. 공장, 자동차, 생물성 연소에 따라 화학반응 또는 자연적으로 생성됩니다.
        </p>
      </div>

      {/* 등급 표시 섹션 */}
      <div className="flex flex-col gap-3 w-full">
        {/* 등급 바 */}
        <div className="flex gap-1 items-end w-full">
          <QualityLevelBar
            level="good"
            label="좋음"
            color={AIR_QUALITY_COLORS.good}
            rangeText={getPM10RangeText('good')}
          />
          <QualityLevelBar
            level="normal"
            label="보통"
            color={AIR_QUALITY_COLORS.normal}
            rangeText={getPM10RangeText('normal')}
          />
          <QualityLevelBar
            level="bad"
            label="나쁨"
            color={AIR_QUALITY_COLORS.bad}
            rangeText={getPM10RangeText('bad')}
          />
          <QualityLevelBar
            level="very_bad"
            label="매우나쁨"
            color={AIR_QUALITY_COLORS.very_bad}
            rangeText={getPM10RangeText('very_bad')}
          />
        </div>

        {/* 하단 설명 */}
        <p
          className="text-[12px] w-full"
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          실시간 관측값으로, 환경에 따라 오차가 있을 수 있습니다. (단위: μg/m³)
        </p>
      </div>
    </div>
  );
});

/**
 * PM25Content Component
 * 초미세먼지 탭 콘텐츠
 */
const PM25Content = memo(function PM25Content() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 초미세먼지 설명 섹션 */}
      <div className="flex flex-col gap-1 w-full">
        {/* 타이틀 */}
        <div className="flex items-center gap-1">
          <img
            src={`${basePath}icon/pm25icon.svg`}
            alt="초미세먼지"
            className="w-6 h-6"
          />
          <span
            className="text-[16px] text-white font-bold flex-1"
            style={{ fontFamily: 'Pretendard' }}
          >
            초미세먼지 (PM-2.5)
          </span>
        </div>
        {/* 설명 텍스트 */}
        <p
          className="text-[14px] text-white w-full"
          style={{
            fontFamily: 'Pretendard',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          PM2.5는 1000분의 2.5mm 보다 작은 초미립자 먼지이며, 입자가 미세해 코점막을 통해 걸러지지 않고 폐에 침투해 천식 및 폐질환을 유발할 수 있습니다.
        </p>
      </div>

      {/* 등급 표시 섹션 */}
      <div className="flex flex-col gap-3 w-full">
        {/* 등급 바 */}
        <div className="flex gap-1 items-end w-full">
          <QualityLevelBar
            level="good"
            label="좋음"
            color={AIR_QUALITY_COLORS.good}
            rangeText={getPM25RangeText('good')}
          />
          <QualityLevelBar
            level="normal"
            label="보통"
            color={AIR_QUALITY_COLORS.normal}
            rangeText={getPM25RangeText('normal')}
          />
          <QualityLevelBar
            level="bad"
            label="나쁨"
            color={AIR_QUALITY_COLORS.bad}
            rangeText={getPM25RangeText('bad')}
          />
          <QualityLevelBar
            level="very_bad"
            label="매우나쁨"
            color={AIR_QUALITY_COLORS.very_bad}
            rangeText={getPM25RangeText('very_bad')}
          />
        </div>

        {/* 하단 설명 */}
        <p
          className="text-[12px] w-full"
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          실시간 관측값으로, 환경에 따라 오차가 있을 수 있습니다. (단위: μg/m³)
        </p>
      </div>
    </div>
  );
});

/**
 * VOCsContent Component
 * VOCs 탭 콘텐츠
 */
const VOCsContent = memo(function VOCsContent() {
  return (
    <div className="flex flex-col gap-1 w-full">
      {/* 타이틀 */}
      <div className="flex items-center gap-1">
        <img
          src={`${basePath}icon/vocicon.svg`}
          alt="VOCs"
          className="w-6 h-6"
        />
        <span
          className="text-[16px] text-white font-bold flex-1"
          style={{ fontFamily: 'Pretendard' }}
        >
          VOCs
        </span>
      </div>
      {/* 설명 텍스트 */}
      <p
        className="text-[14px] text-white w-full"
        style={{
          fontFamily: 'Pretendard',
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        VOCs는 휘발성이 강한 유기화합물로, 공인된 등급이 존재하지 않습니다. 실내외 공기 중에 증기 형태로 존재하며 눈, 코, 호흡기 자극 및 두통, 메스꺼움 등을 유발할 수 있습니다.
      </p>
    </div>
  );
});

const TABS = ['미세먼지', '초미세먼지', 'VOCs'];

/**
 * LegendPanel Component
 * 범례 패널 - 대기질 등급 기준 표시
 * CSS display 방식으로 탭 전환하여 리렌더링 방지
 */
function LegendPanel() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = useCallback((index: number) => {
    setActiveTab(index);
  }, []);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 탭 네비게이션 */}
      <TabNavigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* 기준 정보 */}
      <div
        className="flex justify-between items-start w-full text-[12px]"
        style={{
          color: '#A6A6A6',
          fontFamily: 'Pretendard',
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        <span>기준 : 매시 정각 업데이트 (1시간 단위)</span>
        <span>환경부 한국환경공단</span>
      </div>

      {/* 탭 콘텐츠 - CSS display로 전환하여 리마운트 방지 */}
      <div style={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <PM10Content />
      </div>
      <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <PM25Content />
      </div>
      <div style={{ display: activeTab === 2 ? 'block' : 'none' }}>
        <VOCsContent />
      </div>
    </div>
  );
}

export default LegendPanel;
