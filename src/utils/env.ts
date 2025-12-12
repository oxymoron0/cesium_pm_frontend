/**
 * Runtime Environment Configuration Utility
 *
 * Provides type-safe access to runtime environment variables injected via env-config.js.
 * In Docker/Kubernetes, env-config.js is generated at container startup from environment variables.
 * In development, default values from public/env-config.js are used.
 *
 * @example
 * ```typescript
 * import { getEnv, isCivil } from '@/utils/env';
 *
 * // Get specific environment variable
 * const civil = getEnv('IS_CIVIL');
 *
 * // Or use convenience getter
 * if (isCivil()) {
 *   // Civil mode specific logic
 * }
 * ```
 */

export interface RuntimeEnv {
  IS_CIVIL: boolean;
}

/**
 * Get runtime environment configuration
 * Falls back to default values if window.__ENV__ is not available
 */
function getRuntimeEnv(): RuntimeEnv {
  const env = (window as Window & { __ENV__?: RuntimeEnv }).__ENV__;

  return {
    IS_CIVIL: env?.IS_CIVIL ?? false,
  };
}

/**
 * Get a specific environment variable value
 */
export function getEnv<K extends keyof RuntimeEnv>(key: K): RuntimeEnv[K] {
  return getRuntimeEnv()[key];
}

/**
 * Check if application is running in civil mode
 */
export function isCivil(): boolean {
  return getEnv('IS_CIVIL');
}

/**
 * Get all runtime environment variables
 */
export function getAllEnv(): RuntimeEnv {
  return getRuntimeEnv();
}
