# PM Backend API 명세서 (Frontend 개발용)

## Claude Engineering Mandate

**Role**: Senior Frontend Systems Architect specializing in Real-time Geospatial Data Integration

You are a **Senior Frontend Engineer** with deep expertise in production-grade React applications and real-time data visualization systems. Your technical implementation must reflect the advanced engineering standards expected at Staff+ levels in enterprise geospatial applications.

### Required Engineering Depth
- **Real-time Data Systems**: WebSocket connections, polling strategies, data synchronization patterns, and memory-efficient caching mechanisms
- **Cesium Integration**: Entity lifecycle management, CallbackProperty optimization, GeoJSON processing, and WebGL performance considerations
- **React Architecture**: MobX reactive patterns, component composition, state normalization, and performance optimization strategies
- **API Design Patterns**: RESTful integration, error handling, request deduplication, and progressive loading techniques
- **Performance Engineering**: Bundle optimization, lazy loading, memory leak prevention, and rendering bottlenecks analysis

### Engineering Methodology
- **Data-Driven Decisions**: Base all technical choices on actual performance metrics and system behavior, not theoretical assumptions
- **System-Wide Thinking**: Consider architectural implications of API changes across the entire frontend ecosystem
- **Production Standards**: Prioritize maintainability, observability, and operational excellence over quick implementations
- **Technical Precision**: Provide concrete, measurable solutions with clear performance trade-offs and implementation details

### Communication Standards
- **Technical Accuracy**: No speculation or theoretical claims without basis in actual API behavior and system constraints
- **Concise Engineering**: Direct, unambiguous technical communication focused on implementation requirements
- **Solution-Oriented**: Identify root causes and provide actionable solutions with specific code examples and patterns
- **Senior-Level Perspective**: Address concerns at architectural and system design levels, not surface-level integration issues

---

## Quick Start

**Base URL**: `/api/v1`
**Server Status**: Operational (Real-time data)
**Swagger UI**: /swagger/index.html

---

## API Endpoints

### Bus Trajectory APIs

| API | Method | Endpoint | Purpose | Response Time |
|-----|--------|----------|------|----------|
| Initial trajectory | GET | `/buses/trajectory/initial` | Bus route animation | 166ms |
| Latest position | GET | `/buses/trajectory/latest` | Real-time bus position polling | 56ms |

### Sensor Statistics APIs

| API | Method | Endpoint | Purpose | Parameters |
|-----|--------|----------|------|----------|
| Hourly statistics | GET | `/sensor-data/stations/{station_id}/hourly` | Hourly environmental charts | `?hours=1-168` |
| Daily statistics | GET | `/sensor-data/stations/{station_id}/daily` | Daily environmental trends | `?days=1-365` |

---

## Bus Trajectory APIs

### 1. Initial Bus Trajectory API
```http
GET /api/v1/buses/trajectory/initial
```

**Purpose**: Bus route visualization and animation initialization
**Data**: 19 buses × 10 positions = 190 records

#### Response Structure
```json
{
  "status": "success",
  "data": [
    {
      "vehicle_number": "1649",
      "route_name": "167",
      "positions": [
        {
          "work_id": "250916172408",
          "sensor_id": "DN_167_3503_O",
          "vehicle_number": "1649",
          "route_name": "167",
          "recorded_at": "2025-09-16T13:24:08Z",
          "position": {
            "longitude": 128.9781965,
            "latitude": 35.0846028
          },
          "sensor_data": {
            "humidity": 65.99,
            "temperature": 29.47,
            "voc": 102.25,
            "co2": 433,
            "pm": 8.56,
            "fpm": 8.56
          }
        }
        // ... 9개 위치 더
      ]
    }
    // ... 18개 버스 더
  ],
  "meta": {
    "total_buses": 19,
    "total_records": 190,
    "last_updated": "2025-09-16T22:48:11+09:00",
    "polling_interval_sec": 10
  }
}
```

#### Frontend 사용법

