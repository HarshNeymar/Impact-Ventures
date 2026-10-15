/**
 * Type definitions for emissions data and API responses
 */

export interface EmissionsData {
  lat: number;
  lng: number;
  state: string;
  county: string;
  year: number;
  fire_type: string;
  duration_days: number;
  spatial_extent_km: number;
  fire_size: number;
  fire_size_category: string;
  emission_value: number;
  total_emissions: number;
  emission_intensity: 'very_high' | 'high' | 'medium' | 'low';
  size_category: string;
  emissions: {
    co2: number;
    ch4: number;
    co: number;
    pm2_5: number;
  };
}

export interface EmissionsApiResponse {
  message?: string;
  events?: EmissionsData[];
  count?: number;
  summary?: {
    total_events: number;
    total_fire_size: number;
    avg_duration: number;
    avg_spatial_extent: number;
    total_emissions: number;
    max_emission_value: number;
    years_covered: number[];
    states_covered: string[];
  };
  error?: string;
  status_code?: number;
}

export interface EmissionsApiError {
  error: string;
  details?: string;
  status_code: number;
}

/**
 * Request payload for emissions analysis API
 */
export interface EmissionsAnalysisRequest {
  emission_data?: EmissionsData;
  query: string;
  session_id?: string;
}

/**
 * Response from emissions analysis API
 */
export interface EmissionsAnalysisResponse {
  answer: string;
  session_id: string;
  error?: string;
}