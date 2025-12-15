/**
 * Integrated Page - Cesium-only Cleanup Utilities
 *
 * Purpose: Clean up Cesium DataSources without touching MobX stores
 * Used when switching between services to clear visual elements while preserving UI state
 */

import { clearDataSource, removeDataSource, listDataSources } from '@/utils/cesium/datasources';
import { clearLocationMarker } from '@/utils/cesium/locationMarker';
import { clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { disableDirectLocationClickHandler } from '@/utils/cesium/directLocationRenderer';

/**
 * DataSource name patterns for each service
 */
const MONITORING_DATASOURCES = {
  routes: 'routes',
  stationsPrefix: 'stations_',
  busModels: 'bus_models',
};

const SIMULATION_DATASOURCES = {
  locationMarker: 'simulation_location_marker',
  administrativeBoundary: 'administrative_boundary',
  resultStations: 'simulation_result_stations',
  civilResultStations: 'simulation_civil_result_stations',
};

const PRIORITY_DATASOURCES = {
  administrativeBoundary: 'administrative_boundary',
  priorityStations: 'priority_stations',
  nearbyRoads: 'nearby_roads',
  vulnerableFacilities: 'vulnerable_facilities',
  facilityBuildingOutlines: 'facility_building_outlines',
  nearbyBuildingFacilities: 'nearby_building_facilities',
  childcare: 'childcare',
  senior: 'senior',
  availableVulnerabilities: 'available_vulnerabilities',
};

/**
 * Clear Monitoring service Cesium entities
 * Removes routes, stations, and bus models from the viewer
 */
export function clearMonitoringCesium(): void {
  const viewer = window.cviewer;
  if (!viewer) return;

  try {
    // Clear routes
    clearDataSource(MONITORING_DATASOURCES.routes);

    // Clear all station DataSources (pattern: stations_*)
    const allDataSources = listDataSources();
    allDataSources
      .filter(name => name.startsWith(MONITORING_DATASOURCES.stationsPrefix))
      .forEach(name => clearDataSource(name));

    // Remove bus models DataSource
    removeDataSource(MONITORING_DATASOURCES.busModels);

    console.log('[clearMonitoringCesium] Monitoring Cesium entities cleared');
  } catch (error) {
    console.error('[clearMonitoringCesium] Error:', error);
  }
}

/**
 * Clear Simulation service Cesium entities
 * Removes location marker, administrative boundary, and result stations
 */
export function clearSimulationCesium(): void {
  const viewer = window.cviewer;
  if (!viewer) return;

  try {
    // Clear location marker
    clearLocationMarker();
    disableDirectLocationClickHandler();

    // Clear administrative boundary
    clearAdministrativeBoundary();

    // Clear simulation result stations
    clearDataSource(SIMULATION_DATASOURCES.resultStations);
    clearDataSource(SIMULATION_DATASOURCES.civilResultStations);

    console.log('[clearSimulationCesium] Simulation Cesium entities cleared');
  } catch (error) {
    console.error('[clearSimulationCesium] Error:', error);
  }
}

/**
 * Clear Priority service Cesium entities
 * Removes administrative boundary, stations, roads, and vulnerability facilities
 */
export function clearPriorityCesium(): void {
  const viewer = window.cviewer;
  if (!viewer) return;

  try {
    // Clear administrative boundary
    clearAdministrativeBoundary();

    // Clear priority-specific DataSources
    clearDataSource(PRIORITY_DATASOURCES.priorityStations);
    clearDataSource(PRIORITY_DATASOURCES.nearbyRoads);
    clearDataSource(PRIORITY_DATASOURCES.vulnerableFacilities);
    clearDataSource(PRIORITY_DATASOURCES.facilityBuildingOutlines);
    clearDataSource(PRIORITY_DATASOURCES.nearbyBuildingFacilities);

    // Clear vulnerability category DataSources
    clearDataSource(PRIORITY_DATASOURCES.childcare);
    clearDataSource(PRIORITY_DATASOURCES.senior);
    clearDataSource(PRIORITY_DATASOURCES.availableVulnerabilities);

    console.log('[clearPriorityCesium] Priority Cesium entities cleared');
  } catch (error) {
    console.error('[clearPriorityCesium] Error:', error);
  }
}

/**
 * Clear all Cesium entities from all services
 */
export function clearAllCesium(): void {
  clearMonitoringCesium();
  clearSimulationCesium();
  clearPriorityCesium();
  console.log('[clearAllCesium] All Cesium entities cleared');
}
