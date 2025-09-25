import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import Title from '@/components/basic/Title'
import Icon from '@/components/basic/Icon'

interface StationDetailProps {
  stationId: string
  stationName?: string
  routeName?: string
  onClose: () => void
}

interface SensorData {
  humidity: number;
  temperature: number;
  voc: number;
  co2: number;
  pm: number;
  fpm: number;
}

const StationDetail = observer(function StationDetail({
  stationId,
  stationName,
  routeName,
  onClose
}: StationDetailProps) {
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    // TODO: Implement API call to get latest sensor data for station
    // GET /api/v1/sensor-data/stations/latest-all or specific station endpoint
    // For now, using mock data
    setSensorData({
      humidity: 65.5,
      temperature: 24.8,
      voc: 98.2,
      co2: 420,
      pm: 12.4,
      fpm: 8.9
    })

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
          <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
            {stationName || '정류장'}
          </div>
          <div style={{ color: '#C4C6C6', fontSize: '14px' }}>
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
          <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '600' }}>
            현재 정류장 공기 상태
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#C4C6C6',
              fontSize: '12px'
            }}
          >
            <span>버스 IoT 센서 측정값 기준 {lastUpdated} 업데이트됨</span>
            <Icon name="refresh" />
          </div>
        </div>

      </div>
    </div>
  )
})

export default StationDetail