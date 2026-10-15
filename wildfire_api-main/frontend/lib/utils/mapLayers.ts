import { ScatterplotLayer, GeoJsonLayer } from "@deck.gl/layers";
import type { EmissionsData } from '@/types/emissions';

export function createEmissionsLayers(
  emissionsData: EmissionsData[],
  water: any,
  tab: string,
  zoom: number
) {
  // Only show emissions layer when emissions tab is active and we have data
  if (tab !== 'emission' || emissionsData.length === 0) {
    return [];
  }

  // Variable smoky halos around each point - size controlled by spatial_extent_km
  const smokyHaloLayer = new ScatterplotLayer({
    id: 'smoky-halos',
    data: emissionsData,
    pickable: false,
    opacity: 0.3,
    stroked: false,
    filled: true,
    radiusUnits: 'pixels',
    radiusScale: 1,
    radiusMinPixels: 1,
    radiusMaxPixels: 120,
    getPosition: (d: EmissionsData) => [d.lng, d.lat],
    getRadius: (d: EmissionsData) => {
      // Calculate radius based on spatial_extent_km with min/max normalization
      const minSpatialExtent = 0.00;
      const maxSpatialExtent = 4274.98;
      const minRadius = 4;
      const maxRadius = 90;
      
      // Normalize spatial_extent_km to 0-1 range
      const normalizedExtent = Math.min(Math.max((d.spatial_extent_km - minSpatialExtent) / (maxSpatialExtent - minSpatialExtent), 0), 1);
      
      // Map to radius range using square root for better visual distribution
      const radius = minRadius + (maxRadius - minRadius) * Math.sqrt(normalizedExtent);
      
      return Math.round(radius);
    },
    getFillColor: (d: EmissionsData) => {
      // Color based on emission_intensity - smoky gray tones
      switch (d.emission_intensity) {
        case 'low': return [200, 200, 200, 160];
        case 'medium': return [140, 140, 140, 180];
        case 'high': return [90, 90, 90, 200];
        case 'very_high': return [50, 50, 50, 220];
        default: return [170, 170, 170, 190];
      }
    }
  });

  // Invisible scatter plot dots - hidden but still pickable for tooltips
  const scatterLayer = new ScatterplotLayer({
    id: 'emissions-scatter',
    data: emissionsData,
    pickable: true,
    opacity: 0,
    stroked: false,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 1,
    radiusMaxPixels: 5,
    lineWidthMinPixels: 0,
    getPosition: (d: EmissionsData) => [d.lng, d.lat],
    getRadius: () => 2,
    getFillColor: () => [0, 0, 0, 0],
    getLineColor: () => [0, 0, 0, 0]
  });

  const waterPoly = water && new GeoJsonLayer({
    id: "water",
    data: water,
    filled: true,
    stroked: false,
    getFillColor: [218, 233, 246, 140],
    opacity: 0.5
  });

  return [waterPoly, smokyHaloLayer, scatterLayer].filter(Boolean);
}
