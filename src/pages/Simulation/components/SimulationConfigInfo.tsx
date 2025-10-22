import { observer } from 'mobx-react-lite';
import Panel from '@/components/basic/Panel';
import Title from '@/components/basic/Title';
import Spacer from '@/components/basic/Spacer';
import Divider from '@/components/basic/Divider';

interface SimulationConfigInfoProps {
  onClose?: () => void;
}

const SimulationConfigInfo = observer(function SimulationConfigInfo({ onClose }: SimulationConfigInfoProps) {
  // TODO: Replace with actual data from simulationStore
  const configData = {
    title: '부전동 미세먼지 테스트',
    pollutant: '미세먼지 (PM-10)',
    concentration: '151 μg/m³',
    roadAddress: '(도로명) 부산광역시 부산진구 중앙대로 지하 730',
    jibunAddress: '(지번) 부산광역시 부산진구 부전동 573-1',
    emissionHeight: '1.5m',
    windDirection: '200°',
    windSpeed: '3.41 m/s'
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
        {configData.title}
      </div>

      <Spacer height={8} />
      <Divider color="bg-[#C3C3C3]" />

      {/* Configuration Details Table */}
      <div className="flex flex-col self-stretch">
        <ConfigRow label="오염물질" value={configData.pollutant} />
        <ConfigRow label="농도" value={configData.concentration} />
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
              {configData.roadAddress}
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
              {configData.jibunAddress}
            </div>
          </div>
        </ConfigRow>
        <ConfigRow label="발생 고도" value={configData.emissionHeight} />
        <ConfigRow label="기상조건" value={`(풍향) ${configData.windDirection} (풍속) ${configData.windSpeed}`} />
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
