# PM Frontend - Technical Specification

**Version**: 2.1
**Last Updated**: 2025-10-02
**React Version**: 19.1.1
**Cesium Version**: 1.115.0
**Architecture**: Qiankun Microfrontend

---

## System Overview

React-based microfrontend application for geospatial bus route visualization using Cesium 3D rendering engine. Implements clean architecture patterns with MobX state management for real-time environmental monitoring and route tracking.

### Core Technologies
- **UI Framework**: React 19.1.1 with TypeScript 5.x
- **3D Rendering**: Cesium 1.115 for WebGL-based geospatial visualization
- **State Management**: MobX 6.x with reactive patterns
- **Data Visualization**: Recharts 3.2.1 for time-series charts
- **Build Tool**: Vite 7.x with optimized build pipeline
- **Styling**: Tailwind CSS 4.x with PostCSS prefixing for CSS isolation

### System Capabilities
- Real-time bus tracking with 3D visualization and HTML overlays
- Route geometry rendering with PostGIS LineString support
- Station management with direction-aware color coding
- Environmental sensor data visualization with circular progress indicators
- Time-series sensor data charts (hourly/daily/monthly)
- Air quality monitoring with modal-based detail views
- Microfrontend deployment with Qiankun integration

---

## Quick Start

### Development Commands
```bash
# Install dependencies
pnpm install

# Development server (SPA mode)
pnpm dev
# Access at http://localhost:5173

# Type checking
npx tsc --noEmit

# Code quality checks
pnpm lint

# Production build (UMD module)
VITE_PAGE=Monitoring pnpm build

# Build all pages
pnpm build
```

### Environment Setup
```bash
# Required Node.js version
node >= 18.0.0

# Package manager
pnpm >= 8.0.0

# Cesium viewer availability
window.cviewer must be initialized before app mount
```

---

## Project Structure

```
pm-frontend/
├── src/
│   ├── pages/                      # Page-level components (UMD modules)
│   │   ├── Monitoring/            # Main monitoring dashboard
│   │   │   ├── index.tsx          # Page entry point
│   │   │   ├── Monitoring.tsx     # Root component
│   │   │   └── components/        # Page-specific components
│   │   │       ├── AirQualityStatus/
│   │   │       │   ├── index.tsx              # Modal wrapper
│   │   │       │   ├── RouteDetail.tsx        # Route station list
│   │   │       │   ├── StationDetail.tsx      # Station sensor detail
│   │   │       │   ├── StationSensorMetric.tsx # Tab content renderers
│   │   │       │   └── RouteSelector.tsx      # Route selection
│   │   │       ├── Monitoring.tsx
│   │   │       ├── MonitoringPanel.tsx
│   │   │       └── StationInfo.tsx
│   │   └── SamplePage/            # Sample page template
│   │
│   ├── stores/                     # MobX state management
│   │   ├── RouteStore.ts          # Route data and selection state
│   │   ├── StationStore.ts        # Station data with dependency inversion
│   │   ├── StationDetailStore.ts  # AirQualityStatus modal state
│   │   ├── SensorSelectionStore.ts # User sensor type preferences
│   │   ├── StationSensorStore.ts  # Station sensor display management
│   │   ├── BusStore.ts            # Bus tracking and animation
│   │   └── VulnerabilityStore.ts  # Vulnerability data management
│   │
│   ├── utils/                      # Utility modules
│   │   ├── api/                   # API integration
│   │   │   ├── route.ts           # Route API calls
│   │   │   ├── station.ts         # Station API calls
│   │   │   ├── sensor.ts          # Sensor API calls
│   │   │   └── types.ts           # API type definitions
│   │   ├── cesium/                # Cesium 3D rendering
│   │   │   ├── routeRenderer.ts   # Route geometry rendering
│   │   │   ├── stationRenderer.ts # Station point rendering
│   │   │   ├── glbRenderer.ts     # Bus 3D model rendering
│   │   │   ├── dataSourceManager.ts  # DataSource lifecycle
│   │   │   └── cameraUtils.ts     # Camera control utilities
│   │   ├── airQuality/            # Air quality standards
│   │   │   └── index.ts           # Centralized standards
│   │   ├── chart/                 # Chart data transformation
│   │   │   └── sensorDataTransform.ts # Recharts data formatters
│   │   └── dateTime.ts            # Timezone conversion utilities
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── basic/                 # Basic UI components
│   │   │   ├── Panel.tsx          # Floating panel container
│   │   │   ├── Title.tsx          # Panel title bar
│   │   │   ├── Icon.tsx           # Icon wrapper
│   │   │   └── TabNavigation.tsx  # Tab navigation
│   │   ├── chart/                 # Chart components (Recharts)
│   │   │   ├── SensorLineChart.tsx     # Time-series line chart
│   │   │   ├── SensorTooltip.tsx       # Custom chart tooltip
│   │   │   ├── ChartController.tsx     # Sensor type selection
│   │   │   ├── ChartHeader.tsx         # Chart period header
│   │   │   ├── LineChartContainer.tsx  # Chart layout wrapper
│   │   │   └── StatsSummaryContainer.tsx # Statistics summary
│   │   └── service/               # Service-specific components
│   │       ├── sensor/
│   │       │   ├── SensorInfoContainer.tsx  # Circular progress sensor display
│   │       │   ├── AirQualityDisplay.tsx    # Air quality status
│   │       │   └── PM10Sensor.tsx / PM25Sensor.tsx / VOCSensor.tsx
│   │       ├── StationHtmlRenderer.tsx      # HTML overlay for stations
│   │       ├── StationSensorRenderer.tsx    # Sensor overlay renderer
│   │       └── BusHtmlRenderer.tsx          # Bus HTML overlay
│   │
│   ├── assets/                     # Static assets
│   │   ├── icons/                 # SVG icons
│   │   └── models/                # 3D models (GLB)
│   │
│   └── styles/                     # Global styles
│       └── index.css              # Tailwind base styles
│
├── public/                         # Public assets
│   └── CesiumViewer/              # Cesium viewer component
│       └── index.html             # Standalone viewer
│
├── vite.config.ts                  # Vite build configuration
├── postcss.config.js              # PostCSS with CSS prefixing
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── eslint.config.js               # ESLint configuration
├── package.json                   # Dependencies and scripts
└── pnpm-lock.yaml                 # Dependency lock file
```

