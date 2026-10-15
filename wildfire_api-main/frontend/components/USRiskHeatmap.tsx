"use client";

import { useEffect, useMemo, useState, useRef, type HTMLAttributes } from "react";
import type { FeatureCollection } from "geojson";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { Map, NavigationControl } from "@vis.gl/react-maplibre";
import { RiskEvent, WildfireApiResponse } from "@/types/wildfire";
import { tooltipClasses } from "@/lib/utils";
import { SHARED_MAP_CONTAINER_CLASSNAME } from "@/lib/sharedMapContainer";
import { useGlobalSidebars } from "@/components/AuthenticatedLayout";

// Declare Material 3 components for TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-card': HTMLAttributes<HTMLElement>;
      'md-elevated-card': HTMLAttributes<HTMLElement>;
      'md-filled-button': HTMLAttributes<HTMLButtonElement>;
      'md-outlined-button': HTMLAttributes<HTMLButtonElement>;
      'md-chip-set': HTMLAttributes<HTMLElement>;
      'md-filter-chip': HTMLAttributes<HTMLElement>;
      'md-linear-progress': HTMLAttributes<HTMLElement>;
    }
  }
}

// Material components are globally registered once in material-init.ts (imported in layout)

// Minimal US-centric view - responsive zoom based on container size
type Viewport = { 
  longitude: number; 
  latitude: number; 
  zoom: number;
  bearing?: number;
  pitch?: number;
};

// Function to calculate responsive zoom level
const getResponsiveZoom = (containerWidth: number, containerHeight: number): number => {
  // Base zoom for desktop
  let zoom = 3.5;
  
  // Adjust zoom based on container width
  if (containerWidth < 480) {
    // Mobile phones
    zoom = 2.5;
  } else if (containerWidth < 640) {
    // Large mobile phones
    zoom = 2.8;
  } else if (containerWidth < 768) {
    // Small tablets (portrait)
    zoom = 3.0;
  } else if (containerWidth < 1024) {
    // Medium tablets (landscape)
    zoom = 3.3;
  } else if (containerWidth < 1280) {
    // Desktop
    zoom = 3.6;
  } else {
    // Large desktop
    zoom = 3.8;
  }
  
  // Further adjust based on aspect ratio (height)
  if (containerHeight < 400) {
    zoom = Math.max(2.0, zoom - 0.5);
  } else if (containerHeight < 500) {
    zoom = Math.max(2.2, zoom - 0.3);
  } else if (containerHeight > 600) {
    zoom = Math.min(4.2, zoom + 0.2);
  }
  
  return zoom;
};

const getInitialView = (containerWidth: number = 1024, containerHeight: number = 500): Viewport => ({
  longitude: -95.0,
  latitude: 39.0,
  zoom: getResponsiveZoom(containerWidth, containerHeight),
  bearing: 0,
  pitch: 0
});

// Minimal interface for the maplibre map instance stored in the ref
interface MapInstance {
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  project: (lnglat: [number, number]) => { x: number; y: number };
}

// Props contract
export interface USRiskHeatmapProps {
  risk?: number | null;           // wildfireResponse.imputed.risk (1.8 - 6.4)
  state?: string | null;          // Selected state name (matching GeoJSON 'name')
  county?: string | null;         // Optional, for future highlighting
  lon?: number | null;            // Optional point marker
  lat?: number | null;            // Optional point marker
  showEmptyState?: boolean;       // If true and no risk/state => show placeholder
  riskEvents?: RiskEvent[] | null; // Array of risk event points to display as circles
  wildfireResponse?: WildfireApiResponse | null;
}

