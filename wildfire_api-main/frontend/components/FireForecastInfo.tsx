"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useGlobalSidebars, useGlobalSidebarConfig } from '@/components/AuthenticatedLayout';

export const FIRE_FORECAST_SLIDES = [
  {
    id: 1,
    title: "Understanding Wildfire Risk Assessment",
    content: (
      <p className="text-sm leading-relaxed text-white">
        This Fire Forecast system provides data-driven predictions of wildfire behavior across the United States. By analyzing environmental conditions and historical patterns, the model helps visualize potential fire risks in different regions, enabling better preparedness and response planning.
      </p>
    )
  },
  {
    id: 2,
    title: "Risk Level Classification",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          The risk assessment uses a 1-10 scale to communicate the severity of potential fire events:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Low Risk (1-3):</strong> Minimal fire danger with favorable weather conditions and low fuel availability. Standard precautions are sufficient.
          </li>
          <li>
            <strong className="text-teal-400">Moderate Risk (4-6):</strong> Elevated fire potential due to moderate fuel loads or weather conditions. Increased vigilance recommended.
          </li>
          <li>
            <strong className="text-teal-400">High Risk (7-8):</strong> Significant fire danger with high fuel availability and conducive weather patterns. Enhanced preparedness required.
          </li>
          <li>
            <strong className="text-teal-400">Extreme Risk (9-10):</strong> Critical fire conditions with the highest potential for rapid spread and severe impact. Maximum alert status.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 3,
    title: "Key Fire Behavior Indicators",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          The forecast integrates multiple factors that influence wildfire behavior:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Burning Index:</strong> Measures the potential flame length and difficulty of fire suppression based on fuel and weather conditions.
          </li>
          <li>
            <strong className="text-teal-400">Wind Speed:</strong> Critical factor affecting fire spread rate and direction. Higher winds significantly increase fire intensity and unpredictability.
          </li>
          <li>
            <strong className="text-teal-400">Fire Duration:</strong> Estimated persistence of active burning, helping responders understand resource allocation needs.
          </li>
          <li>
            <strong className="text-teal-400">Burning Severity (BSEV):</strong> Predicts the depth of burn and ecological impact, ranging from light surface burns to severe damage affecting deep soil layers.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 4,
    title: "Interactive Map Features",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          The risk heatmap provides an intuitive visualization of fire danger across regions:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Color Coding:</strong> Green indicates low risk areas, progressing through yellow and orange to red for extreme risk zones.
          </li>
          <li>
            <strong className="text-teal-400">Event Markers:</strong> Circular indicators show predicted fire events, with size reflecting the risk magnitude. Hover for detailed information.
          </li>
          <li>
            <strong className="text-teal-400">Regional Context:</strong> State and county boundaries help identify specific areas of concern for targeted intervention.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 5,
    title: "Environmental Parameters Impact",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          The model considers numerous environmental factors that influence fire behavior:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Fuel Conditions:</strong> Prefire fuel load, vegetation type, and fuel moisture determine how readily fires can ignite and spread.
          </li>
          <li>
            <strong className="text-teal-400">Weather Patterns:</strong> Temperature, humidity, wind speed, and solar radiation directly affect fire intensity and behavior.
          </li>
          <li>
            <strong className="text-teal-400">Topography:</strong> Terrain features influence fire spread patterns, with fires typically moving faster uphill and in narrow canyons.
          </li>
          <li>
            <strong className="text-teal-400">Seasonal Factors:</strong> Time of year affects vegetation dryness and weather conditions, creating distinct fire season patterns.
          </li>
        </ul>
      </div>
    )
  }
];

export function FireForecastInfo() {
  const [currentPage, setCurrentPage] = useState(0);
  const { enableBTS, isBTSUnlocked } = useGlobalSidebars();
  const { config } = useGlobalSidebarConfig();

  const handleNext = () => {
    if (currentPage < FIRE_FORECAST_SLIDES.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const currentInfo = FIRE_FORECAST_SLIDES[currentPage];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-lg border border-teal-500/30 shadow-lg shadow-teal-500/10 p-6 h-full flex flex-col">
        {/* Navigation Controls */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-teal-500/20">
          <Button
            onClick={handlePrev}
            disabled={currentPage === 0}
            size="sm"
            variant="outline"
            className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {/* Page indicator */}
          <div className="flex items-center gap-2">
            {FIRE_FORECAST_SLIDES.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentPage
                    ? 'w-8 bg-teal-400'
                    : 'w-2 bg-gray-600 hover:bg-gray-500 cursor-pointer'
                }`}
                onClick={() => setCurrentPage(index)}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={currentPage === FIRE_FORECAST_SLIDES.length - 1}
            size="sm"
            variant="outline"
            className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-teal-400 mb-4">
          {currentInfo.title}
        </h3>

        {/* Content - Scrollable area with fixed height */}
        <div className="flex-1 overflow-y-auto text-gray-200 text-sm md:text-base leading-relaxed pr-2 custom-scrollbar">
          {currentInfo.content}
          
          {/* Behind the Scenes Button - Only on last slide */}
          {currentPage === FIRE_FORECAST_SLIDES.length - 1 && !isBTSUnlocked && (
            <div className="mt-6 pt-4 border-t border-teal-500/30">
              <Button
                onClick={() => {
                  enableBTS();
                  if (config.onNavigateToML) {
                    config.onNavigateToML();
                  }
                  // Scroll to top of page
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 hover:!from-teal-600 hover:!via-cyan-700 hover:!to-teal-800 font-semibold text-sm md:text-base py-5"
              >
                <Eye className="w-5 h-5 mr-2" />
                Take a Peek Behind the Scenes of PyroPath
              </Button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 184, 166, 0.7);
        }
      `}</style>
    </div>
  );
}
