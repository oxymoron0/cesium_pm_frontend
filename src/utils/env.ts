/**
 * Runtime Configuration Utility
 *
 * Loads configuration from config.json at runtime.
 * In Docker/Kubernetes, config.json is generated at container startup from environment variables.
 * In development, default values from public/config.json are used.
 *
 * @example
 * ```typescript
 * import { loadConfig, isCivil } from '@/utils/env';
 *
 * // Load config once at app startup
 * await loadConfig();
 *
 * // Then use synchronously
 * if (isCivil()) {
 *   // Civil mode specific logic
 * }
 * ```
 */

export interface RuntimeConfig {
  isCivil: boolean;
}

// Cached configuration
let cachedConfig: RuntimeConfig | null = null;

// Default configuration (fallback)
const defaultConfig: RuntimeConfig = {
  isCivil: false,
};

/**
 * Load configuration from config.json
 * Should be called once at app initialization
 */
export async function loadConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const basePath = import.meta.env.VITE_BASE_PATH || '/';
    const response = await fetch(`${basePath}config.json`);

    if (!response.ok) {
      console.warn('[env] Failed to load config.json, using defaults');
      cachedConfig = defaultConfig;
      return cachedConfig;
    }

    const config = await response.json();
    cachedConfig = {
      isCivil: config.isCivil ?? defaultConfig.isCivil,
    };

    console.log('[env] Config loaded:', cachedConfig);
    return cachedConfig;
  } catch (error) {
    console.warn('[env] Error loading config.json, using defaults:', error);
    cachedConfig = defaultConfig;
    return cachedConfig;
  }
}

/**
 * Get cached configuration
 * Returns default config if not loaded yet
 */
export function getConfig(): RuntimeConfig {
  return cachedConfig ?? defaultConfig;
}

/**
 * Check if application is running in civil mode
 */
export function isCivil(): boolean {
  return getConfig().isCivil;
}

/**
 * Check if config has been loaded
 */
export function isConfigLoaded(): boolean {
  return cachedConfig !== null;
}
