/**
 * Simulation Page Cleanup Utilities
 *
 * Purpose: Clean up Cesium DataSources, administrative boundaries, and store state when unmounting
 * Called from: index.tsx unmount() lifecycle hook
 */

import { clearAdministrativeBoundary } from '@/utils/cesium/administrativeRenderer';
import { clearLocationMarker } from '@/utils/cesium/locationMarker';
import { simulationStore } from '@/stores/SimulationStore';

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
 * Clean up administrative boundary
 * Removes boundary polygons from Cesium viewer
 */
export function cleanupAdministrativeBoundary(): void {
  try {
    clearAdministrativeBoundary();
  } catch {
    // Silent error handling
  }
}

/**
 * Clean up location marker
 * Removes location marker from Cesium viewer
 */
export function cleanupLocationMarker(): void {
  try {
    clearLocationMarker();
  } catch {
    // Silent error handling
  }
}

/**
 * Clean up SimulationStore state
 * Resets all UI state to initial values
 */
export function cleanupSimulationStore(): void {
  try {
    simulationStore.cleanup();
  } catch {
    // Silent error handling
  }
}

/**
 * Master cleanup function
 * Executes all cleanup operations
 */
export function cleanupAll(): void {
  cleanupSimulationStore();
  cleanupCesiumDataSources();
  cleanupAdministrativeBoundary();
  cleanupLocationMarker();
}
