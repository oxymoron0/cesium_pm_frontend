# PM Backend API Specification

## Configuration

**Base URL**: `/api/v1`
**Health Check**: `/health`
**Documentation**: `/swagger/index.html`

## Core APIs

### Bus Trajectory
- `GET /api/v1/buses/trajectory/initial` - Complete trajectory data (19 buses × 10 positions)
- `GET /api/v1/buses/trajectory/latest` - Current positions (19 buses, 10s polling)

### Sensor Data
- `GET /api/v1/sensor-data/stations/{station_id}/hourly?hours=1-168` - Hourly statistics
- `GET /api/v1/sensor-data/stations/{station_id}/daily?days=1-60` - Daily trends (default: 30 days)
- `GET /api/v1/sensor-data/stations/latest-all` - Current readings (373 stations)

### Route Information
- `GET /api/v1/route/getInfo` - Route metadata (4 routes)
- `GET /api/v1/route/geom/{route_name}` - GeoJSON LineString geometry
- `GET /api/v1/route/stations/{route_name}?direction=inbound|outbound` - Station points

### Simulation
- `POST /api/v1/simulation/process` - Submit simulation request (queued processing)
- `GET /api/v1/simulation/list?page=1&limit=7&user_id=&include_private=false` - Paginated list
- `GET /api/v1/simulation/{uuid}` - Simulation details by UUID
- `POST /api/v1/simulation/callback` - Webhook callback (internal use)

### Testing (Development Only)
- `POST /api/v1/test/simulation` - Mock external simulation API
- `POST /api/v1/test/complete-all` - Complete all pending simulations

---

## Response Formats

### Bus Trajectory Response
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
      ]
    }
  ],
  "meta": {
    "total_buses": 19,
    "total_records": 190,
    "last_updated": "2025-09-16T22:48:11+09:00"
  }
}
```

### Route Geometry Response (GeoJSON)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[129.0403, 35.1160, 0], [129.0405, 35.1162, 0]]
      },
      "properties": {
        "route_name": "10",
        "direction": "inbound"
      }
    }
  ]
}
```

### Station Search Response
```json
{
  "type": "FeatureCollection",
  "query": "역",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [129.0796335, 35.19662561]
      },
      "properties": {
        "route_name": "10",
        "station_id": "50000002604",
        "station_order": 22,
        "station_name": "교대역",
        "ars_id": "13701"
      }
    }
  ],
  "total": 95,
  "page": 1,
  "limit": 3
}
```

### Sensor Data Response
```json
{
  "status": "success",
  "data": {
    "station_id": "21050611005",
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
        }
      }
    ]
  }
}
```

### Simulation Request (POST /api/v1/simulation/process)
```json
{
  "simulation_name": "Busan PM10 Test",
  "user": "leorca",
  "is_private": false,
  "timestamp": "2025-10-17T12:00:00Z",
  "lot": "부산광역시 부산진구 부전동 573-1",
  "road_name": "부산광역시 부산진구 중앙대로 지하730",
  "location": "Busan",
  "weather": {
    "wind_direction_1m": 180,
    "wind_speed_1m": 2.5,
    "wind_direction_10m": 185,
    "wind_speed_10m": 3.2,
    "humidity": 65.0,
    "sea_level_pressure": 1013.25,
    "temperature": 22.5
  },
  "air_quality": {
    "pm_type": "pm10",
    "stations": [
      {
        "station_name": "연제공용버스차고지",
        "location": { "longitude": 129.0531938, "latitude": 35.1852289 },
        "concentration": 45.5
      }
    ]
  }
}
```

### Simulation Response
```json
{
  "success": true,
  "message": "Simulation request queued successfully",
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "status": "대기",
    "position_in_queue": 3,
    "simulation_name": "Busan PM10 Test"
  }
}
```

### Simulation List Response
```json
{
  "simulations": [
    {
      "index": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "simulation_name": "Busan PM10 Test",
      "pm_type": "pm10",
      "requested_at": "2025-10-17T12:00:00Z",
      "status": "완료",
      "concentration": 45.5,
      "station_name": "연제공용버스차고지",
      "lot": "부산광역시 부산진구 부전동 573-1",
      "road_name": "부산광역시 부산진구 중앙대로 지하730",
      "weather": { "temperature": 22.5, "humidity": 65.0 }
    }
  ],
  "pagination": { "page": 1, "limit": 7, "total": 42, "total_pages": 6 }
}
```

## Frontend Integration

