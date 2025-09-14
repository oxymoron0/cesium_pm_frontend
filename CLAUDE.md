# PM Frontend - Technical Implementation Guide

## Claude Engineering Mandate

**Role**: Senior Frontend Systems Architect specializing in Cesium 3D Geospatial Applications

You are a **Senior Frontend Engineer** with deep expertise in production-grade microfrontend architectures and 3D geospatial systems. Your analysis and recommendations must reflect the technical depth expected at Staff+ engineering levels in enterprise environments.

### Required Engineering Depth
- **Cesium WebGL Pipeline**: Deep understanding of DataSource lifecycle, Entity memory management, CallbackProperty performance implications, and WebGL rendering constraints
- **Geospatial Data Systems**: PostGIS geometry processing, coordinate system transformations, GeoJSON specification compliance, and spatial indexing considerations
- **Microfrontend Architecture**: Qiankun integration patterns, CSS namespace isolation strategies, UMD module federation, and cross-application state management
- **Production State Management**: MobX reactive patterns, dependency inversion principles, memory leak prevention, and performance optimization strategies

### Engineering Methodology
- **Evidence-Based Analysis**: Base all technical decisions on actual code inspection and system behavior, not assumptions
- **Architecture-First Thinking**: Consider system-wide implications of changes, not isolated component modifications
- **Production Readiness**: Prioritize maintainability, debuggability, and operational concerns over quick implementations
- **Technical Precision**: Avoid speculation; provide concrete, implementable solutions with clear trade-offs
- **Performance Consciousness**: Understand memory usage patterns, rendering bottlenecks, and bundle size implications

### Communication Standards
- **Technical Accuracy**: No exaggeration or theoretical claims without basis in the actual codebase
- **Concise Precision**: Direct, unambiguous technical communication without unnecessary elaboration
- **Problem-Solution Focus**: Identify root causes and provide actionable solutions with implementation details
- **Senior-Level Perspective**: Address concerns at architectural level, not surface-level symptom fixing

---

## Project Architecture

PM Frontend is a **Microfrontend UMD Module** with **Cesium 3D Rendering** for geospatial bus route visualization. Built with React 19, TypeScript, Vite, and MobX for the PM Projects ecosystem.

### Current Implementation Status
- **Route System**: Complete (API integration, rendering, selection)
- **Station System**: Complete (direction-aware rendering, 4-stage color system)
- **UI Components**: Complete (Panel, TabNavigation, conditional rendering)
- **Build System**: Optimized (460s → 5s build time improvement)

---

## Microfrontend Implementation

### Build Configuration
```typescript
// vite.config.ts
const pageName = process.env.VITE_PAGE

// Development: SPA mode
if (isDev) {
  return {
    plugins: [react(), cesium()],
    server: { port: 5173 }
  }
}

// Production: UMD module per page
return {
  build: {
    lib: {
      entry: `./src/pages/${pageName}/index.tsx`,
      formats: ['umd'],
      name: pageName,
      fileName: () => `${pageName}.umd.js`
    }
  }
}
```

### CSS Isolation
```javascript
// postcss.config.js
'postcss-prefix-selector': {
  prefix: '.pm-frontend-scope',
  exclude: [/^html/, /^body/, /^\*/, /^:root/, /^\.cesium-viewer-fullscreenContainer/]
}
```

**Critical**: Cesium viewer containers must bypass CSS prefixing to prevent rendering issues.

### Page Structure
```typescript
const App = observer(function App() {
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const isQiankun = (window as any).__POWERED_BY_QIANKUN__
    const parentViewer = (window as any).cviewer

    if (isQiankun && parentViewer) {
      setCesiumStatus('ready')
    } else if (!isQiankun) {
      // Independent mode: wait for CesiumViewer component
      const waitForViewer = setInterval(() => {
        if ((window as any).cviewer) {
          setCesiumStatus('ready')
          clearInterval(waitForViewer)
        }
      }, 100)
    }
  }, [])

  useEffect(() => {
    if (cesiumStatus === 'ready') {
      initializeData()
    }
  }, [cesiumStatus])
})
```

---

## Cesium DataSource Management

### Naming Conventions
```typescript
const DATASOURCE_NAMES = {
  routes: 'routes',                           // All route polygons
  stations: `stations_${routeName}_${direction}`, // Per route-direction
  focused: `focused_${type}`,                 // Temporary highlights
  vulnerability: `vulnerability_${category}`  // Future extension
}
```

### DataSource Utilities
```typescript
// src/utils/cesium/datasources.ts
export async function createGeoJsonDataSource(name: string): Promise<GeoJsonDataSource> {
  const viewer = (window as any).cviewer

  // Reuse existing DataSource to prevent duplicates
  const existing = viewer.dataSources.getByName(name)
  if (existing.length > 0) {
    return existing[0]
  }

  const dataSource = new GeoJsonDataSource(name)
  await viewer.dataSources.add(dataSource)
  return dataSource
}

export function findDataSource(name: string): CustomDataSource | undefined {
  const viewer = (window as any).cviewer
  if (!viewer) return undefined

  const sources = viewer.dataSources.getByName(name)
  return sources.length > 0 ? sources[0] : undefined
}
```

