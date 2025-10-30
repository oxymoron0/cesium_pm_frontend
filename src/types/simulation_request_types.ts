/**
 * Frontend (React) → Backend API Types
 *
 * POST /api/v1/simulation/process
 *
 * @description Types for submitting simulation requests from React frontend to Go backend
 */

/**
 * Main simulation request payload sent from frontend
 */
export interface SimulationRequest {
  simulation_name: string;           // Simulation name (max 200 chars)
  user: string;                      // User ID (max 50 chars)
  is_private: boolean;               // Whether simulation is private
  timestamp: string;                 // ISO 8601 timestamp (e.g., "2025-10-15T09:00:00Z")
  lot: string;                       // 지번 주소 (max 500 chars)
  road_name: string;                 // 도로명 주소 (max 500 chars)
  location: string;                  // City/Location name (max 100 chars)
  weather: Weather;                  // Weather data
  air_quality: AirQuality;           // Air quality data
}

/**
 * Weather data (meteorological measurements)
 */
export interface Weather {
  wind_direction_1m: number;         // Wind direction at 1m height (degrees, 0-360)
  wind_speed_1m: number;             // Wind speed at 1m height (m/s, 0-100)
  wind_direction_10m: number;        // Wind direction at 10m height (degrees, 0-360)
  wind_speed_10m: number;            // Wind speed at 10m height (m/s, 0-100)
  humidity: number;                  // Relative humidity (%, 0-100)
  sea_level_pressure: number;        // Sea level pressure (hPa, 900-1100)
  temperature: number;               // Air temperature (°C, -50 to 60)
}

/**
 * Air quality data with multiple station measurements
 */
export interface AirQuality {
  pm_type: PMType;                   // Particulate matter type
  points: StationMeasurement[];    // Array of station measurements (min 1)
}

/**
 * Single station measurement
 */
export interface StationMeasurement {
  name: string;              // Station name (max 200 chars)
  location: CoordinateLocation;      // Station coordinates
  concentration: number;             // PM concentration (μg/m³, 0-10000)
}

/**
 * Geographic coordinates (WGS84)
 */
export interface CoordinateLocation {
  longitude: number;                 // Longitude (-180 to 180)
  latitude: number;                  // Latitude (-90 to 90)
}

/**
 * Particulate matter type constants
 */
export type PMType = 'pm10' | 'pm25';

/**
 * Backend response after submitting simulation request
 */
export interface SimulationResponse {
  success: boolean;                  // Whether request succeeded
  message: string;                   // Response message
  data?: SimulationResponseData;     // Response data (if successful)
}

/**
 * Response data after successful simulation submission
 */
export interface SimulationResponseData {
  uuid: string;                      // Generated simulation UUID
  status: string;                    // Initial status ("대기")
  position_in_queue: number;         // Position in queue (1-indexed)
  simulation_name: string;           // Echo of simulation name
}

/**
 * Simulation list item from GET /api/v1/simulation/list
 */
export interface SimulationListItem {
  index: number;                     // List index
  uuid: string;                      // Simulation UUID
  simulation_name: string;           // Simulation name
  pm_type: PMType;                   // PM type (pm10 or pm25)
  requested_at: string;              // Request timestamp (ISO 8601)
  status: string;                    // Status ("대기", "진행중", "완료", "실패")
  concentration: number;             // First station PM concentration
  station_name: string;              // First station name
  lot: string;                       // 지번 주소
  road_name: string;                 // 도로명 주소
  weather: Weather;                  // Weather data
  is_private: boolean;
}

/**
 * Pagination metadata for simulation list
 */
export interface SimulationListPagination {
  page: number;                      // Current page
  limit: number;                     // Items per page
  total: number;                     // Total items
  total_pages: number;               // Total pages
}

/**
 * Simulation list response from GET /api/v1/simulation/list
 */
export interface SimulationListResponse {
  simulations: SimulationListItem[]; // Simulation items
  pagination: SimulationListPagination; // Pagination info
}

/**
 * Simulation detail response from GET /api/v1/simulation/:uuid
 */
export interface SimulationDetail {
  uuid: string;                      // Simulation UUID
  simulationName: string;            // Simulation name
  userID: string;                    // User ID
  isPrivate: boolean;                // Whether simulation is private
  requestedAt: string;               // Request timestamp (ISO 8601)
  lot: string;                       // 지번 주소
  roadName: string;                  // 도로명 주소
  location: string;                  // Location name
  status: string;                    // Current status
  startedAt: string | null;          // Start timestamp (ISO 8601)
  completedAt: string | null;        // Completion timestamp (ISO 8601)
  retryCount?: number;               // Retry count (optional)
  errorMessage?: string;             // Error message (if failed, optional)
  weatherData?: Weather;             // Weather data (optional)
  airQualityData?: AirQuality;       // Air quality data (optional)
  pmtype?: PMType;                   // PM type (pm10 or pm25, optional)
  firstStationConcentration?: number; // First station concentration (optional)
  firstStationName?: string;         // First station name (optional)
  resultPath?: string;               // Result file path (GLB, optional)
  createdAt: string;                 // Creation timestamp (ISO 8601)
  updatedAt: string;                 // Update timestamp (ISO 8601)
}

/**
 * Simulation auto response from GET /api/v1/simulation_auto/list
 */
export interface SimulationQuckData {
  index: number;
  measured_at: string;
  pm_type: "pm10" | "pm25";
  result_path: string;
  weather: WeatherData;
  station_data: StationData[];
}

export interface LocationPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface StationData {
  index: number;
  station_name: string;
  station_id: string;
  measured_at: string;
  concentration: number;
  location: LocationPoint;
}

export interface WeatherData {
  wind_direction_1m: number;
  wind_speed_1m: number;
  wind_direction_10m: number;
  wind_speed_10m: number;
  humidity: number;
  sea_level_pressure: number;
  temperature: number;
}

export interface SimulationQuckDataResponse {
  simulations: SimulationQuckData[]; // Simulation items
  pagination: SimulationListPagination; // Pagination info
}