### Store Pattern
```typescript
// Bus position polling
class BusStore {
  async startPolling() {
    setInterval(() => this.updatePositions(), 10000);
  }

  async updatePositions() {
    const response = await get('/api/v1/buses/trajectory/latest');
    this.positions = response.data.data;
  }
}

// Sensor data caching
class SensorStore {
  async loadHourlyStats(stationId: string, hours = 24) {
    const key = `${stationId}-${hours}h`;
    if (this.cache.has(key)) return this.cache.get(key);

    const response = await get(`/api/v1/sensor-data/stations/${stationId}/hourly?hours=${hours}`);
    this.cache.set(key, response.data);
    return response.data;
  }
}

// Simulation management
class SimulationStore {
  @observable simulations: Simulation[] = [];
  @observable currentSimulation: Simulation | null = null;

  @action
  async createSimulation(request: SimulationRequest) {
    const response = await post('/api/v1/simulation/process', request);
    if (response.data.success) {
      await this.loadSimulations(); // Refresh list
      return response.data.data.uuid;
    }
    throw new Error(response.data.message);
  }

  @action
  async loadSimulations(userId?: string) {
    const response = await get('/api/v1/simulation/list', {
      params: { user_id: userId, page: 1, limit: 10 }
    });
    this.simulations = response.data.simulations;
  }

  @action
  async loadSimulation(uuid: string) {
    const response = await get(`/api/v1/simulation/${uuid}`);
    this.currentSimulation = response.data;
  }

  // Poll for status updates
  async monitorSimulation(uuid: string, onComplete: (result: Simulation) => void) {
    const interval = setInterval(async () => {
      await this.loadSimulation(uuid);
      if (this.currentSimulation?.status === '완료' || this.currentSimulation?.status === '실패') {
        clearInterval(interval);
        onComplete(this.currentSimulation);
      }
    }, 5000); // Poll every 5 seconds
  }
}
```

### API Functions
```typescript
// Route API
export async function getRouteGeometry(routeName: string) {
  const response = await get(`/api/v1/route/geom/${routeName}`);
  return response.data;
}

// Station API
export async function getRouteStations(routeName: string, direction: 'inbound' | 'outbound') {
  const response = await get(`/api/v1/route/stations/${routeName}?direction=${direction}`);
  return response.data;
}

// Simulation API
export async function createSimulation(request: SimulationRequest) {
  const response = await post('/api/v1/simulation/process', request);
  return response.data;
}

export async function listSimulations(params?: {
  page?: number;
  limit?: number;
  user_id?: string;
  include_private?: boolean;
}) {
  const query = new URLSearchParams(params as any).toString();
  const response = await get(`/api/v1/simulation/list?${query}`);
  return response.data;
}

export async function getSimulation(uuid: string) {
  const response = await get(`/api/v1/simulation/${uuid}`);
  return response.data;
}
```

## Error Handling

### Standard Error Response
```json
{
  "status": "error",
  "error": "Direction parameter is required (inbound or outbound)",
  "details": "route.direction.required"
}
```

### Error Patterns
```typescript
// API error handling
try {
  const response = await get('/api/v1/route/stations/10');
  if (!response.ok) {
    throw new Error(`API failed with status ${response.status}`);
  }
} catch (error) {
  console.error('API call failed:', error);
}

// Store error management
class BaseStore {
  errorState: string | null = null;

  protected async handleApiCall<T>(apiCall: () => Promise<T>): Promise<T | null> {
    try {
      return await apiCall();
    } catch (error) {
      this.errorState = error.message;
      return null;
    }
  }
}
```

## Data Specifications

### Coordinate System
- **WGS84 (EPSG:4326)**
- **Range**: Longitude 128°-130°, Latitude 35°-36°

### Sensor Units
- **Temperature**: °C | **Humidity**: %
- **CO2**: ppm | **PM/FPM**: μg/m³ | **VOC**: ppb

### Update Intervals
- **Bus Position**: 10s polling
- **Hourly Stats**: Hourly refresh
- **Daily Stats**: 2 AM batch processing

## Complete API Endpoints

### Health & Documentation
- `GET /health` - Service status
- `GET /ping` - Connectivity test
- `GET /swagger/*any` - API documentation

### Bus Trajectory (19 vehicles)
- `GET /api/v1/buses/trajectory/initial` - Complete trajectory data
- `GET /api/v1/buses/trajectory/latest` - Current positions
- `GET /api/v1/buses/trajectory/vehicle/{vehicle_number}` - Single vehicle
- `GET /api/v1/buses/trajectory/route/{route_name}` - Route buses
- `GET /api/v1/buses/active-routes` - Active route list
- `GET /api/v1/buses/trajectory/validation` - Data validation

