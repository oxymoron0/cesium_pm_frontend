# PM Backend API Reference - Frontend Development

**Base URL**: `http://services.leorca.org:8088`
**Total APIs**: 40개 엔드포인트 (실제 사용: 28개, 테스트용: 12개)
**Status**: 모든 API 동작 확인 완료

---

## 1. Health & Documentation (3개)

```bash
GET /health
GET /ping
GET /swagger/index.html
```

---

## 2. Bus Trajectory (6개)

### 전체 버스 궤적 데이터
```typescript
GET /api/v1/buses/trajectory/initial
GET /api/v1/buses/trajectory/latest

interface BusTrajectoryResponse {
  status: "success";
  data: Array<{
    vehicle_number: string;
    route_name: string;
    positions: Array<{
      work_id: string;
      vehicle_number: string;
      route_name: string;
      recorded_at: string;
      position: {
        longitude: number;
        latitude: number;
      };
      sensor_data: {
        humidity: number;
        temperature: number;
        voc: number;
        co2: number;
        pm: number;
        fpm: number;
      };
    }>;
  }>;
  meta: {
    total_buses: number;
    total_records: number;
    last_updated: string;
  };
}
```

### 개별 조회
```bash
GET /api/v1/buses/trajectory/vehicle/{vehicle_number}
GET /api/v1/buses/trajectory/route/{route_name}
GET /api/v1/buses/active-routes
GET /api/v1/buses/trajectory/validation
```

---

## 3. Sensor Data (11개)

### 개별 센서 데이터
```typescript
GET /api/v1/sensor-data/{work_id}
GET /api/v1/sensor-data/latest/{vehicle_number}
GET /api/v1/sensor-data/recent/{vehicle_number}
GET /api/v1/sensor-data/live/{vehicle_number}

interface SensorReading {
  work_id: string;
  sensor_id: string;
  vehicle_number: string;
  route_name: string;
  recorded_at: string;
  humidity: number;
  temperature: number;
  voc: number;
  co2: number;
  pm: number;
  fpm: number;
}
```

### 노선별/전체 센서 데이터
```bash
GET /api/v1/sensor-data/route/{route_name}
GET /api/v1/sensor-data/vehicles
GET /api/v1/sensor-data/stations/latest-all
```

### 정거장별 통계 ⚠️
```typescript
GET /api/v1/sensor-data/stations/{station_id}/daily?days=7    # ✅ 사용 가능
GET /api/v1/sensor-data/stations/{station_id}/hourly?hours=24 # ❌ 많은 정거장에 데이터 없음
GET /api/v1/sensor-data/stations/{station_id}/summary         # ❌ 서버 오류

interface StationSensorData {
  status: "success";
  data: {
    station_id: string;
    route_name: string;
    station_name: string;
    daily_data: Array<{
      date: string;
      average_readings: SensorReading;
      created_at: string;
    }>;
  };
  meta: {
    period_start: string;
    period_end: string;
    total_data_points: number;
  };
}
```

---

## 4. Route Information (4개)

### 노선 기본 정보
```typescript
GET /api/v1/route/getInfo

interface RouteInfoResponse {
  routes: Array<{
    route_name: string;  // "10", "31", "44", "167"
    origin: string;
    destination: string;
  }>;
  total: number;
}
```

### 노선 지오메트리
```typescript
GET /api/v1/route/geom/{route_name}

interface RouteGeometry {
  route_name: string;
  inbound: {
    type: "LineString";
    coordinates: Array<[number, number, number]>; // [lng, lat, elevation]
  };
  outbound: {
    type: "LineString";
    coordinates: Array<[number, number, number]>;
  };
}
```

### 정거장 정보
```typescript
GET /api/v1/route/stations/{route_name}?direction=inbound|outbound
GET /api/v1/route/stations/search?q={query}

interface RouteStationsResponse {
  type: "FeatureCollection";
  route_name: string;
  direction: "inbound" | "outbound";
  direction_name: string;
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      route_name: string;
      station_id: string;
      station_order: number;
      station_name: string;
      station_name_eng?: string;
      city: string;
      county_district?: string;
      dong?: string;
      ars_id?: string;
    };
  }>;
  total: number;
}
```

---

## 5. Station APIs (12개) - **테스트용 - 사용 금지**

⚠️ **개발용 테스트 API - 프로덕션에서 사용하지 말 것**
- 24,253개 테스트 레코드
- 실제 서비스와 무관한 데이터

---

## 6. Vulnerability Data (4개)

### 취약계층 시설 데이터
```typescript
GET /api/v1/vulnerabilities/senior?limit=50
GET /api/v1/vulnerabilities/childcare?limit=50
GET /api/v1/vulnerabilities/statistics

interface SeniorCenter {
  id: number;
  dong: string;
  name: string;
  road_address: string;
  lot_address: string;
  geom?: {
    longitude: number;
    latitude: number;
  };
}

interface ChildcareCenter {
  id: number;
  type: "국공립" | "민간" | "가정" | "직장" | "법인·단체등" | "사회복지법인" | "협동";
  name: string;
  address: string;
  geom?: {
    longitude: number;
    latitude: number;
  };
}

interface VulnerabilityStats {
  senior_centers: {
    total: 270;
    with_geometry: 266;
    completion_rate: 98.52;
  };
  childcare_centers: {
    total: 129;
    with_geometry: 123;
    completion_rate: 95.35;
  };
  grand_total: 399;
}
```

### 시설 검색 ⚠️
```bash
GET /api/v1/vulnerabilities/getFacilities  # radius 파라미터 필요
```

---

## 개발 시 주의사항

### 1. 에러 응답 형식
```typescript
interface ApiError {
  status: "error";
  error: string;
  details?: string;
}
```

### 2. 데이터 없는 경우
- Sensor hourly 통계: 많은 정거장에 데이터 없음
- Vulnerability 지오메트리: 약 2-5% 시설에 좌표 없음

### 3. 파라미터 주의사항
- Station search: `q` 파라미터 사용 (query 아님)
- Route stations: `direction` 파라미터 필수
- 일부 APIs는 파라미터 형식 확인 필요

### 4. 좌표계
- WGS84 (EPSG:4326)
- 부산 지역: 경도 128°-130°, 위도 35°-36°

---

## 빠른 시작 예제 (실제 서비스 API만 사용)

```typescript
// 1. 노선 정보 로드
const routes = await fetch('/api/v1/route/getInfo').then(r => r.json());

// 2. 특정 노선 지오메트리 로드
const geom = await fetch('/api/v1/route/geom/167').then(r => r.json());

// 3. 정거장 로드 (Route API 사용)
const stations = await fetch('/api/v1/route/stations/167?direction=inbound').then(r => r.json());

// 4. 실시간 버스 위치
const buses = await fetch('/api/v1/buses/trajectory/latest').then(r => r.json());

// 5. 센서 데이터
const sensors = await fetch('/api/v1/sensor-data/stations/latest-all').then(r => r.json());

// ❌ Station APIs (/api/v1/stations/*) 사용 금지 - 테스트용
```