'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { Map, NavigationControl } from '@vis.gl/react-maplibre';
import { tooltipClasses } from '@/lib/utils';

interface StateData {
  state: string;
  duration: number;
  state_code: string;
}

// Function to calculate responsive zoom level
const getResponsiveZoom = (containerWidth: number, containerHeight: number): number => {
  console.log('Container dimensions:', containerWidth, containerHeight);
  
  // Calculate zoom based on container dimensions to fit US properly
  let zoom = 3.5;
  
  if (containerWidth < 480) {
    // Mobile phones - much lower zoom to show complete US like in second image
    zoom = containerHeight < 300 ? 2.0 : 2.3;
  } else if (containerWidth < 640) {
    // Large mobile phones  
    zoom = 2.6;
  } else if (containerWidth < 768) {
    // Small tablets (portrait)
    zoom = 2.9;
  } else if (containerWidth < 1024) {
    // Medium tablets (landscape)
    zoom = 3.2;
  } else if (containerWidth < 1280) {
    // Desktop
    zoom = 3.6;
  } else {
    // Large desktop
    zoom = 3.8;
  }
  
  // Further adjust based on aspect ratio (height) - following USRiskHeatmap pattern
  if (containerHeight < 400) {
    zoom = Math.max(2.0, zoom - 0.5);
  } else if (containerHeight < 500) {
    zoom = Math.max(2.2, zoom - 0.3);
  } else if (containerHeight > 600) {
    zoom = Math.min(4.2, zoom + 0.2);
  }
  
  console.log('Calculated zoom:', zoom);
  return zoom;
};

// Helper function to get initial view state
const getInitialViewState = (containerWidth: number = 1024, containerHeight: number = 500) => ({
  longitude: -98.5,
  latitude: 39.8,
  zoom: getResponsiveZoom(containerWidth, containerHeight),
  pitch: 0,
  bearing: 0
});

