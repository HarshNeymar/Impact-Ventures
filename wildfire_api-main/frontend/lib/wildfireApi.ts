/**
 * Service functions for wildfire API integration
 */

import { 
  WildfireApiRequest, 
  WildfireApiResponse, 
  WildfireApiError, 
  EnvironmentalParameters, 
  LocationParameters,
  WildfireFeatures 
} from '@/types/wildfire';
import { calculateDayOfYear, isValidWildfireDate } from '@/lib/dateUtils';

// Use our local API route to avoid CORS issues
const WILDFIRE_API_ENDPOINT = '/api/wildfire';

/**
 * Normalize county names by stripping common administrative suffixes that
 * some UI dropdowns include. This ensures the API receives a canonical
 * county token it expects for lookup/join logic.
 * Examples:
 *   "Los Angeles County" -> "Los Angeles"
 *   "Fairbanks North Star Borough" -> "Fairbanks North Star"
 *   "St. John the Baptist Parish" -> "St. John the Baptist"
 *   "Anchorage Municipality" -> "Anchorage"
 *   "New York City" -> "New York"
 */
function sanitizeCounty(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const suffixes = [
    'county',
    'city',
    'parish',
    'borough',
    'census area',
    'municipality'
  ];
  const lowered = trimmed.toLowerCase();
  for (const suf of suffixes) {
    // Match suffix optionally preceded by a comma or extra spaces
    const regex = new RegExp(`\\s+${suf}$`,'i');
    if (regex.test(lowered)) {
      return trimmed.replace(new RegExp(`\\s+${suf}$`,'i'),'').trim();
    }
  }
  return trimmed; // unchanged
}

/**
 * Transform UI environmental parameters to API features format
 * @param environmental - Environmental parameters from UI controls
 * @param location - Location parameters (state, county, date)
 * @returns Wildfire features formatted for API
 */
function transformToApiFeatures(
  environmental: EnvironmentalParameters,
  location: LocationParameters
): WildfireFeatures {
  // Calculate day of year only if a date is provided & valid
  let doy: number | undefined = undefined;
  if (location.date) {
    if (!isValidWildfireDate(location.date)) {
      throw new Error('Date must be between January 1 and September 30');
    }
    doy = calculateDayOfYear(location.date);
  }

  // Derive month/season and day-of-year sin/cos from date if available
  const monthFromDate: number | undefined = location.date ? (location.date.getMonth() + 1) : undefined; // 1..12
  // Season must match the dataset's meteorological labelling AND the backend imputer:
  // Dec/Jan/Feb=1, Mar/Apr/May=2, Jun/Jul/Aug=3, Sep/Oct/Nov=4.
  // The previous formula ((month-1)/3)+1 was wrong for every quarter-start month
  // (Mar, Jun, Sep, Dec), which made the backend's `season = X AND doy BETWEEN ...`
  // filter contradict itself and return zero historical events.
  const seasonFromDate: number | undefined = monthFromDate ? (Math.floor((monthFromDate % 12) / 3) + 1) : undefined; // 1..4
  const doyForTrig = doy;
  const dayOfYearSinFromDate: number | undefined = typeof doyForTrig === 'number' ? Math.sin(2 * Math.PI * (doyForTrig / 366)) : undefined;
  const dayOfYearCosFromDate: number | undefined = typeof doyForTrig === 'number' ? Math.cos(2 * Math.PI * (doyForTrig / 366)) : undefined;

  // Transform and scale parameters according to API requirements
  // Helper to choose provided value or a sensible default
  const num = (v: number | undefined, d: number) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);

  // Defaults chosen to match the provided API example
  const defaults = {
    fm1000_value: 4.5, // from API example
    fm100_value: 3.4000000953674316, // from API example
    bi_value: 114.0, // from API example
    th_value: 251.0, // from API example
    burn_source: 1.0, // from API example
    rmin_value: 5.300000190734863, // from API example
    burnday_source: 15.0, // from API example
    vpd_value: 1.7699999809265137, // from API example
    sph_value: 0.0021899999119341373, // from API example
    pet_value: 8.300000190734863, // from API example
    BSEV: 1.0, // from API example
    fuelcode: 1920.0, // from API example
    month: 5.0, // from API example (May)
    season: 2.0, // from API example (Q2)
  } as const;

  // Build features with ONLY the requested keys and ALWAYS include them
  const features: WildfireFeatures = {
    prefire_fuel: environmental.prefireFuel, // Now direct value, no scaling
    covertype: Math.round(environmental.coverType), // Direct value, just round to integer
    day_of_year_sin: num(environmental.day_of_year_sin, dayOfYearSinFromDate ?? Math.sin(2 * Math.PI * ((doyForTrig ?? 180) / 366))),
    day_of_year_cos: num(environmental.day_of_year_cos, dayOfYearCosFromDate ?? Math.cos(2 * Math.PI * ((doyForTrig ?? 180) / 366))),
    month: num(environmental.month, monthFromDate ?? defaults.month),
    season: num(environmental.season, seasonFromDate ?? defaults.season),
    fm1000_value: num(environmental.fm1000_value, defaults.fm1000_value),
    fm100_value: num(environmental.fm100_value, defaults.fm100_value),
    bi_value: num(environmental.bi_value, defaults.bi_value),
    th_value: num(environmental.th_value, defaults.th_value),
    burn_source: num(environmental.burn_source, defaults.burn_source),
    rmin_value: num(environmental.rmin_value, defaults.rmin_value),
    burnday_source: num(environmental.burnday_source, defaults.burnday_source),
    vpd_value: num(environmental.vpd_value, defaults.vpd_value),
    sph_value: num(environmental.sph_value, defaults.sph_value),
    pet_value: num(environmental.pet_value, defaults.pet_value),
    BSEV: num(environmental.BSEV, defaults.BSEV),
    fuelcode: num(environmental.fuelcode, defaults.fuelcode),
  } as WildfireFeatures;

  // Send the real day-of-year. Without it the backend imputes doy from the mean of
  // nearest neighbours, so the historical-events window ignored the chosen date.
  if (typeof doy === 'number' && !Number.isNaN(doy)) {
    features.doy = doy;
  }

  // Add additional features that were previously derived from UI values
  // Now using direct API values from the UI
  (features as any).duff_frac = environmental.duffFraction; // Direct value
  (features as any).cwd_frac = environmental.coarseWoodyDebris; // Direct value  
  (features as any).srad_value = environmental.solarRadiation; // Direct value
  (features as any).fuel_moisture_class = environmental.dryness; // Direct value (1.0-4.0)
  (features as any).tmmn_value = environmental.temperature; // Direct value in Kelvin
  (features as any).rmax_value = environmental.humidity; // Direct value (6.1-100.0)

  // Add state and county if provided
  if (location.state && location.state.trim()) {
    features.state = location.state.trim();
  }
  
  if (location.county && location.county.trim()) {
    features.county = sanitizeCounty(location.county);
  }

  return features;
}

