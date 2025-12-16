import { memo } from 'react';
import { getAirQualityLevel } from '@/utils/airQuality';
import { getBasePath } from '@/utils/env';

const basePath = getBasePath();

/**
 * 국가측정망 측정소 데이터 타입
 * TODO: API 연동 시 실제 응답 타입으로 교체
 */
export interface NationalSensorData {
  /** 측정소 이름 */
  stationName: string;
  /** 미세먼지 (PM10) 값 (μg/m³) */
  pm10: number;
  /** 초미세먼지 (PM2.5) 값 (μg/m³) */
  pm25: number;
  /** 측정 시간 (ISO 8601) */
  measuredAt: string;
}

/**
 * 국가측정망 API 응답 타입
 * TODO: API 연동 시 실제 응답 구조로 교체
 */
export interface NationalSensorResponse {
  stations: NationalSensorData[];
  updatedAt: string;
}

/**
 * Mock 데이터 - API 연동 전 테스트용
 * TODO: API 연동 시 제거
 */
const MOCK_DATA: NationalSensorResponse = {
  stations: [
    {
      stationName: '개금동',
      pm10: 28,
      pm25: 108,
      measuredAt: '2025-08-15T17:00:00+09:00',
    },
    {
      stationName: '전포동',
      pm10: 53,
      pm25: 81,
      measuredAt: '2025-08-15T17:00:00+09:00',
    },
  ],
  updatedAt: '2025-08-15T17:00:00+09:00',
};

/**
 * 등급 색상 정의
 */
const GRADE_COLORS = {
  good: '#18A274',
  normal: '#FFD040',
  bad: '#FF7700',
  very_bad: '#D32F2D',
} as const;

interface QualityBadgeProps {
  level: 'good' | 'normal' | 'bad' | 'very_bad';
  text: string;
}

/**
 * QualityBadge Component
 * 등급 표시 배지
 */
const QualityBadge = memo(function QualityBadge({ level, text }: QualityBadgeProps) {
  return (
    <div
      className="flex items-center justify-center h-6 px-2 rounded-xl"
      style={{
        backgroundColor: GRADE_COLORS[level],
        minWidth: '64px',
      }}
    >
      <span
        className="text-[12px] text-white"
        style={{ fontFamily: 'Pretendard', fontWeight: 400 }}
      >
        {text}
      </span>
    </div>
  );
});

interface SensorCellProps {
  value: number;
  sensorType: 'pm10' | 'pm25';
}

/**
 * SensorCell Component
 * 센서 값과 등급 표시 셀
 */
const SensorCell = memo(function SensorCell({ value, sensorType }: SensorCellProps) {
  const { level, levelText } = getAirQualityLevel(sensorType, value);

  return (
    <div className="flex flex-col items-center justify-center gap-1 py-2 px-2">
      <QualityBadge level={level} text={levelText} />
      <span
        className="text-[12px] text-center"
        style={{
          color: '#A6A6A6',
          fontFamily: 'Pretendard',
          fontWeight: 400,
        }}
      >
        {value} μg/m³
      </span>
    </div>
  );
});

/**
 * 날짜 포맷팅 함수
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = date.getHours();
  return `${year}.${month}.${day} ${hour}시 기준`;
}

/**
 * DescriptionSection Component
 * 부산광역시 보건환경정보 공개시스템 설명
 */