---

## Architecture Implementation

### 1. Microfrontend Architecture

#### Qiankun Integration

**Lifecycle Hooks**:
```typescript
// src/pages/Monitoring/index.tsx
export async function bootstrap() {
  console.log('[Monitoring] Bootstrap')
}

export async function mount(props: any) {
  console.log('[Monitoring] Mount', props)
  const container = props.container
    ? props.container.querySelector('#root')
    : document.getElementById('root')

  if (container) {
    const root = ReactDOM.createRoot(container)
    root.render(
      <React.StrictMode>
        <div className="pm-frontend-scope">
          <App />
        </div>
      </React.StrictMode>
    )
  }
}

export async function unmount() {
  console.log('[Monitoring] Unmount')
  // Cleanup: Remove DataSources, event listeners, intervals
}
```

**Environment Detection**:
```typescript
const isQiankun = (window as any).__POWERED_BY_QIANKUN__
const parentViewer = (window as any).cviewer

if (isQiankun && parentViewer) {
  // Qiankun mode: Use parent viewer
  setCesiumStatus('ready')
} else {
  // Standalone mode: Wait for own viewer initialization
  waitForViewerInitialization()
}
```

#### Build Configuration

**Development Mode**: SPA with Vite dev server
```typescript
// vite.config.ts - Development
export default defineConfig({
  server: {
    port: 5173,
    open: true
  }
})
```

**Production Mode**: UMD module per page
```typescript
// vite.config.ts - Production
const pageName = process.env.VITE_PAGE || 'Monitoring'

export default defineConfig({
  build: {
    lib: {
      entry: `./src/pages/${pageName}/index.tsx`,
      formats: ['umd'],
      name: pageName,
      fileName: () => `${pageName}.umd.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
```

#### CSS Isolation

**PostCSS Configuration**:
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-prefix-selector': {
      prefix: '.pm-frontend-scope',
      exclude: [
        /^html/,
        /^body/,
        /^\*/,
        /^:root/,
        /^\.cesium-viewer-fullscreenContainer/,
        /^\.cesium-viewer/
      ]
    },
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

**Usage Pattern**:
```tsx
// All components wrapped in scope
<div className="pm-frontend-scope">
  <App />
</div>
```

---

### 2. State Management (MobX)

#### RouteStore - Primary State Authority

**Responsibilities**:
- Route data management (route_info, route_geom)
- Route selection state
- Data loading and caching

**Implementation**:
```typescript
import { makeAutoObservable } from 'mobx'

class RouteStore {
  // Observable state
  routeInfoList: RouteInfo[] = []
  routeGeomMap: Map<string, RouteGeom> = new Map()
  selectedRouteName: string | null = null
  isLoading: boolean = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  // Actions
  async initializeRouteData() {
    this.isLoading = true
    try {
      await this.loadRouteInfo()
      if (this.routeInfoList.length > 0) {
        await this.loadAllRouteGeometries()
      }
    } catch (error) {
      this.error = (error as Error).message
    } finally {
      this.isLoading = false
    }
  }

  setSelectedRoute(routeName: string) {
    this.selectedRouteName = routeName
  }

  clearSelection() {
    this.selectedRouteName = null
  }

  // Computed values
  get selectedRouteInfo(): RouteInfo | undefined {
    return this.routeInfoList.find(r => r.route_name === this.selectedRouteName)
  }

  getRouteGeom(routeName: string): RouteGeom | undefined {
    return this.routeGeomMap.get(routeName)
  }
}

export const routeStore = new RouteStore()
```

#### StationStore - Dependency Inversion Pattern

**Responsibilities**:
- Station data management per route-direction
- Station selection state (for Cesium rendering)
- Dependency on RouteStore for route context

**Implementation**: See existing code (unchanged from v2.0)

#### StationDetailStore - Modal State Management

**Purpose**: Independent state management for AirQualityStatus modal

**Responsibilities**:
- Modal visibility control
- Route and station selection within modal
- Station data caching per route

**Key Features**:
```typescript
class StationDetailStore {
  isModalOpen: boolean
  selectedRoute: string | null
  selectedStationId: string | null
  selectedStationName: string | null
  selectedDirection: 'inbound' | 'outbound' | null
  routeStationCache: Map<string, { inbound, outbound }>