export function USStateHeatmap() {
  const [data, setData] = useState<StateData[]>([]);
  const [statesGeoJson, setStatesGeoJson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hovered, setHovered] = useState<any>(null);
  const [hoverPos, setHoverPos] = useState<{x: number; y: number} | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 390, height: 256 }); // Default to mobile dimensions
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState(() => getInitialViewState(390, 256)); // Start with mobile defaults
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [deckReady, setDeckReady] = useState(false);

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

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading state duration data...');
        const response = await fetch('/state_avg_duration.csv');
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        const csvData: StateData[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length >= 3) {
            const state = values[0].trim();
            const duration = parseFloat(values[1]);
            const state_code = values[2].trim();
            
            if (!isNaN(duration)) {
              csvData.push({ state, duration, state_code });
            }
          }
        }
        
        console.log('Parsed state data:', csvData.length);
        setData(csvData);
      } catch (err) {
        console.error('Error loading state data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load CSV data');
      }
    };

    loadData();
  }, []);

  // Load GeoJSON data for US states
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Fetch US states GeoJSON from external source
        const res = await fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json");
        if (!res.ok) throw new Error(`Failed to fetch US states: ${res.status}`);
        const gj = await res.json();
        if (!cancelled) {
          setStatesGeoJson(gj);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('Error loading GeoJSON:', e);
          setError(e?.message ?? "Failed to load map data");
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Container size detection for responsive zoom
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    
    const setupObserver = () => {
      // Try ref first, then fallback to querySelector
      let container = containerRef.current;
      if (!container) {
        container = document.querySelector('.state-heatmap-container') as HTMLDivElement;
      }
      
      if (!container) return false;

      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setContainerSize({ width, height });
          }
        }
      });

      resizeObserver.observe(container);
      return true;
    };

    // Try immediately
    if (!setupObserver()) {
      // If not available, try again after a delay
      const timer = setTimeout(() => {
        setupObserver();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Update zoom level when container size changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newZoom = getResponsiveZoom(containerSize.width, containerSize.height);
      console.log('Updating viewState with new zoom:', newZoom, 'for container:', containerSize);
      
      // Force a complete viewState update to ensure DeckGL re-renders properly
      setViewState(prev => ({
        longitude: -98.5,
        latitude: 39.8,
        zoom: newZoom,
        pitch: 0,
        bearing: 0
      }));
    }
  }, [containerSize.width, containerSize.height]);

  // Create state data lookup using state names (not codes) - handle case variations
  const stateDataMap = useMemo(() => {
    const lookup = new globalThis.Map<string, StateData>();
    data.forEach(d => {
      // Store with original case and also lowercase for flexible lookup
      lookup.set(d.state, d);
      lookup.set(d.state.toLowerCase(), d);
    });
    return lookup;
  }, [data]);

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

  // Lightweight point-in-polygon helpers for GeoJSON rings/polygons
  const pointInRing = (pt: [number, number], ring: number[][]): boolean => {
    // Ray casting algorithm
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
        (pt[0] < (xj - xi) * (pt[1] - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const pointInPolygon = (pt: [number, number], polygon: number[][][]): boolean => {
    // polygon: [outerRing, hole1, hole2, ...]
    if (!polygon || polygon.length === 0) return false;
    if (!pointInRing(pt, polygon[0])) return false; // must be in outer ring
    // if in any hole, it's outside
    for (let h = 1; h < polygon.length; h++) {
      if (pointInRing(pt, polygon[h])) return false;
    }
    return true;
  };

  const pointInMultiPolygon = (pt: [number, number], multi: number[][][][]): boolean => {
    for (const poly of multi) {
      if (pointInPolygon(pt, poly)) return true;
    }
    return false;
  };

  const pointInFeature = (pt: [number, number], feature: any): boolean => {
    if (!feature.geometry) return false;
    const type = feature.geometry.type;
    const coords = feature.geometry.coordinates;
    
    if (type === 'Polygon') {
      return pointInPolygon(pt, coords as any);
    } else if (type === 'MultiPolygon') {
      return pointInMultiPolygon(pt, coords as any);
    }
    return false;
  };

  // Color scale function
  const getColorForDuration = useMemo(() => {
    if (data.length === 0) return () => [200, 200, 200, 255] as [number, number, number, number];
    
    const minDuration = Math.min(...data.map(d => d.duration));
    const maxDuration = Math.max(...data.map(d => d.duration));
    
    return (duration: number): [number, number, number, number] => {
      const normalizedValue = (duration - minDuration) / (maxDuration - minDuration);
      
      // Color scale from light beige to dark red (similar to reference image)
      if (normalizedValue < 0.25) {
        // Light beige to light orange
        const t = normalizedValue / 0.25;
        return [
          Math.round(250 - t * 30),  // R: 250 -> 220
          Math.round(240 - t * 40),  // G: 240 -> 200
          Math.round(220 - t * 60),  // B: 220 -> 160
          255
        ];
      } else if (normalizedValue < 0.5) {
        // Light orange to medium orange
        const t = (normalizedValue - 0.25) / 0.25;
        return [
          Math.round(220 - t * 20),  // R: 220 -> 200
          Math.round(160 - t * 40),  // G: 160 -> 120
          Math.round(100 - t * 40),  // B: 100 -> 60
          255
        ];
      } else if (normalizedValue < 0.75) {
        // Medium orange to red
        const t = (normalizedValue - 0.5) / 0.25;
        return [
          Math.round(200 - t * 30),  // R: 200 -> 170
          Math.round(80 - t * 30),   // G: 80 -> 50
          Math.round(40 - t * 25),   // B: 40 -> 15
          255
        ];
      } else {
        // Red to dark red
        const t = (normalizedValue - 0.75) / 0.25;
        return [
          Math.round(170 - t * 40),  // R: 170 -> 130
          Math.round(30 - t * 20),   // G: 30 -> 10
          Math.round(15 - t * 10),   // B: 15 -> 5
          255
        ];
      }
    };
  }, [data]);

  // Create the layer
  const layers = useMemo(() => {
    if (!statesGeoJson || data.length === 0) return [];

    return [
      new GeoJsonLayer({
        id: 'states-layer',
        data: statesGeoJson,
        filled: true,
        stroked: true,
        getFillColor: (feature: any) => {
          const stateName = feature.properties.name || feature.properties.NAME || 
                           feature.properties.state_name || feature.properties.STATE_NAME;
          
          // Try exact match first, then lowercase
          let stateData = stateDataMap.get(stateName);
          if (!stateData && stateName) {
            stateData = stateDataMap.get(stateName.toLowerCase());
          }
          
          if (stateData) {
            return getColorForDuration(stateData.duration);
          }
          return [240, 240, 240, 255]; // Light gray for no data
        },
        getLineColor: [255, 255, 255, 255], // White borders
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [100, 100, 100, 100],
        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      })
    ];
  }, [statesGeoJson, stateDataMap, getColorForDuration, viewState]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Average Fire Duration by State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 md:h-80 lg:h-96">
            <div className="text-gray-500">Loading map data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Average Fire Duration by State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 md:h-80 lg:h-96">
            <div className="text-red-500">Error loading data: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const minDuration = data.length > 0 ? Math.min(...data.map(d => d.duration)) : 0;
  const maxDuration = data.length > 0 ? Math.max(...data.map(d => d.duration)) : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Average Fire Duration by State</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <div ref={containerRef} className="relative h-64 sm:h-80 md:h-[400px] lg:h-[500px] border border-gray-200 rounded-md overflow-hidden state-heatmap-container">
            <Map
              mapStyle="https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json"
              longitude={viewState.longitude}
              latitude={viewState.latitude}
              zoom={viewState.zoom}
              pitch={viewState.pitch}
              bearing={viewState.bearing}
              onMove={(ev) => setViewState(ev.viewState)}
              onLoad={(e: any) => {
                mapRef.current = e.target;
                setMapLoaded(true);
              }}
              onMouseMove={(e: any) => {
                if (!statesGeoJson || !mapRef.current || !data.length) {
                  setHovered(null);
                  setHoverPos(null);
                  return;
                }
                try {
                  const mouse = e.point; // {x,y}
                  const lngLat = e.lngLat; // {lng, lat}
                  
                  // Find which state contains this geographic point
                  const features = statesGeoJson.type === 'FeatureCollection' ? statesGeoJson.features : [statesGeoJson];
                  let hoveredState = null;
                  
                  for (const feature of features) {
                    if (!feature.geometry || !feature.properties) continue;
                    
                    // Check if the point is inside this state's geometry
                    if (pointInFeature([lngLat.lng, lngLat.lat], feature)) {
                      const stateName = feature.properties.name || 
                                       feature.properties.NAME || 
                                       feature.properties.state_name || 
                                       feature.properties.STATE_NAME;
                      
                      if (stateName) {
                        // Try exact match first, then lowercase
                        let stateData = stateDataMap.get(stateName);
                        if (!stateData) {
                          stateData = stateDataMap.get(stateName.toLowerCase());
                        }
                        
                        if (stateData) {
                          hoveredState = { stateName, stateData };
                          break;
                        }
                      }
                    }
                  }
                  
                  if (hoveredState) {
                    setHovered(hoveredState);
                    setHoverPos({ x: mouse.x, y: mouse.y });
                  } else {
                    setHovered(null);
                    setHoverPos(null);
                  }
                } catch {
                  setHovered(null);
                  setHoverPos(null);
                }
              }}
              dragRotate={false}
              doubleClickZoom={true}
              scrollZoom={true}
              style={{width: "100%", height: "100%"}}
              attributionControl={false}
              maxBounds={[[-130, 20], [-60, 50]]}        // Restrict to US bounds
              maxZoom={8}
              minZoom={2.0}
            >
              <NavigationControl position="top-right" />
            </Map>
            {deckReady && mapLoaded && webglSupported && (
              <DeckGL
                key={`deckgl-${containerSize.width}-${containerSize.height}`}
                viewState={viewState}
                controller={false}
                layers={layers}
                style={{width: "100%", height: "100%", position:"absolute", top:"0", left:"0", pointerEvents:"none"}}
                onViewStateChange={({viewState: newViewState}: any) => {
                  if (newViewState && typeof newViewState === 'object' && 'longitude' in newViewState) {
                    setViewState({
                      longitude: newViewState.longitude,
                      latitude: newViewState.latitude,
                      zoom: newViewState.zoom,
                      pitch: newViewState.pitch || 0,
                      bearing: newViewState.bearing || 0
                    });
                  }
                }}
                getTooltip={null}
              />
            )}

            {!webglSupported && (
              <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md border border-amber-300/40 bg-slate-900/85 px-3 py-2 text-xs text-amber-200">
                WebGL is unavailable in this browser context. Map overlay is disabled.
              </div>
            )}
            
            {/* Manual tooltip */}
            {hovered && hoverPos && (
              <div
                className={`${tooltipClasses} max-w-[200px] text-[13px]`}
                style={{ left: hoverPos.x + 12, top: hoverPos.y + 12 }}
              >
                <div className="text-center">
                  <div className="font-bold mb-1">{hovered.stateName}</div>
                  <div>
                    {hovered.stateData ? (
                      <>
                        Avg Fire Duration: <span className="text-yellow-400">
                          {hovered.stateData.duration.toFixed(1)} days
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">No fire data available</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Low Duration</span>
              <div className="flex border border-gray-300">
                {[0, 0.25, 0.5, 0.75, 1].map((value, index) => {
                  const color = getColorForDuration(minDuration + value * (maxDuration - minDuration));
                  return (
                    <div
                      key={index}
                      className="w-8 h-4"
                      style={{
                        backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-sm text-gray-600">High Duration</span>
            </div>
          </div>
          
          {/* Duration range info */}
          <div className="mt-2 text-center text-sm text-gray-500">
            Range: {minDuration.toFixed(1)} - {maxDuration.toFixed(1)} days
          </div>
        </div>
      </CardContent>
    </Card>
  );
}