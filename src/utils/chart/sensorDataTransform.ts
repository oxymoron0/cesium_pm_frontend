import type { HourlyDataPoint, DailyDataPoint } from '@/utils/api/types'

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
}

/**
 * Transform hourly sensor data to chart format
 *
 * @param hourlyData - Array of hourly data points from API
 * @returns Transformed data for Recharts
 */
export function transformHourlyData(hourlyData: HourlyDataPoint[]): ChartDataPoint[] {
  return hourlyData.map(point => ({
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
  return dailyData.map(point => ({
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
    case 'today':
      // Format: "09:00"
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

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