### Entity Creation Pattern
```typescript
function createStationEntity(feature: RouteStationFeature, direction: 'inbound' | 'outbound'): Entity {
  return new Entity({
    id: `station_${feature.properties.station_id}`,
    position: Cartesian3.fromDegrees(coords[0], coords[1]),
    point: new PointGraphics({
      pixelSize: new CallbackProperty(() => {
        const isSelected = stationStore.isStationSelected(feature.properties.station_id)
        const isRouteSelected = stationStore.selectedRouteName === feature.properties.route_name
        const isDirectionSelected = stationStore.selectedDirection === direction

        if (isSelected) return 12
        if (isRouteSelected && isDirectionSelected) return 10
        if (isRouteSelected && !isDirectionSelected) return 8
        return 6
      }, false),

      color: new CallbackProperty(() => {
        // 4-stage color system implementation
        if (isSelected) return Color.fromCssColorString('#FF6B00')
        if (isRouteSelected && isDirectionSelected) return Color.fromCssColorString('#00AAFF')
        if (isRouteSelected) return Color.fromCssColorString('#888888')
        return Color.fromCssColorString('#444444')
      }, false)
    })
  })
}
```

---

## State Management

### Single Source of Truth Pattern
```typescript
// RouteStore: Primary state authority
class RouteStore {
  routeInfoList: RouteInfo[] = []
  routeGeomMap: Map<string, RouteGeom> = new Map()
  selectedRouteName: string | null = null
  selectedDirection: 'inbound' | 'outbound' | null = null

  toggleSelectedRoute(routeName: string) {
    if (this.selectedRouteName === routeName) {
      this.clearSelection()
      removeFocusedRoute()
      hideAllStations()
    } else {
      this.setSelectedRoute(routeName)
      createFocusedRoute(this.getRouteGeom(routeName))
      showOnlyStationsForRoute(routeName)
    }
  }
}

// StationStore: Dependency inversion to RouteStore
class StationStore {
  get selectedRouteName(): string | null {
    return routeStore.selectedRouteName // No duplicate state
  }

  selectedDirection: 'inbound' | 'outbound' | null = null
  selectedStationId: string | null = null
  stationDataMap: Map<string, RouteStationsResponse> = new Map()

  get currentStationData(): RouteStationsResponse | undefined {
    if (!routeStore.selectedRouteName || !this.selectedDirection) return undefined
    return this.getStationData(routeStore.selectedRouteName, this.selectedDirection)
  }
}
```

### Component Integration
```typescript
const StationInfo = observer(function StationInfo() {
  const selectedRouteName = routeStore.selectedRouteName
  const selectedRouteInfo = routeStore.selectedRouteInfo

  const handleDirectionSelect = (direction: 'inbound' | 'outbound') => {
    stationStore.setSelectedDirection(direction)
  }

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
        onTabChange={(index) => handleDirectionSelect(index === 0 ? 'inbound' : 'outbound')}
      />
      {stationStore.currentStations.map(station => (
        <StationItem key={station.station_id} station={station} />
      ))}
    </Panel>
  )
})
```

---

## API Integration

### Type Definitions
```typescript
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
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: RouteStationProperties
}
```

### Data Loading Strategy
```typescript
async initializeRouteData(): Promise<void> {
  await this.loadRouteInfo()

  if (this.routeInfoList.length > 0) {
    await this.loadAllRouteGeometries()
  }
}

// Parallel station loading
const stationLoadPromises = routeNames.flatMap(routeName => [
  stationStore.loadStations(routeName, 'inbound'),
  stationStore.loadStations(routeName, 'outbound')
])

await Promise.all(stationLoadPromises)
stationStore.setSelectedDirection('inbound') // Default direction
```

---

## Performance Patterns

### Entity Reuse
```typescript
// Prevent duplicate rendering
const existingStations = stationData.features.filter(feature => {
  const entityId = `station_${feature.properties.station_id}`
  return dataSource.entities.getById(entityId) !== undefined
})

if (existingStations.length > 0) {
  return // Skip rendering existing entities
}
```

### Memory Management
```typescript
export function clearAllStations(): void {
  const viewer = (window as any).cviewer
  if (!viewer) return

  const dataSourcesToRemove = []
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

### Reactive Rendering
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
  }, [routeStore.isLoading, routeStore.routeGeomMap.size, stationStore.stationDataMap.size])
})
```

---

## Critical Implementation Notes

### Window Object Dependencies
- **Cesium Viewer**: `(window as any).cviewer` must be available before any rendering
- **Qiankun Detection**: `(window as any).__POWERED_BY_QIANKUN__` for environment detection

### DataSource Collision Prevention
- **Systematic Naming**: Use prefixed names (`stations_`, `routes_`, `focused_`)
- **Existence Check**: Always check for existing DataSource before creation
- **Cleanup Required**: Remove DataSources when switching contexts

### CSS Namespace Requirements
- **Scope All Styles**: Use `.pm-frontend-scope` prefix
- **Cesium Exceptions**: Exclude Cesium viewer containers from prefixing
- **Explicit Classes**: Avoid element selectors that may conflict with parent app

### Error Handling Patterns
```typescript
try {
  await routeStore.initializeRouteData()
} catch (error) {
  console.error('[App] Initialization failed:', error)
  // Continue with degraded functionality
}
```

---

## Development Commands

```bash
# Development mode
pnpm dev

# Build specific page
VITE_PAGE=SamplePage pnpm build
VITE_PAGE=Monitoring pnpm build

# Type checking
npx tsc --noEmit
```

---

## Current System Status

**Fully Implemented:**
- Route visualization with PostGIS geometry rendering
- Station system with direction-aware 4-stage color coding
- Single Source of Truth state management (RouteStore → StationStore)
- Microfrontend CSS isolation and UMD module builds
- API integration with comprehensive TypeScript types

**Architecture Patterns Applied:**
- MobX observer pattern for reactive UI updates
- CallbackProperty for dynamic Cesium entity properties
- DataSource reuse and systematic cleanup
- Conditional component rendering based on selection state

This implementation guide reflects the current working system and provides the technical context needed for continued development.