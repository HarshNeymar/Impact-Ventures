'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { Info, MapPin, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { states } from 'states-us';
import { CustomDatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { callWildfireApi, validateEnvironmentalParameters, getParameterSummary } from '@/lib/wildfireApi';
import { EnvironmentalParameters, LocationParameters, WildfireApiResponse } from '@/types/wildfire';

// Memoize the expensive data processing operations
const getStatesData = () => {
  return states.map((state: any) => state.name);
};

interface SearchDropdownProps {
  placeholder: string;
  data?: string[];
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  label: string;
  fetchUrl?: string;
  stateFilter?: string; // Add state filter for county searches
  disabled?: boolean;
  tooltip?: string;
}

const SearchDropdown = React.memo(function SearchDropdown({
  placeholder,
  data,
  value,
  onChange,
  icon,
  label,
  fetchUrl,
  stateFilter,
  disabled = false,
  tooltip
}: SearchDropdownProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [fetchedData, setFetchedData] = useState<string[]>([]);

  useEffect(() => {
    if (fetchUrl && searchTerm) {
      // For county dropdown, require a state to be selected
      if (label === 'County' && !stateFilter) {
        setFetchedData([]);
        return;
      }

      const controller = new AbortController();
      const { signal } = controller;

      // Construct URL with search and optional state parameters
      const url = new URL(fetchUrl, window.location.origin);
      url.searchParams.set('search', searchTerm);
      
      // Add state filter for county searches
      if (stateFilter) {
        url.searchParams.set('state', stateFilter);
      }

      fetch(url.toString(), { signal })
        .then(res => res.json())
        .then(data => {
          setFetchedData(data);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error(err);
          }
        });

      return () => {
        controller.abort();
      };
    }
  }, [searchTerm, fetchUrl, stateFilter, label]);

  // Memoize the filtered data to prevent recalculation on every render
  const filteredData = useMemo(() => {
    if (fetchUrl) {
      return fetchedData;
    }
    if (!searchTerm || searchTerm.length === 0 || !data) return [];
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return data
      .filter(item => item.toLowerCase().includes(lowerSearchTerm))
      .slice(0, 10); // Limit to 10 results for better performance
  }, [data, searchTerm, fetchUrl, fetchedData]);

  // Simplified dropdown visibility logic
  const showDropdown = !disabled && isFocused && searchTerm && searchTerm.length > 0 && filteredData.length > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only reset county search when state actually changes (not on every render)
  const [lastStateFilter, setLastStateFilter] = useState(stateFilter);
  useEffect(() => {
    if (label === 'County' && stateFilter !== lastStateFilter && lastStateFilter !== undefined) {
      setSearchTerm('');
      setFetchedData([]);
      setLastStateFilter(stateFilter);
    } else if (lastStateFilter === undefined) {
      setLastStateFilter(stateFilter);
    }
  }, [stateFilter, lastStateFilter, label]);

  useEffect(() => {
    // Sync with external value changes (when parent resets the value)
    // Only update if the value is different from current searchTerm and it's a reset (empty string)
    if (value === '' && searchTerm !== '') {
      setSearchTerm('');
    }
  }, [value]); // Remove searchTerm from dependencies to prevent loops

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsFocused(true);
    
    if (newValue === '') {
      onChange('');
    } else if (!fetchUrl) {
      // Only call onChange if we have an exact match for non-fetching dropdown
      const exactMatch = data?.find(item => 
        item.toLowerCase() === newValue.toLowerCase()
      );
      if (exactMatch) {
        onChange(exactMatch);
      }
    }
  }, [data, onChange, fetchUrl, disabled]);

  const handleSelect = useCallback((item: string) => {
    setSearchTerm(item);
    onChange(item);
    setIsFocused(false);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    if (disabled) return;
    setIsFocused(true);
  }, [disabled]);

  const handleBlur = useCallback(() => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs md:text-sm font-medium text-white mb-1.5">
        <span className="inline-flex items-center gap-1">
          {label}
          {tooltip ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`${label} help`}
                    className="text-white/60 hover:text-white/90 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </span>
      </label>
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-white/80 pointer-events-none">
          {icon}
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-full pl-9 pr-2 py-2.5 text-xs md:text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-white/50 truncate disabled:opacity-60 disabled:cursor-not-allowed"
          title={tooltip}
        />
      </div>

      {showDropdown && (
        <Card className="absolute z-50 w-full mt-1 p-0 shadow-lg border max-h-60 overflow-y-auto" key={searchTerm}>
          {filteredData.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-white hover:text-black border-b last:border-b-0"
              onMouseDown={() => handleSelect(item)}
            >
              {item}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
});

interface SearchDropdownsProps {
  onStateChange?: (state: string) => void;
  onCountyChange?: (county: string) => void;
  onDateChange?: (date: Date | null) => void;
  environmentalParameters?: EnvironmentalParameters;
  onWildfireApiResponse?: (response: WildfireApiResponse | null, error?: string) => void;
}

export function SearchDropdowns({ 
  onStateChange, 
  onCountyChange, 
  onDateChange, 
  environmentalParameters,
  onWildfireApiResponse 
}: SearchDropdownsProps) {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date('2025-05-28T00:00:00')); // Day 148 of 2025
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize the expensive data processing to prevent re-computation on every render
  const statesData = useMemo(() => getStatesData(), []);

  const handleStateChange = useCallback((state: string) => {
    setSelectedState(state);
    // Reset county when state changes
    if (selectedCounty) {
      setSelectedCounty('');
      onCountyChange?.('');
    }
    onStateChange?.(state);
  }, [onStateChange, onCountyChange, selectedCounty]);

  const handleCountyChange = useCallback((county: string) => {
    setSelectedCounty(county);
    onCountyChange?.(county);
  }, [onCountyChange]);

  const handleDateChange = useCallback((date: Date | null) => {
    setSelectedDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  const handleRefreshData = useCallback(async () => {
    if (!environmentalParameters) {
      alert('Environmental parameters are not available. Please ensure all parameters are set.');
      return;
    }

    // State/County/Date are now optional. We'll call API with whatever is present.

    // Validate environmental parameters
    const validationErrors = validateEnvironmentalParameters(environmentalParameters);
    if (validationErrors.length > 0) {
      alert(`Parameter validation failed:\n${validationErrors.join('\n')}`);
      return;
    }

    setIsRefreshing(true);

    try {
      const locationParameters: LocationParameters = {
        state: selectedState || '',
        county: selectedCounty || '',
        date: selectedDate || null
      };

      console.log('Refreshing wildfire data with parameters:');
  console.log(getParameterSummary(environmentalParameters, locationParameters));

      const response = await callWildfireApi(environmentalParameters, locationParameters);
      
      onWildfireApiResponse?.(response);
      
      //alert(`Wildfire risk prediction successful!\nRisk Value: ${response.imputed?.risk || 'N/A'}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error refreshing wildfire data:', error);
      onWildfireApiResponse?.(null, errorMessage);
      alert(`Error refreshing wildfire data:\n${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [environmentalParameters, selectedState, selectedCounty, selectedDate, onWildfireApiResponse]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* State and County in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <SearchDropdown
            placeholder="State"
            data={statesData}
            value={selectedState}
            onChange={handleStateChange}
            icon={<MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            label="State"
            tooltip="The US state for the forecast location."
          />
        </div>
        <div>
          <SearchDropdown
            placeholder="County"
            value={selectedCounty}
            onChange={handleCountyChange}
            icon={<MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            label="County"
            fetchUrl="/api/counties"
            stateFilter={selectedState}
            disabled={!selectedState}
            tooltip="Pick a county."
          />
        </div>
      </div>
      
      {/* Date picker */}
      <div className="w-full">
        <CustomDatePicker
          label="Date"
          value={selectedDate}
          onChange={handleDateChange}
          minDate={new Date('2025-01-01T00:00:00')}
          maxDate={new Date('2025-09-30T23:59:59')}
          tooltip="The calendar date used for the forecast run."
        />
      </div>
      
      {/* Refresh Data button */}
      <div data-tour="refresh-button" className="w-full">
        <Button
          variant="default"
          className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 font-medium px-3 py-2.5 h-[42px] flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed w-full text-xs md:text-sm"
          onClick={handleRefreshData}
          disabled={isRefreshing || !environmentalParameters}
        >
          <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
    </div>
  );
}