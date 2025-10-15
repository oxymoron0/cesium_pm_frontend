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