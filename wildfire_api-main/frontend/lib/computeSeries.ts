// Data model and computation utilities for Wildfire Scenario Explorer

export type Row = {
  date: string;             // ISO day
  prefire_fuel: number; 
  duff_frac: number; 
  cwd_frac: number; 
  tree_cover: number;
  tmmx: number; 
  tmmn: number; 
  vpd: number; 
  rmin: number; 
  rmax: number; 
  vs: number;
  fm100: number; 
  fm1000: number; 
  burn_severity: number;
};

export type ComputedRow = Row & {
  fuel: number;
  weather: number;
  response: number;
  aftermath: number;
  composite: number;
};

export type ScenarioControls = {
  fuelMult: number;          // Prefire fuel load (×) [0.5–1.5]
  duffOff: number;           // Duff layer (±) [−0.2…+0.2]
  cwdOff: number;            // Coarse woody debris (±) [−0.2…+0.2]
  treeCoverDelta: number;    // Tree cover (Δ%) [−30…+30]
  tmmxMult: number;          // Hotter days (×; tmmx/tmmn) [0.8–1.2]
  tmmnMult: number;          
  vpdMult: number;           // Drier air (×; VPD) [0.8–1.2]
  rhOff: number;             // Lower humidity (±; rmin/rmax) [−10…+10]
  windPercentile: number;    // Wind percentile (vs) [10…90]
  fm100Off: number;          // Dead-fuel moisture (±; fm100/fm1000) [−5…+5]
  fm1000Off: number;
  suppression: number;       // Suppression effort [0…1]
  rxBurn: number;            // Prescribed burns (%/yr) [0…10]
  sevThresh: number;         // High-severity threshold [0.2…0.9]
  reforest: number;          // Reforestation (%/yr) [0…10]
  weights: {
    fuel: number;
    weather: number;
    response: number;
    aftermath: number;
  };
};

export const DEFAULT_CONTROLS: ScenarioControls = {
  fuelMult: 1.0,
  duffOff: 0.0,
  cwdOff: 0.0,
  treeCoverDelta: 0,
  tmmxMult: 1.0,
  tmmnMult: 1.0,
  vpdMult: 1.0,
  rhOff: 0,
  windPercentile: 50,
  fm100Off: 0,
  fm1000Off: 0,
  suppression: 0.5,
  rxBurn: 2,
  sevThresh: 0.5,
  reforest: 3,
  weights: {
    fuel: 25,
    weather: 25,
    response: 25,
    aftermath: 25,
  },
};

// Utility functions
export function normalize01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function step(value: number, threshold: number): number {
  return value >= threshold ? 1 : 0;
}

export function windPct(vs: number, percentile: number): number {
  // Simple approximation: map percentile to a multiplier
  const multiplier = percentile / 50; // 50th percentile = 1.0
  return normalize01(vs * multiplier / 100); // Normalize wind speed
}

export function rhBoost(rmin: number, rmax: number): number {
  // Convert relative humidity to a beneficial factor (higher RH reduces fire risk)
  const avgRH = (rmin + rmax) / 2;
  return avgRH / 100; // Normalized to [0,1]
}

export function weightedSum(
  values: { fuel: number; weather: number; response: number; aftermath: number },
  weights: { fuel: number; weather: number; response: number; aftermath: number }
): number {
  const totalWeight = weights.fuel + weights.weather + weights.response + weights.aftermath;
  if (totalWeight === 0) return 0;
  
  const normalizedWeights = {
    fuel: weights.fuel / totalWeight,
    weather: weights.weather / totalWeight,
    response: weights.response / totalWeight,
    aftermath: weights.aftermath / totalWeight,
  };
  
  return (
    values.fuel * normalizedWeights.fuel +
    values.weather * normalizedWeights.weather +
    values.response * normalizedWeights.response +
    values.aftermath * normalizedWeights.aftermath
  );
}

export function rollingMean(data: number[], windowSize: number): number[] {
  if (windowSize <= 1) return data;
  
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
    const window = data.slice(start, end);
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(mean);
  }
  return result;
}

// Generate mock data for 2010-2025
export function generateMockData(): Row[] {
  const data: Row[] = [];
  const startDate = new Date('2010-01-01');
  const endDate = new Date('2025-12-31');
  
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const year = date.getFullYear();
    const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI); // Seasonal variation
    
    data.push({
      date: date.toISOString().split('T')[0],
      prefire_fuel: 0.7 + Math.random() * 0.3 + seasonalFactor * 0.1,
      duff_frac: 0.3 + Math.random() * 0.2,
      cwd_frac: 0.2 + Math.random() * 0.15,
      tree_cover: 65 + Math.random() * 20 - (year - 2010) * 0.5, // Slight decline over time
      tmmx: 25 + Math.random() * 15 + seasonalFactor * 10 + (year - 2010) * 0.2, // Climate change
      tmmn: 10 + Math.random() * 10 + seasonalFactor * 8 + (year - 2010) * 0.15,
      vpd: 1.5 + Math.random() * 1.0 + seasonalFactor * 0.5,
      rmin: 30 + Math.random() * 40 - seasonalFactor * 15,
      rmax: 60 + Math.random() * 30 - seasonalFactor * 10,
      vs: 5 + Math.random() * 15 + Math.abs(seasonalFactor) * 5,
      fm100: 15 + Math.random() * 10 - seasonalFactor * 5,
      fm1000: 20 + Math.random() * 15 - seasonalFactor * 8,
      burn_severity: Math.random() * 0.8 + seasonalFactor * 0.1,
    });
  }
  
  return data;
}

// Compute derived values for each row
export function computeSeries(data: Row[], controls: ScenarioControls): ComputedRow[] {
  return data.map(row => {
    // Fuel component
    const fuel = normalize01(
      row.prefire_fuel * controls.fuelMult + 
      row.duff_frac + controls.duffOff + 
      row.cwd_frac + controls.cwdOff - 
      controls.rxBurn / 100
    );
    
    // Weather component
    const weather = normalize01(
      row.vpd * controls.vpdMult / 3 + 
      windPct(row.vs, controls.windPercentile) + 
      ((row.tmmx * controls.tmmxMult + row.tmmn * controls.tmmnMult) / 2 - 20) / 30 - 
      (row.fm100 + controls.fm100Off) / 30 - 
      (row.fm1000 + controls.fm1000Off) / 40 - 
      rhBoost(row.rmin, row.rmax + controls.rhOff)
    );
    
    // Response component
    const response = normalize01(1 - controls.suppression);
    
    // Aftermath component
    const aftermath = normalize01(
      step(row.burn_severity, controls.sevThresh) - 
      controls.reforest / 100
    );
    
    // Composite risk
    const composite = weightedSum(
      { fuel, weather, response, aftermath },
      controls.weights
    );
    
    return {
      ...row,
      fuel,
      weather,
      response,
      aftermath,
      composite,
    };
  });
}

export function getRiskLevel(composite: number): 'Low' | 'Medium' | 'High' {
  if (composite < 0.33) return 'Low';
  if (composite < 0.67) return 'Medium';
  return 'High';
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'Low': return 'text-green-600 bg-green-100';
    case 'Medium': return 'text-yellow-600 bg-yellow-100';
    case 'High': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}
