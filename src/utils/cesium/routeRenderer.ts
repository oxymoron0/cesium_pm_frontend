import { Color, Entity, Cartesian3 } from 'cesium';
import { routeStore } from '../../stores/RouteStore';
import { createDataSource, findDataSource, clearDataSource } from './datasources';
import type { RouteGeom } from '../api/types';

/**
 * Route rendering utility functions
 */

const ROUTE_DATASOURCE_NAME = 'routes';

/**
 * Convert GeoJSON Polygon to Cesium Cartesian3 coordinates
 * @param geoJsonPolygon - GeoJSON Polygon object
 * @returns Array of Cartesian3 coordinates
 */
function parseGeoJSONPolygon(geoJsonPolygon: any): Cartesian3[] {
  if (!geoJsonPolygon || geoJsonPolygon.type !== 'Polygon') {
    throw new Error(`Invalid GeoJSON Polygon format`);
  }
  
  // Use the first linear ring (exterior ring)
  const coordinates = geoJsonPolygon.coordinates[0];
  
  return coordinates.map((coord: [number, number]) => {
    const [lng, lat] = coord;
    return Cartesian3.fromDegrees(lng, lat);
  });
}

/**
 * Render a single Route geometry
 * @param routeGeom - Route geometry data
 */
export function renderRoute(routeGeom: RouteGeom): void {
  try {
    // Check/create DataSource
    let dataSource = findDataSource(ROUTE_DATASOURCE_NAME);
    if (!dataSource) {
      dataSource = createDataSource(ROUTE_DATASOURCE_NAME);
    }

    const routeName = routeGeom.route_name;

    // Create inbound Entity
    const inboundCoords = parseGeoJSONPolygon(routeGeom.inbound);
    const inboundEntity = new Entity({
      id: `${routeName}-inbound`,
      name: 'route',
      polygon: {
        hierarchy: inboundCoords,
        material: Color.WHITE.withAlpha(0.7), // 30% transparency (alpha = 0.7)
        outline: true,
        outlineColor: Color.WHITE
      }
    });

    // Create outbound Entity
    const outboundCoords = parseGeoJSONPolygon(routeGeom.outbound);
    const outboundEntity = new Entity({
      id: `${routeName}-outbound`,
      name: 'route',
      polygon: {
        hierarchy: outboundCoords,
        material: Color.WHITE.withAlpha(0.7), // 30% transparency (alpha = 0.7)
        outline: true,
        outlineColor: Color.WHITE
      }
    });

    // Add entities to DataSource
    dataSource.entities.add(inboundEntity);
    dataSource.entities.add(outboundEntity);

    console.log(`[renderRoute] Route ${routeName} rendered successfully`);
  } catch (error) {
    console.error(`[renderRoute] Failed to render route ${routeGeom.route_name}:`, error);
  }
}

/**
 * Render all Routes using MobX store data
 */
export function renderAllRoutes(): void {
  try {
    // Clear existing Route entities
    clearDataSource(ROUTE_DATASOURCE_NAME);

    // Get all RouteGeom data from MobX store and render
    const routeGeomMap = routeStore.routeGeomMap;
    
    if (routeGeomMap.size === 0) {
      console.warn('[renderAllRoutes] No RouteGeom data available');
      return;
    }

    routeGeomMap.forEach((routeGeom) => {
      renderRoute(routeGeom);
    });

    console.log(`[renderAllRoutes] Successfully rendered ${routeGeomMap.size} routes`);
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
    console.log('[clearAllRoutes] All routes cleared successfully');
  } catch (error) {
    console.error('[clearAllRoutes] Failed to clear routes:', error);
  }
}