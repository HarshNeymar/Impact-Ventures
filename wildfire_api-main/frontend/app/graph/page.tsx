'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { KPICards } from '@/components/KPICards';
import { BurningSeverityChart } from '@/components/BurningSeverityChart';
import USRiskHeatmap from '@/components/USRiskHeatmap';
import { GraphsSideNav, DEFAULT_GRAPHS_CONTROLS } from '@/components/GraphsSideNav';
import { SearchDropdowns } from '@/components/SearchDropdowns';
import { WildfireApiResponse } from '@/types/wildfire';

export default function GraphPage() {
  const [graphsControls, setGraphsControls] = useState(DEFAULT_GRAPHS_CONTROLS);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [wildfireResponse, setWildfireResponse] = useState<WildfireApiResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleGraphsControlsChange = (newControls: typeof DEFAULT_GRAPHS_CONTROLS) => {
    setGraphsControls(newControls);
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    console.log('Selected state:', state);
  };

  const handleCountyChange = (county: string) => {
    setSelectedCounty(county);
    console.log('Selected county:', county);
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    console.log('Selected date:', date);
  };

  const handleWildfireApiResponse = (response: WildfireApiResponse | null, error?: string) => {
    setWildfireResponse(response);
    setApiError(error || null);
    
    if (response) {
      console.log('Wildfire API response received:', response);
    } else if (error) {
      console.error('Wildfire API error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-80px)]">
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                
              </h1>
              <p className="text-muted-foreground">
                
              </p>
            </div>
            
            {/* Search Dropdowns */}
            <SearchDropdowns 
              onStateChange={handleStateChange}
              onCountyChange={handleCountyChange}
              onDateChange={handleDateChange}
              environmentalParameters={graphsControls}
              onWildfireApiResponse={handleWildfireApiResponse}
            />

            {/* API Response Status */}
            {apiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {apiError}
                </p>
              </div>
            )}

            {/* {wildfireResponse && !apiError && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>Prediction Success:</strong> Risk value {wildfireResponse.imputed?.risk || 'N/A'} 
                </p>
              </div>
            )} */}
            
            <KPICards 
              showEmptyState={!wildfireResponse}
              data={wildfireResponse ?? undefined}
            />

            {/* Risk Heatmap + Burning Severity side-by-side */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <USRiskHeatmap 
                risk={wildfireResponse?.imputed?.risk}
                state={wildfireResponse?.input?.state}
                county={wildfireResponse?.input?.county}
                showEmptyState={!wildfireResponse}
              />
            </div>
            {/* Burning Severity Bar under KPI cards */}
            <div className="mt-4">
              <BurningSeverityChart 
                bsevValue={wildfireResponse?.imputed?.BSEV}
                showEmptyState={!wildfireResponse}
              />
            </div>
          </div>
          
          {/* Side Navigation - Moved to Right */}
          <GraphsSideNav 
            controls={graphsControls}
            onControlsChange={handleGraphsControlsChange}
            onWildfireApiResponse={handleWildfireApiResponse}
          />
        </div>
      </main>
    </div>
  );
}