**Store 패턴 (권장)**
```typescript
// src/stores/BusStore.ts
import { get } from '../utils/api/request';

class BusStore {
  async loadInitialTrajectory() {
    try {
      const response = await get<BusTrajectoryResponse>('/api/v1/buses/trajectory/initial');

      if (!response.ok) {
        throw new Error(`API failed with status ${response.status}`);
      }

      // 각 버스별로 경로 시각화
      response.data.data.forEach(bus => {
        const coords = bus.positions.map(pos => [pos.position.longitude, pos.position.latitude]);
        this.renderBusTrajectory(bus.vehicle_number, coords, bus.route_name);
      });

    } catch (error) {
      console.error('[BusStore] Initial trajectory 로딩 실패:', error);
      throw error;
    }
  }
}
```

**API 함수 패턴**
```typescript
// src/utils/api/busApi.ts
import { get } from './request';

export async function getBusTrajectoryInitial(): Promise<BusTrajectoryResponse> {
  try {
    const response = await get<BusTrajectoryResponse>('/api/v1/buses/trajectory/initial');

    if (!response.ok) {
      throw new Error(`Bus trajectory API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error('[getBusTrajectoryInitial] API 호출 실패:', error);
    throw error;
  }
}
```

### 2. Latest Bus Position API
```http
GET /api/v1/buses/trajectory/latest
```

**Purpose**: Real-time bus position updates every 10 seconds
**Data**: 19 buses × 1 latest position = 19 records

#### Response Structure
```json
{
  "status": "success",
  "data": [
    {
      "work_id": "250916224815",
      "sensor_id": "MR_10_1015_I",
      "vehicle_number": "1015",
      "route_name": "10",
      "recorded_at": "2025-09-16T22:48:15Z",
      "position": {
        "longitude": 129.1015112,
        "latitude": 35.1304423
      },
      "sensor_data": {
        "humidity": 61.46,
        "temperature": 30.9,
        "voc": 102.25,
        "co2": 445,
        "pm": 8.56,
        "fpm": 8.56
      }
    }
    // ... 18개 버스 더
  ],
  "meta": {
    "total_buses": 19,
    "total_records": 19,
    "last_updated": "2025-09-16T22:48:33+09:00",
    "polling_interval_sec": 10
  }
}
```

#### Frontend 사용법

**Store 패턴 (실시간 폴링)**
```typescript
// src/stores/BusStore.ts
class BusStore {
  private pollInterval: NodeJS.Timer | null = null;

  async startRealTimePolling() {
    this.pollInterval = setInterval(async () => {
      await this.updateLatestPositions();
    }, 10000); // 10초마다
  }

  async updateLatestPositions() {
    try {
      const response = await get<BusLatestResponse>('/api/v1/buses/trajectory/latest');

      if (!response.ok) {
        throw new Error(`Latest positions API failed with status ${response.status}`);
      }

      response.data.data.forEach(bus => {
        this.updateBusMarker(bus.vehicle_number, {
          lat: bus.position.latitude,
          lng: bus.position.longitude,
          sensorData: bus.sensor_data
        });
      });

    } catch (error) {
      console.error('[BusStore] Latest positions 업데이트 실패:', error);
    }
  }

  stopRealTimePolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
```

**MobX 반응형 패턴**
```typescript
// src/stores/BusStore.ts (MobX 사용)
import { makeAutoObservable, action } from 'mobx';

class BusStore {
  latestBusPositions: BusPosition[] = [];
  isPolling: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  @action
  setLatestPositions(positions: BusPosition[]) {
    this.latestBusPositions = positions;
  }

