import type { HourlyDataPoint, DailyDataPoint, StationSensorApiData } from '@/utils/api/types'
import { normalizeToPercentage } from '@/utils/airQuality'

/**
 * Chart Data Point
 * Unified format for Recharts consumption
 */
export interface ChartDataPoint {
  time: string          // Formatted display label
  timestamp: string     // Original ISO timestamp
  pm10: number | null   // PM10 value
  pm25: number | null   // PM25 value
  voc: number | null    // VOCs value
  // 정규화된 값 (civil 모드에서 PM10+PM25 동시 표시용)
  pm10Normalized?: number | null
  pm25Normalized?: number | null
}

/**
 * Transform hourly sensor data to chart format
 *
 * @param hourlyData - Array of hourly data points from API
 * @returns Transformed data for Recharts
 */
export function transformHourlyData(hourlyData: HourlyDataPoint[]): ChartDataPoint[] {
  // Sort by timestamp first, then transform
  const sorted = [...hourlyData].sort((a, b) =>
    new Date(a.hour).getTime() - new Date(b.hour).getTime()
  )

  return sorted.map(point => ({
    time: formatTimeLabel(point.hour, 'today'),
    timestamp: point.hour,
    pm10: point.average_readings.pm,
    pm25: point.average_readings.fpm,
    voc: point.average_readings.voc
  }))
}

/**
 * Transform daily sensor data to chart format
 *
 * @param dailyData - Array of daily data points from API
 * @returns Transformed data for Recharts
 */
export function transformDailyData(dailyData: DailyDataPoint[]): ChartDataPoint[] {
  // Sort by timestamp first, then transform
  const sorted = [...dailyData].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return sorted.map(point => ({
    time: formatTimeLabel(point.date, 'week'),
    timestamp: point.date,
    pm10: point.average_readings.pm,
    pm25: point.average_readings.fpm,
    voc: point.average_readings.voc
  }))
}

/**
 * Format ISO timestamp for display
 *
 * @param isoString - ISO 8601 timestamp
 * @param period - Time period context
 * @returns Formatted label string
 */
export function formatTimeLabel(isoString: string, period: 'today' | 'week' | 'month'): string {
  const date = new Date(isoString)

  switch (period) {
    case 'today': {
      // 오늘 자정 (00:00) 계산
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

      // 오늘 자정 이전 데이터는 날짜 포함 (예: "10/01 11:00")
      if (date < todayStart) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hour = date.getHours().toString().padStart(2, '0')
        const minute = date.getMinutes().toString().padStart(2, '0')
        return `${month}/${day} ${hour}:${minute}`
      }

      // 오늘 데이터는 시간만 (예: "11:00")
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }

    case 'week':
    case 'month':
      // Format: "10/01"
      return date.toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit'
      }).replace(/\. /g, '/').replace(/\.$/, '')

    default:
      return isoString
  }
}

/**
 * Transform Latest sensor data to chart format
 *
 * @param latestData - Latest sensor data from API
 * @returns Single chart data point
 */
export function transformLatestDataToChartPoint(latestData: StationSensorApiData): ChartDataPoint {
  return {
    time: formatTimeLabel(latestData.recorded_at, 'today'),
    timestamp: latestData.recorded_at,
    pm10: latestData.sensor_data.pm,
    pm25: latestData.sensor_data.fpm,
    voc: latestData.sensor_data.voc
  }
}

/**
 * Merge hourly data with latest sensor reading
 * Prevents duplicate timestamps and ensures chronological order
 *
 * @param hourlyData - Hourly average data points
 * @param latestData - Latest sensor reading (optional)
 * @returns Combined and sorted chart data
 */
export function mergeHourlyWithLatest(
  hourlyData: ChartDataPoint[],
  latestData?: ChartDataPoint
): ChartDataPoint[] {
  if (!latestData) {
    return hourlyData
  }

  // Check if Latest timestamp already exists in Hourly data
  const latestExists = hourlyData.some(point =>
    new Date(point.timestamp).getTime() === new Date(latestData.timestamp).getTime()
  )

  // If Latest is duplicate, skip merging
  if (latestExists) {
    return hourlyData
  }

  // Merge and sort by timestamp
  const combined = [...hourlyData, latestData]
  return combined.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

/**
 * Daily Bar Chart Data Point
 * Format for DailyBarChart component
 */
export interface DailyBarDataPoint {
  date: string      // ISO date string
  dateLabel: string // MM.DD format
  dayOfWeek: string // 요일 (일/월/화/수/목/금/토)
  value: number
}

/**
 * Get Korean day of week
 *
 * @param date - Date object
 * @returns Korean day of week string
 */
function getKoreanDayOfWeek(date: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[date.getDay()]
}

/**
 * Transform daily data to bar chart format with date labels and day of week
 *
 * @param dailyData - Array of daily data points from API
 * @param sensorType - 'pm' (PM10), 'fpm' (PM25), or 'voc'
 * @returns Transformed data for DailyBarChart
 */
export function transformDailyDataToBarChart(
  dailyData: DailyDataPoint[],
  sensorType: 'pm' | 'fpm' | 'voc'
): DailyBarDataPoint[] {
  // Sort by timestamp first, then transform
  const sorted = [...dailyData].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return sorted.map(point => {
    const date = new Date(point.date)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const dateLabel = `${month}.${day}`
    const dayOfWeek = getKoreanDayOfWeek(date)

    return {
      date: point.date,
      dateLabel,
      dayOfWeek,
      value: point.average_readings[sensorType]
    }
  })
}

/**
 * Get Y-axis domain based on sensor values
 *
 * @param data - Chart data points
 * @param sensorType - 'pm10' | 'pm25' | 'voc'
 * @returns [min, max] domain for Y-axis
 */
export function getYAxisDomain(
  data: ChartDataPoint[],
  sensorType: 'pm10' | 'pm25' | 'voc'
): [number, number] {
  const values = data
    .map(point => point[sensorType])
    .filter((val): val is number => val !== null)

  if (values.length === 0) return [0, 100]

  const max = Math.max(...values)
  const min = Math.min(...values)

  // Add 10% padding
  const padding = (max - min) * 0.1

  return [
    Math.max(0, Math.floor(min - padding)),
    Math.ceil(max + padding)
  ]
}

/**
 * 차트 데이터에 정규화된 값 추가
 * Civil 모드에서 PM10과 PM25를 동시에 표시할 때 사용
 *
 * @param data - 원본 차트 데이터 배열
 * @returns 정규화된 값이 추가된 차트 데이터
 */
export function normalizeChartData(data: ChartDataPoint[]): ChartDataPoint[] {
  return data.map(point => ({
    ...point,
    pm10Normalized: point.pm10 !== null
      ? normalizeToPercentage('pm10', point.pm10)
      : null,
    pm25Normalized: point.pm25 !== null
      ? normalizeToPercentage('pm25', point.pm25)
      : null
  }))
}
