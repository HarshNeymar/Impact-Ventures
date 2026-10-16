import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { EmissionsData } from '@/types/emissions';

// Air Pollution "cloud" layer: a built-in MapLibre heatmap over gridded emission events.
// Spec: docs/aq-cloud-layer/SPEC.md. Visual values below are the approved design; only
// heatmap-intensity and heatmap-radius may be recalibrated.

export const AQ_CELLS_SOURCE = 'aq-cells';
export const AQ_CLOUD_LAYER = 'aq-cloud';
export const AQ_HIT_LAYER = 'aq-hit';
const AQ_WORLD_SOURCE = 'aq-world';
const AQ_TEXTURE_LAYER = 'aq-texture';
const AQ_GRATICULE = 'aq-graticule';
const AQ_COAST_LAYER = 'aq-coast';
const AQ_SWIRL_IMAGE = 'aq-swirl';
const AQ_SWIRL_URL = '/assets/aq-swirl-pattern.png';

// Our layers sit under country outlines. The basemap (CARTO Voyager, no labels) has no label layers.
export const AQ_BEFORE_ID = 'boundary_country_outline';

// CARTO Voyager layer ids, from the style JSON.
const BASEMAP = {
  land: ['background', 'landcover', 'landuse', 'landuse_residential', 'park_national_park', 'park_nature_reserve'],
  water: ['water', 'water_shadow'],
  country: ['boundary_country_outline', 'boundary_country_inner'],
  state: 'boundary_state',
  basemapSource: 'carto',
};

export interface GridOptions {
  cellDeg?: number;
  aggregate?: 'mean' | 'sum';
  scale?: 'linear' | 'sqrt' | 'log';
  /** Value that maps to w = 1. null = 98th percentile of cell values. */
  domainMax?: number | null;
}

// total_emissions is tons per fire event (CO2 + CH4 + CO + PM2.5), so cells add up (sum).
// sqrt sits between the spec's linear and log: linear left most of the country blank next to
// the dense Southeast, log turned nearly every cell dark grey.
export const EMISSIONS_GRID_OPTIONS: GridOptions = {
  cellDeg: 1,
  aggregate: 'sum',
  scale: 'sqrt',
  domainMax: null,
};

export interface AqCellProperties {
  value: number;
  w: number;
  points: number;
  /** State of the largest event in the cell, for the tooltip. */
  state: string;
}

export interface GridResult {
  domainMax: number;
  geojson: FeatureCollection<Point, AqCellProperties>;
}

export function gridEmissions(events: EmissionsData[], options: GridOptions = EMISSIONS_GRID_OPTIONS): GridResult {
  const { cellDeg = 1, aggregate = 'mean', scale = 'linear', domainMax = null } = options;

  const cells = new Map<string, { lon: number; lat: number; sum: number; n: number; top: number; state: string }>();
  for (const e of events) {
    const value = e.total_emissions;
    if (value == null || !Number.isFinite(value)) continue;
    const key = `${Math.floor(e.lng / cellDeg)}:${Math.floor(e.lat / cellDeg)}`;
    const c = cells.get(key) || { lon: 0, lat: 0, sum: 0, n: 0, top: -Infinity, state: '' };
    c.lon += e.lng;
    c.lat += e.lat;
    c.sum += value;
    c.n += 1;
    if (value > c.top) {
      c.top = value;
      c.state = e.state;
    }
    cells.set(key, c);
  }

  const rows = [...cells.values()].map((c) => ({
    lon: c.lon / c.n,
    lat: c.lat / c.n,
    n: c.n,
    state: c.state,
    value: aggregate === 'sum' ? c.sum : c.sum / c.n,
  }));

  let max = domainMax;
  if (max == null) {
    const sorted = rows.map((r) => r.value).sort((a, b) => a - b);
    // nearest-rank 98th percentile
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.98 * sorted.length) - 1));
    max = sorted[idx] || 1;
  }
  const top = max;
  const norm = (v: number) => {
    if (v <= 0) return 0;
    const t = scale === 'log' ? Math.log1p(v) / Math.log1p(top) : scale === 'sqrt' ? Math.sqrt(v / top) : v / top;
    return Math.max(0, Math.min(1, t));
  };

  return {
    domainMax: top,
    geojson: {
      type: 'FeatureCollection',
      features: rows.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
        properties: { value: r.value, w: norm(r.value), points: r.n, state: r.state },
      })),
    },
  };
}