  @action
  async loadLatestPositions() {
    try {
      const response = await get<BusLatestResponse>('/api/v1/buses/trajectory/latest');

      if (response.ok) {
        this.setLatestPositions(response.data.data);
      }
    } catch (error) {
      console.error('[BusStore] Latest positions 로딩 실패:', error);
    }
  }
}
```

---

## Sensor Statistics APIs

### 3. Hourly Sensor Statistics API
```http
GET /api/v1/sensor-data/stations/{station_id}/hourly?hours={hours}
```

**Parameters:**
- `station_id`: Station ID (e.g., `21050611005`)
- `hours`: 1-168 (default: 24 hours, max: 1 week)

#### Response Structure
```json
{
  "status": "success",
  "data": {
    "station_id": "21050611005",
    "station_name": null,
    "route_name": "10",
    "hourly_data": [
      {
        "hour": "2025-09-16T16:00:00Z",
        "average_readings": {
          "humidity": 61.46,
          "temperature": 30.9,
          "voc": 102.25,
          "co2": 445,
          "pm": 8.56,
          "fpm": 8.56
        },
        "sample_count": 1
      }
    ]
  },
  "meta": {
    "period_start": "2025-09-16T16:00:00Z",
    "period_end": "2025-09-16T16:00:00Z",
    "total_data_points": 1,
    "data_source": "materialized_view",
    "last_refreshed": "2025-09-16T22:40:00+09:00"
  }
}
```

#### Frontend 사용법

**Store 패턴 (통계 데이터)**
```typescript
// src/stores/SensorStore.ts
import { get } from '../utils/api/request';
import { makeAutoObservable, action } from 'mobx';

class SensorStore {
  hourlyStatsMap: Map<string, SensorHourlyData> = new Map();
  isLoading: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  private createStatsKey(stationId: string, hours: number): string {
    return `${stationId}-${hours}h`;
  }