export default function USRiskHeatmap({ risk, state, county, lon, lat, showEmptyState, riskEvents, wildfireResponse }: USRiskHeatmapProps) {
  const { setChatbotExpanded, analyzeFireData, isChatbotExpanded } = useGlobalSidebars();
  const [statesGeoJson, setStatesGeoJson] = useState<FeatureCollection | null>(null);
  const [viewState, setViewState] = useState<Viewport>(getInitialView());
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [mapLoaded, setMapLoaded] = useState(false); // ensure map style is loaded before overlay
  const [deckReady, setDeckReady] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [stored, setStored] = useState<{
    risk?: number;
    state?: string;
    county?: string;
    lon?: number;
    lat?: number;
  }>({});
  const [hasStoredData, setHasStoredData] = useState(false);
  const [hovered, setHovered] = useState<RiskEvent | null>(null);
  const [hoverPos, setHoverPos] = useState<{x:number;y:number}|null>(null);
  const [clicked, setClicked] = useState<RiskEvent | null>(null);
  const [clickedPos, setClickedPos] = useState<{x:number;y:number}|null>(null);
  const mapRef = useRef<MapInstance | null>(null);

  // Defer DeckGL mount by one tick to avoid React Strict Mode throwaway mounts in dev.
  useEffect(() => {
    const timer = window.setTimeout(() => setDeckReady(true), 0);
    return () => {
      window.clearTimeout(timer);
      setDeckReady(false);
    };
  }, []);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const hasWebGL = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
      setWebglSupported(hasWebGL);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Add styles for Material 3 components
  const buttonStyles = `
    .risk-button-low {
      --md-filled-button-container-color: rgb(34, 197, 94);
    }
    .risk-button-medium {
      --md-filled-button-container-color: rgb(251, 146, 60);
    }
    .risk-button-high {
      --md-filled-button-container-color: rgb(239, 68, 68);
    }
    .compact-button {
      --md-outlined-button-container-height: 32px;
      --md-outlined-button-label-text-size: 12px;
      --md-filled-button-container-height: 32px;
      --md-filled-button-label-text-size: 12px;
    }
    .legend-chip-low {
      --md-filter-chip-container-color: rgb(254, 240, 138, 0.8);
    }
    .legend-chip-medium {
      --md-filter-chip-container-color: rgb(251, 146, 60, 0.8);
    }
    .legend-chip-high {
      --md-filter-chip-container-color: rgb(239, 68, 68, 0.8);
    }
  `;

  // Add resize observer to track container dimensions
  useEffect(() => {
    const container = document.querySelector('.us-risk-heatmap-container');
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Update zoom level when container size changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newZoom = getResponsiveZoom(containerSize.width, containerSize.height);
      setViewState(prev => ({
        ...prev,
        zoom: newZoom
      }));
    }
  }, [containerSize.width, containerSize.height]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("riskHeatmapData");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setStored(parsed);
          setHasStoredData(true);
        }
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  // Save to localStorage when fresh values arrive
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = {
      risk: typeof risk === "number" ? risk : stored.risk,
      state: state ?? stored.state,
      county: county ?? stored.county,
      lon: typeof lon === "number" ? lon : stored.lon,
      lat: typeof lat === "number" ? lat : stored.lat,
    };
    // If any field changed, persist
    const changed = JSON.stringify(next) !== JSON.stringify(stored);
    if (changed) {
      try {
        localStorage.setItem("riskHeatmapData", JSON.stringify(next));
        setStored(next);
        setHasStoredData(Boolean(next.risk && next.state));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risk, state, county, lon, lat]);

  // Load US states GeoJSON (small, public sample). Consider moving to /public/data to avoid network.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Fetch US states GeoJSON from external source
        const res = await fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json");
        if (!res.ok) throw new Error(`Failed to fetch US states: ${res.status}`);
        const gj = await res.json();
        if (!cancelled) setStatesGeoJson(gj);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load map data");
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Color scale for risk range 1.8 → 6.4 (enhanced saturation yellow → orange → deep red)
  const colorForRisk = useMemo(() => {
    const stops = [
      { t: 0,   color: [255, 222, 89] },  // richer yellow
      { t: 0.5, color: [255, 140, 0]  },  // vivid orange
      { t: 1,   color: [200, 30, 30]  }   // deeper red
    ];
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    return (val: number) => {
      const t = clamp((val - 1.8) / (6.4 - 1.8), 0, 1);
      const seg = t <= 0.5 ? [stops[0], stops[1]] : [stops[1], stops[2]];
      const localT = t <= 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
      const r = Math.round(lerp(seg[0].color[0], seg[1].color[0], localT));
      const g = Math.round(lerp(seg[0].color[1], seg[1].color[1], localT));
      const b = Math.round(lerp(seg[0].color[2], seg[1].color[2], localT));
      return [r, g, b, 255] as [number, number, number, number]; // fully opaque for thicker look
    };
  }, []);

  // Prefer live props; fall back to stored values
  const effectiveRisk = typeof risk === "number" ? risk : stored.risk;
  const effectiveState = state ?? stored.state;

  const layers = useMemo((): (GeoJsonLayer | ScatterplotLayer)[] => {
    if (!statesGeoJson) return [];

    const baseAlpha = Math.min(200, 120 + (viewState.zoom - 3) * 20);
    const lineWidth = Math.max(1, Math.min(4, viewState.zoom / 2));

    const base = new GeoJsonLayer({
      id: "us-states-base",
      data: statesGeoJson,
      stroked: true,
      filled: true,
      getFillColor: [245, 245, 245, baseAlpha],
      getLineColor: [200, 200, 200, Math.min(255, baseAlpha + 50)],
      lineWidthMinPixels: lineWidth,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      transitions: {
        getFillColor: 300,
        getLineColor: 300,
        lineWidthMinPixels: 300
      }
    });

    // Scatterplot of risk events (if provided)
    const events = (riskEvents && riskEvents.length) ? new ScatterplotLayer({
      id: 'risk-events',
      data: riskEvents,
      pickable: true,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      getPosition: (d: RiskEvent) => [d.longitude, d.latitude],
      getRadius: (d: RiskEvent) => {
        // Dynamic pixel sizing achieved through min/max pixels. Use risk to scale visually.
        // Return nominal radius (meters) but rely on pixel clamps; still vary slightly by risk.
        const norm = Math.min(1, Math.max(0, (d.risk - 1.8) / (6.4 - 1.8))); // 0..1
        return 1 + norm * 0.5; // small variation; real size via pixel clamps below
      },
      radiusMinPixels: 8,   // thicker base
      radiusMaxPixels: 28,  // allow larger at higher zoom
      getFillColor: (d: RiskEvent) => {
        const color = colorForRisk(d.risk);
        return color; // already full alpha
      },
      stroked: false, // remove outer white stroke
      filled: true,
      parameters: { depthTest: false },
      transitions: { getFillColor: 300, radiusMinPixels: 300 },
      // Hover handled manually via map pointer move for scroll zoom compatibility
    }) : null;

    return [base, events].filter((l) => l !== null) as (GeoJsonLayer | ScatterplotLayer)[];
  }, [statesGeoJson, riskEvents, viewState.zoom, colorForRisk]);

  // Must match ScatterplotLayer's radiusMinPixels below. getRadius returns metres
  // (~1) which is sub-pixel at these zooms, so every dot renders at exactly this size.
  const DOT_RADIUS_PX = 8;
  // Small forgiveness for imprecise clicks. The old code used 30px, nearly 4x the dot,
  // so clicking empty map selected a dot the user could not see.
  const PICK_TOLERANCE_PX = 4;

  // Returns the event the user is actually pointing at.
  // Previously both handlers took the nearest dot CENTRE within 30px. DeckGL paints in
  // array order, so overlapping dots hid earlier ones, and "nearest centre" regularly
  // returned a dot underneath the visible one - a different county ~25% of the time.
  const pickEventAt = (mouse: { x: number; y: number }): RiskEvent | null => {
    const map = mapRef.current;
    if (!map || !riskEvents || !riskEvents.length) return null;

    let covering: RiskEvent | null = null;
    let nearest: RiskEvent | null = null;
    let nearestDist = Infinity;

    for (const rv of riskEvents) {
      const p = map.project([rv.longitude, rv.latitude]);
      const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      // Later entries are painted on top, so keep overwriting to end up with the
      // dot that is actually visible at this pixel.
      if (dist <= DOT_RADIUS_PX) covering = rv;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = rv;
      }
    }

    if (covering) return covering;
    return nearestDist <= DOT_RADIUS_PX + PICK_TOLERANCE_PX ? nearest : null;
  };

  // Force a redraw after both map and geojson have loaded to eliminate initial overlay shift
  useEffect(() => {
    if (mapLoaded && statesGeoJson) {
      // Small delay to ensure map is fully rendered before syncing DeckGL
      const timer = setTimeout(() => {
        // Trigger DeckGL to recompute matrices by setting same state object
        setViewState(v => ({ ...v }));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, statesGeoJson]);


  // Empty state
  if (showEmptyState && isLoaded && !hasStoredData && (!effectiveRisk || !effectiveState)) {
    return (
      <md-elevated-card className="w-full h-full">
        <style>{buttonStyles}</style>
  <div className="p-0">
          <div className={`${SHARED_MAP_CONTAINER_CLASSNAME} us-risk-heatmap-container`}>
            <div className="absolute inset-0 overflow-hidden">
              {/* Show US Map with base layer only */}
              <Map
                mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE as string}
                {...viewState}
                onMove={(ev) => setViewState({
                  longitude: ev.viewState.longitude,
                  latitude: ev.viewState.latitude,
                  zoom: ev.viewState.zoom
                })}
                maxBounds={[[-180, 15], [-50, 75]]}
                dragRotate={false}
                doubleClickZoom={false}
                scrollZoom={true}
                style={{width: "100%", height: "100%"}}
              >
                <NavigationControl position="top-left" />
              </Map>
              {/* Show base layer with no highlights */}
              {deckReady && webglSupported && statesGeoJson && (
                <DeckGL
                  viewState={{
                    longitude: viewState.longitude,
                    latitude: viewState.latitude,
                    zoom: viewState.zoom,
                    pitch: 0,
                    bearing: 0
                  }}
                  layers={[
                    new GeoJsonLayer({
                      id: "us-states-base-empty",
                      data: statesGeoJson,
                      stroked: true,
                      filled: true,
                      getFillColor: [245, 245, 245, 120],
                      getLineColor: [200, 200, 200, 200],
                      lineWidthMinPixels: 1,
                      pickable: false,
                      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    })
                  ]}
                  controller={false}
                  style={{width: "100%", height: "100%", position:"absolute", top:"0", left:"0", pointerEvents:"none"}}
                  getTooltip={null}
                />
              )}
            </div>
          </div>
        </div>
      </md-elevated-card>
    );
  }

  return (
    <md-elevated-card className="w-full h-full">
      <style>{buttonStyles}</style>
  <div className="p-0">
  <div className={`${SHARED_MAP_CONTAINER_CLASSNAME} us-risk-heatmap-container`}>
          <div className="absolute inset-0 overflow-hidden">
            {/* Removed Material 3 Control Panel (Reset View, Risk button) */}
            <Map
              mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE as string}
              {...viewState}
              onMove={(ev) => setViewState({
                longitude: ev.viewState.longitude,
                latitude: ev.viewState.latitude,
                zoom: ev.viewState.zoom
              })}
              onLoad={(e: { target: MapInstance }) => {
                try {
                  const center = e.target.getCenter();
                  const zoom = e.target.getZoom();
                  setViewState({ longitude: center.lng, latitude: center.lat, zoom });
                  mapRef.current = e.target;
                } catch {}
                setMapLoaded(true);
              }}
              onMouseMove={(e: { point: { x: number; y: number } }) => {
                if (!riskEvents || !riskEvents.length || !mapRef.current) {
                  setHovered(null);
                  setHoverPos(null);
                  return;
                }
                try {
                  const mouse = e.point; // {x,y}
                  const closest = pickEventAt(mouse);
                  if (closest) {
                    setHovered(closest);
                    setHoverPos({ x: mouse.x, y: mouse.y });
                  } else {
                    setHovered(null);
                    setHoverPos(null);
                  }
                } catch {
                  // ignore
                }
              }}
              onClick={(e: { point: { x: number; y: number } }) => {
                if (!riskEvents || !riskEvents.length || !mapRef.current) {
                  setClicked(null);
                  setClickedPos(null);
                  return;
                }
                try {
                  const mouse = e.point; // {x,y}
                  const closest = pickEventAt(mouse);
                  if (closest) {
                    console.log('🔥 Scatter plot point clicked:', {
                      clickedEvent: closest,
                      clickPosition: { x: mouse.x, y: mouse.y },
                      hasWildfireResponse: !!wildfireResponse,
                    });
                    setClicked(closest);
                    setClickedPos({ x: mouse.x, y: mouse.y });

                    if (wildfireResponse) {
                      // Send the dot that was actually clicked. This used to pass
                      // `wildfireResponse` unchanged, so the assistant always described the
                      // location from the side-panel forecast no matter which dot was picked
                      // (click Shawnee, Kansas -> "Cochise County, Arizona").
                      // `risk_events` is stripped: it is ~44KB the backend never reads.
                      const { risk_events: _unusedRiskEvents, ...forecast } = wildfireResponse;
                      const fireDataForPoint = {
                        ...forecast,
                        input: {
                          ...wildfireResponse.input,
                          state: closest.state,
                          county: closest.county,
                        },
                        imputed: {
                          ...wildfireResponse.imputed,
                          state: closest.state,
                          county: closest.county,
                          latitude: closest.latitude,
                          longitude: closest.longitude,
                          risk: closest.risk,
                        },
                      };

                      console.log('🔥 Scatter plot clicked - analyzing selected point:', {
                        location: `${closest.county}, ${closest.state}`,
                        risk: closest.risk,
                        chatbotAlreadyExpanded: isChatbotExpanded,
                      });

                      analyzeFireData(fireDataForPoint);

                      // Only call setChatbotExpanded if chatbot is not already expanded
                      if (!isChatbotExpanded) {
                        setChatbotExpanded(true);
                      }
                    } else {
                      console.log('🔥 No wildfire response data available for analysis');
                      // Still open chatbot even if no data, but only if not already open
                      if (!isChatbotExpanded) {
                        setChatbotExpanded(true);
                      }
                    }
                  } else {
                    setClicked(null);
                    setClickedPos(null);
                  }
                } catch {
                  // ignore
                }
              }}
              maxBounds={[[-180, 15], [-50, 75]]}
              dragRotate={false}
              doubleClickZoom={false}
              scrollZoom={true}
              style={{width: "100%", height: "100%"}}
            >
              <NavigationControl position="top-left" />
            </Map>
            {deckReady && webglSupported && mapLoaded && (
              <DeckGL
                viewState={{
                  longitude: viewState.longitude,
                  latitude: viewState.latitude,
                  zoom: viewState.zoom,
                  pitch: 0,
                  bearing: 0
                }}
                layers={layers}
                controller={false}
                style={{width: "100%", height: "100%", position:"absolute", top:"0", left:"0", pointerEvents:"none"}}
                getTooltip={null}
                onViewStateChange={({viewState: newViewState}) => {
                  // Keep DeckGL in sync with map
                  if (newViewState && typeof newViewState === 'object' && 'longitude' in newViewState) {
                    setViewState({
                      longitude: newViewState.longitude,
                      latitude: newViewState.latitude,
                      zoom: newViewState.zoom
                    });
                  }
                }}
              />
            )}
            {!webglSupported && (
              <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md border border-amber-300/40 bg-slate-900/85 px-3 py-2 text-xs text-amber-200">
                WebGL is unavailable in this browser context. Map overlay is disabled.
              </div>
            )}
            {wildfireResponse && Array.isArray(riskEvents) && riskEvents.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
                <div className="max-w-md rounded-lg border border-teal-500/30 bg-slate-900/90 px-6 py-4 text-center text-sm leading-relaxed text-teal-100/90 backdrop-blur-sm">
                  <p className="text-base font-semibold text-teal-400">
                    No historical fires match these inputs
                  </p>
                  <p className="mt-2">
                    KPIs are model predictions. The map shows similar past events. None found here.
                    Try a broader state, county, or date.
                  </p>
                </div>
              </div>
            )}
            {hovered && hoverPos && !clicked && (
              <div
                className={`${tooltipClasses} text-[13px] max-w-[240px] text-white`}
                style={{ left: hoverPos.x + 12, top: hoverPos.y + 12 }}
              >
                <div className="font-semibold mb-0.5 text-center text-teal-400">
                  {(hovered.county || 'Unknown County')}{hovered.state ? `, ${hovered.state}` : ''}
                </div>
                <div className="opacity-90 mb-1">Risk: <span className="font-medium">{hovered.risk.toFixed(2)}</span></div>
                <div className="text-xs opacity-75 text-center italic mt-2">
                  Click on dot to learn more
                </div>
              </div>
            )}
            {clicked && clickedPos && (
              <div
                className={`${tooltipClasses} text-[13px] max-w-[280px] text-white`}
                style={{ left: clickedPos.x + 12, top: clickedPos.y + 12 }}
              >
                <button
                  onClick={() => {
                    setClicked(null);
                    setClickedPos(null);
                  }}
                  className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="font-semibold mb-1 text-center text-teal-400 pr-6">
                  {(clicked.county || 'Unknown County')}{clicked.state ? `, ${clicked.state}` : ''}
                </div>
                <div className="space-y-1">
                  <div className="opacity-90">Risk Level: <span className="font-medium">{clicked.risk.toFixed(2)}</span></div>
                  <div className="opacity-90 text-xs">
                    Location: {clicked.latitude.toFixed(4)}, {clicked.longitude.toFixed(4)}
                  </div>
                </div>
                <div className="text-xs opacity-75 text-center italic mt-3">
                  Use AI chat to ask questions about this location
                </div>
              </div>
            )}
          </div>
          {/* Removed Risk Scale legend and chips */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>
    </md-elevated-card>
  );
}
