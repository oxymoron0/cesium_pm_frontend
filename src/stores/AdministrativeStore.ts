import { makeAutoObservable, runInAction } from 'mobx';
import { API_PATHS } from '@/utils/api/config';
import type {
  AdministrativeDivision,
  AdministrativeGeometryResponse,
  GeometryQueryParams,
} from '@/types/administrative';
import type { GeoJSONMultiPolygon } from '@/types/postgis';

/**
 * Administrative Division Store
 *
 * Manages South Korean administrative division data and geometry
 * Supports hierarchical selection: Province → District → Neighborhood → Village
 */
class AdministrativeStore {
  // ============================================================================
  // Administrative Division Data
  // ============================================================================
  provinces: AdministrativeDivision[] = [];
  districts: AdministrativeDivision[] = [];
  neighborhoods: AdministrativeDivision[] = [];
  villages: AdministrativeDivision[] = [];

  // ============================================================================
  // Selection State
  // ============================================================================
  selectedProvinceCode: string | null = null;
  selectedDistrictCode: string | null = null;
  selectedNeighborhoodCode: string | null = null;
  selectedVillageCode: string | null = null;

  // ============================================================================
  // Geometry Cache
  // ============================================================================
  geometryCache: Map<string, GeoJSONMultiPolygon> = new Map();

  // ============================================================================
  // Loading State
  // ============================================================================
  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // ============================================================================
  // Data Loading Methods
  // ============================================================================

