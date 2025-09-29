import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import Title from '@/components/basic/Title'
import Icon from '@/components/basic/Icon'
import SensorInfoContainer from '@/components/service/sensor/SensorInfoContainer'
import { getHourlySensorData } from '@/utils/api'
import type { HourlyDataPoint } from '@/utils/api/types'
import { formatUTCToKoreaTime, getCurrentKoreaTime } from '@/utils/dateTime'

interface StationDetailProps {
  stationId: string
  stationName?: string
  routeName?: string
  onClose: () => void
}

const StationDetail = observer(function StationDetail({
  stationId,
  stationName,
  routeName,
  onClose
}: StationDetailProps) {
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [currentSensorData, setCurrentSensorData] = useState<HourlyDataPoint | null>(null)
  const [previousSensorData, setPreviousSensorData] = useState<HourlyDataPoint | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    const fetchSensorData = async () => {
      setIsLoading(true)
      try {
        // 최근 2시간 데이터 요청 (현재값 + 이전값 비교용)
        const response = await getHourlySensorData(stationId, 2)

        if (response.status === 'success' && response.data?.hourly_data) {
          const hourlyData = response.data.hourly_data

          // 디버깅: 실제 API 응답 데이터 확인
          console.log('[StationDetail] API 응답 데이터:', {
            stationId,
            totalRecords: hourlyData.length,
            rawData: hourlyData.map(item => ({
              hour: item.hour,
              pm: item.average_readings.pm,
              voc: item.average_readings.voc
            }))
          })

          // VOCs 0값 처리: 유효한 값 찾기
          const findValidSensorValue = (sensorType: 'pm' | 'fpm' | 'voc') => {
            // 가장 최근 데이터부터 순회하여 0이 아닌 값 찾기
            for (const dataPoint of hourlyData) {
              const value = dataPoint.average_readings[sensorType]
              if (value > 0) {
                return {
                  current: value,
                  dataPoint,
                  // 이전 값도 같은 방식으로 찾기
                  previous: hourlyData.find(dp => dp !== dataPoint && dp.average_readings[sensorType] > 0)?.average_readings[sensorType]
                }
              }
            }
            return { current: null, dataPoint: null, previous: null }
          }

          // 센서별 유효한 값 찾기 (VOCs만 특별 처리)
          const vocData = findValidSensorValue('voc')

          // 현재값과 이전값 설정 (기본적으로는 최신 데이터 사용, VOCs만 특별 처리)
          const current = hourlyData[0] || null
          const previous = hourlyData[1] || null

          // VOCs 특별 처리: 유효한 값이 있으면 해당 값 사용
          const processedCurrent = current ? {
            ...current,
            average_readings: {
              ...current.average_readings,
              voc: vocData.current || current.average_readings.voc
            }
          } : null

          const processedPrevious = previous ? {
            ...previous,
            average_readings: {
              ...previous.average_readings,
              voc: vocData.previous || previous.average_readings.voc
            }
          } : null

          setCurrentSensorData(processedCurrent)
          setPreviousSensorData(processedPrevious)

          // 실제 측정 시간 표시 (UTC → Korea Seoul 변환)
          if (current) {
            console.log('[StationDetail] 시간 변환 디버깅:', {
              originalUTC: current.hour,
              parsedDate: new Date(current.hour),
              convertedTime: formatUTCToKoreaTime(current.hour)
            })
            const timeString = formatUTCToKoreaTime(current.hour)
            setLastUpdated(timeString)
          }
        } else {
          // API 응답이 없거나 실패한 경우 초기화
          setCurrentSensorData(null)
          setPreviousSensorData(null)

          const timeString = getCurrentKoreaTime()
          setLastUpdated(timeString)
        }
      } catch (error) {
        console.error('[StationDetail] 센서 데이터 로딩 실패:', error)

        // 에러 발생 시 초기화
        setCurrentSensorData(null)
        setPreviousSensorData(null)

        const timeString = getCurrentKoreaTime()
        setLastUpdated(timeString)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSensorData()
  }, [stationId])

  return (
    <div
      style={{
        display: 'flex',
        padding: '20px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '16px',
        flex: '1 0 0',
        alignSelf: 'stretch',
        borderRadius: '8px',
        border: '1px solid #696A6A',
        background: 'rgba(0, 0, 0, 0.80)',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.10)'
      }}
    >
      <Title onClose={onClose} dividerColor='bg-[#FFFFFF]'>
        정류장 공기질 모니터링
      </Title>

      <div
        style={{
          display: 'flex',
          width: '302px',
          padding: '12px',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '16px',
          alignSelf: 'stretch',
          borderRadius: '8px',
          border: '1px solid rgba(196, 198, 198, 0.20)',
          background: 'rgba(255, 255, 255, 0.10)',
          boxShadow: '0 23px 28.6px 0 rgba(0, 0, 0, 0.03)'
        }}
      >
        <div
          style={{
            display: 'flex',
            paddingBottom: '12px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            alignSelf: 'stretch',
            borderBottom: '1px solid #C4C6C6'
          }}
        >
          <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '600' }}>
            {stationName || '정류장'}
          </div>
          <div style={{ color: '#C4C6C6', fontSize: '16px' }}>
            {stationId} ({routeName || '노선'}번 방면)
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            alignSelf: 'stretch'
          }}
        >
          <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '600' }}>
            현재 정류장 공기 상태
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#A6A6A6',
              fontVariantNumeric: 'lining-nums tabular-nums',
              fontFamily: 'Pretendard',
              fontSize: '12px',
              fontStyle: 'normal',
              fontWeight: '400',
              lineHeight: '18px'
            }}
          >
            <span>
              버스 IoT 센서 측정값 기준 {lastUpdated} 업데이트됨
              {isLoading && ' (로딩 중...)'}
            </span>
            <Icon name="refresh" />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            paddingLeft: '4px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '32px',
            alignSelf: 'stretch'
          }}
        >
          <SensorInfoContainer
            sensorType="pm10"
            value={currentSensorData?.average_readings.pm || 0}
            previousValue={previousSensorData?.average_readings.pm}
            hasValidData={!!currentSensorData && currentSensorData.average_readings.pm > 0}
          />
          <SensorInfoContainer
            sensorType="pm25"
            value={currentSensorData?.average_readings.fpm || 0}
            previousValue={previousSensorData?.average_readings.fpm}
            hasValidData={!!currentSensorData && currentSensorData.average_readings.fpm > 0}
          />
          <SensorInfoContainer
            sensorType="vocs"
            value={currentSensorData?.average_readings.voc || 0}
            previousValue={previousSensorData?.average_readings.voc}
            hasValidData={!!currentSensorData && currentSensorData.average_readings.voc > 0}
          />
        </div>

      </div>
    </div>
  )
})

export default StationDetail