  openModal() / closeModal()
  selectRoute(routeName)
  selectStation(stationId, stationName, routeName, direction, directionName)
  cacheRouteStations(routeName, data)
  getCachedRouteStations(routeName)
}
```

**Integration**: Separates modal UI state from Cesium rendering state

#### SensorSelectionStore - User Preference Management

**Purpose**: Persist sensor type selection across tabs and stations

**Responsibilities**:
- Track PM vs VOCs selection
- Track PM10 vs PM25 selection
- Provide computed selection state

**Implementation**:
```typescript
class SensorSelectionStore {
  selectedSensorType: 'PM' | 'VOCs' = 'PM'
  selectedPMType: 'PM10' | 'PM25' | null = null

  setSensorType(type: 'PM' | 'VOCs')
  togglePMType(type: 'PM10' | 'PM25')

  get isPMSelected(): boolean
  get isVOCsSelected(): boolean
  get isPM10Selected(): boolean
  get isPM25Selected(): boolean
}
```

**Usage**: Drives chart visibility and sensor icon highlighting

#### StationSensorStore - Sensor Display Management

**Purpose**: Manage sensor visibility on Cesium HTML overlays

**Responsibilities**:
- Track which stations show sensor data
- Manage hover state
- Load and cache API sensor data

**Key Methods**:
```typescript
class StationSensorStore {
  visibleStationIds: Set<string>
  sensorDataMap: Map<string, SensorData>
  hoveredStationId: string | null

  showSelectedRoute()  // Show sensors for current route
  clearAll()           // Hide all sensors
  setHoveredStation(stationId)
  loadSensorData()     // API integration
  isStationVisible(stationId): boolean
}
```

#### Observer Pattern

**Component Integration**:
```typescript
import { observer } from 'mobx-react-lite'

// Example 1: StationInfo with RouteStore + StationStore
const StationInfo = observer(function StationInfo() {
  const selectedRouteName = routeStore.selectedRouteName
  const selectedRouteInfo = routeStore.selectedRouteInfo

  if (!selectedRouteName || !selectedRouteInfo) {
    return <EmptyState message="노선을 먼저 선택해주세요." />
  }

  return (
    <Panel position="right" offset={96}>
      <TabNavigation
        tabs={[
          `${selectedRouteInfo.destination} 방면`,
          `${selectedRouteInfo.origin} 방면`
        ]}
        activeTab={stationStore.selectedDirection === 'inbound' ? 0 : 1}
        onTabChange={(index) =>
          stationStore.setSelectedDirection(index === 0 ? 'inbound' : 'outbound')
        }
      />
      <StationList stations={stationStore.currentStations} />
    </Panel>
  )
})

// Example 2: SensorLineChart with SensorSelectionStore
const SensorLineChart = observer(function SensorLineChart({ data }) {
  const isPMMode = sensorSelectionStore.isPMSelected
  const showPM10 = isPMMode && (sensorSelectionStore.selectedPMType === null || sensorSelectionStore.isPM10Selected)
  const showPM25 = isPMMode && (sensorSelectionStore.selectedPMType === null || sensorSelectionStore.isPM25Selected)

  return (
    <LineChart data={data}>
      <Line dataKey="pm10" hide={!showPM10} />
      <Line dataKey="pm25" hide={!showPM25} />
    </LineChart>
  )
})
```

**Key Pattern**: Observer components automatically re-render when observed store values change

---

### 3. Cesium 3D Rendering

#### DataSource Management

**Naming Convention**:
```typescript
const DATASOURCE_NAMES = {
  routes: 'routes',
  stations: `stations_${routeName}_${direction}`,
  focusedRoute: `focused_route`,
  busModels: 'bus_models',
  searchStations: 'search_stations'
}
```

**DataSource Utilities**:
```typescript
// Create DataSource with duplicate prevention
export async function createGeoJsonDataSource(
  name: string
): Promise<GeoJsonDataSource> {
  const viewer = (window as any).cviewer
  if (!viewer) {
    throw new Error('Cesium viewer not available')
  }

  // Check for existing DataSource
  const existing = viewer.dataSources.getByName(name)
  if (existing.length > 0) {
    console.log(`[DataSource] Reusing existing: ${name}`)
    return existing[0]
  }

  // Create new DataSource
  const dataSource = new GeoJsonDataSource(name)
  await viewer.dataSources.add(dataSource)
  console.log(`[DataSource] Created new: ${name}`)
  return dataSource
}

// Remove DataSource by name
export function removeDataSource(name: string): void {
  const viewer = (window as any).cviewer
  if (!viewer) return

  const dataSources = viewer.dataSources.getByName(name)
  dataSources.forEach((ds: DataSource) => {
    viewer.dataSources.remove(ds)
  })
}

