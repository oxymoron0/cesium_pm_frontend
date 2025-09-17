# Cesium Production Architecture

## Core Strategy: Microfrontend WebGL Management

**Critical Pattern**: Global viewer singleton with DataSource isolation per domain

```typescript
// Global viewer access (microfrontend requirement)
const viewer = (window as any).cviewer

// Domain-isolated DataSource hierarchy
viewer.dataSources
├── 'routes' (GeoJsonDataSource)           // Route geometries
├── 'stations_{route}_{dir}' (GeoJsonDataSource)  // Per route-direction isolation
└── 'focused_{type}' (CustomDataSource)    // Temporary highlights
```

## DataSource Isolation Strategy

**Performance-Critical**: Prevent DataSource collision in shared viewer environment

```typescript
// DataSource reuse pattern (memory optimization)
export async function createGeoJsonDataSource(name: string): Promise<GeoJsonDataSource> {
  const existing = viewer.dataSources.getByName(name);
  if (existing.length > 0) return existing[0]; // Reuse existing

  const dataSource = new GeoJsonDataSource(name);
  await viewer.dataSources.add(dataSource);
  return dataSource;
}

// Bulk visibility control (route switching optimization)
export function showOnlyStationsForRoute(routeName: string): void {
  listDataSources()
    .filter(name => name.startsWith('stations_'))
    .forEach(name => toggleDataSource(name, false));

  toggleDataSource(`stations_${routeName}_inbound`, true);
  toggleDataSource(`stations_${routeName}_outbound`, true);
}
```

## PostGIS-Cesium Integration Strategy

**Critical Optimization**: Z-coordinate removal for terrain clamping

```typescript
// PostGIS LineString → Cesium Entity pipeline
function removeZCoordinates(geometry: any): any {
  const processCoordinates = (coords: any[]): any[] =>
    typeof coords[0] === 'number' ? [coords[0], coords[1]] : coords.map(processCoordinates);

  return { ...geometry, coordinates: processCoordinates(geometry.coordinates) };
}

// Entity deduplication strategy
export async function renderRoute(routeGeom: RouteGeom): Promise<void> {
  const dataSource = await createGeoJsonDataSource('routes');
  const entityId = `${routeGeom.route_name}-${direction}`;

  if (dataSource.entities.getById(entityId)) return; // Skip existing

  const coords = removeZCoordinates(routeGeom[direction]).coordinates;
  dataSource.entities.add(new Entity({
    id: entityId,
    polyline: new PolylineGraphics({
      positions: Cartesian3.fromDegreesArray(coords.flat()),
      clampToGround: true,
      material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.7))
    })
  }));
}
```

## CallbackProperty Reactive Strategy

**Expert Pattern**: MobX-driven dynamic entity properties

```typescript
// 4-tier visual hierarchy with reactive updates
function createStationEntity(feature: RouteStationFeature, direction: string): Entity {
  return new Entity({
    id: `station_${feature.properties.station_id}`,
    position: Cartesian3.fromDegrees(coords[0], coords[1]),
    point: new PointGraphics({
      pixelSize: new CallbackProperty(() => {
        const isSelected = stationStore.isStationSelected(feature.properties.station_id);
        const isRouteActive = stationStore.selectedRouteName === feature.properties.route_name;
        const isDirectionActive = stationStore.selectedDirection === direction;

        return isSelected ? 12 : isRouteActive && isDirectionActive ? 10 : isRouteActive ? 8 : 6;
      }, false),

      color: new CallbackProperty(() => {
        const colors = ['#444444', '#888888', '#00AAFF', '#FF6B00'];
        const level = isSelected ? 3 : isRouteActive && isDirectionActive ? 2 : isRouteActive ? 1 : 0;
        return Color.fromCssColorString(colors[level]);
      }, false)
    })
  });
}
```

## MobX Integration Strategy

**Critical Pattern**: Batch observable updates for CallbackProperty efficiency

```typescript
// MobX runInAction batches all CallbackProperty updates
runInAction(() => {
  stationStore.setSelectedStation(newStationId);
  stationStore.setSelectedDirection(newDirection);
}); // Single render cycle for all entities

// Entity existence check (performance-critical)
const existingEntity = dataSource.entities.getById(`station_${stationId}`);
if (existingEntity) return; // Skip duplicate creation
```

## Production Constraints

**Memory Management**: Entity lifecycle in shared viewer
- DataSource reuse prevents memory leaks
- Visibility toggle over recreation
- Batch operations for route switching

**WebGL Limits**: Entity count considerations
- Monitor total entity count < 10k active
- Use DataSource visibility for LOD
- CallbackProperty count impacts frame rate

**Microfrontend Requirements**
- CSS isolation: Exclude Cesium containers from prefixing
- Global viewer: Check `window.cviewer` availability
- Module loading: UMD compatibility for Cesium imports