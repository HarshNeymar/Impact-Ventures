"use client"

import React from 'react';
import { FeatureImportanceChart } from '@/components/FeatureImportanceChart';
import { CorrelationMatrix } from '@/components/CorrelationMatrix';
import { SeasonalityChart } from '@/components/SeasonalityChart';
import { SurvivalProbabilityChart } from '@/components/SurvivalProbabilityChart';
import { USStateHeatmap } from '@/components/USStateHeatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MLAnalytics() {
  return (
    <div className="w-full h-full overflow-hidden" data-tour="ml-container">
      <div className="h-full w-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          
          {/* ML Analytics Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Machine Learning Analytics
            </h1>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              Advanced machine learning insights and statistical analysis for wildfire prediction models.
            </p>
          </div>

          {/* State Duration Heatmap - Full Width */}
          <div className="w-full">
            <USStateHeatmap />
          </div>

          {/* Feature Importance Chart - Full Width */}
          <div className="w-full">
            <FeatureImportanceChart />
          </div>

          {/* Seasonality Chart - Full Width */}
          <div className="w-full">
            <SeasonalityChart />
          </div>

          {/* Two Column Layout for Medium Charts */}
          {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <CorrelationMatrix />
            </div>
            <div className="space-y-6">
              <SeasonalityChart />
            </div>
          </div> */}

          {/* Survival Probability Chart - Full Width */}
          <div className="w-full">
            <SurvivalProbabilityChart />
          </div>

          {/* Model Performance Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
              <CardHeader>
                <CardTitle className="text-white text-xl">Model Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-base">Accuracy:</span>
                    <span className="text-green-400 font-semibold text-lg">92.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base">Precision:</span>
                    <span className="text-green-400 font-semibold text-lg">89.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base">Recall:</span>
                    <span className="text-green-400 font-semibold text-lg">94.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base">F1 Score:</span>
                    <span className="text-green-400 font-semibold text-lg">91.9%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
              <CardHeader>
                <CardTitle className="text-white text-xl">Model Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-base">Algorithm:</span>
                    <span className="text-blue-400 font-semibold text-lg">Random Forest</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base">Features:</span>
                    <span className="text-blue-400 font-semibold text-lg">47</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base">Training Data:</span>
                    <span className="text-blue-400 font-semibold text-lg">2.3M samples</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base">Last Updated:</span>
                    <span className="text-blue-400 font-semibold text-lg">Dec 2025</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}

        </div>
      </div>
    </div>
  );
}