// Clear all DataSources matching pattern
export function clearDataSourcesByPattern(pattern: string): void {
  const viewer = (window as any).cviewer
  if (!viewer) return

  const toRemove: DataSource[] = []
  for (let i = 0; i < viewer.dataSources.length; i++) {
    const ds = viewer.dataSources.get(i)
    if (ds.name.startsWith(pattern)) {
      toRemove.push(ds)
    }
  }

  toRemove.forEach(ds => viewer.dataSources.remove(ds))
}
```

#### Route Rendering

**GeoJSON to Cesium Entity**:
```typescript
export async function renderAllRoutes(): Promise<void> {
  const viewer = (window as any).cviewer
  if (!viewer) return

  // Get all route geometry data from store
  const allRouteGeoms = Array.from(routeStore.routeGeomMap.values())
  if (allRouteGeoms.length === 0) return

  // Create or reuse routes DataSource
  const dataSource = await createGeoJsonDataSource('routes')

  // Convert to GeoJSON FeatureCollection
  const featureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: allRouteGeoms.flatMap(routeGeom => [
      createRouteFeature(routeGeom, 'inbound'),
      createRouteFeature(routeGeom, 'outbound')
    ])
  }

  // Load all routes in single operation
  await dataSource.load(featureCollection)

  // Apply default styling
  dataSource.entities.values.forEach(entity => {
    if (entity.polygon) {
      entity.polygon.material = Color.fromCssColorString('#888888')
      entity.polygon.outlineColor = Color.fromCssColorString('#666666')
    }
  })
}

function createRouteFeature(
  routeGeom: RouteGeom,
  direction: 'inbound' | 'outbound'
): GeoJSON.Feature {
  const coordinates = parsePostGISLineString(
    direction === 'inbound' ? routeGeom.inbound : routeGeom.outbound
  )

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates
    },
    properties: {
      route_name: routeGeom.route_name,
      direction
    }
  }
}
```

#### Station Rendering

**Dynamic Entity Creation with CallbackProperty**:
```typescript
export async function renderStations(
  routeName: string,
  direction: 'inbound' | 'outbound'
): Promise<void> {
  const viewer = (window as any).cviewer
  if (!viewer) return

  const stationData = stationStore.getStationData(routeName, direction)
  if (!stationData) return

  const dataSource = await createGeoJsonDataSource(
    `stations_${routeName}_${direction}`
  )

  // Check for duplicate entities
  const existingIds = new Set(
    dataSource.entities.values.map(e => e.id)
  )

  stationData.features.forEach(feature => {
    const entityId = `station_${feature.properties.station_id}`
    if (existingIds.has(entityId)) return

    const [lng, lat] = feature.geometry.coordinates
    const entity = new Entity({
      id: entityId,
      position: Cartesian3.fromDegrees(lng, lat),
      point: new PointGraphics({
        pixelSize: new CallbackProperty(() => {
          const isSelected = stationStore.selectedStationId === feature.properties.station_id
          const isRouteSelected = routeStore.selectedRouteName === routeName
          const isDirectionSelected = stationStore.selectedDirection === direction

          if (isSelected) return 12
          if (isRouteSelected && isDirectionSelected) return 10
          if (isRouteSelected) return 8
          return 6
        }, false),

        color: new CallbackProperty(() => {
          const isSelected = stationStore.selectedStationId === feature.properties.station_id
          const isRouteSelected = routeStore.selectedRouteName === routeName
          const isDirectionSelected = stationStore.selectedDirection === direction

          if (isSelected) return Color.fromCssColorString('#FF6B00')
          if (isRouteSelected && isDirectionSelected) return Color.fromCssColorString('#00AAFF')
          if (isRouteSelected) return Color.fromCssColorString('#888888')
          return Color.fromCssColorString('#444444')
        }, false),

        outlineColor: Color.WHITE,
        outlineWidth: 2
      }),
      properties: feature.properties
    })

    dataSource.entities.add(entity)
  })
}
```

#### Bus Model Rendering

**GLB Model with Route-Based Coloring**:
```typescript
export async function renderBusModels(
  busData: BusTrajectoryData[]
): Promise<void> {
  const viewer = (window as any).cviewer
  if (!viewer) return

  removeDataSource('bus_models')
  const dataSource = await createGeoJsonDataSource('bus_models')

  const ROUTE_COLORS = ['#FF6B00', '#00AAFF', '#00FF00', '#FFFF00']

  busData.forEach(bus => {
    if (bus.positions.length === 0) return

    const firstPosition = bus.positions[0]
    const { longitude, latitude } = firstPosition.position

    // Route-based color assignment
    const colorIndex = parseInt(bus.route_name) % ROUTE_COLORS.length
    const color = Color.fromCssColorString(ROUTE_COLORS[colorIndex])

    const entity = new Entity({
      id: `bus_model_${bus.vehicle_number}`,
      name: `Bus ${bus.vehicle_number} (Route ${bus.route_name})`,
      position: new ConstantPositionProperty(
        Cartesian3.fromDegrees(longitude, latitude, 0)
      ),
      model: new ModelGraphics({
        uri: '/models/CesiumMilkTruck.glb',
        scale: 1,
        minimumPixelSize: 32,
        maximumScale: 64,
        color: color,
        colorBlendMode: ColorBlendMode.HIGHLIGHT,
        heightReference: HeightReference.CLAMP_TO_GROUND
      })
    })

    dataSource.entities.add(entity)
  })
}
```

---

### 4. API Integration

#### Type Definitions

**GeoJSON Types**:
```typescript
export interface RouteInfo {
  route_name: string
  origin: string
  destination: string
}

export interface RouteGeom {
  route_name: string
  inbound: string  // PostGIS LineString WKT
  outbound: string // PostGIS LineString WKT
}

export interface RouteStationsResponse {
  type: 'FeatureCollection'
  route_name: string
  direction: 'inbound' | 'outbound'
  direction_name: string
  total: number
  features: RouteStationFeature[]
}

