import { observer } from 'mobx-react-lite'
import SubTitle from '@/components/basic/SubTitle'
import { sensorSelectionStore } from '@/stores/SensorSelectionStore'

export interface ConcentrationRankingItem {
  rank: number
  hour: string
  value: number
}

interface ConcentrationRankingsProps {
  type: 'high' | 'low'
  data: ConcentrationRankingItem[]
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
  data
}: ConcentrationRankingsProps) {
  const isVOCsMode = sensorSelectionStore.isVOCsSelected
  const unit = isVOCsMode ? 'ppb' : 'μg/m³'

  const title = type === 'high' ? '고농도 시간대 TOP3' : '저농도 시간대 TOP3'
  const description = type === 'high'
    ? '평균 농도가 높아 외부 활동 시 주의가 필요한 시간대'
    : '공기질이 양호하여 야외 활동에 적합한 시간대'

  const emptyMessage = type === 'high'
    ? '최근 농도 수치가 기준치 미만으로,\n위험도가 높은 시간대는 없습니다.'
    : '최근 시간대별 농도 수치가 모두 높아,\n외부 활동에 유의가 필요합니다.'

  const hasData = data && data.length > 0

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
              gap: '8px',
              alignSelf: 'stretch'
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'flex',
                padding: '10px',
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
                순위
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
                시간
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
                농도 수치 ({unit})
              </div>
            </div>

            {/* Table Rows */}
            {data.slice(0, 3).map((item) => (
              <div
                key={item.rank}
                style={{
                  display: 'flex',
                  padding: '10px',
                  alignItems: 'center',
                  alignSelf: 'stretch'
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
                <div
                  style={{
                    flex: '1 0 0',
                    color: type === 'high' ? '#F70' : '#18A274',
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '14px',
                    textAlign: 'center'
                  }}
                >
                  {type === 'high' ? '나쁨' : '좋음'}({item.value.toFixed(0)} {unit})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export default ConcentrationRankings
