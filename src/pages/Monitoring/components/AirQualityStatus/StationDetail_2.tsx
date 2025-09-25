import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import Icon from '../../../../components/basic/Icon'

interface StationDetailProps {
  stationId: string
  stationName?: string
  routeName?: string
  onClose: () => void
}

const StationDetail_2 = observer(function StationDetail_2({
  stationId,
  stationName,
  routeName,
  onClose
}: StationDetailProps) {

  const [activeTab, setActiveTab] = useState<'realtime' | 'history' | 'info'>('realtime')

  // Generate sample air quality data based on station ID
  const generateSampleAirQualityData = (stationId: string) => {
    const seed = parseInt(stationId.slice(-2), 10) || 1
    return {
      pm10: 30 + (seed * 7) % 50, // 30-80 range
      pm25: 15 + (seed * 5) % 35, // 15-50 range
      vocs: 100 + (seed * 13) % 200, // 100-300 range
      temperature: 20 + (seed * 3) % 15, // 20-35°C range
      humidity: 40 + (seed * 2) % 40 // 40-80% range
    }
  }

  const airQualityData = generateSampleAirQualityData(stationId)

  // Helper function to get air quality status
  const getAQIStatus = (pm25: number) => {
    if (pm25 <= 15) return { level: '좋음', color: 'text-green-400', bgColor: 'bg-green-400/20' }
    if (pm25 <= 35) return { level: '보통', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' }
    if (pm25 <= 75) return { level: '나쁨', color: 'text-orange-400', bgColor: 'bg-orange-400/20' }
    return { level: '매우나쁨', color: 'text-red-400', bgColor: 'bg-red-400/20' }
  }

  const aqiStatus = getAQIStatus(airQualityData.pm25)

  return (
    <div
      className="flex flex-col self-stretch"
      style={{
        padding: '0',
        gap: '0',
        flex: '1 0 0',
        borderRadius: '12px',
        border: '1px solid #444',
        background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(10, 10, 20, 0.95))',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >

    </div>
  )
})

export default StationDetail_2