export interface RouteStationFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: RouteStationProperties
}

export interface RouteStationProperties {
  route_name: string
  station_id: string
  station_order: number
  station_name: string
  station_name_eng: string
  city: string
  county_district: string
  dong: string
  ars_id: string
}
```

#### API Functions

**Base Configuration**:
```typescript
const API_BASE_URL = 'http://services.leorca.org:8088/api/v1'

async function get<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`)
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  return response.json()
}
```

**Route API**:
```typescript
export async function getRouteInfo(): Promise<RouteInfoListResponse> {
  return get('/route/getInfo')
}

export async function getRouteGeometry(
  routeName: string
): Promise<RouteGeomResponse> {
  return get(`/route/geom/${routeName}`)
}

export async function getRouteStations(
  routeName: string,
  direction: 'inbound' | 'outbound'
): Promise<RouteStationsResponse> {
  return get(`/route/stations/${routeName}?direction=${direction}`)
}
```

**Sensor API**:
```typescript
export async function getLatestSensorData(
  stationId: string
): Promise<SensorDataResponse> {
  return get(`/sensor-data/stations/${stationId}/latest`)
}

export async function getHourlySensorData(
  stationId: string,
  hours: number = 24
): Promise<HourlySensorDataResponse> {
  return get(`/sensor-data/stations/${stationId}/hourly?hours=${hours}`)
}
```

#### Data Loading Pattern

**Sequential Initialization**:
```typescript
// In Monitoring component
useEffect(() => {
  const initializeData = async () => {
    try {
      // 1. Load route info
      await routeStore.initializeRouteData()

      // 2. Load station data for all routes
      const routeNames = routeStore.routeInfoList.map(r => r.route_name)
      const stationLoadPromises = routeNames.flatMap(routeName => [
        stationStore.loadStations(routeName, 'inbound'),
        stationStore.loadStations(routeName, 'outbound')
      ])
      await Promise.all(stationLoadPromises)

      // 3. Render Cesium entities
      if (!routeStore.isLoading && routeStore.routeGeomMap.size > 0) {
        await renderAllRoutes()
        resetAllRouteColors()
        if (stationStore.stationDataMap.size > 0) {
          await renderAllStations()
        }
      }
    } catch (error) {
      console.error('[Monitoring] Initialization failed:', error)
    }
  }

  initializeData()
}, [])
```

---

### 5. Performance Optimization

#### Entity Reuse

**Duplicate Prevention**:
```typescript
const existingStations = stationData.features.filter(feature => {
  const entityId = `station_${feature.properties.station_id}`
  return dataSource.entities.getById(entityId) !== undefined
})

if (existingStations.length > 0) {
  console.log('[StationRenderer] Skipping duplicate entities')
  return
}
```

#### Memory Management

**DataSource Cleanup**:
```typescript
export function clearAllStations(): void {
  const viewer = (window as any).cviewer
  if (!viewer) return

  const dataSourcesToRemove: DataSource[] = []
  for (let i = 0; i < viewer.dataSources.length; i++) {
    const dataSource = viewer.dataSources.get(i)
    if (dataSource.name.startsWith('stations_')) {
      dataSourcesToRemove.push(dataSource)
    }
  }

  dataSourcesToRemove.forEach(dataSource => {
    viewer.dataSources.remove(dataSource)
  })
}
```

**Component Unmount Cleanup**:
```typescript
useEffect(() => {
  return () => {
    // Cleanup on component unmount
    clearAllStations()
    removeDataSource('routes')
    removeDataSource('bus_models')
  }
}, [])
```

#### Terrain Height Caching

**Performance Pattern**:
```typescript
const terrainHeightCache = new Map<string, number>()

function getTerrainHeight(longitude: number, latitude: number): number {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`

  if (terrainHeightCache.has(key)) {
    return terrainHeightCache.get(key)!
  }

  const viewer = (window as any).cviewer
  const cartographic = Cartographic.fromDegrees(longitude, latitude)
  const height = viewer.scene.globe.getHeight(cartographic) || 0

  terrainHeightCache.set(key, height)
  return height
}
```

#### Reactive Rendering Optimization

**Conditional Rendering Based on State**:
```typescript
const Monitoring = observer(function Monitoring() {
  useEffect(() => {
    if (!routeStore.isLoading && routeStore.routeGeomMap.size > 0) {
      const renderAll = async () => {
        await renderAllRoutes()
        resetAllRouteColors()
        if (stationStore.stationDataMap.size > 0) {
          await renderAllStations()
        }
      }
      renderAll()
    }
  }, [
    routeStore.isLoading,
    routeStore.routeGeomMap.size,
    stationStore.stationDataMap.size
  ])

  return <div>...</div>
})
```

---

## UI Component Library

### Common Components

#### Panel
**Purpose**: Floating panel container with positioning
```typescript
interface PanelProps {
  position?: 'left' | 'right' | 'center'
  offset?: number
  children: React.ReactNode
  onClose?: () => void
}

