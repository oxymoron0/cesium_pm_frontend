import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import Title from '@/components/basic/Title'
import Icon from '@/components/basic/Icon'
import TabNavigation from '@/components/basic/TabNavigation'
import SensorInfoContainer from '@/components/service/sensor/SensorInfoContainer'
import { getHourlySensorData, getDailySensorData, getLatestSensorData } from '@/utils/api'
import type { HourlyDataPoint, DailyDataPoint, StationSensorApiData } from '@/utils/api/types'
import { formatUTCToKoreaTime, getCurrentKoreaTime, formatTimeDifference } from '@/utils/dateTime'
import { stationDetailStore } from '@/stores/StationDetailStore'
import { isCivil } from '@/utils/env'
import UnifiedStationSensorMetric from './StationSensorMetric'

interface StationDetailProps {
  stationId: string
  onClose: () => void
}

const StationDetail = observer(function StationDetail({
  stationId,
  onClose
}: StationDetailProps) {
  const civilMode = isCivil()
  // Store에서 정류장 정보 가져오기
  const { selectedStationName, selectedRouteName, selectedDirection, selectedDirectionName } = stationDetailStore
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
  const [activeTab, setActiveTab] = useState<number>(0)

  // 캐시된 데이터 상태 (정류장별로 캐싱)
  const [cachedStationId, setCachedStationId] = useState<string | null>(null)
  const [cachedTodayData, setCachedTodayData] = useState<{
    hourlyData: HourlyDataPoint[]
    latestData: StationSensorApiData | null
  } | null>(null)
  const [cachedWeekData, setCachedWeekData] = useState<{
    dailyData: DailyDataPoint[]
    hourlyData: HourlyDataPoint[]
  } | null>(null)
  const [cachedMonthData, setCachedMonthData] = useState<{
    dailyData: DailyDataPoint[]
    hourlyData: HourlyDataPoint[]
  } | null>(null)

  // No need for renderTabContent - using unified component

  useEffect(() => {
    // 정류장이 변경되었는지 확인
    const isStationChanged = cachedStationId !== stationId

    if (isStationChanged) {
      console.log('[StationDetail] 정류장 변경 감지, 캐시 초기화:', { prev: cachedStationId, new: stationId })
      setCachedStationId(stationId)
      setCachedTodayData(null)
      setCachedWeekData(null)
      setCachedMonthData(null)
    }

    const fetchAllSensorData = async () => {
      setIsLoading(true)
      try {
        // 모든 기간의 데이터를 병렬로 가져오기 (우선순위: 오늘 > 7일 > 1개월)
        console.log('[StationDetail] 모든 탭 데이터 병렬 로딩 시작')
        const [
          latestResponse,
          hourly24Response,
          hourly7daysResponse,
          hourly30daysResponse,
          daily7Response,
          daily30Response
        ] = await Promise.all([
          getLatestSensorData(),
          getHourlySensorData(stationId, 24),        // 오늘
          getHourlySensorData(stationId, 24 * 7),    // 7일
          getHourlySensorData(stationId, 24 * 30),   // 30일 (1개월)
          getDailySensorData(stationId, 7),          // 7일
          getDailySensorData(stationId, 30)          // 30일 (1개월)
        ])

        console.log('[StationDetail] 모든 API 응답 완료:', {
          stationId,
          latestCount: latestResponse?.data?.length || 0,
          hourly24: hourly24Response?.status,
          hourly7days: hourly7daysResponse?.status,
          hourly30days: hourly30daysResponse?.status,
          daily7: daily7Response?.status,
          daily30: daily30Response?.status
        })

        // Latest Data에서 해당 station 찾기
        const stationLatestData = latestResponse?.data?.find(data => data.station_id === stationId)
        const hourly24Data = hourly24Response?.status === 'success' ? hourly24Response.data?.hourly_data || [] : []
        const hourly7daysData = hourly7daysResponse?.status === 'success' ? hourly7daysResponse.data?.hourly_data || [] : []
        const hourly30daysData = hourly30daysResponse?.status === 'success' ? hourly30daysResponse.data?.hourly_data || [] : []
        const daily7Data = daily7Response?.status === 'success' ? daily7Response.data?.daily_data || [] : []
        const daily30Data = daily30Response?.status === 'success' ? daily30Response.data?.daily_data || [] : []

        // 캐시에 데이터 저장
        setCachedTodayData({
          hourlyData: hourly24Data,
          latestData: stationLatestData || null
        })
        setCachedWeekData({
          dailyData: daily7Data,
          hourlyData: hourly7daysData
        })
        setCachedMonthData({
          dailyData: daily30Data,
          hourlyData: hourly30daysData
        })

        console.log('[StationDetail] 캐시 저장 완료:', {
          todayCached: hourly24Data.length > 0,
          weekCached: daily7Data.length > 0,
          monthCached: daily30Data.length > 0
        })

        // 좌측 센서 정보 업데이트 (오늘 데이터 기준)
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
          if (hourly24Data.length > 0) {
            const latestHourlyData = hourly24Data[hourly24Data.length - 1]
            const timeDiff = formatTimeDifference(stationLatestData.recorded_at, latestHourlyData.hour)

            setPreviousSensorData(latestHourlyData)
            setTimeComparisonData({
              timeDiff,
              latestTimestamp: stationLatestData.recorded_at,
              hourlyTimestamp: latestHourlyData.hour
            })
          } else {
            setPreviousSensorData(null)
            setTimeComparisonData(null)
          }

          const timeString = formatUTCToKoreaTime(stationLatestData.recorded_at)
          setLastUpdated(timeString)

        } else {
          console.warn('[StationDetail] Latest 데이터 없음')
          setLatestSensorData(null)
          setCurrentSensorData(null)
          setPreviousSensorData(null)
          setTimeComparisonData(null)
          setLastUpdated(getCurrentKoreaTime())
        }

      } catch (error) {
        console.error('[StationDetail] API 호출 실패:', error)
        setLatestSensorData(null)
        setCurrentSensorData(null)
        setPreviousSensorData(null)
        setTimeComparisonData(null)
        setLastUpdated(getCurrentKoreaTime())
      } finally {
        setIsLoading(false)
      }
    }

    // 정류장 변경 시에만 데이터 로딩
    if (isStationChanged) {
      fetchAllSensorData()
    }
  }, [stationId, cachedStationId])

  return (
    <>
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
          alignItems: 'flex-start',
          gap: '16px',
          flex: '1 0 0',
          alignSelf: 'stretch'
        }}
      >
        {/* 좌측 컨테이너 */}
        <div
            style={{
              display: 'flex',
              width: '302px',
              padding: '12px',
              flexDirection: 'column',
              justifyContent: 'flex-start',
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
                {selectedStationName || '정류장'}
              </div>
              <div style={{ color: '#C4C6C6', fontSize: '14px' }}>
                {stationId} ({selectedDirectionName || `${selectedDirection === 'inbound' ? '상행선' : selectedDirection === 'outbound' ? '하행선' : `${selectedRouteName || '노선'}번`} 방면`})
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
              {!civilMode && (
                <SensorInfoContainer
                  sensorType="vocs"
                  value={currentSensorData?.average_readings.voc || 0}
                  previousValue={previousSensorData?.average_readings.voc}
                  hasValidData={!!currentSensorData && currentSensorData.average_readings.voc > 0}
                  timeDifference={timeComparisonData?.timeDiff}
                />
              )}
            </div>
        </div>

        {/* 우측 컨테이너 */}
        <div
          style={{
            display: 'flex',
            padding: '12px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
            flex: '1 0 0',
            alignSelf: 'stretch',
            borderRadius: '8px',
            border: '1px solid rgba(196, 198, 198, 0.20)',
            background: 'rgba(255, 255, 255, 0.10)',
            boxShadow: '0 23px 28.6px 0 rgba(0, 0, 0, 0.03)'
          }}
        >
          <TabNavigation
            tabs={['오늘', '최근 7일', '최근 1개월']}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* 통합 차트 컴포넌트 - 탭 전환 시 리렌더링 없이 데이터만 변경 */}
          <UnifiedStationSensorMetric
            activeTab={activeTab as 0 | 1 | 2}
            cachedTodayData={cachedTodayData}
            cachedWeekData={cachedWeekData}
            cachedMonthData={cachedMonthData}
          />
        </div>
      </div>
    </div>
    </>
  )
})

export default StationDetail