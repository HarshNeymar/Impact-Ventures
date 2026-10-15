/**
 * TypeScript interfaces and types for the wildfire API integration
 */

/**
 * Environmental features required for wildfire risk prediction
 */
export interface WildfireFeatures {
  /** Prefire fuel load value (API range: 0.0 to 13337.0, floating point) */
  prefire_fuel: number;
  
  /** Cover type classification (API range: 0.0 to 95.0, integers) */
  covertype: number;
  
  /** State name (optional) */
  state?: string;
  
  /** County name (optional) */
  county?: string;
  
  /** Temperature values - currently disabled */
  temperature?: number;
  
  /** Humidity values - currently disabled */
  humidity?: number;
  
  /** Coarse woody debris - currently disabled */
  coarse_woody_debris?: number;

  /** Additional optional advanced inputs */
  day_of_year_sin?: number;
  fm1000_value?: number;
  day_of_year_cos?: number;
  bi_value?: number;
  fm100_value?: number;
  month?: number;
  season?: number;
  /** Day of year (1-366). Sent so the backend filters historical events on the
   *  date the user actually picked instead of imputing it from neighbour averages. */
  doy?: number;
  th_value?: number;
  burn_source?: number;
  rmin_value?: number;
  burnday_source?: number;
  vpd_value?: number;
  sph_value?: number;
  pet_value?: number;
  BSEV?: number;
  fuelcode?: number;
}

/**
 * Request payload for the wildfire API
 */
export interface WildfireApiRequest {
  /** Environmental features for prediction */
  features: WildfireFeatures;
  
  /** Whether to round the risk value (we use false) */
  round_risk: boolean;
}

/**
 * Risk event data structure
 */
export interface RiskEvent {
  latitude: number;
  longitude: number;
  state: string;
  county: string;
  risk: number;
  // Allow any additional environmental parameters from the API
  [key: string]: any;
}

/**
 * Response from the wildfire API
 */
export interface WildfireApiResponse {
  /** Input parameters that were provided to the API */
  input: {
    prefire_fuel: number;
    covertype: number;
    rmax_value: number;
    state?: string;
    county?: string;
    doy?: number;
    duff_frac?: number;
    srad_value?: number;
    fuel_moisture_class?: number;
    [key: string]: any;
  };
  
  /** Imputed/calculated values including the risk prediction */
  imputed: {
    /** Predicted risk value (1.8 to 6.3, 7 decimal places) */
    risk: number;
    /** Wind speed value (vs_value: 0.4 to 18.4) */
    vs_value: number;
    /** Burning index value (bi_value: 0.0 to 171.0) */
    bi_value: number;
    /** Temperature minimum value (tmmn_value: 240.3 to 305.4) */
    tmmn_value: number;
    /** Maximum relative humidity value (rmax_value: 6.1 to 100.0) */
    rmax_value: number;
    /** Fuel moisture class (fuel_moisture_class: 1.0 to 4.0, integer) */
    fuel_moisture_class: number;
    /** Coarse woody debris fraction (cwd_frac: 0.0 to 0.49) */
    cwd_frac: number;
    /** Burning Severity Index (BSEV: 0 to 6, integer) */
    BSEV: number;
    /** Location information */
    longitude?: number;
    latitude?: number;
    state?: string;
    county?: string;
    /** All other imputed values */
    [key: string]: any;
  };

  /** Predictions from the model */
  predictions: {
    /** Fire duration in days (floating point) */
    duration: number;
    /** Probability that fire ends tomorrow (0-1) */
    end_tomorrow_prob: number;
    /** Binary label for end tomorrow (0 or 1) */
    end_tomorrow_label: number;
  };

  /** Array of risk events at similar locations */
  risk_events: RiskEvent[];
}

/**
 * Environmental parameters mapping from UI controls to API features
 */
export interface EnvironmentalParameters {
  /** Prefire Fuel (0.0 to 13337.51083) - direct API value */
  prefireFuel: number;
  
  /** Cover Type (0 to 95) - direct API value */
  coverType: number;
  
  /** Temperature in Kelvin (240.300003 to 305.299988) - direct API value */
  temperature: number;
  
  /** Max Humidity (6.1 to 100.0%) - direct API value */
  humidity: number;
  
  /** Fuel Moisture Class (1.0 to 4.0) - direct API value */
  dryness: number;
  
  /** Duff Fraction (0.0 to 0.800324) - direct API value */
  duffFraction: number;
  
  /** Coarse Woody Debris Fraction (0.0 to 0.497034) - direct API value */
  coarseWoodyDebris: number;
  
  /** Solar Radiation Value (0.0 to 445.300018) - direct API value */
  solarRadiation: number;

  /** Advanced (optional) fields to send directly when provided */
  day_of_year_sin?: number;
  fm1000_value?: number;
  day_of_year_cos?: number;
  bi_value?: number;
  fm100_value?: number;
  month?: number;
  season?: number;
  th_value?: number;
  burn_source?: number;
  rmin_value?: number;
  burnday_source?: number;
  vpd_value?: number;
  sph_value?: number;
  pet_value?: number;
  BSEV?: number;
  fuelcode?: number;
}

/**
 * Location parameters for the API call
 */
export interface LocationParameters {
  /** Selected state */
  state: string;
  
  /** Selected county */
  county: string;
  
  /** Selected date */
  date: Date | null;
}

/**
 * Complete parameters needed for the wildfire API call
 */
export interface WildfireCallParameters {
  environmental: EnvironmentalParameters;
  location: LocationParameters;
}

/**
 * Error response from the wildfire API
 */
export interface WildfireApiError {
  error: string;
  details?: string;
  status_code?: number;
}