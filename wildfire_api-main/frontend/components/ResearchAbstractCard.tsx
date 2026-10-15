"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResearchAbstractCard() {
  return (
    <div className="w-full max-w-7xl mx-auto bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-lg border border-teal-500/30 shadow-lg shadow-teal-500/10 p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-teal-400 mb-1">Research Abstract</h3>
        <p className="text-sm text-gray-400">IEEE publication summary</p>
      </div>

      <div className="space-y-3 text-sm md:text-base leading-relaxed text-gray-200">
        <p>
          This research presents a machine learning framework for wildfire risk forecasting that combines historical fire records, weather dynamics, fuel indicators, and geographic context into a unified predictive workflow.
        </p>
        <p>
          The system integrates more than 7.5 million wildfire records with large scale environmental observations to model fire intensity, spread behavior, and expected duration under changing conditions. We evaluate multiple supervised models, apply feature importance analysis for interpretability, and validate performance across state level and county level scenarios.
        </p>
        <p>
          Results show that the combined feature set improves prediction reliability and supports practical decision making for preparedness, resource allocation, and early intervention. The framework is designed to be operationally useful while remaining transparent through visual analytics and explainable model outputs.
        </p>
      </div>

      <div className="mt-5">
        <Button
          asChild
          size="sm"
          className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400"
        >
          <a
            href="/AAIML_camera-ready-paper.pdf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open full IEEE research paper in a new tab"
          >
            Open Full Research Paper
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}
