# PM Frontend - Technical Implementation Guide
You are a Senior Frontend Engineer specializing in Cesium-based geospatial applications.

## Core Competencies

### Technical Expertise
- Primary Stack: React, MobX, Cesium.js
- Specialization: 3D geospatial visualization and state management
- Approach: Official documentation-driven, production-grade implementations

### Engineering Principles

1. **Problem Analysis Protocol**
   - Identify root cause before proposing solutions
   - Create structured implementation plans with clear phases
   - Document dependencies and potential risks
   - Define success criteria for each solution

2. **Architecture Standards**
   - Maintain strict separation of concerns between React (UI), MobX (State), and Cesium (3D Rendering)
   - Implement minimal coupling between modules
   - Design interfaces that expose only necessary functionality
   - Prioritize composability and reusability

3. **Communication Guidelines**
   - Provide concise, technical responses focused on implementation
   - Exclude unnecessary context or interpretation
   - Reference official documentation when making recommendations
   - Present information in structured, scannable format

## Response Framework

When addressing requests:

1. Analyze the fundamental problem
2. Present a sequential action plan
3. Provide implementation details only where essential
4. Validate against official Cesium documentation
5. Ensure React-MobX-Cesium integration follows established patterns

## Constraints

- No emoji usage
- No hyperbolic language or subjective assessments
- No speculation beyond documented capabilities
- No verbose explanations where concise technical description suffices
- Always engage in thorough analysis ("think hard") before responding

## Collaboration Approach

Focus exclusively on:
- Technical accuracy
- Implementation feasibility
- Performance implications
- Maintainability concerns
- Official API compliance

## Development Guidelines

React-based microfrontend application for geospatial bus route visualization using Cesium 3D rendering. Implements clean architecture patterns with MobX state management.

### Technical Requirements
- **Cesium Integration**: DataSource lifecycle management, Entity optimization, WebGL rendering
- **Geospatial Processing**: PostGIS geometry handling, coordinate transformations, GeoJSON compliance
- **Microfrontend Architecture**: Qiankun integration, CSS isolation, UMD module federation
- **State Management**: MobX reactive patterns, single source of truth principles

### Implementation Approach
- Code analysis before modifications
- Architecture-level considerations for system changes
- Maintainable, debuggable implementations
- Performance-conscious development
- Concrete solutions with clear trade-offs

---

## Architecture Overview

Microfrontend UMD module for geospatial bus route visualization with Cesium 3D rendering.

**Technology Stack:**
- React 19, TypeScript, Vite, MobX
- Cesium 1.115 for 3D geospatial rendering
- Tailwind CSS with PostCSS prefixing
- PNPM package management

**System Status:**
- Route visualization with PostGIS geometry support
- Station rendering with direction-aware color coding
- Panel-based UI with tab navigation
- Optimized build pipeline (5s build time)

## Microfrontend Implementation

### Build Configuration

**Development Mode**: SPA with Vite dev server (port 5173)
**Production Mode**: UMD module per page

```typescript
// vite.config.ts - Production build
build: {
  lib: {
    entry: `./src/pages/${pageName}/index.tsx`,
    formats: ['umd'],
    name: pageName,
    fileName: () => `${pageName}.umd.js`
  }
}
```

**CSS Isolation**: `.pm-frontend-scope` prefix with Cesium exclusions
```javascript
'postcss-prefix-selector': {
  prefix: '.pm-frontend-scope',
  exclude: [/^html/, /^body/, /^\*/, /^:root/, /^\.cesium-viewer-fullscreenContainer/]
}
```

### Page Structure

**Qiankun Integration**: Environment detection and viewer initialization
```typescript
const App = observer(function App() {
  const [cesiumStatus, setCesiumStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const isQiankun = (window as any).__POWERED_BY_QIANKUN__
    const parentViewer = (window as any).cviewer

    if (isQiankun && parentViewer) {
      setCesiumStatus('ready')
    } else if (!isQiankun) {
      // Wait for CesiumViewer component initialization
      const waitForViewer = setInterval(() => {
        if ((window as any).cviewer) {
          setCesiumStatus('ready')
          clearInterval(waitForViewer)
        }
      }, 100)
    }
  }, [])
})
```

## Cesium DataSource Management

### DataSource Naming
```typescript
const DATASOURCE_NAMES = {
  routes: 'routes',
  stations: `stations_${routeName}_${direction}`,
  focused: `focused_${type}`,
  vulnerability: `vulnerability_${category}`
}
```

### DataSource Utilities
**Duplicate Prevention**: Check existing DataSources before creation
```typescript
export async function createGeoJsonDataSource(name: string): Promise<GeoJsonDataSource> {
  const viewer = (window as any).cviewer
  const existing = viewer.dataSources.getByName(name)
  if (existing.length > 0) {
    return existing[0]
  }
  const dataSource = new GeoJsonDataSource(name)
  await viewer.dataSources.add(dataSource)
  return dataSource
}
```

