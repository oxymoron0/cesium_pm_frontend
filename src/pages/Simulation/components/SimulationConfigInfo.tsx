import { observer } from 'mobx-react-lite';
import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Divider from '@/components/basic/Divider';
import { simulationStore } from '@/stores/SimulationStore';
import type { PMType } from '@/types/simulation_request_types';

interface SimulationConfigInfoProps {
  onClose?: () => void;
}

const SimulationConfigInfo = observer(function SimulationConfigInfo({ onClose }: SimulationConfigInfoProps) {
  const { simulationDetail } = simulationStore;

  if (!simulationDetail) {
    return null;
  }

  // PMType 포맷 변환
  const formatPollutant = (pmType?: PMType) => {
    if (pmType === 'pm10') return '미세먼지 (PM-10)';
    if (pmType === 'pm25') return '초미세먼지 (PM-2.5)';
    return '-';
  };

  return (
    <Panel position="right" width="540px" maxHeight="calc(100vh - 160px)" offset={96}>
      <Title onClose={onClose}>
        시뮬레이션 설정 정보
      </Title>

      <Spacer height={16} />

      {/* Simulation Title Section */}
      <div
        className="self-stretch"
        style={{
          color: '#FFF',
          fontFamily: 'Pretendard',
          fontSize: '16px',
          fontWeight: '600',
          lineHeight: 'normal'
        }}
      >
        {simulationDetail.simulationName || '-'}
      </div>

      <Spacer height={8} />
      <Divider color="bg-[#C3C3C3]" />

      {/* Configuration Details Table */}
      <div className="flex flex-col self-stretch">
        <ConfigRow label="오염물질" value={formatPollutant(simulationDetail.pmtype)} />
        <ConfigRow label="농도" value={
          simulationDetail.firstStationConcentration
            ? `${simulationDetail.firstStationConcentration} μg/m³`
            : '-'
        } />
        <ConfigRow label="발생 위치">
          <div className="flex flex-col">
            <div
              style={{
                color: '#FFF',
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: 'normal'
              }}
            >
              {simulationDetail.roadName ? `(도로명) ${simulationDetail.roadName}` : '-'}
            </div>
            <div
              style={{
                color: '#FFF',
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: 'normal'
              }}
            >
              {simulationDetail.lot ? `(지번) ${simulationDetail.lot}` : '-'}
            </div>
          </div>
        </ConfigRow>
        <ConfigRow label="기상조건" value={
          `(풍향) ${simulationDetail.weatherData?.wind_direction_10m ?? '-'}° (풍속) ${simulationDetail.weatherData?.wind_speed_10m ?? '-'} m/s`
        } />
      </div>
    </Panel>
  );
});

// Config Row Component
function ConfigRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div
      className="flex items-center self-stretch border-b border-[#696A6A]"
      style={{
        padding: '12px 20px',
        gap: '12px'
      }}
    >
      <div
        style={{
          color: '#FFF',
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: 'normal',
          width: '80px',
          flexShrink: 0
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: '#FFF',
          fontFamily: 'Pretendard',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: 'normal'
        }}
      >
        |
      </div>
      {children ? (
        children
      ) : (
        <div
          style={{
            flex: 1,
            color: '#FFF',
            fontFamily: 'Pretendard',
            fontSize: '14px',
            fontWeight: '400',
            lineHeight: 'normal'
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

export default SimulationConfigInfo;
