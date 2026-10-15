"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const BEHIND_SCENES_SLIDES = [
  {
    id: 1,
    title: "Welcome Behind the Scenes",
    content: (
      <p className="text-sm leading-relaxed text-white">
        Welcome to the analytical heart of PyroPath. This section unveils the sophisticated machine learning models and statistical analysis that power our wildfire prediction system. Here, you'll discover how we transform raw environmental data into actionable insights about wildfire risk and behavior.
      </p>
    )
  },
  {
    id: 2,
    title: "Feature Importance Analysis",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          Understanding which factors most significantly influence wildfire outcomes is crucial for accurate prediction. Our Feature Importance chart reveals:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Top Predictors:</strong> Environmental variables ranked by their contribution to model accuracy, helping identify the most critical factors in fire behavior.
          </li>
          <li>
            <strong className="text-teal-400">Relative Impact:</strong> Quantitative measures showing how changes in specific conditions affect wildfire risk and intensity.
          </li>
          <li>
            <strong className="text-teal-400">Model Insights:</strong> Data-driven evidence of which environmental parameters deserve the most attention in fire management strategies.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 3,
    title: "Variable Correlations",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          The correlation matrix illustrates the complex relationships between environmental variables:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Interconnected Factors:</strong> Discover how temperature, humidity, fuel conditions, and wind patterns interact to create fire-prone conditions.
          </li>
          <li>
            <strong className="text-teal-400">Pattern Recognition:</strong> Identify which combinations of environmental factors most reliably predict high-risk scenarios.
          </li>
          <li>
            <strong className="text-teal-400">Seasonal Dependencies:</strong> Understand how variable relationships shift throughout the year, affecting fire season intensity.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 4,
    title: "Seasonal Patterns",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          Wildfire risk follows distinct seasonal patterns influenced by climate cycles:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Annual Cycles:</strong> Track how fire risk varies throughout the year, with peak seasons driven by temperature, precipitation, and vegetation cycles.
          </li>
          <li>
            <strong className="text-teal-400">Regional Variations:</strong> Different areas experience peak fire seasons at different times, reflecting local climate patterns and vegetation types.
          </li>
          <li>
            <strong className="text-teal-400">Predictive Timing:</strong> Historical patterns help forecast when and where fire risk will be highest, enabling proactive resource allocation.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 5,
    title: "Survival Probability Analysis",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          Our survival probability models predict the likelihood of fire persistence over time:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Duration Forecasting:</strong> Estimate how long fires are likely to remain active under different environmental conditions.
          </li>
          <li>
            <strong className="text-teal-400">Containment Probability:</strong> Calculate the likelihood of successful fire suppression based on current and forecasted conditions.
          </li>
          <li>
            <strong className="text-teal-400">Resource Planning:</strong> Help emergency responders allocate resources more effectively by understanding expected fire duration.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 6,
    title: "State Duration Heatmap",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          The geographic visualization of fire duration patterns across states reveals:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Regional Vulnerability:</strong> Identify which states experience longer-lasting fires, indicating areas requiring enhanced preparedness.
          </li>
          <li>
            <strong className="text-teal-400">Climate Influence:</strong> Observe how regional climate patterns affect typical fire duration and persistence.
          </li>
          <li>
            <strong className="text-teal-400">Historical Trends:</strong> Track changes in fire behavior patterns over time, revealing the impact of climate change on wildfire dynamics.
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 7,
    title: "Model Performance & Accuracy",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          Our machine learning models are continuously refined to ensure prediction reliability:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-teal-400">Algorithm Selection:</strong> Advanced ensemble methods combine multiple models to achieve robust predictions across diverse scenarios.
          </li>
          <li>
            <strong className="text-teal-400">Training Data:</strong> Models learn from millions of historical fire events and environmental measurements, capturing complex patterns.
          </li>
          <li>
            <strong className="text-teal-400">Validation:</strong> Rigorous testing ensures predictions remain accurate when applied to new data and changing conditions.
          </li>
          <li>
            <strong className="text-teal-400">Continuous Learning:</strong> Regular updates incorporate the latest data, improving predictions as our understanding of wildfire behavior evolves.
          </li>
        </ul>
      </div>
    )
  }
];

export function BehindTheScenesInfo() {
  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = () => {
    if (currentPage < BEHIND_SCENES_SLIDES.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const currentInfo = BEHIND_SCENES_SLIDES[currentPage];

  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col">
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
            {BEHIND_SCENES_SLIDES.map((_, index) => (
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
            disabled={currentPage === BEHIND_SCENES_SLIDES.length - 1}
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
