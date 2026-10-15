"use client"

import React from 'react';
import { Lock } from 'lucide-react';

interface TabNavigationProps {
  tab: 'risk' | 'emission' | 'ml';
  onTabChange: (tab: 'risk' | 'emission' | 'ml') => void;
  isBTSEnabled?: boolean;
}

export function DesktopTabNavigation({ tab, onTabChange, isBTSEnabled = false }: TabNavigationProps) {
  return (
    <div className="hidden md:flex w-full justify-center items-center mb-4 md:mb-8 px-3 md:px-6 pb-2 top-[64px] z-40 border-border/20 mt-4 md:mt-8 bg-transparent">
      <div className="flex items-center gap-4 md:gap-16 flex-wrap justify-center overflow-x-auto">
        <div className="relative flex justify-center min-w-fit">
          <button
            className={`font-inter text-lg md:text-3xl font-medium focus:outline-none pb-1 transition-colors ${tab === 'risk' ? 'text-orange-500' : 'text-white'}`}
            onClick={() => onTabChange('risk')}
          >
            Fire Forecast
          </button>
          {tab === 'risk' && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />
          )}
        </div>
        <div className="relative flex justify-center min-w-fit">
          <button
            className={`font-inter text-lg md:text-3xl font-medium focus:outline-none pb-1 transition-colors ${tab === 'emission' ? 'text-orange-500' : 'text-white'}`}
            onClick={() => onTabChange('emission')}
          >
            Air Pollution
          </button>
          {tab === 'emission' && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />
          )}
        </div>
        {isBTSEnabled && (
          <div className="relative flex justify-center min-w-fit">
            <button
              className={`font-inter text-lg md:text-3xl font-medium focus:outline-none pb-1 transition-colors ${tab === 'ml' ? 'text-orange-500' : 'text-white'}`}
              onClick={() => onTabChange('ml')}
            >
              Behind the Scenes
            </button>
            {tab === 'ml' && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileTabNavigation({ tab, onTabChange, isBTSEnabled = false }: TabNavigationProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-t border-border/30">
      <div className="flex justify-center items-center px-4 py-3">
        <div className="flex items-center justify-center gap-8 w-full">
          <div className="relative flex flex-col items-center min-w-fit">
            <button
              className={`flex flex-col items-center justify-center focus:outline-none transition-colors ${tab === 'risk' ? 'text-orange-500' : 'text-white'}`}
              onClick={() => onTabChange('risk')}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-medium">Fire Forecast</span>
            </button>
            {tab === 'risk' && (
              <div className="pointer-events-none absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </div>
          <div className="relative flex flex-col items-center min-w-fit">
            <button
              className={`flex flex-col items-center justify-center focus:outline-none transition-colors ${tab === 'emission' ? 'text-orange-500' : 'text-white'}`}
              onClick={() => onTabChange('emission')}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium">Air Pollution</span>
            </button>
            {tab === 'emission' && (
              <div className="pointer-events-none absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </div>
          {isBTSEnabled && (
            <div className="relative flex flex-col items-center min-w-fit">
              <button
                className={`flex flex-col items-center justify-center focus:outline-none transition-colors ${tab === 'ml' ? 'text-orange-500' : 'text-white'}`}
                onClick={() => onTabChange('ml')}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4M20 12h-4M4 12h4M12 20v-4M7.5 7.5l2.5 2.5M14 14l2.5 2.5M16.5 7.5L14 10" />
                </svg>
                <span className="text-xs font-medium">Behind the Scenes</span>
              </button>
              {tab === 'ml' && (
                <div className="pointer-events-none absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