export function Panel({
  position = 'left',
  offset = 16,
  children,
  onClose
}: PanelProps) {
  const positionClasses = {
    left: 'left-4',
    right: 'right-4',
    center: 'left-1/2 transform -translate-x-1/2'
  }

  return (
    <div className={`
      absolute top-4 ${positionClasses[position]}
      bg-white rounded-lg shadow-lg
      p-4 min-w-[320px] max-w-[480px]
    `}>
      {onClose && (
        <button onClick={onClose} className="absolute top-2 right-2">
          ×
        </button>
      )}
      {children}
    </div>
  )
}
```

#### Title
**Purpose**: Panel title bar with minimize functionality
```typescript
interface TitleProps {
  text: string
  onMinimize?: () => void
  onClose?: () => void
  dividerColor?: string
}

export function Title({ text, onMinimize, onClose, dividerColor = '#E5E7EB' }: TitleProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{text}</h2>
        <div className="flex gap-2">
          {onMinimize && (
            <button onClick={onMinimize} className="hover:bg-gray-100 p-1 rounded">
              <Icon name="minimize" size={16} />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="hover:bg-gray-100 p-1 rounded">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="border-b" style={{ borderColor: dividerColor }} />
    </div>
  )
}
```

#### TabNavigation
**Purpose**: Tab navigation for panel content
```typescript
interface TabNavigationProps {
  tabs: string[]
  activeTab: number
  onTabChange: (index: number) => void
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex border-b mb-4">
      {tabs.map((tab, index) => (
        <button
          key={index}
          onClick={() => onTabChange(index)}
          className={`
            flex-1 py-2 px-4 text-sm font-medium
            transition-colors duration-200
            ${index === activeTab
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
```

### Service Components

#### SensorInfoContainer
**Purpose**: Circular progress bar for sensor data visualization
```typescript
interface SensorInfoContainerProps {
  sensorType: 'PM10' | 'PM25' | 'VOCs'
  value: number
  hasValidData: boolean
}

export function SensorInfoContainer({
  sensorType,
  value,
  hasValidData
}: SensorInfoContainerProps) {
  const { level, levelText, color, textColor } = getAirQualityLevel(sensorType, value)
  const angle = getCircularBarAngle(sensorType, value)
  const { name, shortName, unit } = getSensorInfo(sensorType)

  const radius = 45
  const circumference = 2 * Math.PI * radius

  if (!hasValidData) {
    return (
      <div className="w-[98px] h-[98px] relative">
        <div className="absolute inset-0 border-8 border-gray-300 rounded-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-gray-400">수집안됨</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[98px] h-[98px] relative">
      {/* Base border */}
      <div
        className="absolute inset-0 border-8 rounded-full"
        style={{ borderColor: sensorType === 'VOCs' ? '#999' : '#E5E7EB' }}
      />

      {/* Progress bar (only for PM10/PM25) */}
      {sensorType !== 'VOCs' && (
        <svg className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="49"
            cy="49"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${(angle / 360) * circumference} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Text content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-gray-500">{shortName}</span>
        <span className="text-xl font-bold" style={{ color: textColor }}>
          {value.toFixed(1)}
        </span>
        <span className="text-[10px] text-gray-400">{unit}</span>
        <span
          className="text-xs font-medium mt-1"
          style={{ color: textColor }}
        >
          {levelText}
        </span>
      </div>
    </div>
  )
}
```

---

## Utility Modules

### Air Quality Standards

**Centralized Standards Management**:
```typescript
// src/utils/airQuality/index.ts

export type SensorType = 'PM10' | 'PM25' | 'VOCs'
export type AirQualityLevel = 'good' | 'normal' | 'bad' | 'very_bad'

export interface AirQualityResult {
  level: AirQualityLevel
  levelText: string
  color: string
  textColor: string
}

const AIR_QUALITY_STANDARDS = {
  PM10: { good: 30, normal: 80, bad: 150 },
  PM25: { good: 15, normal: 35, bad: 75 },
  VOCs: { good: 500, normal: 1000, bad: 2000 }
}

const AIR_QUALITY_COLORS = {
  good: { color: '#10B981', textColor: '#059669' },
  normal: { color: '#F59E0B', textColor: '#D97706' },
  bad: { color: '#EF4444', textColor: '#DC2626' },
  very_bad: { color: '#7C3AED', textColor: '#6D28D9' }
}

export function getAirQualityLevel(
  sensorType: SensorType,
  value: number
): AirQualityResult {
  const standards = AIR_QUALITY_STANDARDS[sensorType]

  let level: AirQualityLevel
  if (value <= standards.good) level = 'good'
  else if (value <= standards.normal) level = 'normal'
  else if (value <= standards.bad) level = 'bad'
  else level = 'very_bad'

  const levelTexts = {
    good: '좋음',
    normal: '보통',
    bad: '나쁨',
    very_bad: '매우나쁨'
  }

  return {
    level,
    levelText: levelTexts[level],
    ...AIR_QUALITY_COLORS[level]
  }
}

export function getCircularBarAngle(
  sensorType: SensorType,
  value: number
): number {
  if (sensorType === 'VOCs') return 0

  const standards = AIR_QUALITY_STANDARDS[sensorType]
  const maxValue = standards.bad * 1.5

  if (value <= standards.good) {
    return (value / standards.good) * 90
  } else if (value <= standards.normal) {
    const rangeProgress = (value - standards.good) / (standards.normal - standards.good)
    return 90 + rangeProgress * 90
  } else if (value <= standards.bad) {
    const rangeProgress = (value - standards.normal) / (standards.bad - standards.normal)
    return 180 + rangeProgress * 90
  } else {
    const rangeProgress = Math.min((value - standards.bad) / (maxValue - standards.bad), 1.0)
    return 270 + rangeProgress * 90
  }
}

export function getSensorInfo(sensorType: SensorType) {
  const info = {
    PM10: { name: '미세먼지', shortName: 'PM10', unit: 'μg/m³' },
    PM25: { name: '초미세먼지', shortName: 'PM2.5', unit: 'μg/m³' },
    VOCs: { name: '휘발성유기화합물', shortName: 'VOCs', unit: 'ppb' }
  }
  return info[sensorType]
}
```

### DateTime Utilities

**File**: `/src/utils/dateTime.ts`

**Timezone Conversion**:
```typescript
export function formatUTCToKoreaTime(utcTimestamp: string): string {
  // ISO 8601 → "오후 2:30" format
  const date = new Date(utcTimestamp)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

export function getCurrentKoreaTime(): string {
  // Current time in "오후 2:30" format
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatTimeDifference(
  latestTimestamp: string,
  hourlyTimestamp: string
): string {
  // Calculate "2시간 30분 전" style relative time
  const diffMs = Math.abs(
    new Date(latestTimestamp).getTime() - new Date(hourlyTimestamp).getTime()
  )
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const remainingMinutes = diffMinutes % 60

  return diffHours > 0
    ? `${diffHours}시간 ${remainingMinutes}분`
    : `${remainingMinutes}분`
}
```

**Usage**: Sensor data timestamps, trend calculations

### Chart Data Transformation

**File**: `/src/utils/chart/sensorDataTransform.ts`

**Recharts Data Formatting**:
```typescript
export interface ChartDataPoint {
  time: string          // Display label ("09:00" or "10/01")
  timestamp: string     // Original ISO timestamp
  pm10: number | null
  pm25: number | null
  voc: number | null
}

export function transformHourlyData(hourlyData: HourlyDataPoint[]): ChartDataPoint[]
export function transformDailyData(dailyData: DailyDataPoint[]): ChartDataPoint[]
export function formatTimeLabel(isoString: string, period: 'today' | 'week' | 'month'): string
```

**Features**:
- Sort data by timestamp
- Convert API response to Recharts format
- Format X-axis labels based on time period
- Handle null values with `connectNulls`

---

## Build Optimization

### Performance Metrics

**Before Optimization**: 460 seconds
**After Optimization**: 5 seconds
**Improvement**: 99% reduction

### Optimization Techniques

1. **Vite Configuration**:
   - UMD module format for microfrontend
   - External dependencies (React, ReactDOM)
   - Code splitting disabled for single bundle

2. **Dependency Management**:
   - Tree shaking enabled
   - Dynamic imports where applicable
   - Minimal bundle size

3. **Asset Optimization**:
   - SVG icons inlined
   - GLB models loaded on-demand
   - Cesium assets externalized

### Build Commands

```bash
# Single page build
VITE_PAGE=Monitoring pnpm build

# All pages build
pnpm build

# Build with type checking
pnpm build && npx tsc --noEmit

# Build with analysis
VITE_PAGE=Monitoring pnpm build --mode production --analyze
```

---

## Testing Strategy

### Type Checking

```bash
# Full TypeScript compilation check
npx tsc --noEmit

# Watch mode for development
npx tsc --noEmit --watch
```

### Linting

```bash
# ESLint check
pnpm lint

# ESLint with auto-fix
pnpm lint --fix

# Specific file
pnpm lint src/stores/RouteStore.ts
```

### Common Issues and Fixes

**Unused Variables**:
```typescript
// Before
const unusedVar = getValue()

// After (if truly needed)
const _unusedVar = getValue()

// Or remove entirely
```

**Missing Dependencies**:
```typescript
// Before
useEffect(() => {
  updateData(routeName)
}, [])

// After
useEffect(() => {
  updateData(routeName)
}, [routeName])
```

**Any Types**:
```typescript
// Before
const viewer = (window as any).cviewer

// After
interface CesiumWindow extends Window {
  cviewer?: Cesium.Viewer
}
const viewer = (window as CesiumWindow).cviewer
```

---

## Deployment

### Production Build

```bash
# Set environment
export NODE_ENV=production

# Build UMD module
VITE_PAGE=Monitoring pnpm build

# Output: dist/Monitoring.umd.js
```

### Integration with Parent App

```typescript
// Parent app integration
import { loadMicroApp } from 'qiankun'

loadMicroApp({
  name: 'pm-frontend-monitoring',
  entry: '//localhost:5173',
  container: '#monitoring-container',
  props: {
    cviewer: window.cviewer // Pass Cesium viewer
  }
})
```

### Environment Configuration

```typescript
// vite.config.ts
export default defineConfig({
  base: process.env.NODE_ENV === 'production'
    ? '/pm-frontend/'
    : '/',

  server: {
    port: 5173,
    cors: true
  }
})
```

---

## Development Best Practices

### Component Design Principles

1. **Pure Components**: Props-only dependencies
2. **Observer Pattern**: Use MobX `observer` for reactive components
3. **Single Responsibility**: One component, one purpose
4. **Reusability**: Extract common patterns to shared components

### State Management Rules

1. **Single Source of Truth**: RouteStore owns route selection
2. **Computed Values**: Use MobX computed for derived state
3. **Actions for Mutations**: All state changes through actions
4. **Dependency Inversion**: StationStore depends on RouteStore

### Cesium Integration Guidelines

1. **DataSource Naming**: Consistent naming convention
2. **Duplicate Prevention**: Always check before creating
3. **Memory Cleanup**: Remove DataSources on unmount
4. **Type Safety**: Use Cesium Property classes correctly

### Code Quality Standards

1. **TypeScript**: No `any` types, complete type definitions
2. **ESLint**: Zero violations before commit
3. **Naming**: PascalCase for components, camelCase for functions
4. **Comments**: Document complex logic and Cesium operations

---

## Service Endpoints

### Development
- **Frontend Dev Server**: http://localhost:5173
- **Backend API**: http://services.leorca.org:8088
- **Swagger UI**: http://services.leorca.org:8088/swagger/index.html

### Production
- **UMD Module**: Served by parent application
- **API Base URL**: Configured via environment variables
- **Cesium Assets**: CDN or local assets

---

## Recent Updates (v2.1)

### Chart Visualization System (2025-10-02)

**Recharts Integration**:
- Time-series sensor data visualization (PM10/PM25/VOCs)
- Three time periods: Today (hourly), 7 days (daily), 1 month (daily)
- Dynamic line visibility based on SensorSelectionStore
- Custom tooltip with air quality levels
- ReferenceArea for air quality threshold zones

**New Components**:
- `SensorLineChart`: Responsive line chart with Recharts
- `SensorTooltip`: Custom tooltip with air quality status
- `ChartController`: PM/VOCs sensor type toggle
- `ChartHeader`: Period indicator with date display
- `LineChartContainer` / `StatsSummaryContainer`: Layout wrappers

**Data Flow**:
```
API (hourly/daily) → sensorDataTransform → ChartDataPoint[] → Recharts
```

### Enhanced Sensor Display (2025-10-02)

**SensorInfoContainer Updates**:
- Circular progress bar with exact SVG alignment (98px × 98px)
- Trend indicators with actual time differences
- API-driven previous value comparison
- Four-digit number formatting for sensor values
- State icons (good/normal/bad/very_bad)

**Features**:
- Real-time vs hourly data comparison
- Dynamic border color based on air quality level
- "수집안됨" state for missing data
- PM10/PM25 separate threshold zones
- New SVG icons: `state_good`, `state_normal`, `state_bad`, `state_very_bad`
- PM10/PM25 icon variations for ChartController

### Modal Architecture (2025-10-02)

**AirQualityStatus Modal**:
- Integrated into App.tsx with StationDetailStore
- Route selection → Station list → Station detail flow
- Independent state from Cesium rendering
- Cached station data per route

**StationDetail Component**:
- Left panel: Current sensor readings with circular progress
- Right panel: Tabbed time-series charts
- Parallel API calls: `getLatestSensorData()` + `getHourlySensorData()`
- Time difference calculation for trend display

**Click Integration**:
- StationHtmlRenderer click → StationDetailStore.selectStation()
- Opens modal with pre-selected station
- RouteSelector syncs with StationDetailStore.selectedRoute

### Store Architecture Evolution

**Separation of Concerns**:
- **StationStore**: Cesium rendering state only
- **StationDetailStore**: Modal UI state only
- **SensorSelectionStore**: User preferences across tabs
- **StationSensorStore**: HTML overlay sensor visibility

**Benefits**:
- Independent modal operation from 3D map
- Persistent sensor type selection
- Cached data reduces API calls

### HTML Overlay System (2025-09-30)

**Components**:
- `StationHtmlRenderer`: HTML overlays for stations with click handlers
- `StationSensorRenderer`: Sensor data overlays with hover states
- `BusHtmlRenderer`: Real-time bus position overlays

**Features**:
- Terrain height optimization with caching
- Negative height handling for underground/sea level positions
- Click events integrated with StationDetailStore
- Performance: Terrain height cache prevents redundant calculations

### Lifecycle Management (2025-09-30)

**Cleanup System**:
- `src/pages/Monitoring/cleanup.ts`: Centralized cleanup utilities
- `onCloseMicroApp` integration for Qiankun unmount
- BusStore animation cleanup on component unmount
- Proper DataSource removal to prevent memory leaks

**Implementation**:
```typescript
// App.tsx
useEffect(() => {
  return () => {
    busStore.cleanup()  // Stop animations, clear intervals
  }
}, [])
```

---

## Future Enhancements

### Planned Features
1. ~~Real-time bus animation with smooth transitions~~ ✅ Implemented
2. Advanced route filtering and search
3. ~~Historical sensor data visualization with charts~~ ✅ Implemented
4. User preferences and saved views
5. Statistics summary in StatsSummaryContainer

### Technical Improvements
1. React Testing Library integration
2. Storybook for component documentation
3. Performance monitoring with Web Vitals
4. Error boundary implementation
5. Accessibility (A11Y) compliance

---

For Cesium implementation patterns, see `/pm-frontend/CLAUDE_CESIUM.md`
For HTML overlay techniques, see `/pm-frontend/CLAUDE_CESIUM_HTML.md`
For API integration details, see `/pm-frontend/CLAUDE_API.md`
For Claude's role definition, see `/pm-frontend/CLAUDE.md`