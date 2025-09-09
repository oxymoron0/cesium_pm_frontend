import { routeStore } from '../../stores/RouteStore';
import { createGeoJsonDataSource, findDataSource, clearDataSource } from './datasources';
import type { RouteGeom } from '../api/types';
import type { GeoJsonDataSource } from 'cesium';
import { Color, ColorMaterialProperty, Cartesian3 } from 'cesium';

/**
 * Route rendering utility functions
 */

const ROUTE_DATASOURCE_NAME = 'routes';
const DEFAULT_COLOR = Color.WHITE.withAlpha(0.7);


/**
 * Render a single Route geometry using GeoJsonDataSource
 * @param routeGeom - Route geometry data
 */
export function renderRoute(routeGeom: RouteGeom): void {
  try {
    // Check/create GeoJsonDataSource
    let dataSource = findDataSource(ROUTE_DATASOURCE_NAME) as GeoJsonDataSource;
    if (!dataSource) {
      dataSource = createGeoJsonDataSource(ROUTE_DATASOURCE_NAME);
    }

    const routeName = routeGeom.route_name;

    // Create GeoJSON FeatureCollection for this route
    const geoJsonData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: `${routeName}-inbound`,
          properties: {
            name: `Route ${routeName} Inbound`,
            stroke: '#ffffff',
            'stroke-width': 2,
            'stroke-opacity': 1,
            fill: '#ffffff',
            'fill-opacity': 0.7
          },
          geometry: routeGeom.inbound
        },
        {
          type: 'Feature',
          id: `${routeName}-outbound`,
          properties: {
            name: `Route ${routeName} Outbound`,
            stroke: '#ffffff',
            'stroke-width': 2,
            'stroke-opacity': 1,
            fill: '#ffffff',
            'fill-opacity': 0.7
          },
          geometry: routeGeom.outbound
        }
      ]
    };

    // Load GeoJSON data
    dataSource.load(geoJsonData);

    console.log(`[renderRoute] Route ${routeName} rendered successfully with GeoJsonDataSource`);
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

    // Get all RouteGeom data from MobX store
    const routeGeomMap = routeStore.routeGeomMap;

    if (routeGeomMap.size === 0) {
      console.warn('[renderAllRoutes] No RouteGeom data available');
      return;
    }

    // Check/create GeoJsonDataSource
    let dataSource = findDataSource(ROUTE_DATASOURCE_NAME) as GeoJsonDataSource;
    if (!dataSource) {
      dataSource = createGeoJsonDataSource(ROUTE_DATASOURCE_NAME);
    }

    // Combine all routes into single FeatureCollection
    const allFeatures: any[] = [];
    
    routeGeomMap.forEach((routeGeom) => {
      const routeName = routeGeom.route_name;
      
      allFeatures.push({
        type: 'Feature',
        id: `${routeName}-inbound`,
        properties: {
          name: `Route ${routeName} Inbound`,
          stroke: '#ffffff',
          'stroke-width': 2,
          'stroke-opacity': 1,
          fill: '#ffffff',
          'fill-opacity': 0.7
        },
        geometry: routeGeom.inbound
      });

      allFeatures.push({
        type: 'Feature',
        id: `${routeName}-outbound`,
        properties: {
          name: `Route ${routeName} Outbound`,
          stroke: '#ffffff',
          'stroke-width': 2,
          'stroke-opacity': 1,
          fill: '#ffffff',
          'fill-opacity': 0.7
        },
        geometry: routeGeom.outbound
      });
    });

    const geoJsonData = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    // Load all routes at once
    dataSource.load(geoJsonData);

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