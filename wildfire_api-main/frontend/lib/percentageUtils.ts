/**
 * Utility functions for converting between actual API values and percentage display values (0-100%)
 */

// Parameter ranges for conversion between actual values and 0-100% display
export const PARAMETER_RANGES = {
  prefireFuel: { min: 0, max: 13337.51083 },
  coverType: { min: 0, max: 95 },
  temperature: { min: 240.300003, max: 305.299988 },
  humidity: { min: 6.1, max: 100.0 },
  dryness: { min: 1.0, max: 4.0 },
  duffFraction: { min: 0, max: 0.800324 },
  coarseWoodyDebris: { min: 0, max: 0.497034 },
  solarRadiation: { min: 0, max: 445.300018 },
  // Advanced parameters
  day_of_year_sin: { min: -0.999999, max: 0.999986 },
  day_of_year_cos: { min: -0.999979, max: 1.0 },
  fm1000_value: { min: 2.2, max: 36.700001 },
  fm100_value: { min: 1.43, max: 29.5 },
  bi_value: { min: 0.0, max: 171.0 },
  month: { min: 1, max: 12 },
  season: { min: 1, max: 4 },
  th_value: { min: 0.0, max: 360.0 },
  burn_source: { min: 1, max: 4 },
  rmin_value: { min: 0.7, max: 100.0 },
  vs_value: { min: 0.4, max: 18.4 },
  burnday_source: { min: 12, max: 81 },
  vpd_value: { min: 0.0, max: 6.91 },
  sph_value: { min: 0.0, max: 0.0232 },
  pet_value: { min: 0.0, max: 16.5 },
  BSEV: { min: 0, max: 6 },
  fuelcode: { min: 0, max: 2950 }
};

export type ParameterKey = keyof typeof PARAMETER_RANGES;

/**
 * Convert an actual API value to a percentage (0-100) for display
 * @param parameterKey - The parameter name
 * @param actualValue - The actual API value
 * @returns Percentage value between 0-100
 */
export function actualValueToPercentage(parameterKey: ParameterKey, actualValue: number): number {
  const range = PARAMETER_RANGES[parameterKey];
  if (!range) {
    console.warn(`Unknown parameter key: ${parameterKey}`);
    return 50; // Default to 50% if parameter not found
  }
  
  const { min, max } = range;
  const percentage = ((actualValue - min) / (max - min)) * 100;
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, percentage));
}

/**
 * Convert a percentage (0-100) to the actual API value
 * @param parameterKey - The parameter name
 * @param percentage - Percentage value between 0-100
 * @returns Actual API value within the parameter's range
 */
export function percentageToActualValue(parameterKey: ParameterKey, percentage: number): number {
  const range = PARAMETER_RANGES[parameterKey];
  if (!range) {
    console.warn(`Unknown parameter key: ${parameterKey}`);
    return 0; // Default to 0 if parameter not found
  }
  
  const { min, max } = range;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const actualValue = min + (clampedPercentage / 100) * (max - min);
  
  return actualValue;
}

/**
 * Convert all actual control values to percentage values for display
 * @param controls - Controls object with actual API values
 * @returns Controls object with percentage values for display
 */
export function controlsToPercentageDisplay(controls: Record<string, unknown>): Record<string, unknown> {
  const percentageControls = { ...controls };
  
  for (const [key, value] of Object.entries(controls)) {
    if (key in PARAMETER_RANGES && typeof value === 'number') {
      percentageControls[key] = actualValueToPercentage(key as ParameterKey, value);
    }
  }
  
  return percentageControls;
}

/**
 * Convert percentage display values back to actual API values
 * @param percentageControls - Controls object with percentage values
 * @returns Controls object with actual API values
 */
export function percentageDisplayToControls(percentageControls: Record<string, unknown>): Record<string, unknown> {
  const actualControls = { ...percentageControls };
  
  for (const [key, value] of Object.entries(percentageControls)) {
    if (key in PARAMETER_RANGES && typeof value === 'number') {
      actualControls[key] = percentageToActualValue(key as ParameterKey, value);
    }
  }
  
  return actualControls;
}

/**
 * Get the step size for a parameter's percentage slider
 * @param parameterKey - The parameter name
 * @returns Appropriate step size for the percentage slider
 */
export function getPercentageStep(parameterKey: ParameterKey): number {
  // For most parameters, 1% steps are fine
  // For very precise parameters, use smaller steps
  const preciseParameters = ['duffFraction', 'coarseWoodyDebris', 'day_of_year_sin', 'day_of_year_cos', 'sph_value'];
  
  if (preciseParameters.includes(parameterKey)) {
    return 0.1; // 0.1% steps for more precision
  }
  
  return 1; // 1% steps for most parameters
}