"use client";

import {useEffect, useMemo, useState} from "react";
import {Map, NavigationControl, Marker} from "@vis.gl/react-maplibre";
import type {MapLayerMouseEvent} from "maplibre-gl";
import DeckGL from "@deck.gl/react";
import {HeatmapLayer} from "@deck.gl/aggregation-layers";
import {ScatterplotLayer, GeoJsonLayer} from "@deck.gl/layers";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Pt = { lon:number; lat:number; prob:number; tree_cover:number };

// Function to get responsive zoom for standalone map
const getResponsiveMapZoom = (): number => {
  if (typeof window === 'undefined') return 4;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  let zoom = 4;
  
  if (width < 480) {
    zoom = 3.0; // Mobile phones
  } else if (width < 768) {
    zoom = 3.5; // Tablets (portrait)
  } else if (width < 1024) {
    zoom = 3.8; // Tablets (landscape)
  } else if (width < 1280) {
    zoom = 4.0; // Medium desktop
  } else {
    zoom = 4.2; // Large desktop
  }
  
  if (height < 400) {
    zoom = Math.max(2.5, zoom - 0.5);
  }
  
  return zoom;
};

const getInitialMapView = () => ({
  longitude: -98.5,
  latitude: 39.8,
  zoom: getResponsiveMapZoom()
});

