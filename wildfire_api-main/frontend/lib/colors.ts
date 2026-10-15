// ColorBrewer Pastel palettes for Wildfire Scenario Explorer
export const COLORS = {
  fuel: 'rgba(251, 180, 174, 0.9)',      // Pastel red - increased opacity
  weather: 'rgba(179, 205, 227, 0.9)',   // Pastel blue - increased opacity
  response: 'rgba(204, 235, 197, 0.9)',  // Pastel green - increased opacity
  aftermath: 'rgba(222, 203, 228, 0.9)', // Pastel purple - increased opacity
  composite: 'rgba(254, 217, 166, 0.9)', // Pastel orange
} as const;

export const FILL_COLORS = {
  fuel: 'rgba(251, 180, 174, 0.6)',
  weather: 'rgba(179, 205, 227, 0.6)',
  response: 'rgba(204, 235, 197, 0.6)',
  aftermath: 'rgba(222, 203, 228, 0.6)',
  composite: 'rgba(254, 217, 166, 0.3)',
} as const;

export const STROKE_COLORS = {
  fuel: '#fb6a4a',      // Darker red
  weather: '#6baed6',   // Darker blue
  response: '#74c476',  // Darker green
  aftermath: '#9e9ac8', // Darker purple
  composite: '#fd8d3c', // Darker orange
} as const;

export type ComponentType = keyof typeof COLORS;
