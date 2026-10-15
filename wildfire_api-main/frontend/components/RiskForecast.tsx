"use client"

import React from 'react';
import { KPICards } from '@/components/KPICards';
import { BurningSeverityChart } from '@/components/BurningSeverityChart';
import USRiskHeatmap from '@/components/USRiskHeatmap';
import { FireForecastInfo } from '@/components/FireForecastInfo';
import { DEFAULT_GRAPHS_CONTROLS } from '@/components/GraphsSideNav';
import { SHARED_MAP_CONTAINER_CLASSNAME } from '@/lib/sharedMapContainer';
import type { WildfireApiResponse } from '@/types/wildfire';

interface RiskForecastProps {
  graphsControls: typeof DEFAULT_GRAPHS_CONTROLS;
  selectedState: string;
  selectedCounty: string;
  selectedDate: Date | null;
  wildfireResponse: WildfireApiResponse | null;
  apiError: string | null;
  isLoadingPrediction: boolean;
  resetCounter: number;
  onGraphsControlsChange: (controls: typeof DEFAULT_GRAPHS_CONTROLS) => void;
  onStateChange: (state: string) => void;
  onCountyChange: (county: string) => void;
  onDateChange: (date: Date | null) => void;
  onWildfireApiResponse: (response: WildfireApiResponse | null, error?: string) => void;
  onResetAll: () => void;
  onMobileMenuStateChange?: (isOpen: boolean) => void;
}

export function RiskForecast({
  wildfireResponse,
  apiError,
  isLoadingPrediction,
  resetCounter
}: RiskForecastProps) {
  return (
    <div className="w-full h-full flex flex-col" data-tour="main-container">
      {/* Risk HeatMap - Main Content */}
      <div className="h-full w-full">
        <div className="flex flex-col h-full min-h-0 max-w-full">
          {/* API Response Status */}
          {apiError && (
            <div className="shrink-0 mx-3 md:mx-4 lg:mx-8 mt-3 md:mt-4 lg:mt-6 p-2 md:p-3 lg:p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs md:text-sm lg:text-sm text-red-700">
                <strong>Error:</strong> {apiError}
              </p>
            </div>
          )}

          {/* Main Content - Scrollable */}
          <div className="flex-1 min-w-0 px-3 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6 overflow-y-auto max-w-full">
            {/* KPI Cards */}
            {isLoadingPrediction ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse" key={`kpi-skel-${resetCounter}`}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-lg bg-muted/40 border border-border/40" />
                ))}
              </div>
            ) : (
              <div data-tour="kpi-cards">
                <KPICards
                  key={`kpi-${resetCounter}`}
                  showEmptyState={!wildfireResponse}
                  data={wildfireResponse ?? undefined}
                />
              </div>
            )}

            {/* Burning Severity Bar */}
            <div className="mt-3 md:mt-4 lg:mt-4">
              {isLoadingPrediction ? (
                <div className="h-10 md:h-12 lg:h-12 rounded-md bg-muted/40 border border-border/40 animate-pulse" key={`bsev-skel-${resetCounter}`} />
              ) : (
                <BurningSeverityChart
                  key={`bsev-${resetCounter}`}
                  bsevValue={wildfireResponse?.imputed?.BSEV}
                  showEmptyState={!wildfireResponse}
                />
              )}
            </div>

            {/* Risk Heatmap */}
            <div className="mt-4 md:mt-5 lg:mt-6" data-tour="risk-map">
              {isLoadingPrediction ? (
                <div className={`${SHARED_MAP_CONTAINER_CLASSNAME} animate-pulse bg-muted/30`} key={`heatmap-skel-${resetCounter}`} />
              ) : (
                <USRiskHeatmap
                  key={`heatmap-${resetCounter}`}
                  risk={wildfireResponse?.imputed?.risk}
                  state={wildfireResponse?.input?.state}
                  county={wildfireResponse?.input?.county}
                  showEmptyState={!wildfireResponse}
                  riskEvents={wildfireResponse?.risk_events}
                  lon={wildfireResponse?.imputed?.longitude}
                  lat={wildfireResponse?.imputed?.latitude}
                  wildfireResponse={wildfireResponse}
                />
              )}
            </div>

            {/* Fire Forecast Info Section */}
            <div className="mt-4 md:mt-5 lg:mt-6">
              <FireForecastInfo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