// heatmap-density -> colour. Approved design, do not restyle.
export const CLOUD_RAMP = [
  0.0, 'rgba(230,233,238,0)',
  0.06, 'rgba(230,233,238,0.22)',
  0.17, 'rgba(205,209,216,0.50)',
  0.33, 'rgba(160,164,172,0.70)',
  0.5, 'rgba(108,111,119,0.82)',
  0.67, 'rgba(62,64,71,0.90)',
  1.0, 'rgba(20,20,26,0.95)',
] as const;

// Legend bar (CSS) matching CLOUD_RAMP over the faded basemap. Approved design, do not restyle.
export const LEGEND_GRADIENT =
  'linear-gradient(90deg, #f3f4f5 0%, #e3e5e9 6%, #d3d6db 17%, #a8abb2 33%, #75787f 50%, #45474e 67%, #14141a 100%)';

/** Cell values at 0, 1/6, 1/3, 1/2, 2/3 and 1 of the legend bar, inverting the grid scale. */
export function legendTicks(domainMax: number, scale: GridOptions['scale'] = EMISSIONS_GRID_OPTIONS.scale): number[] {
  return [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 1].map((t) => {
    if (scale === 'log') return Math.expm1(t * Math.log1p(domainMax));
    if (scale === 'sqrt') return t * t * domainMax;
    return t * domainMax;
  });
}

/**
 * Adds the cloud stack: heatmap, swirl texture, 10° grid, white coastlines, plus the basemap
 * restyle. Safe to call again on the same map: nothing is added twice.
 */
export function addPollutionClouds(map: MaplibreMap, events: EmissionsData[]): GridResult {
  const result = gridEmissions(events);
  const beforeId = map.getLayer(AQ_BEFORE_ID) ? AQ_BEFORE_ID : undefined;

  const source = map.getSource(AQ_CELLS_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(result.geojson);
  } else {
    map.addSource(AQ_CELLS_SOURCE, { type: 'geojson', data: result.geojson });
  }

  if (!map.getLayer(AQ_CLOUD_LAYER)) {
    map.addLayer({
      id: AQ_CLOUD_LAYER,
      type: 'heatmap',
      source: AQ_CELLS_SOURCE,
      paint: {
        'heatmap-weight': ['get', 'w'],
        // Calibrated on the real data (SPEC.md "Calibration"): radius ~50px at the default
        // zoom (spec start ~62px smeared regions together). At country-wide zooms neighbouring
        // cells add up, so intensity is lowest there (~0.68 at the default zoom): high enough
        // for the worst areas to reach near-black, low enough that the dense Southeast doesn't
        // merge into one block. Zoomed-in views keep their stronger values.
        // Zoom 8 keeps the spec's 260px so neighbouring 1° cells still merge up close.
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.45, 5, 0.84, 8, 1.45],
        'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 2, 24, 3, 37, 5, 89, 8, 260],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], ...CLOUD_RAMP],
        'heatmap-opacity': 1,
      },
    }, beforeId);
  }

  // Texture layer is added once its image loads; it slots in under the grid to keep the order.
  addSwirlTexture(map);

  if (!map.getSource(AQ_GRATICULE)) {
    const lines: [number, number][][] = [];
    for (let lon = -180; lon <= 180; lon += 10) lines.push([[lon, -80], [lon, 80]]);
    for (let lat = -80; lat <= 80; lat += 10) lines.push([[-180, lat], [180, lat]]);
    map.addSource(AQ_GRATICULE, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } },
    });
  }
  if (!map.getLayer(AQ_GRATICULE)) {
    map.addLayer({
      id: AQ_GRATICULE,
      type: 'line',
      source: AQ_GRATICULE,
      paint: { 'line-color': '#ffffff', 'line-opacity': 0.45, 'line-width': 0.6 },
    }, beforeId);
  }

  // The basemap has no coastline layer; outline its water polygons instead.
  if (!map.getLayer(AQ_COAST_LAYER) && map.getSource(BASEMAP.basemapSource)) {
    map.addLayer({
      id: AQ_COAST_LAYER,
      type: 'line',
      source: BASEMAP.basemapSource,
      'source-layer': 'water',
      filter: ['==', '$type', 'Polygon'],
      paint: { 'line-color': '#ffffff', 'line-width': 1.1 },
    }, beforeId);
  }

  restyleBasemap(map, beforeId);

  // Invisible hit layer: heatmap layers cannot be queried, the hover tooltip reads from this.
  if (!map.getLayer(AQ_HIT_LAYER)) {
    map.addLayer({
      id: AQ_HIT_LAYER,
      type: 'circle',
      source: AQ_CELLS_SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 8, 6, 20, 9, 40],
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
      },
    });
  }

  return result;
}