export default function MapPage() {
  const [viewState, setViewState] = useState(getInitialMapView());
  const [minProb, setMinProb] = useState(0.1);
  const [deckReady, setDeckReady] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  // mock data — replace with your predictions and water geojson
  const [predictions, setPredictions] = useState<Pt[]>([]);
  const [water, setWater] = useState<any>(null);
  const [pin, setPin] = useState<{lng:number; lat:number} | null>(null);

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

  useEffect(() => {
    // Generate more organic smoke cloud data with random dispersal
    const generateSmokeCloud = (centerLon: number, centerLat: number, prob: number, tree_cover: number) => {
      const points = [];
      const numPoints = Math.floor(12 + prob * 18); // Slightly fewer points for more controlled spread
      
      for (let i = 0; i < numPoints; i++) {
        // Create more controlled, realistic smoke distribution
        const angle = (Math.PI * 2 * i) / numPoints + (Math.random() - 0.5) * 0.6;
        const distance = Math.random() * 0.4 + 0.1; // Reduced from 1.2 to 0.4 (0.1 to 0.5)
        const irregularity = Math.random() * 0.3; // Reduced from 0.8 to 0.3
        
        const offsetLon = Math.cos(angle) * distance * irregularity;
        const offsetLat = Math.sin(angle) * distance * irregularity;
        
        points.push({
          lon: centerLon + offsetLon,
          lat: centerLat + offsetLat,
          prob: prob * (0.7 + Math.random() * 0.4), // Vary intensity within cloud
          tree_cover
        });
      }
      return points;
    };

    // Multi-state smoke coverage: California, Colorado (Denver), Virginia, Florida, and Texas
    const multiStateSmokeRegions = [
      // CALIFORNIA - existing coverage
      ...generateSmokeCloud(-122.5, 38.5, 0.85, 0.7), // North Bay Area
      ...generateSmokeCloud(-121.8, 38.8, 0.82, 0.8), // Sacramento Valley
      ...generateSmokeCloud(-120.5, 39.2, 0.90, 0.9), // Sierra Nevada foothills
      ...generateSmokeCloud(-118.2, 34.1, 0.81, 0.3), // Los Angeles Basin
      ...generateSmokeCloud(-117.8, 33.8, 0.87, 0.4), // Inland Empire
      ...generateSmokeCloud(-119.5, 37.5, 0.92, 0.8), // Sierra Nevada
      
      // COLORADO (Denver and surrounding areas)
      ...generateSmokeCloud(-105.0, 39.7, 0.78, 0.6), // Denver metro
      ...generateSmokeCloud(-105.5, 40.2, 0.82, 0.8), // Fort Collins area
      ...generateSmokeCloud(-104.8, 38.8, 0.85, 0.7), // Colorado Springs
      ...generateSmokeCloud(-106.8, 39.5, 0.89, 0.9), // Vail/Aspen area
      ...generateSmokeCloud(-107.5, 37.8, 0.86, 0.8), // Durango area
      ...generateSmokeCloud(-108.2, 39.1, 0.83, 0.7), // Grand Junction area
      
      // VIRGINIA
      ...generateSmokeCloud(-77.0, 38.9, 0.65, 0.7), // Northern Virginia/DC area
      ...generateSmokeCloud(-78.5, 37.5, 0.72, 0.8), // Richmond area
      ...generateSmokeCloud(-79.4, 37.3, 0.68, 0.9), // Lynchburg area
      ...generateSmokeCloud(-80.0, 37.0, 0.74, 0.8), // Roanoke area
      ...generateSmokeCloud(-76.3, 36.8, 0.69, 0.6), // Norfolk/Virginia Beach
      ...generateSmokeCloud(-78.9, 36.0, 0.71, 0.7), // Danville area
      ...generateSmokeCloud(-79.8, 39.3, 0.76, 0.8), // Eastern Panhandle
      
      // FLORIDA
      ...generateSmokeCloud(-81.4, 28.5, 0.73, 0.4), // Orlando area
      ...generateSmokeCloud(-80.2, 25.8, 0.67, 0.3), // Miami/South Florida
      ...generateSmokeCloud(-82.5, 27.9, 0.75, 0.5), // Tampa Bay area
      ...generateSmokeCloud(-84.3, 30.4, 0.78, 0.6), // Tallahassee area
      ...generateSmokeCloud(-81.7, 30.3, 0.79, 0.7), // Jacksonville area
      ...generateSmokeCloud(-82.6, 29.7, 0.76, 0.8), // Gainesville area
      ...generateSmokeCloud(-81.0, 29.2, 0.74, 0.6), // Daytona Beach area
      ...generateSmokeCloud(-82.8, 26.5, 0.71, 0.4), // Fort Myers area
      
      // TEXAS
      ...generateSmokeCloud(-97.7, 30.3, 0.81, 0.5), // Austin area
      ...generateSmokeCloud(-95.4, 29.8, 0.77, 0.4), // Houston area
      ...generateSmokeCloud(-96.8, 32.8, 0.79, 0.6), // Dallas area
      ...generateSmokeCloud(-98.5, 29.4, 0.83, 0.3), // San Antonio area
      ...generateSmokeCloud(-106.5, 31.8, 0.88, 0.2), // El Paso area
      ...generateSmokeCloud(-101.8, 33.6, 0.86, 0.4), // Lubbock area
      ...generateSmokeCloud(-100.4, 31.5, 0.84, 0.5), // Abilene area
      ...generateSmokeCloud(-94.1, 32.3, 0.82, 0.7), // East Texas forests
      ...generateSmokeCloud(-99.9, 27.8, 0.85, 0.3), // South Texas brush country
      ...generateSmokeCloud(-103.2, 32.2, 0.87, 0.4), // West Texas plains
      ...generateSmokeCloud(-97.1, 27.8, 0.78, 0.2), // Rio Grande Valley
    ];

    setPredictions(multiStateSmokeRegions);
    
    // optional: rivers/lakes polygons from /public/data/water.geojson
    fetch("/data/water.geojson").then(r=>r.json()).then(setWater).catch(()=>{});
  }, []);

  // Handle window resize for responsive zoom
  useEffect(() => {
    const handleResize = () => {
      const newZoom = getResponsiveMapZoom();
      setViewState(prev => ({
        ...prev,
        zoom: newZoom
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // deck.gl layers (zoom-aware + pastel smoke animation)
  const layers = useMemo(() => {
    const filteredPredictions = predictions.filter(d => d.prob >= minProb);
    
    const smoke = new HeatmapLayer<Pt>({
      id: "smoke",
      data: filteredPredictions,
      getPosition: (d: Pt) => [d.lon, d.lat],
      getWeight: (d: Pt) => d.prob * 1.5,                 // amplify weight for smoother blending
      // Dynamic radius: Large and thick at min zoom, smaller and focused when zoomed in
      radiusPixels: Math.max(20, 400 * Math.pow(0.6, viewState.zoom - 4)),
      // Dynamic intensity: High coverage at min zoom, more precise at high zoom
      intensity: Math.max(0.3, 2.5 * Math.pow(0.8, viewState.zoom - 4)),
      threshold: 0.005,  // Low threshold for smooth gradients
      colorRange: [
        [255, 255, 255, 0],      // transparent white
        [250, 250, 252, 40],     // very light whitish smoke (increased)
        [245, 245, 248, 70],     // light whitish-gray smoke (increased)
        [235, 235, 240, 100],    // soft gray smoke (increased)
        [220, 220, 225, 130],    // medium whitish-gray smoke (increased)
        [200, 200, 210, 160],    // visible gray smoke (increased)
        [180, 180, 190, 190]     // denser gray smoke (increased)
      ],
      // Smooth transitions for animation-like effect
      transitions: {
        radiusPixels: {duration: 1000, easing: (t: number) => Math.sin(t * Math.PI * 0.5)},
        intensity: {duration: 800, easing: (t: number) => t * t},
        opacity: {duration: 600, easing: (t: number) => t}
      }
    });

    const trees = new ScatterplotLayer<Pt>({
      id: "trees",
      data: predictions,
      pickable: true,
      getPosition: (d: Pt) => [d.lon, d.lat],
      getRadius: (d: Pt) => Math.max(2, d.tree_cover * (viewState.zoom * 1.2 + 4)),
      radiusMinPixels: 2,
      opacity: 0.6,
      getFillColor: [204,235,197, 200],      // pastel green (ColorBrewer-ish)
      getLineColor: [255,255,255,180],
      stroked: true,
      lineWidthMinPixels: 1,
      transitions: {getRadius: 250}
    });

    const waterPoly = water && new GeoJsonLayer({
      id: "water",
      data: water,
      filled: true,
      stroked: false,
      getFillColor: [218,233,246, 140],      // pastel blue
      opacity: 0.5
    });

    return [waterPoly, trees, smoke].filter(Boolean);
  }, [predictions, water, viewState, minProb]);

  // Map handlers (dbl-click drops a pin; move keeps DeckGL in sync)
  const handleDblClick = (e: MapLayerMouseEvent) => {
    setPin({lng: e.lngLat.lng, lat: e.lngLat.lat});
  };

  return (
    <div className="relative h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]"> {/* adjust for mobile header */}
      {/* Back Button */}
      <Link href="/" className="absolute top-2 md:top-4 left-2 md:left-4 z-10 bg-white/90 backdrop-blur-sm hover:bg-white/100 transition-colors rounded-lg px-3 md:px-4 py-1.5 md:py-2 shadow-md flex items-center gap-1 md:gap-2 text-gray-700 hover:text-gray-900">
        <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
        <span className="text-xs md:text-sm font-medium">Back to Home</span>
      </Link>

      {/* Base map */}
      <Map
        mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE!}
        {...viewState}
        onMove={(ev) => setViewState(ev.viewState)}  // sync view with deck.gl
        onDblClick={handleDblClick}                  // built-in dblclick event
        doubleClickZoom={true}
        maxBounds={[[-180, 15], [-50, 75]]}         // Restrict to USA bounds
        maxZoom={15}
        minZoom={4}
        style={{position:"absolute", inset:0}}
      >
        <NavigationControl position="top-right" />
        {pin && (
          <Marker longitude={pin.lng} latitude={pin.lat} color="#94a3b8" />
        )}
      </Map>

      {/* DeckGL overlay (overlaid mode) */}
      {deckReady && webglSupported && (
        <DeckGL
          viewState={viewState}
          layers={layers as any}
          controller={false}            // map handles interaction
          style={{position:"absolute", inset:"0", pointerEvents:"none"}}
        />
      )}

      {!webglSupported && (
        <div className="absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-md border border-amber-300/40 bg-slate-900/85 px-3 py-2 text-xs text-amber-200">
          WebGL is unavailable in this browser context. Map overlay is disabled.
        </div>
      )}

      {/* a tiny UI chip for the probability filter (demo) */}
      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-white/85 backdrop-blur px-2 md:px-3 py-1.5 md:py-2 shadow text-xs md:text-sm">
        Min smoke probability:
        <input type="range" min={0} max={1} step={0.05}
               value={minProb}
               onChange={e => setMinProb(parseFloat(e.target.value))}
               className="ml-1 md:ml-2 align-middle w-16 md:w-auto"/>
        <span className="ml-1 md:ml-2 text-xs md:text-sm">{minProb.toFixed(2)}</span>
      </div>
    </div>
  );
}