  /**
   * Load provinces (시도)
   */
  async loadProvinces(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await fetch(API_PATHS.ADMINISTRATIVE_PROVINCES);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load provinces`);
      }
      const data: AdministrativeDivision[] = await response.json();
      runInAction(() => {
        this.provinces = data;
        this.loading = false;
      });
      console.log('[AdministrativeStore] Loaded provinces:', data.length);
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.loading = false;
      });
      console.error('[AdministrativeStore] Failed to load provinces:', error);
    }
  }

  /**
   * Load districts (시군구) for selected province
   */
  async loadDistricts(provinceCode: string): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await fetch(API_PATHS.ADMINISTRATIVE_DISTRICTS(provinceCode));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load districts`);
      }
      const data: AdministrativeDivision[] = await response.json();
      runInAction(() => {
        this.districts = data;
        this.loading = false;
      });
      console.log('[AdministrativeStore] Loaded districts:', data.length);
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.loading = false;
      });
      console.error('[AdministrativeStore] Failed to load districts:', error);
    }
  }

  /**
   * Load neighborhoods (읍면동) for selected district
   */
  async loadNeighborhoods(provinceCode: string, districtCode: string): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await fetch(API_PATHS.ADMINISTRATIVE_NEIGHBORHOODS(provinceCode, districtCode));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load neighborhoods`);
      }
      const data: AdministrativeDivision[] = await response.json();
      runInAction(() => {
        this.neighborhoods = data;
        this.loading = false;
      });
      console.log('[AdministrativeStore] Loaded neighborhoods:', data.length);
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.loading = false;
      });
      console.error('[AdministrativeStore] Failed to load neighborhoods:', error);
    }
  }

  /**
   * Load villages (리) for selected neighborhood
   */
  async loadVillages(provinceCode: string, districtCode: string, neighborhoodCode: string): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await fetch(API_PATHS.ADMINISTRATIVE_VILLAGES(provinceCode, districtCode, neighborhoodCode));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load villages`);
      }
      const data: AdministrativeDivision[] = await response.json();
      runInAction(() => {
        this.villages = data;
        this.loading = false;
      });
      console.log('[AdministrativeStore] Loaded villages:', data.length);
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.loading = false;
      });
      console.error('[AdministrativeStore] Failed to load villages:', error);
    }
  }

  /**
   * Load geometry for administrative division
   */
  async loadGeometry(params: GeometryQueryParams): Promise<AdministrativeGeometryResponse> {
    this.loading = true;
    this.error = null;
    try {
      const cacheKey = this.getCacheKey(params);

      // Check cache first
      if (this.geometryCache.has(cacheKey)) {
        console.log('[AdministrativeStore] Using cached geometry:', cacheKey);
        this.loading = false;
        return {
          success: true,
          full_name: cacheKey,
          geom: this.geometryCache.get(cacheKey)!,
        };
      }

      const response = await fetch(API_PATHS.ADMINISTRATIVE_GEOMETRY(params));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load geometry`);
      }
      const data: AdministrativeGeometryResponse = await response.json();

      runInAction(() => {
        // Cache successful geometry responses
        if (data.success) {
          this.geometryCache.set(cacheKey, data.geom);
        }
        this.loading = false;
      });

      console.log('[AdministrativeStore] Loaded geometry:', data);
      return data;
    } catch (error) {
      runInAction(() => {
        this.error = String(error);
        this.loading = false;
      });
      console.error('[AdministrativeStore] Failed to load geometry:', error);
      throw error;
    }
  }

  // ============================================================================
  // Selection Methods
  // ============================================================================

  /**
   * Select province and load its districts
   */
  async selectProvince(provinceCode: string): Promise<void> {
    this.selectedProvinceCode = provinceCode;
    this.selectedDistrictCode = null;
    this.selectedNeighborhoodCode = null;
    this.selectedVillageCode = null;
    this.districts = [];
    this.neighborhoods = [];
    this.villages = [];

    if (provinceCode) {
      await this.loadDistricts(provinceCode);
    }
  }

  /**
   * Select district and load its neighborhoods
   */
  async selectDistrict(districtCode: string): Promise<void> {
    this.selectedDistrictCode = districtCode;
    this.selectedNeighborhoodCode = null;
    this.selectedVillageCode = null;
    this.neighborhoods = [];
    this.villages = [];

    if (this.selectedProvinceCode && districtCode) {
      await this.loadNeighborhoods(this.selectedProvinceCode, districtCode);
    }
  }

  /**
   * Select neighborhood and load its villages
   */
  async selectNeighborhood(neighborhoodCode: string): Promise<void> {
    this.selectedNeighborhoodCode = neighborhoodCode;
    this.selectedVillageCode = null;
    this.villages = [];

    if (this.selectedProvinceCode && this.selectedDistrictCode && neighborhoodCode) {
      await this.loadVillages(this.selectedProvinceCode, this.selectedDistrictCode, neighborhoodCode);
    }
  }

  /**
   * Select village
   */
  selectVillage(villageCode: string): void {
    this.selectedVillageCode = villageCode;
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedProvinceCode = null;
    this.selectedDistrictCode = null;
    this.selectedNeighborhoodCode = null;
    this.selectedVillageCode = null;
    this.districts = [];
    this.neighborhoods = [];
    this.villages = [];
  }

  // ============================================================================
  // Computed Properties
  // ============================================================================

  /**
   * Get current geometry query parameters
   */
  get currentGeometryParams(): GeometryQueryParams | null {
    if (!this.selectedProvinceCode) return null;

    const params: GeometryQueryParams = {
      province_code: this.selectedProvinceCode,
    };

    if (this.selectedDistrictCode) {
      params.district_code = this.selectedDistrictCode;
    }
    if (this.selectedNeighborhoodCode) {
      params.neighborhood_code = this.selectedNeighborhoodCode;
    }
    if (this.selectedVillageCode) {
      params.village_code = this.selectedVillageCode;
    }

    return params;
  }

  /**
   * Get selected administrative division name
   */
  get selectedDivisionName(): string | null {
    if (this.selectedVillageCode) {
      const village = this.villages.find(v => v.code.endsWith(this.selectedVillageCode!));
      return village?.full_name || null;
    }
    if (this.selectedNeighborhoodCode) {
      const neighborhood = this.neighborhoods.find(n => n.code.endsWith(this.selectedNeighborhoodCode!));
      return neighborhood?.full_name || null;
    }
    if (this.selectedDistrictCode) {
      const district = this.districts.find(d => d.code.endsWith(this.selectedDistrictCode!));
      return district?.full_name || null;
    }
    if (this.selectedProvinceCode) {
      const province = this.provinces.find(p => p.code === this.selectedProvinceCode);
      return province?.full_name || null;
    }
    return null;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate cache key from geometry params
   */
  private getCacheKey(params: GeometryQueryParams): string {
    const parts = [params.province_code];
    if (params.district_code) parts.push(params.district_code);
    if (params.neighborhood_code) parts.push(params.neighborhood_code);
    if (params.village_code) parts.push(params.village_code);
    return parts.join('_');
  }

  /**
   * Clear geometry cache
   */
  clearCache(): void {
    this.geometryCache.clear();
    console.log('[AdministrativeStore] Geometry cache cleared');
  }
}

// Export singleton instance
export const administrativeStore = new AdministrativeStore();
