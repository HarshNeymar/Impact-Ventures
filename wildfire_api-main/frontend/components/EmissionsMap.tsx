"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Map, NavigationControl, Marker } from "@vis.gl/react-maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { Button } from '@/components/ui/button';
import type { EmissionsData } from '@/types/emissions';
import { tooltipClasses } from '@/lib/utils';
import { getInitialEmissionView, getResponsiveEmissionZoom } from '@/lib/utils/viewportUtils';
import { addPollutionClouds, updatePollutionClouds, AQ_HIT_LAYER, type AqCellProperties } from '@/lib/utils/aqCloudLayer';
import { AirPollutionLegend } from '@/components/AirPollutionLegend';
import { SHARED_MAP_CONTAINER_CLASSNAME } from '@/lib/sharedMapContainer';
import { useGlobalSidebars } from '@/components/AuthenticatedLayout';

interface EmissionsMapProps {
  emissionsData: EmissionsData[];
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function EmissionsMap({ emissionsData, isRefreshing, onRefresh }: EmissionsMapProps) {
  const { setChatbotExpanded, analyzeEmissionsData, isChatbotExpanded } = useGlobalSidebars();
  const [emissionViewState, setEmissionViewState] = useState(getInitialEmissionView());
  const [emissionMapSize, setEmissionMapSize] = useState({ width: 0, height: 0 });
  const [pin, setPin] = useState<{ lng: number; lat: number } | null>(null);
  const [clickedEmission, setClickedEmission] = useState<EmissionsData | null>(null);
  const [clickedPos, setClickedPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ cell: AqCellProperties; x: number; y: number } | null>(null);
  const [emissionMapLoaded, setEmissionMapLoaded] = useState(false);
  const [domainMax, setDomainMax] = useState<number | null>(null);
  const mapRef = useRef<any>(null);

  // Responsive emission map sizing
  useEffect(() => {
    const container = document.querySelector('.emission-map-container');
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setEmissionMapSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Update emission map zoom when size changes
  useEffect(() => {
    if (emissionMapSize.width > 0 && emissionMapSize.height > 0) {
      const newZoom = getResponsiveEmissionZoom(emissionMapSize.width, emissionMapSize.height);
      setEmissionViewState(prev => ({
        ...prev,
        zoom: newZoom
      }));
    }
  }, [emissionMapSize.width, emissionMapSize.height]);

  // Cloud layer: added once per map instance, then re-gridded whenever data (re)loads.
  useEffect(() => {
    const map = mapRef.current;
    if (!emissionMapLoaded || !map) return;
    const result = updatePollutionClouds(map, emissionsData) ?? addPollutionClouds(map, emissionsData);
    setDomainMax(emissionsData.length ? result.domainMax : null);
  }, [emissionMapLoaded, emissionsData]);

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const map = mapRef.current;
    if (!map || !map.getLayer(AQ_HIT_LAYER)) return;
    const feature = map.queryRenderedFeatures(e.point, { layers: [AQ_HIT_LAYER] })[0];
    if (!feature) {
      setHoveredCell(null);
      return;
    }
    // Moving away from a clicked point closes its tooltip so the two don't stack.
    if (clickedPos && Math.hypot(e.point.x - clickedPos.x, e.point.y - clickedPos.y) > 40) {
      setClickedEmission(null);
      setClickedPos(null);
    }
    setHoveredCell({ cell: feature.properties as AqCellProperties, x: e.point.x, y: e.point.y });
  };

  const handleDblClick = (e: MapLayerMouseEvent) => {
    setPin({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  const handleMapClick = (e: any) => {
    console.log('🌫️ Map clicked! Event:', e);
    console.log('🌫️ Emissions data available:', emissionsData?.length || 0, 'points');
    console.log('🌫️ Map ref:', !!mapRef.current);
    
    if (!emissionsData || !emissionsData.length || !mapRef.current) {
      console.log('🌫️ Early return - missing data or map ref');
      setClickedEmission(null);
      setClickedPos(null);
      return;
    }
    
    try {
      const map = mapRef.current;
      const mouse = e.point;
      console.log('🌫️ Mouse position:', mouse);
      
      let closest: EmissionsData | null = null;
      let minDist = Infinity;
      
      for (const emission of emissionsData) {
        const p = map.project([emission.lng, emission.lat]);
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closest = emission;
        }
      }
      
      console.log('🌫️ Closest point found:', closest ? `${closest.county}, ${closest.state}` : 'none');
      console.log('🌫️ Distance:', minDist);
      
      if (closest && minDist < 30) { // 30px click radius threshold
        console.log('🌫️ Emissions scatter plot point clicked:', {
          clickedEmission: closest,
          clickPosition: { x: mouse.x, y: mouse.y },
          chatbotContext: { setChatbotExpanded, analyzeEmissionsData }
        });
        setClickedEmission(closest);
        setClickedPos({ x: mouse.x, y: mouse.y });
        
        console.log('🌫️ Emissions clicked - analyzing emissions data:', {
          chatbotAlreadyExpanded: isChatbotExpanded,
          emissionsData: !!closest,
          action: isChatbotExpanded ? 'analyzing_in_existing_chatbot' : 'opening_chatbot_and_analyzing'
        });
        
        console.log('🌫️ About to call analyzeEmissionsData with data:', closest);
        
        // Always call analyzeEmissionsData - it handles both new and existing chatbot
        analyzeEmissionsData(closest);
        
        // Only call setChatbotExpanded if chatbot is not already expanded
        if (!isChatbotExpanded) {
          setChatbotExpanded(true);
        }
      } else {
        console.log('🌫️ No point within 30px threshold');
        setClickedEmission(null);
        setClickedPos(null);
      }
    } catch (error) {
      console.error('🌫️ Error handling emissions map click:', error);
    }
  };

  const resetMapView = () => {
    const initialView = getInitialEmissionView(emissionMapSize.width || 1024, emissionMapSize.height || 500);
    setEmissionViewState(initialView);
  };

  return (
    <div className="w-full px-3 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6">
      {/* Control Buttons */}
      <div className="flex justify-end items-center gap-2 mb-2 md:mb-3 lg:mb-4">
        <Button
          onClick={resetMapView}
          size="sm"
          className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 text-xs md:text-sm"
          title="Reset map to initial view"
        >
          <svg
            className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Reset View
        </Button>
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          size="sm"
          className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 text-xs md:text-sm"
        >
          {isRefreshing ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-primary mr-1 md:mr-2"></div>
              Refreshing...
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Data
            </>
          )}
        </Button>
      </div>

      <div className={`${SHARED_MAP_CONTAINER_CLASSNAME} emission-map-container`}>
        {/* Base map */}
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json"
          {...emissionViewState}
          onMove={(ev) => setEmissionViewState(ev.viewState)}
          onDblClick={handleDblClick}
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredCell(null)}
          cursor={hoveredCell ? 'pointer' : 'grab'}
          onLoad={(e: any) => {
            mapRef.current = e.target;
            setEmissionMapLoaded(true);
          }}
          doubleClickZoom={true}
          maxBounds={[[-180, -60], [-30, 85]]}
          maxZoom={15}
          minZoom={1}
          style={{ position: "absolute", inset: 0 }}
        >
          <NavigationControl position="top-right" />
          {pin && (
            <Marker longitude={pin.lng} latitude={pin.lat} color="#94a3b8" />
          )}
        </Map>

        {domainMax && <AirPollutionLegend domainMax={domainMax} />}

        {/* Cloud cell tooltip - shown on hover */}
        {hoveredCell && !clickedEmission && (
          <div
            className={`${tooltipClasses} max-w-[280px] text-white`}
            style={{ left: hoveredCell.x + 12, top: hoveredCell.y + 12 }}
          >
            <div className="font-bold text-teal-400 mb-1 capitalize">
              {hoveredCell.cell.state.toLowerCase()} area
            </div>
            <div className="space-y-0.5">
              <div>Total Emissions: <span className="font-medium">{Math.round(hoveredCell.cell.value).toLocaleString()} tons</span></div>
              <div>Emission Events: <span className="font-medium">{hoveredCell.cell.points}</span></div>
              <div className="text-xs mt-2 pt-1 border-t border-border/50">Historical record, 2003–2015. Click for event details.</div>
            </div>
          </div>
        )}

        {/* Emissions tooltip - shown on click */}
        {clickedEmission && clickedPos && (
          <div
            className={`${tooltipClasses} max-w-[280px] text-white`}
            style={{ left: clickedPos.x + 12, top: clickedPos.y + 12 }}
          >
            <div className="font-bold text-teal-400 mb-1">
              {clickedEmission.county}, {clickedEmission.state}
            </div>
            <div className="space-y-0.5">
              <div>Emission Intensity: <span className="font-medium capitalize">{clickedEmission.emission_intensity}</span></div>
              <div>Fire Size Category: <span className="font-medium capitalize">{clickedEmission.fire_size_category}</span></div>
              <div>Emission Value: <span className="font-medium">{clickedEmission.emission_value.toFixed(2)}</span></div>
              <div className="text-xs mt-2 pt-1 border-t border-border/50">
                <div className="font-medium mb-1">Emissions Breakdown:</div>
                <div>CO2: <span className="font-medium">{clickedEmission.emissions.co2.toFixed(2)}</span></div>
                <div>CH4: <span className="font-medium">{clickedEmission.emissions.ch4.toFixed(2)}</span></div>
                <div>CO: <span className="font-medium">{clickedEmission.emissions.co.toFixed(2)}</span></div>
                <div>PM2.5: <span className="font-medium">{clickedEmission.emissions.pm2_5.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
