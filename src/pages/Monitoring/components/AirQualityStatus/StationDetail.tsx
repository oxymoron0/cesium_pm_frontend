import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import Title from '@/components/basic/Title'
import Icon from '@/components/basic/Icon'
import SensorInfoContainer from '@/components/service/sensor/SensorInfoContainer'
import { getHourlySensorData, getLatestSensorData } from '@/utils/api'
import type { HourlyDataPoint, StationSensorApiData } from '@/utils/api/types'
import { formatUTCToKoreaTime, getCurrentKoreaTime, formatTimeDifference } from '@/utils/dateTime'

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
  const [, setLatestSensorData] = useState<StationSensorApiData | null>(null)
  const [timeComparisonData, setTimeComparisonData] = useState<{
    timeDiff: string;
    latestTimestamp: string;
    hourlyTimestamp: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    const fetchSensorData = async () => {
      setIsLoading(true)
      try {
        // Latest Data + Hourly Data 병렬 호출
        const [latestResponse, hourlyResponse] = await Promise.all([
          getLatestSensorData(),
          getHourlySensorData(stationId, 24)
        ])

        console.log('[StationDetail] 병렬 API 응답:', {
          stationId,
          latestStatus: latestResponse?.data?.length || 0,
          hourlyStatus: hourlyResponse?.status
        })

        // Latest Data에서 해당 station 찾기
        const stationLatestData = latestResponse?.data?.find(data => data.station_id === stationId)
        const hourlyData = hourlyResponse?.status === 'success' ? hourlyResponse.data?.hourly_data : []

        if (stationLatestData) {
          // Latest Data를 Hourly 형식으로 변환 (현재값)
          const latestAsHourly: HourlyDataPoint = {
            hour: stationLatestData.recorded_at,
            average_readings: {
              humidity: stationLatestData.sensor_data.humidity,
              temperature: stationLatestData.sensor_data.temperature,
              voc: stationLatestData.sensor_data.voc,
              co2: stationLatestData.sensor_data.co2,
              pm: stationLatestData.sensor_data.pm,
              fpm: stationLatestData.sensor_data.fpm
            },
            sample_count: 1
          }

          setLatestSensorData(stationLatestData)
          setCurrentSensorData(latestAsHourly)

          // Hourly 데이터가 있는 경우 비교 처리
          if (hourlyData && hourlyData.length > 0) {
            console.log('[StationDetail] Latest + Hourly 데이터 성공:', {
              latestTime: stationLatestData.recorded_at,
              hourlyTime: hourlyData[hourlyData.length - 1].hour,
              latestPm: stationLatestData.sensor_data.pm,
              hourlyPm: hourlyData[hourlyData.length - 1].average_readings.pm
            })

            // 가장 최신 Hourly Data (비교값)
            const latestHourlyData = hourlyData[hourlyData.length - 1]

            // 시간 차이 계산
            const timeDiff = formatTimeDifference(stationLatestData.recorded_at, latestHourlyData.hour)

            setPreviousSensorData(latestHourlyData)
            setTimeComparisonData({
              timeDiff,
              latestTimestamp: stationLatestData.recorded_at,
              hourlyTimestamp: latestHourlyData.hour
            })
          } else {
            console.log('[StationDetail] Latest 데이터만 사용 (Hourly 데이터 없음)')
            setPreviousSensorData(null)
            setTimeComparisonData(null)
          }

          // 실제 측정 시간 표시 (Latest Data 기준)
          const timeString = formatUTCToKoreaTime(stationLatestData.recorded_at)
          setLastUpdated(timeString)

        } else {
          console.warn('[StationDetail] Latest 데이터 없음')

          // 완전 실패 시 초기화
          setLatestSensorData(null)
          setCurrentSensorData(null)
          setPreviousSensorData(null)
          setTimeComparisonData(null)

          const timeString = getCurrentKoreaTime()
          setLastUpdated(timeString)
        }

      } catch (error) {
        console.error('[StationDetail] API 호출 실패:', error)

        // 에러 발생 시 초기화
        setLatestSensorData(null)
        setCurrentSensorData(null)
        setPreviousSensorData(null)
        setTimeComparisonData(null)

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
            timeDifference={timeComparisonData?.timeDiff}
          />
          <SensorInfoContainer
            sensorType="pm25"
            value={currentSensorData?.average_readings.fpm || 0}
            previousValue={previousSensorData?.average_readings.fpm}
            hasValidData={!!currentSensorData && currentSensorData.average_readings.fpm > 0}
            timeDifference={timeComparisonData?.timeDiff}
          />
          <SensorInfoContainer
            sensorType="vocs"
            value={currentSensorData?.average_readings.voc || 0}
            previousValue={previousSensorData?.average_readings.voc}
            hasValidData={!!currentSensorData && currentSensorData.average_readings.voc > 0}
            timeDifference={timeComparisonData?.timeDiff}
          />
        </div>

      </div>
    </div>
  )
})

export default StationDetail