/**
 * Make a POST request to the wildfire API
 * @param environmental - Environmental parameters from UI controls
 * @param location - Location parameters
 * @returns Promise resolving to the API response
 */
export async function callWildfireApi(
  environmental: EnvironmentalParameters,
  location: LocationParameters
): Promise<WildfireApiResponse> {
  try {
    // Transform parameters to API format
    const features = transformToApiFeatures(environmental, location);
    
    // Prepare request payload
    const requestPayload: WildfireApiRequest = {
      features,
      round_risk: false
    };

    console.log('Calling wildfire API with payload:', requestPayload);

    // Make the API call through our proxy
    const response = await fetch(WILDFIRE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      
      try {
        const errorJson = JSON.parse(errorText) as WildfireApiError;
        errorMessage = errorJson.error || `API request failed with status ${response.status}`;
      } catch {
        errorMessage = `API request failed with status ${response.status}: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    // Parse and return the response
    const data: WildfireApiResponse = await response.json();
    
    console.log('Wildfire API response:', data);
    
    return data;

  } catch (error) {
    console.error('Error calling wildfire API:', error);
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred while calling wildfire API');
    }
  }
}

/**
 * Validate environmental parameters before making API call
 * @param environmental - Environmental parameters to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateEnvironmentalParameters(
  environmental: EnvironmentalParameters
): string[] {
  const errors: string[] = [];

  if (environmental.prefireFuel < 0 || environmental.prefireFuel > 13337.51083) {
    errors.push('Prefire fuel must be between 0 and 13337.51083');
  }

  if (environmental.coverType < 0 || environmental.coverType > 95) {
    errors.push('Cover type must be between 0 and 95');
  }

  if (environmental.dryness < 1.0 || environmental.dryness > 4.0) {
    errors.push('Fuel moisture class must be between 1.0 and 4.0');
  }

  if (environmental.duffFraction < 0 || environmental.duffFraction > 0.800324) {
    errors.push('Duff fraction must be between 0 and 0.800324');
  }

  if (environmental.coarseWoodyDebris < 0 || environmental.coarseWoodyDebris > 0.497034) {
    errors.push('Coarse woody debris fraction must be between 0 and 0.497034');
  }

  if (environmental.solarRadiation < 0 || environmental.solarRadiation > 445.300018) {
    errors.push('Solar radiation must be between 0 and 445.300018');
  }

  if (environmental.temperature < 240.300003 || environmental.temperature > 305.299988) {
    errors.push('Temperature must be between 240.300003K and 305.299988K');
  }

  if (environmental.humidity < 6.1 || environmental.humidity > 100.0) {
    errors.push('Max humidity must be between 6.1 and 100.0');
  }

  return errors;
}

/**
 * Get a human-readable summary of the API call parameters
 * @param environmental - Environmental parameters
 * @param location - Location parameters
 * @returns Formatted summary string
 */
export function getParameterSummary(
  environmental: EnvironmentalParameters,
  location: LocationParameters
): string {
  const doy = location.date ? calculateDayOfYear(location.date) : undefined;
  const sanitizedCounty = location.county ? sanitizeCounty(location.county) : undefined;
  
  return `
Wildfire Risk Prediction Parameters:
• Location: ${sanitizedCounty || 'N/A'}, ${location.state || 'N/A'}
• Date: ${location.date ? location.date.toLocaleDateString() + ` (Day ${doy})` : 'N/A'}
• Prefire Fuel: ${environmental.prefireFuel.toFixed(1)}
• Cover Type: ${environmental.coverType}
• Duff Fraction: ${environmental.duffFraction.toFixed(3)}
• Coarse Woody Debris: ${environmental.coarseWoodyDebris.toFixed(3)}
• Solar Radiation: ${environmental.solarRadiation.toFixed(1)}
• Fuel Moisture Class: ${environmental.dryness.toFixed(1)}
• Temperature: ${environmental.temperature.toFixed(1)}K
• Max Humidity: ${environmental.humidity.toFixed(1)}%
  `.trim();
}