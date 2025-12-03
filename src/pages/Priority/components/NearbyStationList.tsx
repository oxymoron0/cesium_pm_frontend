import { observer } from 'mobx-react-lite';
import type { NearbyStation } from '../types';

interface NearbyStationListProps {
  stations: NearbyStation[];
}

// 등급별 스타일
const getLevelStyle = (level: string) => {
  switch (level) {
    case 'very-bad':
      return { bg: '#D32F2D', textColor: '#FFFFFF', text: '매우나쁨' };
    case 'bad':
      return { bg: '#FF7700', textColor: '#FFFFFF', text: '나쁨' };
    case 'normal':
      return { bg: '#FFD040', textColor: '#000000', text: '보통' };
    case 'good':
      return { bg: '#00C851', textColor: '#FFFFFF', text: '좋음' };
    default:
      return { bg: '#FFD040', textColor: '#000000', text: '보통' };
  }
};

const NearbyStationList = observer(function NearbyStationList({ stations }: NearbyStationListProps) {
  if (stations.length === 0) {
    return (
      <div className="w-full">
        <div className="flex h-[42px] py-[10px] items-center gap-2 self-stretch border-b border-[#C3C3C3]">
          <p className="text-white font-pretendard text-[18px] font-bold">주변 정류장</p>
        </div>
        <div className="flex items-center justify-center py-8 text-[#999999] font-pretendard text-[14px] justify-start">
          ※ 취약시설 선택 시, 해당 시설 주변의 정류장 정보가 아래에 표시됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start self-stretch">
      {/* 제목 */}
      <div className="flex h-[42px] py-[10px] items-center gap-2 self-stretch border-b border-[#C3C3C3]">
        <p className="text-white font-pretendard text-[18px] font-bold">주변 정류장</p>
      </div>

      {/* 테이블 컨테이너 */}
      <div className="flex gap-2 items-start self-stretch">
        {/* 테이블 */}
        <div
          className="flex-1 custom-scrollbar"
          style={{
            maxHeight: '240px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {/* 테이블 헤더 */}
          <div className="flex h-[54px] items-center self-stretch border-b border-white">
            <div
              className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
              style={{ width: '120px', height: '54px', flexShrink: 0 }}
            >
              정류장명
            </div>
            <div
              className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
              style={{ width: '120px', height: '54px', flexShrink: 0 }}
            >
              정류장 ID
            </div>
            <div
              className="flex flex-1 items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
              style={{ height: '54px' }}
            >
              측정시간
            </div>
            <div
              className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
              style={{ width: '80px', height: '54px', flexShrink: 0 }}
            >
              농도
            </div>
            <div
              className="flex items-center justify-center text-white font-pretendard text-[14px] font-bold text-center"
              style={{ width: '100px', height: '54px', flexShrink: 0 }}
            >
              등급
            </div>
          </div>

          {/* 테이블 데이터 */}
          {stations.map((station) => {
            const totalHeight = station.measurements.length * 40;

            return (
              <div key={station.id} className="flex items-start self-stretch">
                {/* 정류장명 */}
                <div
                  className="flex items-center justify-center text-white font-pretendard text-[14px] text-center border-b border-[#696A6A]"
                  style={{ width: '120px', height: `${totalHeight}px`, flexShrink: 0 }}
                >
                  {station.stationName}
                </div>

                {/* 정류장 ID */}
                <div
                  className="flex items-center justify-center text-white font-pretendard text-[14px] text-center border-b border-[#696A6A]"
                  style={{ width: '120px', height: `${totalHeight}px`, flexShrink: 0 }}
                >
                  {station.stationId}
                </div>

              {/* 측정 데이터 (시간, 농도, 등급) */}
              <div className="flex flex-1 flex-col items-start justify-center">
                {station.measurements.map((measurement, idx) => {
                  const levelStyle = getLevelStyle(measurement.level);
                  return (
                    <div
                      key={`${station.id}-${idx}`}
                      className="flex items-center w-full border-b border-[#696A6A]"
                      style={{ height: '40px' }}
                    >
                      {/* 측정시간 */}
                      <div className="flex flex-1 items-center justify-center text-white font-pretendard text-[14px] text-center">
                        {measurement.time}
                      </div>

                      {/* 농도 */}
                      <div
                        className="flex items-center justify-center text-white font-pretendard text-[14px] text-center"
                        style={{ width: '80px', flexShrink: 0 }}
                      >
                        {measurement.concentration} ㎍/㎥
                      </div>

                      {/* 등급 */}
                      <div
                        className="flex items-center justify-center"
                        style={{ width: '100px', flexShrink: 0 }}
                      >
                        <div
                          className="flex items-center justify-center rounded-xl font-pretendard text-[12px]"
                          style={{
                            backgroundColor: levelStyle.bg,
                            color: levelStyle.textColor,
                            width: '64px',
                            height: '24px'
                          }}
                        >
                          {levelStyle.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default NearbyStationList;
