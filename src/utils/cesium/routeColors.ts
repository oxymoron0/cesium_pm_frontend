import { Color, ColorMaterialProperty } from 'cesium';
import { findDataSource } from './datasources';

/**
 * Route color management utilities
 */

const ROUTE_DATASOURCE_NAME = 'routes';

// Color definitions  
const DEFAULT_COLOR = Color.WHITE.withAlpha(0.7);
const SELECTED_INBOUND_COLOR = Color.fromCssColorString('#00AAFF');
const SELECTED_OUTBOUND_COLOR = Color.fromCssColorString('#FF6B00');

/**
 * Update colors for specific route
 */
export function updateRouteColors(routeName: string, isSelected: boolean): void {
  const dataSource = findDataSource(ROUTE_DATASOURCE_NAME);
  if (!dataSource) return;

  const inboundId = `${routeName}-inbound`;
  const outboundId = `${routeName}-outbound`;

  const inboundEntity = dataSource.entities.getById(inboundId);
  const outboundEntity = dataSource.entities.getById(outboundId);

  if (isSelected) {
    // Apply selected colors to polylines
    if (inboundEntity?.polyline) {
      inboundEntity.polyline.material = new ColorMaterialProperty(SELECTED_INBOUND_COLOR);
    }
    if (outboundEntity?.polyline) {
      outboundEntity.polyline.material = new ColorMaterialProperty(SELECTED_OUTBOUND_COLOR);
    }
  } else {
    // Reset to default colors
    if (inboundEntity?.polyline) {
      inboundEntity.polyline.material = new ColorMaterialProperty(DEFAULT_COLOR);
    }
    if (outboundEntity?.polyline) {
      outboundEntity.polyline.material = new ColorMaterialProperty(DEFAULT_COLOR);
    }
  }
}

/**
 * Reset all routes to default colors
 */
export function resetAllRouteColors(): void {
  const dataSource = findDataSource(ROUTE_DATASOURCE_NAME);
  if (!dataSource) return;

  dataSource.entities.values.forEach(entity => {
    if (entity.polyline) {
      entity.polyline.material = new ColorMaterialProperty(DEFAULT_COLOR);
    }
  });
}