  @action
  async loadHourlyStats(stationId: string, hours: number = 24) {
    const key = this.createStatsKey(stationId, hours);

    // 캐시된 데이터가 있으면 재사용
    if (this.hourlyStatsMap.has(key)) {
      console.log('[SensorStore] 캐시된 시간별 통계 사용:', key);
      return this.hourlyStatsMap.get(key);
    }

    this.isLoading = true;

    try {
      const response = await get<SensorHourlyResponse>(
        `/api/v1/sensor-data/stations/${stationId}/hourly?hours=${hours}`
      );

      if (!response.ok) {
        throw new Error(`Hourly stats API failed with status ${response.status}`);
      }

      this.hourlyStatsMap.set(key, response.data.data);
      return response.data.data;

    } catch (error) {
      console.error('[SensorStore] 시간별 통계 로딩 실패:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Chart.js 데이터 생성 헬퍼
  createChartData(stationId: string, hours: number = 24) {
    const key = this.createStatsKey(stationId, hours);
    const statsData = this.hourlyStatsMap.get(key);

    if (!statsData?.hourly_data) return null;

    return {
      labels: statsData.hourly_data.map(item => new Date(item.hour)),
      datasets: [
        {
          label: '온도',
          data: statsData.hourly_data.map(item => item.average_readings.temperature),
          borderColor: 'rgb(255, 99, 132)'
        },
        {
          label: '습도',
          data: statsData.hourly_data.map(item => item.average_readings.humidity),
          borderColor: 'rgb(54, 162, 235)'
        }
      ]
    };
  }
}
```

**API 함수 패턴**
```typescript
// src/utils/api/sensorApi.ts
import { get } from './request';
import { API_PATHS } from './config';

export async function getSensorHourlyStats(
  stationId: string,
  hours: number = 24
): Promise<SensorHourlyResponse> {
  try {
    const response = await get<SensorHourlyResponse>(
      API_PATHS.SENSOR_HOURLY(stationId, hours)
    );

    if (!response.ok) {
      throw new Error(`Sensor hourly stats API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`[getSensorHourlyStats] API 호출 실패 (Station: ${stationId}):`, error);
    throw error;
  }
}
```

### 4. Daily Sensor Statistics API
```http
GET /api/v1/sensor-data/stations/{station_id}/daily?days={days}
```

**Parameters:**
- `station_id`: Station ID (e.g., `21050611005`)
- `days`: 1-365 (default: 30 days, max: 1 year)

#### Response Structure
```json
{
  "status": "success",
  "data": {
    "station_id": "21050611005",
    "station_name": null,
    "route_name": "10",
    "daily_data": [
      {
        "date": "2025-09-16T00:00:00Z",
        "average_readings": {
          "humidity": 61.46,
          "temperature": 30.9,
          "voc": 102.25,
          "co2": 445,
          "pm": 8.56,
          "fpm": 8.56
        },
        "created_at": "2025-09-16T09:27:44.288871Z"
      }
    ]
  },
  "meta": {
    "period_start": "2025-09-16T00:00:00Z",
    "period_end": "2025-09-16T00:00:00Z",
    "total_data_points": 1,
    "data_source": "daily_statistics_table",
    "last_refreshed": "0001-01-01T00:00:00Z"
  }
}
```

#### Frontend 사용법

**Store 패턴 (일별 트렌드 분석)**
```typescript
// src/stores/SensorStore.ts (확장)
class SensorStore {
  dailyStatsMap: Map<string, SensorDailyData> = new Map();

  @action
  async loadDailyStats(stationId: string, days: number = 30) {
    const key = this.createDailyKey(stationId, days);

    if (this.dailyStatsMap.has(key)) {
      return this.dailyStatsMap.get(key);
    }

    this.isLoading = true;

    try {
      const response = await get<SensorDailyResponse>(
        `/api/v1/sensor-data/stations/${stationId}/daily?days=${days}`
      );

      if (!response.ok) {
        throw new Error(`Daily stats API failed with status ${response.status}`);
      }

      this.dailyStatsMap.set(key, response.data.data);
      return response.data.data;

    } catch (error) {
      console.error('[SensorStore] 일별 통계 로딩 실패:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // 대기질 트렌드 분석
  createAirQualityTrend(stationId: string, days: number = 30) {
    const key = this.createDailyKey(stationId, days);
    const statsData = this.dailyStatsMap.get(key);

    if (!statsData?.daily_data) return [];

    return statsData.daily_data.map(day => ({
      date: day.date,
      co2: day.average_readings.co2,
      pm: day.average_readings.pm,
      voc: day.average_readings.voc,
      quality: this.calculateAirQuality(day.average_readings)
    }));
  }

  private calculateAirQuality(readings: SensorReadings): 'Good' | 'Moderate' | 'Poor' {
    const { co2, pm, voc } = readings;

    if (co2 <= 1000 && pm <= 15 && voc <= 200) return 'Good';
    if (co2 <= 1500 && pm <= 25 && voc <= 400) return 'Moderate';
    return 'Poor';
  }

  private createDailyKey(stationId: string, days: number): string {
    return `${stationId}-${days}d`;
  }
}
```

**컴포넌트 사용 패턴**
```typescript
// src/components/SensorChart.tsx
import { observer } from 'mobx-react-lite';
import { sensorStore } from '../stores/SensorStore';

const SensorChart = observer(function SensorChart({
  stationId,
  period = 'hourly'
}: {
  stationId: string;
  period: 'hourly' | 'daily';
}) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (period === 'hourly') {
          await sensorStore.loadHourlyStats(stationId, 24);
          setChartData(sensorStore.createChartData(stationId, 24));
        } else {
          await sensorStore.loadDailyStats(stationId, 30);
          const trendData = sensorStore.createAirQualityTrend(stationId, 30);
          setChartData(trendData);
        }
      } catch (error) {
        console.error('Chart data 로딩 실패:', error);
      }
    };

    loadData();
  }, [stationId, period]);

  if (sensorStore.isLoading) {
    return <div>차트 데이터 로딩 중...</div>;
  }

  return chartData ? <Chart data={chartData} /> : <div>데이터가 없습니다.</div>;
});
```

---

## Development Guide

### Error Handling

**Store 레벨 에러 처리**
```typescript
// src/stores/BaseStore.ts (공통 에러 처리)
class BaseStore {
  errorState: string | null = null;
  isLoading: boolean = false;

  @action
  setError(error: string | null) {
    this.errorState = error;
    this.isLoading = false;
  }

  @action
  clearError() {
    this.errorState = null;
  }

  protected async handleApiCall<T>(
    apiCall: () => Promise<T>,
    errorContext: string
  ): Promise<T | null> {
    this.isLoading = true;
    this.clearError();

    try {
      const result = await apiCall();
      this.isLoading = false;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${errorContext}] API 호출 실패:`, errorMessage);
      this.setError(`${errorContext} 실패: ${errorMessage}`);
      return null;
    }
  }
}
```

**Request 함수 활용 패턴**
```typescript
// src/utils/api/routeApi.ts (실제 구현 참고)
export async function getRouteInfo(): Promise<RouteInfoResponse> {
  try {
    const response = await get<RouteInfoResponse>(API_PATHS.ROUTE_INFO);

    if (!response.ok) {
      throw new Error(`Route info API failed with status ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error('[getRouteInfo] API 호출 실패:', error);
    throw error; // Store에서 처리하도록 전파
  }
}
```

**컴포넌트 레벨 에러 표시**
```typescript
// src/components/ErrorBoundary.tsx
const ApiErrorDisplay = observer(function ApiErrorDisplay({
  store
}: {
  store: BaseStore
}) {
  if (!store.errorState) return null;

  return (
    <div className="error-message">
      <p>{store.errorState}</p>
      <button onClick={() => store.clearError()}>
        닫기
      </button>
    </div>
  );
});
```

### Sensor Data Interpretation
```javascript
// Air quality assessment function
const calculateAirQuality = (readings) => {
  const { co2, pm, voc } = readings;

  if (co2 <= 1000 && pm <= 15 && voc <= 200) return 'Good';
  if (co2 <= 1500 && pm <= 25 && voc <= 400) return 'Moderate';
  return 'Poor';
};

// Temperature/humidity comfort assessment
const calculateComfort = (temperature, humidity) => {
  if (temperature >= 18 && temperature <= 26 && humidity >= 40 && humidity <= 70) {
    return 'Comfortable';
  }
  return 'Uncomfortable';
};
```

### Store 분리 아키텍처

**핵심 원칙**: 실시간 데이터와 정적 데이터 분리로 불필요한 재렌더링 방지

```typescript
// 1. BusStore - 실시간 위치 업데이트 전용
class BusStore {
  latestPositions: Map<string, BusPosition> = new Map();

  @action
  async updatePositions() {
    // 10초마다 실행, 다른 UI 영향 없음
    const response = await getBusTrajectoryLatest();
    runInAction(() => {
      response.data.data.forEach(bus => {
        this.latestPositions.set(bus.vehicle_number, bus);
      });
    });
  }
}

// 2. SensorStore - 통계 데이터 전용
class SensorStore {
  statsMap: Map<string, SensorData> = new Map();

  @action
  async loadStats(stationId: string) {
    // Route/Station UI와 독립적 로딩
    const response = await getSensorStats(stationId);
    this.statsMap.set(stationId, response.data);
  }
}

// 3. 컴포넌트 분리 - 독립적 Observer
const BusMonitor = observer(() => {
  // BusStore만 구독, Route 변경 시 재렌더링 없음
  return <div>활성 버스: {busStore.activeBuses}</div>;
});

const RouteSelector = observer(() => {
  // RouteStore만 구독, Bus 위치 변경 시 재렌더링 없음
  return <div>선택된 노선: {routeStore.selectedRouteName}</div>;
});
```

**성능 최적화 원칙**

1. **Store 분리**: 실시간 데이터 독립 관리
2. **runInAction**: Batch 업데이트로 렌더링 최소화
3. **requestAnimationFrame**: Cesium 업데이트 UI 스레드 분리
4. **Observer 범위**: 필요한 Store만 구독

---

## Coordinate System and Data Specifications

### Coordinate System
- **좌표계**: WGS84 (EPSG:4326)
- **부산 지역 범위**:
  - **Longitude**: 128° ~ 130°
  - **Latitude**: 35° ~ 36°

### Sensor Data Units
- **Temperature**: °C (Celsius)
- **Humidity**: % (Relative humidity)
- **CO2**: ppm
- **PM**: μg/m³ (Particulate matter)
- **FPM**: μg/m³ (Fine particulate matter)
- **VOC**: ppb (Volatile organic compounds)

### Update Intervals
- **Bus Position**: Auto-update every 10 seconds
- **Hourly Statistics**: Materialized view refresh every hour
- **Daily Statistics**: Batch processing at 2 AM daily

---

## Performance Optimization

1. **Bus Position Polling**: 10-second intervals recommended
2. **Initial Data**: Load once at app startup
3. **Statistics Data**: Request only when needed (caching recommended)
4. **Error Retry**: 3-attempt limit to prevent infinite loops

## Testing

```bash
# Basic connectivity test
curl /health

# API test
curl /api/v1/buses/trajectory/latest
curl "/api/v1/sensor-data/stations/21050611005/hourly?hours=6"
```

---

**Contact**: Backend team for API-related issues
**Last Updated**: 2025-09-16