const DescriptionSection = memo(function DescriptionSection() {
  return (
    <div className="flex flex-col gap-1 w-full">
      {/* 타이틀 */}
      <div className="flex items-center gap-1">
        <img
          src={`${basePath}icon/national_senser.svg`}
          alt="국가측정망"
          className="w-[18px] h-4"
        />
        <span
          className="text-[16px] text-white font-bold"
          style={{ fontFamily: 'Pretendard' }}
        >
          부산광역시 보건환경정보 공개시스템
        </span>
      </div>
      {/* 설명 텍스트 */}
      <p
        className="text-[14px] w-full"
        style={{
          color: '#A6A6A6',
          fontFamily: 'Pretendard',
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        *부산진구 내 측정소 2개소의 자료를 확인하실 수 있습니다.
        <br />
        *본 사업에서는 일반 시민의 호흡선 높이(1.5m)에 센서를 설치하여 국가 공인 측정망 정보와 일부 차이가 있을 수 있습니다.
      </p>
    </div>
  );
});

interface AirQualityTableProps {
  data: NationalSensorResponse;
}

/**
 * AirQualityTable Component
 * 실시간 공기질 테이블
 */
const AirQualityTable = memo(function AirQualityTable({ data }: AirQualityTableProps) {
  const { stations, updatedAt } = data;

  return (
    <div className="flex flex-col w-full">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-2">
        <span
          className="text-[16px] text-white font-bold"
          style={{ fontFamily: 'Pretendard' }}
        >
          실시간 공기질
        </span>
        <span
          className="text-[12px]"
          style={{
            color: '#A6A6A6',
            fontFamily: 'Pretendard',
            fontWeight: 400,
          }}
        >
          {formatDateTime(updatedAt)}
        </span>
      </div>

      {/* 테이블 */}
      <div className="flex flex-col w-full">
        {/* 테이블 헤더 */}
        <div
          className="flex items-center w-full"
          style={{ borderBottom: '1px solid #C4C6C6' }}
        >
          {/* 빈 셀 */}
          <div className="w-[87px] h-[54px]" />
          {/* 측정소 이름 */}
          {stations.map((station) => (
            <div
              key={station.stationName}
              className="flex-1 flex items-center justify-center h-[54px]"
            >
              <span
                className="text-[14px] text-white"
                style={{ fontFamily: 'Pretendard', fontWeight: 400 }}
              >
                {station.stationName}
              </span>
            </div>
          ))}
        </div>

        {/* 미세먼지 행 */}
        <div
          className="flex items-center w-full"
          style={{ borderBottom: '1px solid #C4C6C6' }}
        >
          {/* 라벨 */}
          <div className="w-[87px] flex items-center justify-center py-4">
            <div className="text-center">
              <span
                className="text-[14px] text-white font-bold block"
                style={{ fontFamily: 'Pretendard' }}
              >
                미세먼지
              </span>
              <span
                className="text-[14px] text-white"
                style={{ fontFamily: 'Pretendard', fontWeight: 400 }}
              >
                (PM-10)
              </span>
            </div>
          </div>
          {/* 값 */}
          {stations.map((station) => (
            <div key={station.stationName} className="flex-1 flex items-center justify-center">
              <SensorCell value={station.pm10} sensorType="pm10" />
            </div>
          ))}
        </div>

        {/* 초미세먼지 행 */}
        <div
          className="flex items-center w-full"
          style={{ borderBottom: '1px solid #C4C6C6' }}
        >
          {/* 라벨 */}
          <div className="w-[87px] flex items-center justify-center py-4">
            <div className="text-center">
              <span
                className="text-[14px] text-white font-bold block"
                style={{ fontFamily: 'Pretendard' }}
              >
                초미세먼지
              </span>
              <span
                className="text-[14px] text-white"
                style={{ fontFamily: 'Pretendard', fontWeight: 400 }}
              >
                (PM-2.5)
              </span>
            </div>
          </div>
          {/* 값 */}
          {stations.map((station) => (
            <div key={station.stationName} className="flex-1 flex items-center justify-center">
              <SensorCell value={station.pm25} sensorType="pm25" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * NationalSensorPanel Component
 * 국가측정망 패널 - 부산진구 측정소 실시간 공기질 정보
 */
function NationalSensorPanel() {
  // TODO: API 연동 시 실제 데이터로 교체
  // const { data, isLoading, error } = useNationalSensorData();
  const data = MOCK_DATA;

  return (
    <div className="flex flex-col gap-6 w-full">
      <DescriptionSection />
      <AirQualityTable data={data} />
    </div>
  );
}

export default NationalSensorPanel;