async function addSwirlTexture(map: MaplibreMap) {
  try {
    if (!map.hasImage(AQ_SWIRL_IMAGE)) {
      const { data } = await map.loadImage(AQ_SWIRL_URL);
      // The map may have been removed (tab switch) or a parallel call may have won the race.
      if (!map.style || map.hasImage(AQ_SWIRL_IMAGE)) return;
      map.addImage(AQ_SWIRL_IMAGE, data, { pixelRatio: 1 });
    }
    if (!map.getSource(AQ_WORLD_SOURCE)) {
      map.addSource(AQ_WORLD_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] },
        },
      });
    }
    if (!map.getLayer(AQ_TEXTURE_LAYER)) {
      map.addLayer({
        id: AQ_TEXTURE_LAYER,
        type: 'fill',
        source: AQ_WORLD_SOURCE,
        paint: { 'fill-pattern': AQ_SWIRL_IMAGE, 'fill-opacity': 0.22 },
      }, map.getLayer(AQ_GRATICULE) ? AQ_GRATICULE : undefined);
    }
  } catch (err) {
    console.error('Failed to load air pollution texture:', err);
  }
}

function restyleBasemap(map: MaplibreMap, beforeId: string | undefined) {
  const set = (id: string, prop: string, value: unknown) => {
    if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
  };
  BASEMAP.land.forEach((id) => set(id, map.getLayer(id)?.type === 'background' ? 'background-color' : 'fill-color', '#f1f0ee'));
  BASEMAP.water.forEach((id) => set(id, 'fill-color', '#d9dfe3'));
  BASEMAP.country.forEach((id) => {
    set(id, 'line-color', '#ffffff');
    set(id, 'line-width', 1.1);
  });
  // State lines sit under water in this style and only start at zoom 4; lift them above
  // the clouds and show them at every zoom.
  if (map.getLayer(BASEMAP.state)) {
    set(BASEMAP.state, 'line-color', '#ffffff');
    set(BASEMAP.state, 'line-opacity', 0.75);
    map.setLayerZoomRange(BASEMAP.state, 0, 24);
    if (beforeId) map.moveLayer(BASEMAP.state, beforeId);
  }
}

/** Re-grids after a data (re)load. Layers are untouched; only the source data changes. */
export function updatePollutionClouds(map: MaplibreMap, events: EmissionsData[]): GridResult | null {
  const source = map.getSource(AQ_CELLS_SOURCE) as GeoJSONSource | undefined;
  if (!source) return null;
  const result = gridEmissions(events);
  source.setData(result.geojson);
  return result;
}