### Sensor Data (373 stations)
- `GET /api/v1/sensor-data/{work_id}` - Single sensor record
- `GET /api/v1/sensor-data/latest/{vehicle_number}` - Latest vehicle data
- `GET /api/v1/sensor-data/recent/{vehicle_number}` - Recent vehicle data
- `GET /api/v1/sensor-data/route/{route_name}` - Route sensor data
- `GET /api/v1/sensor-data/live/{vehicle_number}` - Real-time data
- `GET /api/v1/sensor-data/vehicles` - Vehicle list
- `GET /api/v1/sensor-data/stations/{station_id}/hourly` - Hourly statistics
- `GET /api/v1/sensor-data/stations/{station_id}/daily` - Daily trends
- `GET /api/v1/sensor-data/stations/{station_id}/summary` - Statistical summary
- `GET /api/v1/sensor-data/stations/latest-all` - All station readings

### Route Information (4 routes: 10, 31, 44, 167)
- `GET /api/v1/route/getInfo` - Route metadata
- `GET /api/v1/route/geom/{route_name}` - GeoJSON geometry
- `GET /api/v1/route/stations/{route_name}` - Route stations (direction required)
- `GET /api/v1/route/stations/search` - Station search

### Vulnerability Data
- `GET /api/v1/vulnerabilities/senior` - Senior centers
- `GET /api/v1/vulnerabilities/childcare` - Childcare centers
- `GET /api/v1/vulnerabilities/getFacilities` - Facility search
- `GET /api/v1/vulnerabilities/statistics` - Facility statistics

### Simulation APIs
- `POST /api/v1/simulation/process` - Create simulation request
- `GET /api/v1/simulation/list` - List simulations (pagination)
- `GET /api/v1/simulation/{uuid}` - Get simulation details
- `POST /api/v1/simulation/callback` - Webhook (internal)
- `POST /api/v1/test/simulation` - Mock simulation API (dev)
- `POST /api/v1/test/complete-all` - Complete all pending (dev)

## TypeScript Types

### Simulation Types
```typescript
export interface SimulationRequest {
  simulation_name: string;
  user: string;
  is_private: boolean;
  timestamp: string; // ISO 8601
  lot: string;
  road_name: string;
  location: string;
  weather: WeatherData;
  air_quality: AirQualityData;
}

export interface WeatherData {
  wind_direction_1m: number; // 0-360 degrees
  wind_speed_1m: number; // m/s
  wind_direction_10m: number; // 0-360 degrees
  wind_speed_10m: number; // m/s
  humidity: number; // 0-100 %
  sea_level_pressure: number; // 900-1100 hPa
  temperature: number; // -50 to 60 °C
}

export interface AirQualityData {
  pm_type: 'pm10' | 'pm25';
  stations: StationMeasurement[];
}

export interface StationMeasurement {
  station_name: string;
  location: { longitude: number; latitude: number };
  concentration: number; // μg/m³
}

export interface Simulation {
  uuid: string;
  simulationName: string;
  userID: string;
  isPrivate: boolean;
  requestedAt: string;
  lot: string;
  roadName: string;
  location: string;
  status: '대기' | '진행중' | '완료' | '실패';
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  errorMessage: string;
  weatherData: WeatherData;
  airQualityData: AirQualityData;
  pmtype: string;
  firstStationConcentration: number;
  firstStationName: string;
  resultPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationListItem {
  index: number;
  uuid: string;
  simulation_name: string;
  pm_type: string;
  requested_at: string;
  status: string;
  concentration: number;
  station_name: string;
  lot: string;
  road_name: string;
  weather: WeatherData;
}
```

## Validation Rules

### Weather Data
- `wind_direction_1m`, `wind_direction_10m`: 0-360 degrees
- `wind_speed_1m`, `wind_speed_10m`: 0-100 m/s
- `humidity`: 0-100%
- `sea_level_pressure`: 900-1100 hPa
- `temperature`: -50 to 60°C

### Air Quality Data
- `pm_type`: "pm10" or "pm25"
- `concentration`: 0-10000 μg/m³
- `longitude`: -180 to 180
- `latitude`: -90 to 90

### Simulation Request
- `simulation_name`: max 200 characters
- `user`: max 50 characters, required
- `location`: max 100 characters, required
- `timestamp`: ISO 8601 format required