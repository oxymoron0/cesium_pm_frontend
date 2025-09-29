import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import Title from '@/components/basic/Title'
import Icon from '@/components/basic/Icon'
import SensorInfoContainer from '@/components/service/sensor/SensorInfoContainer'

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

  useEffect(() => {
    // TODO: Replace with actual API call to get sensor data with measurement timestamp
    // Use API response timestamp instead of current time for accurate measurement time display
    const now = new Date()
    const timeString = `${now.getHours() < 12 ? '오전' : '오후'} ${now.getHours() % 12 || 12}시 ${now.getMinutes().toString().padStart(2, '0')}분`
    setLastUpdated(timeString)
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
            <span>버스 IoT 센서 측정값 기준 {lastUpdated} 업데이트됨</span>
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
          <SensorInfoContainer sensorType="pm10" value={25} />
          <SensorInfoContainer sensorType="pm25" value={25} />
          <SensorInfoContainer sensorType="vocs" value={120} />
        </div>

      </div>
    </div>
  )
})

export default StationDetail