"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useGlobalSidebars, useGlobalSidebarConfig } from '@/components/AuthenticatedLayout';

export const AIR_POLLUTION_SLIDES = [
  {
    id: 1,
    title: "Respiratory Awareness",
    content: (
      <p className="text-sm leading-relaxed text-white">
        Air quality is a critical yet often invisible factor in personal health. This Emission Map functions as a visual record of the atmospheric changes caused by wildfire activity across the United States; illustrating the concentration of smoke and pollutants.
      </p>
    )
  },
  {
    id: 2,
    title: "Navigating the Data: Smoke & Pollution Intensity",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          The interactive interface utilizes a system of smoke bubbles to represent regional air quality shifts.
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Visual Density:</strong> The color gradient—ranging from light grey to dark—indicates the concentration of pollutants in a specific area.
          </li>
          <li>
            <strong className="text-teal-400">Detailed Breakdown:</strong> Hovering over any regional bubble reveals a precise Emission Value and a comprehensive breakdown of the specific gases and particles released during a fire event.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 3,
    title: "The Science of Smoke: Understanding the Components",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          Wildfire smoke is a complex mixture of hazardous elements. This map categorizes these emissions to help educate the public on the hidden chemistry of the atmosphere:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">PM2.5 (Fine Particulate Matter):</strong> These microscopic particles are a primary health concern because they can travel deep into the lungs and enter the bloodstream, causing immediate and long-term respiratory strain.
          </li>
          <li>
            <strong className="text-teal-400">CO2 (Carbon Dioxide):</strong> As the most prevalent greenhouse gas released during fires, tracking CO2 provides insight into the scale of the burn and its contribution to broader climatic shifts.
          </li>
          <li>
            <strong className="text-teal-400">CO (Carbon Monoxide):</strong> A colorless, odorless gas that, when inhaled in high concentrations, reduces the body's ability to transport oxygen to vital organs.
          </li>
          <li>
            <strong className="text-teal-400">CH4 (Methane):</strong> A potent gas that captures high levels of heat, serving as a key indicator of the fire's impact on atmospheric warming.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 4,
    title: "Contextualizing the Record",
    content: (
      <p className="text-sm leading-relaxed text-white">
        The insights provided on this map are based on historical data rather than real-time monitoring. This archive serves as a permanent educational resource, allowing to study the long-term patterns of wildfire emissions. By analyzing these events, it becomes possible to identify regional risks and better understand the environmental legacy left behind by the fire seasons.
      </p>
    )
  }
];

export function AirPollutionInfo() {
  const [currentPage, setCurrentPage] = useState(0);
  const [contentMinHeight, setContentMinHeight] = useState<number>(0);
  const { enableBTS, isBTSUnlocked } = useGlobalSidebars();
  const { config } = useGlobalSidebarConfig();
  const measureRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const measure = () => {
      const heights = measureRefs.current
        .map((el) => (el ? el.scrollHeight : 0))
        .filter((h) => h > 0);

      if (!heights.length) return;
      const maxHeight = Math.max(...heights);
      setContentMinHeight(maxHeight);
    };

    const raf = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [isBTSUnlocked]);

  const handleNext = () => {
    if (currentPage < AIR_POLLUTION_SLIDES.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const currentInfo = AIR_POLLUTION_SLIDES[currentPage];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-lg border border-teal-500/30 shadow-lg shadow-teal-500/10 p-6 h-full flex flex-col">
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
            {AIR_POLLUTION_SLIDES.map((_, index) => (
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
            disabled={currentPage === AIR_POLLUTION_SLIDES.length - 1}
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

        {/* Content area with unified height based on the tallest slide */}
        <div
          className="flex-1 text-gray-200 text-sm md:text-base leading-relaxed pr-2"
          style={{ minHeight: contentMinHeight || undefined }}
        >
          {currentInfo.content}
        </div>

        {/* Behind the Scenes Button - Only on last slide, anchored at the bottom */}
        {currentPage === AIR_POLLUTION_SLIDES.length - 1 && !isBTSUnlocked && (
          <div className="mt-6">
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

        {/* Hidden measurement nodes to normalize all slide heights */}
        <div className="absolute inset-x-6 top-0 invisible pointer-events-none" aria-hidden="true">
          {AIR_POLLUTION_SLIDES.map((slide, index) => (
            <div
              key={`measure-${slide.id}`}
              ref={(el) => {
                measureRefs.current[index] = el;
              }}
              className="text-sm md:text-base leading-relaxed"
            >
              <div className="pr-2">{slide.content}</div>
            </div>
          ))}
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
