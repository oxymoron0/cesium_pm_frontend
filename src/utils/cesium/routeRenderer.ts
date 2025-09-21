import { routeStore } from '../../stores/RouteStore';
import { createGeoJsonDataSource, findDataSource, clearDataSource } from './datasources';
import type { RouteGeom, GeoJSONLineString } from '../api/types';
import type { GeoJsonDataSource } from 'cesium';
import { Color, ColorMaterialProperty, Cartesian3, Entity, PolylineGraphics } from 'cesium';

/**
 * Route rendering utility functions
 */

const ROUTE_DATASOURCE_NAME = 'routes';

/**
 * Remove Z coordinates from geometry to enable terrain clamping
 * @param geometry - GeoJSON geometry object
 * @returns Geometry with 2D coordinates only
 */
function removeZCoordinates(geometry: GeoJSONLineString): { type: 'LineString'; coordinates: [number, number][] } {
  if (!geometry || !geometry.coordinates) {
    return { type: 'LineString', coordinates: [] };
  }

  const processCoordinates = (coords: [number, number, number][]): [number, number][] => {
    return coords.map(([lng, lat]) => [lng, lat]);
  };

  return {
    ...geometry,
    coordinates: processCoordinates(geometry.coordinates)
  };
}


/**
 * Render a single Route geometry using GeoJsonDataSource
 * @param routeGeom - Route geometry data
 */
export async function renderRoute(routeGeom: RouteGeom): Promise<void> {
  try {
    // Check/create GeoJsonDataSource
    let dataSource = findDataSource(ROUTE_DATASOURCE_NAME) as GeoJsonDataSource;
    if (!dataSource) {
      dataSource = await createGeoJsonDataSource(ROUTE_DATASOURCE_NAME);
    }

    const routeName = routeGeom.route_name;

    // Check if entities already exist to avoid duplicates
    const inboundId = `${routeName}-inbound`;
    const outboundId = `${routeName}-outbound`;
    
    if (dataSource.entities.getById(inboundId) || dataSource.entities.getById(outboundId)) {
      console.log(`[renderRoute] Route ${routeName} entities already exist, skipping`);
      return;
    }

    // Create inbound polyline entity directly
    const inboundCoords = removeZCoordinates(routeGeom.inbound).coordinates;
    const inboundEntity = new Entity({
      id: inboundId,
      name: `Route ${routeName} Inbound`,
      polyline: new PolylineGraphics({
        positions: Cartesian3.fromDegreesArray(inboundCoords.flat()),
        width: 3.5,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.7)),
        clampToGround: true
      })
    });

    // Create outbound polyline entity directly
    const outboundCoords = removeZCoordinates(routeGeom.outbound).coordinates;
    const outboundEntity = new Entity({
      id: outboundId,
      name: `Route ${routeName} Outbound`,
      polyline: new PolylineGraphics({
        positions: Cartesian3.fromDegreesArray(outboundCoords.flat()),
        width: 3.5,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.7)),
        clampToGround: true
      })
    });

    // Add entities to DataSource
    dataSource.entities.add(inboundEntity);
    dataSource.entities.add(outboundEntity);

  } catch (error) {
    console.error(`[renderRoute] Failed to render route ${routeGeom.route_name}:`, error);
  }
}

/**
 * Render all Routes using MobX store data
 */
export async function renderAllRoutes(): Promise<void> {
  try {
    // Clear existing Route entities first
    clearDataSource(ROUTE_DATASOURCE_NAME);

    // Get all RouteGeom data from MobX store
    const routeGeomMap = routeStore.routeGeomMap;

    if (routeGeomMap.size === 0) {
      console.warn('[renderAllRoutes] No RouteGeom data available');
      return;
    }
    
    // Render each route individually using renderRoute
    for (const [, routeGeom] of routeGeomMap.entries()) {
      await renderRoute(routeGeom);
    }
  } catch (error) {
    console.error('[renderAllRoutes] Failed to render all routes:', error);
  }
}

/**
 * Clear all Route entities
 */
export function clearAllRoutes(): void {
  try {
    clearDataSource(ROUTE_DATASOURCE_NAME);
  } catch (error) {
    console.error('[clearAllRoutes] Failed to clear routes:', error);
  }
}