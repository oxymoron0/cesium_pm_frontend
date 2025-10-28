/**
 * Administrative Division API Types
 *
 * GET /api/v1/administrative
 * GET /api/v1/administrative/geometry
 *
 * @description Types for South Korean administrative division code queries and geometry data
 */

import type { GeoJSONMultiPolygon } from './postgis';

/**
 * Administrative division response (provinces, districts, neighborhoods, villages)
 *
 * Unified endpoint returns different levels based on parameters:
 * - No parameters → Provinces (시도)
 * - province_code → Districts (시군구)
 * - province_code + district_code → Neighborhoods (읍면동)
 * - province_code + district_code + neighborhood_code → Villages (리)
 */
export interface AdministrativeDivision {
  code: string;       // Full administrative code (2-10 digits)
  name: string;       // Division name only (e.g., "강서구")
  full_name: string;  // Complete hierarchical name (e.g., "부산광역시 강서구")
}

/**
 * Geometry query parameters
 */
export interface GeometryQueryParams {
  province_code: string;           // Province code (2 digits, required)
  district_code?: string;          // District code (3 digits, optional)
  neighborhood_code?: string;      // Neighborhood code (3 digits, optional)
  village_code?: string;           // Village code (2 digits, optional)
}

/**
 * Geometry response (successful)
 */
export interface AdministrativeGeometrySuccess {
  success: true;
  full_name: string;               // Complete hierarchical name
  geom: GeoJSONMultiPolygon;       // GeoJSON MultiPolygon geometry
}

/**
 * Geometry response (not found)
 */
export interface AdministrativeGeometryNotFound {
  success: false;
  message: 'not found';            // Administrative code doesn't exist
}

/**
 * Geometry response (not updated)
 */
export interface AdministrativeGeometryNotUpdated {
  success: false;
  full_name: string;               // Administrative division name exists
  message: 'not updated';          // But geometry data is not available
}

/**
 * Geometry response (parameter error)
 */
export interface AdministrativeGeometryParameterError {
  success: false;
  message: string;                 // Error message (starts with "parameter error:")
}

/**
 * Union type for all geometry response types
 */
export type AdministrativeGeometryResponse =
  | AdministrativeGeometrySuccess
  | AdministrativeGeometryNotFound
  | AdministrativeGeometryNotUpdated
  | AdministrativeGeometryParameterError;

/**
 * Administrative level type
 */
export type AdministrativeLevel = 'province' | 'district' | 'neighborhood' | 'village';

/**
 * Helper type guards for geometry response discrimination
 */
export function isGeometrySuccess(
  response: AdministrativeGeometryResponse
): response is AdministrativeGeometrySuccess {
  return response.success === true;
}

export function isGeometryNotFound(
  response: AdministrativeGeometryResponse
): response is AdministrativeGeometryNotFound {
  return response.success === false && response.message === 'not found';
}

export function isGeometryNotUpdated(
  response: AdministrativeGeometryResponse
): response is AdministrativeGeometryNotUpdated {
  return response.success === false && response.message === 'not updated';
}

export function isGeometryParameterError(
  response: AdministrativeGeometryResponse
): response is AdministrativeGeometryParameterError {
  return response.success === false && response.message.startsWith('parameter error:');
}