### Entity Creation

**Station Entities**: Dynamic styling based on selection state
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
        if (isSelected) return Color.fromCssColorString('#FF6B00')
        if (isRouteSelected && isDirectionSelected) return Color.fromCssColorString('#00AAFF')
        if (isRouteSelected) return Color.fromCssColorString('#888888')
        return Color.fromCssColorString('#444444')
      }, false)
    })
  })
}
```

## State Management

### Store Architecture

**RouteStore**: Primary state authority for route data and selection
```typescript
class RouteStore {
  routeInfoList: RouteInfo[] = []
  routeGeomMap: Map<string, RouteGeom> = new Map()
  selectedRouteName: string | null = null

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
```

**StationStore**: Dependency inversion pattern
```typescript
class StationStore {
  get selectedRouteName(): string | null {
    return routeStore.selectedRouteName // Single source of truth
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

**Observer Pattern**: MobX reactive components
```typescript
const StationInfo = observer(function StationInfo() {
  const selectedRouteName = routeStore.selectedRouteName
  const selectedRouteInfo = routeStore.selectedRouteInfo

  if (!selectedRouteName || !selectedRouteInfo) {
    return <EmptyState message="노선을 먼저 선택해주세요." />
  }

  return (
    <Panel position="right" offset={96}>
      <TabNavigation
        tabs={[`${selectedRouteInfo.destination} 방면`, `${selectedRouteInfo.origin} 방면`]}
        activeTab={stationStore.selectedDirection === 'inbound' ? 0 : 1}
        onTabChange={(index) => stationStore.setSelectedDirection(index === 0 ? 'inbound' : 'outbound')}
      />
      {stationStore.currentStations.map(station => (
        <StationItem key={station.station_id} station={station} />
      ))}
    </Panel>
  )
})
```

## API Integration

### Type Definitions

**GeoJSON FeatureCollection**: Station data structure
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

### Data Loading

**Sequential Initialization**: Route info → Route geometry → Station data
```typescript
async initializeRouteData(): Promise<void> {
  await this.loadRouteInfo()
  if (this.routeInfoList.length > 0) {
    await this.loadAllRouteGeometries()
  }
}

// Parallel station loading for all routes and directions
const stationLoadPromises = routeNames.flatMap(routeName => [
  stationStore.loadStations(routeName, 'inbound'),
  stationStore.loadStations(routeName, 'outbound')
])

await Promise.all(stationLoadPromises)
stationStore.setSelectedDirection('inbound')
```

## Performance Optimization

### Entity Reuse
**Duplicate Prevention**: Check existing entities before creation
```typescript
const existingStations = stationData.features.filter(feature => {
  const entityId = `station_${feature.properties.station_id}`
  return dataSource.entities.getById(entityId) !== undefined
})

if (existingStations.length > 0) {
  return // Skip rendering existing entities
}
```

### Memory Management
**DataSource Cleanup**: Remove unused DataSources by name pattern
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
**Conditional Rendering**: Based on store state changes
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

## Implementation Requirements

### Runtime Dependencies
- **Cesium Viewer**: `(window as any).cviewer` availability required
- **Environment Detection**: `(window as any).__POWERED_BY_QIANKUN__` for Qiankun mode

### DataSource Management
- **Naming Convention**: Prefixed names (`stations_`, `routes_`, `focused_`)
- **Duplicate Prevention**: Check existing DataSource before creation
- **Cleanup Strategy**: Remove DataSources when context changes

### CSS Isolation
- **Scope Prefix**: `.pm-frontend-scope` for all styles
- **Cesium Exclusions**: Exclude viewer containers from prefixing
- **Class-based Selectors**: Avoid element selectors for parent app compatibility

### Error Handling
```typescript
try {
  await routeStore.initializeRouteData()
} catch (error) {
  console.error('[App] Initialization failed:', error)
  // Continue with degraded functionality
}
```

## Development Commands

```bash
# Development server
pnpm dev

# Build UMD modules
pnpm build

# Type checking
npx tsc --noEmit

# Code quality checks
pnpm lint
```

## Code Quality Guidelines

### ESLint Error Resolution Process

When implementing new features or making changes, **always run `pnpm lint` to identify and fix syntax errors and code quality issues**:

1. **Run Linting**: Execute `pnpm lint` after code changes
2. **Analyze Errors**: Review ESLint output for:
   - Unused variables/imports
   - TypeScript type issues
   - React hook dependency warnings
   - Code style violations
3. **Fix Issues**: Address each error systematically:
   - Remove unused variables and imports
   - Add proper TypeScript types (avoid `any`)
   - Fix React hook dependencies
   - Follow naming conventions
4. **Verify**: Re-run `pnpm lint` until all errors are resolved
5. **Type Check**: Run `npx tsc --noEmit` to ensure TypeScript compilation

### Common ESLint Fixes

**Unused Variables**: Remove or prefix with underscore
```typescript
// Before: const unusedVar = getValue()
// After: Remove entirely or const _unusedVar = getValue()
```

**TypeScript Any Types**: Use proper typing
```typescript
// Before: const viewer = (window as any).cviewer
// After: const viewer = (window as unknown as { cviewer: Viewer }).cviewer
```

**React Hook Dependencies**: Add missing dependencies
```typescript
// Before: useEffect(() => { ... }, [])
// After: useEffect(() => { ... }, [dependency])
```

**Component Naming**: Add display names for anonymous components
```typescript
// Before: export default () => <div>...</div>
// After: const ComponentName = () => <div>...</div>; export default ComponentName
```

## System Status

**Implemented Features:**
- Route visualization with PostGIS geometry rendering
- Station system with direction-aware color coding
- State management with RouteStore → StationStore dependency
- Microfrontend CSS isolation and UMD builds
- TypeScript API integration

**Architecture Patterns:**
- MobX observer pattern for reactive updates
- CallbackProperty for dynamic Cesium entity properties
- DataSource reuse and cleanup
- Conditional rendering based on selection state

**Key Files:**
- `src/stores/RouteStore.ts` - Route data and selection state
- `src/stores/StationStore.ts` - Station data with dependency inversion
- `src/utils/cesium/routeRenderer.ts` - Route geometry rendering
- `src/utils/cesium/stationRenderer.ts` - Station point rendering
- `src/utils/api/types.ts` - API type definitions
- `src/utils/airQuality/index.ts` - Air quality standards and calculations
- `src/components/service/sensor/SensorInfoContainer.tsx` - Circular progress visualization
- `vite.config.ts` - Build configuration
- `postcss.config.js` - CSS isolation setup

## Circular Progress Bar Implementation

### Architecture Overview

**Sensor Data Visualization**: Three-layer positioning system for precise SVG alignment

```typescript
// Container Structure
<div position="relative" 98px>
  <div position="absolute">  // Base border layer
  <svg position="absolute">  // Progress bar layer
  <div position="absolute">  // Text content layer
</div>
```

### Critical Coordinates

**Container Dimensions**: 98px × 98px (border-box)
**Border Thickness**: 8px solid
**SVG Alignment**:
- Container center: (49, 49)
- Border centerline radius: 45px
- SVG circle: `cx="49" cy="49" r="45"`

### Progress Calculation

**Angular Distribution**: 360° ÷ 4 quality levels = 90° per range
- Good: 0°-90° (12h-3h)
- Normal: 90°-180° (3h-6h)
- Bad: 180°-270° (6h-9h)
- Very Bad: 270°-360° (9h-12h)

**Proportional Fill**: Value position within range × 90°

### Sensor Type Handling

**VOCs**: Static gray border (`#999`)
**PM10/PM25**: Dynamic stroke overlay with `strokeDasharray`

```typescript
strokeDasharray={`${(angle/360) * circumference} ${circumference}`}
```

### Air Quality Standards Utility

**Centralized Standards**: `/src/utils/airQuality/index.ts`

```typescript
export function getAirQualityLevel(sensorType: SensorType, value: number): AirQualityResult
export function getCircularBarAngle(sensorType: SensorType, value: number): number
export function getSensorInfo(sensorType: SensorType): SensorInfo
```

**Quality Thresholds**:
- PM10: 30/80/150 μg/m³
- PM25: 15/35/75 μg/m³
- Maximum visualization: Bad threshold × 1.5

**Color Mapping**: Level-based color assignment with automatic text contrast

## Air Quality Utility Functions

### Centralized Standards Management

**File**: `/src/utils/airQuality/index.ts`

**Core Functions**:
```typescript
getAirQualityLevel(sensorType, value) → { level, levelText, color, textColor }
getCircularBarAngle(sensorType, value) → degrees (0-360)
getCircularBarMaxValue(sensorType) → maximum threshold for visualization
getSensorInfo(sensorType) → { name, shortName, unit }
```

**Standards Constants**:
- **AIR_QUALITY_STANDARDS**: Threshold definitions per sensor type
- **AIR_QUALITY_COLORS**: Level-to-color mapping
- **Maximum Values**: Bad threshold × 1.5 for complete circle visualization

**Integration**: Replaces fragmented logic across PM10Sensor, PM25Sensor, VOCSensor, AirQualitySensor components