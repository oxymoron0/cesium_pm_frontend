import { Color, ColorMaterialProperty, Entity, PolylineGraphics, Cartesian3, ConstantProperty } from 'cesium';
import { findDataSource } from './datasources';
import type { RouteGeom, GeoJSONLineString } from '../api/types';

/**
 * Route focus overlay management utilities
 */

const ROUTE_DATASOURCE_NAME = 'routes';

// Color definitions - unified blue color for both directions
const FOCUSED_INBOUND_COLOR = Color.fromCssColorString('#00AAFF');
const FOCUSED_OUTBOUND_COLOR = Color.fromCssColorString('#00AAFF');
const UNFOCUSED_COLOR = Color.fromCssColorString('#66CCFF'); // 더 연한 파란색

// Focused route entity IDs
const FOCUSED_INBOUND_ID = 'focused_inbound';
const FOCUSED_OUTBOUND_ID = 'focused_outbound';

/**
 * Remove Z coordinates from geometry to enable terrain clamping
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
 * Create focused route overlay entities for selected route
 */
export function createFocusedRoute(routeGeom: RouteGeom, selectedDirection?: 'inbound' | 'outbound'): void {
  const dataSource = findDataSource(ROUTE_DATASOURCE_NAME);
  if (!dataSource) return;

  // Remove existing focused routes first
  removeFocusedRoute();

  const routeName = routeGeom.route_name;

  try {
    // Create focused inbound polyline entity
    const inboundCoords = removeZCoordinates(routeGeom.inbound).coordinates;
    const focusedInboundEntity = new Entity({
      id: FOCUSED_INBOUND_ID,
      name: `Focused Route ${routeName} Inbound`,
      polyline: new PolylineGraphics({
        positions: Cartesian3.fromDegreesArray(inboundCoords.flat()),
        width: selectedDirection === 'inbound' ? 6.0 : 5.0, // Thicker if selected direction
        material: new ColorMaterialProperty(
          selectedDirection === 'inbound' ? FOCUSED_INBOUND_COLOR.withAlpha(1.0) : UNFOCUSED_COLOR.withAlpha(0.4)
        ),
        clampToGround: true
      })
    });

    // Create focused outbound polyline entity
    const outboundCoords = removeZCoordinates(routeGeom.outbound).coordinates;
    const focusedOutboundEntity = new Entity({
      id: FOCUSED_OUTBOUND_ID,
      name: `Focused Route ${routeName} Outbound`,
      polyline: new PolylineGraphics({
        positions: Cartesian3.fromDegreesArray(outboundCoords.flat()),
        width: selectedDirection === 'outbound' ? 6.0 : 5.0, // Thicker if selected direction
        material: new ColorMaterialProperty(
          selectedDirection === 'outbound' ? FOCUSED_OUTBOUND_COLOR.withAlpha(1.0) : UNFOCUSED_COLOR.withAlpha(0.4)
        ),
        clampToGround: true
      })
    });

    // Add focused entities (will render on top as they are added last)
    dataSource.entities.add(focusedInboundEntity);
    dataSource.entities.add(focusedOutboundEntity);

    console.log(`[createFocusedRoute] Created focused overlay for route ${routeName}, direction: ${selectedDirection || 'none'}`);
  } catch (error) {
    console.error(`[createFocusedRoute] Failed to create focused route for ${routeName}:`, error);
  }
}

/**
 * Remove focused route overlay entities
 */
export function removeFocusedRoute(): void {
  const dataSource = findDataSource(ROUTE_DATASOURCE_NAME);
  if (!dataSource) return;

  const focusedInbound = dataSource.entities.getById(FOCUSED_INBOUND_ID);
  const focusedOutbound = dataSource.entities.getById(FOCUSED_OUTBOUND_ID);

  if (focusedInbound) {
    dataSource.entities.remove(focusedInbound);
  }
  if (focusedOutbound) {
    dataSource.entities.remove(focusedOutbound);
  }

  console.log('[removeFocusedRoute] Removed focused route overlays');
}

/**
 * Update focused route direction emphasis
 */
export function updateFocusedRouteDirection(selectedDirection: 'inbound' | 'outbound' | null): void {
  const dataSource = findDataSource(ROUTE_DATASOURCE_NAME);
  if (!dataSource) return;

  const focusedInbound = dataSource.entities.getById(FOCUSED_INBOUND_ID);
  const focusedOutbound = dataSource.entities.getById(FOCUSED_OUTBOUND_ID);

  if (!focusedInbound || !focusedOutbound) {
    console.warn('[updateFocusedRouteDirection] No focused route entities found');
    return;
  }

  try {
    // Update inbound entity
    if (focusedInbound.polyline) {
      focusedInbound.polyline.width = new ConstantProperty(selectedDirection === 'inbound' ? 6.0 : 5.0);
      focusedInbound.polyline.material = new ColorMaterialProperty(
        selectedDirection === 'inbound' ? FOCUSED_INBOUND_COLOR.withAlpha(1.0) : UNFOCUSED_COLOR.withAlpha(0.4)
      );
    }

    // Update outbound entity
    if (focusedOutbound.polyline) {
      focusedOutbound.polyline.width = new ConstantProperty(selectedDirection === 'outbound' ? 6.0 : 5.0);
      focusedOutbound.polyline.material = new ColorMaterialProperty(
        selectedDirection === 'outbound' ? FOCUSED_OUTBOUND_COLOR.withAlpha(1.0) : UNFOCUSED_COLOR.withAlpha(0.4)
      );
    }

    console.log(`[updateFocusedRouteDirection] Updated direction emphasis: ${selectedDirection || 'none'}`);
  } catch (error) {
    console.error('[updateFocusedRouteDirection] Failed to update direction emphasis:', error);
  }
}

/**
 * Check if focused route overlay exists
 */
export function hasFocusedRoute(): boolean {
  const dataSource = findDataSource(ROUTE_DATASOURCE_NAME);
  if (!dataSource) return false;

  return !!(dataSource.entities.getById(FOCUSED_INBOUND_ID) &&
            dataSource.entities.getById(FOCUSED_OUTBOUND_ID));
}


/**
 * Legacy function - kept for compatibility (now deprecated)
 */
export function resetAllRouteColors(): void {
  // This function is now deprecated in favor of focused route overlay system
  console.warn('[resetAllRouteColors] Deprecated function - use removeFocusedRoute instead');
}