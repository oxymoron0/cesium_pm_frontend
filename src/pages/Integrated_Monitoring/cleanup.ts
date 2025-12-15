/**
 * Integrated Page Cleanup Utilities
 *
 * Purpose: Clean up all service-related state and Cesium DataSources when unmounting
 * Called from: index.tsx unmount() lifecycle hook
 */

import { cleanupAll as cleanupMonitoring } from '@/pages/Monitoring/cleanup';
import { cleanupAll as cleanupSimulation } from '@/pages/Simulation/cleanup';
import { administrativeStore } from '@/stores/AdministrativeStore';

/**
 * Clean up Priority-specific state
 */
export function cleanupPriority(): void {
  try {
    administrativeStore.clearSelection();
  } catch {
    // Silent error handling
  }
}

/**
 * Master cleanup function
 * Executes all cleanup operations for all services
 */
export function cleanupAll(): void {
  cleanupMonitoring();
  cleanupSimulation();
  cleanupPriority();
}
