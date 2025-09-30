/**
 * Monitoring Page Cleanup Utilities
 *
 * Purpose: Clean up MobX stores and Cesium DataSources when unmounting
 * Called from: index.tsx unmount() lifecycle hook
 */

import { routeStore } from '@/stores/RouteStore';
import { stationStore } from '@/stores/StationStore';
import { busStore } from '@/stores/BusStore';
import { stationSensorStore } from '@/stores/StationSensorStore';

/**
 * Clean up all MobX stores
 * Resets all observable state to initial values
 */
export function cleanupStores(): void {
  try {
    routeStore.clearSelection();
    routeStore.routeInfoList = [];
    routeStore.routeGeomMap.clear();

    stationStore.clearStationSelection();
    stationStore.clearDirectionSelection();
    stationStore.stationDataMap.clear();

    busStore.cleanup();

    stationSensorStore.clearVisibleStations();
  } catch {
    // Silent error handling
  }
}

/**
 * Clean up all Cesium DataSources
 * Removes all DataSources from the viewer
 */
export function cleanupCesiumDataSources(): void {
  const viewer = (window as unknown as { cviewer?: { dataSources: { removeAll: () => void } } }).cviewer;
  if (!viewer) return;

  try {
    viewer.dataSources.removeAll();
  } catch {
    // Silent error handling
  }
}

/**
 * Master cleanup function
 * Executes all cleanup operations in correct order
 */
export function cleanupAll(): void {
  cleanupStores();
  cleanupCesiumDataSources();
}