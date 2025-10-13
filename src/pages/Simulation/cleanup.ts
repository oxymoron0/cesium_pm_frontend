/**
 * Simulation Page Cleanup Utilities
 *
 * Purpose: Clean up Cesium DataSources when unmounting
 * Called from: index.tsx unmount() lifecycle hook
 */

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
 * Executes all cleanup operations
 */
export function cleanupAll(): void {
  cleanupCesiumDataSources();
}
