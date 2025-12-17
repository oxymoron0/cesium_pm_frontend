import { observer } from 'mobx-react-lite'
import SubTitle from '@/components/basic/SubTitle'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'
import { getAirQualityLevel } from '@/utils/airQuality'
import { isCivil } from '@/utils/env'

export interface ConcentrationRankingItem {
  rank: number
  hour: string
  value: number
}

interface ConcentrationRankingsProps {
  type: 'high' | 'low'
  data: ConcentrationRankingItem[]
  pmType?: 'PM10' | 'PM25'
}

/**
 * Concentration Rankings Component
 *
 * Displays TOP3 high/low concentration time periods
 * - High: Shows periods with high average concentration requiring caution
 * - Low: Shows periods with low concentration suitable for outdoor activities
 * - Empty state messages when no data meets threshold
 */
const ConcentrationRankings = observer(function ConcentrationRankings({
  type,
  data,
  pmType = 'PM10'
}: ConcentrationRankingsProps) {
  const civilMode = isCivil()
  const isVOCsMode = sensorSelectionStore.isVOCsSelected
  const unit = isVOCsMode ? 'ppb' : 'μg/m³'

  // Civil 모드에서는 날짜 기반 제목 사용
  const title = civilMode
    ? (type === 'high' ? '미세먼지 주의 날짜' : '미세먼지 양호 날짜')
    : (type === 'high' ? '고농도 시간대 TOP3' : '저농도 시간대 TOP3')

  const description = civilMode
    ? (type === 'high'
        ? '나쁨 등급 이상으로 외부 활동 시 주의가 필요한 날짜'
        : '좋음~보통 등급으로 분류되어, 야외 활동에 적합한 날짜')
    : (type === 'high'
        ? '평균 농도가 높아 외부 활동 시 주의가 필요한 시간대'
        : '공기질이 양호하여 야외 활동에 적합한 시간대')

  const emptyMessage = type === 'high'
    ? '최근 농도 수치가 기준치 미만으로,\n위험도가 높은 시간대는 없습니다.'
    : '최근 시간대별 농도 수치가 모두 높아,\n외부 활동에 유의가 필요합니다.'

  const hasData = data && data.length > 0

  // Civil 모드에서 등급 계산 (PM 타입에 따라)
  const getSensorType = () => {
    if (isVOCsMode) return 'vocs'
    return pmType === 'PM10' ? 'pm10' : 'pm25'
  }

  return (
    <div
      style={{
        display: 'flex',
        padding: '10px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px',
        alignSelf: 'stretch'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '4px',
          alignSelf: 'stretch'
        }}
      >
        <SubTitle>{title}</SubTitle>
        <div
          style={{
            color: '#C4C6C6',
            fontFamily: 'Pretendard',
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: '14px'
          }}
        >
          {description}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          padding: '12px',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          alignSelf: 'stretch',
          borderRadius: '8px',
          border: '1px solid rgba(196, 198, 198, 0.20)',
          background: 'rgba(255, 255, 255, 0.10)',
          minHeight: '112px'
        }}
      >
        {!hasData ? (
          // Empty state
          <div
            style={{
              color: '#999',
              textAlign: 'center',
              fontFamily: 'Pretendard',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '14px',
              whiteSpace: 'pre-line'
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          // Data table
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px',
              alignSelf: 'stretch'
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'stretch'
              }}
            >
              <div
                style={{
                  width: '24px',
                  color: '#C4C6C6',
                  fontFamily: 'Pretendard',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: '14px'
                }}
              >
                순번
              </div>
              <div
                style={{
                  flex: '1 0 0',
                  color: '#C4C6C6',
                  fontFamily: 'Pretendard',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: '14px',
                  textAlign: 'center'
                }}
              >
                {civilMode ? '날짜' : '시간'}
              </div>
              <div
                style={{
                  flex: '1 0 0',
                  color: '#C4C6C6',
                  fontFamily: 'Pretendard',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: '14px',
                  textAlign: 'center'
                }}
              >
                {civilMode ? '등급' : `농도 수치 (${unit})`}
              </div>
            </div>

            {/* Table Rows */}
            {data.slice(0, 3).map((item, index) => {
              const sensorType = getSensorType()
              const airQuality = getAirQualityLevel(sensorType, item.value)

              return (
                <div
                  key={item.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    marginBottom: index < 2 ? '12px' : '0'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      color: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: '14px'
                    }}
                  >
                    {item.rank}
                  </div>
                  <div
                    style={{
                      flex: '1 0 0',
                      color: '#FFF',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '14px',
                      textAlign: 'center'
                    }}
                  >
                    {item.hour}
                  </div>
                  {civilMode ? (
                    // Civil 모드: 컬러 배경 + 등급 텍스트
                    <div
                      style={{
                        flex: '1 0 0',
                        display: 'flex',
                        justifyContent: 'center'
                      }}
                    >
                      <div
                        style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          background: airQuality.color
                        }}
                      >
                        <span
                          style={{
                            color: airQuality.textColor,
                            fontFamily: 'Pretendard',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          {airQuality.levelText}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // 일반 모드: 기존 표시
                    <div
                      style={{
                        flex: '1 0 0',
                        color: type === 'high' ? '#FEE046' : '#1C67D7',
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: '14px',
                        textAlign: 'center'
                      }}
                    >
                      {/* VOCs는 등급 기준이 없으므로 값만 표시 */}
                      {isVOCsMode
                        ? `${item.value.toFixed(0)} ${unit}`
                        : `${type === 'high' ? '나쁨' : '좋음'}(${item.value.toFixed(0)} ${unit})`
                      }
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

export default ConcentrationRankings
