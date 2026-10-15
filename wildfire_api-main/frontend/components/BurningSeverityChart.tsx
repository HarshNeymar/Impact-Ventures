'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';

interface BurningSeverityChartProps {
  bsevValue?: number; // 0-6 range, optional now
  title?: string;
  showEmptyState?: boolean;
}

export function BurningSeverityChart({ bsevValue, title = "Burning Severity Index", showEmptyState = false }: BurningSeverityChartProps) {
  const defaultBsev = 0;
  const [storedBsev, setStoredBsev] = useState<number>(defaultBsev);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasStoredData, setHasStoredData] = useState(false);

  // On mount, load from localStorage if available (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bsevData');
      if (stored) {
        try {
          const parsedData = parseFloat(stored);
          if (!isNaN(parsedData)) {
            setStoredBsev(parsedData);
            setHasStoredData(true);
          }
        } catch {}
      }
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage when new bsevValue is received
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof bsevValue === 'number' && bsevValue !== storedBsev) {
      setStoredBsev(bsevValue);
      setHasStoredData(true);
      localStorage.setItem('bsevData', bsevValue.toString());
    }
  }, [bsevValue, storedBsev]);

  // Use provided value or stored value
  const currentBsev = typeof bsevValue === 'number' ? bsevValue : storedBsev;
  // Clamp value between 0 and 6
  const clampedValue = Math.min(Math.max(currentBsev, 0), 6);
  // Calculate percentage for thermometer fill
  const fillPercentage = (clampedValue / 6) * 100;
  // Determine color based on severity
  const getSeverityConfig = (value: number) => {
    if (value === 0) return { color: 'rgb(59, 130, 246)', label: 'No Severity' };
    if (value <= 1) return { color: 'rgb(254, 240, 138)', label: 'Low' };
    if (value <= 2) return { color: 'rgb(234, 179, 8)', label: 'Moderate-Low' };
    if (value <= 3) return { color: 'rgb(249, 115, 22)', label: 'Moderate' };
    if (value <= 4) return { color: 'rgb(239, 68, 68)', label: 'High' };
    if (value <= 5) return { color: 'rgb(220, 38, 127)', label: 'Very High' };
    return { color: 'rgb(124, 58, 237)', label: 'Extreme' };
  };
  const config = getSeverityConfig(clampedValue);

  if (showEmptyState && !hasStoredData) {
    return (
      <div className="w-full mt-2 md:mt-4">
        <div className="flex flex-col space-y-2 w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm font-medium text-teal-500">Burning Severity Index :</span>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xs md:text-sm font-bold text-gray-400 bg-gray-800 px-1.5 md:px-2 py-0.5 rounded text-center min-w-[2rem]">
                --
              </span>
            </div>
          </div>
          <div className="relative w-full h-3 md:h-4 rounded-full bg-gray-200">
            <div
              className="absolute left-0 top-0 h-3 md:h-4 rounded-full transition-all duration-700"
              style={{ width: `0%`, backgroundColor: 'rgb(59, 130, 246)' }}
            />
            {/* Tick marks */}
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 w-px h-3 md:h-4 bg-gray-400 opacity-30"
                style={{ left: `${(i / 6) * 100}%` }}
              />
            ))}
            <div className="absolute left-0 right-0 top-full flex justify-between text-[10px] md:text-xs text-white mt-1 px-0.5 md:px-1 select-none w-full">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className="leading-none font-medium">{i}</span>
              ))}
            </div>
          </div>
          <div className="md:hidden text-center">
            <span className="text-xs text-gray-400 italic">
              No Data
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full mt-2 md:mt-4">
        <div className="flex flex-col space-y-2 w-full">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-8 animate-pulse" />
          </div>
          <div className="h-3 md:h-4 bg-gray-200 rounded-full w-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-2 md:mt-4">
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex items-center justify-between">
          <span className="text-xs md:text-sm font-medium text-teal-500">Burning Severity Index :</span>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-xs md:text-sm font-bold text-white bg-gray-800 px-1.5 md:px-2 py-0.5 rounded text-center min-w-[2rem]">
              {clampedValue.toFixed(1)}
            </span>
            <span className="hidden md:inline text-xs text-gray-400">
              ({config.label})
            </span>
          </div>
        </div>
        <div className="relative w-full h-3 md:h-4 rounded-full bg-gray-200">
          <div
            className="absolute left-0 top-0 h-3 md:h-4 rounded-full transition-all duration-700"
            style={{ width: `${fillPercentage}%`, backgroundColor: config.color }}
          />
          {/* Tick marks */}
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 w-px h-3 md:h-4 bg-gray-400 opacity-30"
              style={{ left: `${(i / 6) * 100}%` }}
            />
          ))}
          <div className="absolute left-0 right-0 top-full flex justify-between text-[10px] md:text-xs text-white mt-1 px-0.5 md:px-1 select-none w-full">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="leading-none font-medium">{i}</span>
            ))}
          </div>
        </div>
        {/* Mobile severity label */}
        <div className="md:hidden text-center">
          <span className="text-xs text-gray-400 italic">
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}