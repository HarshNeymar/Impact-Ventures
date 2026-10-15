"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Feature importance data from the ML analysis - ordered by importance (highest to lowest)
const featureImportanceData = [
  { feature: 'longitude', importance: 0.3585609459, rank: 1 },
  { feature: 'latitude', importance: 0.3226949865, rank: 2 },
  { feature: 'duff_frac', importance: 0.1390222108, rank: 3 },
  { feature: 'fm1000_value', importance: 0.1272331115, rank: 4 },
  { feature: 'srad_value', importance: 0.0663562786, rank: 5 },
  { feature: 'fm100_value', importance: 0.0584552734, rank: 6 },
  { feature: 'day_of_year_cos', importance: 0.0512114934, rank: 7 },
  { feature: 'day_of_year_sin', importance: 0.0474761028, rank: 8 },
  { feature: 'month', importance: 0.0271815141, rank: 9 },
  { feature: 'fuelcode', importance: 0.0243473108, rank: 10 }
];

// Feature name mappings to match original chart exactly
const featureLabels: Record<string, string> = {
  longitude: 'longitude',
  latitude: 'latitude', 
  duff_frac: 'duff_frac',
  fm1000_value: 'fm1000_value',
  srad_value: 'srad_value',
  fm100_value: 'fm100_value',
  day_of_year_cos: 'day_of_year_cos',
  day_of_year_sin: 'day_of_year_sin',
  month: 'month',
  fuelcode: 'fuelcode'
};

interface FeatureImportanceChartProps {
  className?: string;
}

export function FeatureImportanceChart({ className = "" }: FeatureImportanceChartProps) {
  const chartData = featureImportanceData.map(item => ({
    ...item,
    displayName: featureLabels[item.feature] || item.feature
  }));
  // Mustard color inspired by the reference image (warm, muted)
  const MUSTARD = "#CE8E55";      // primary fill
  const MUSTARD_DARK = "#A6713F"; // subtle stroke for definition

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-foreground text-white">
          Top 10 Features Importance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 md:h-80 lg:h-96 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 80, bottom: 80 }}
              style={{ backgroundColor: 'white' }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="displayName"
                tick={{ fontSize: 14 }}
                interval={0}
                height={80}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                domain={[0, 0.35]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toFixed(2)}
                label={{ value: '', angle: -90, position: 'insideLeft' }}
              />
              <Bar 
                dataKey="importance" 
                fill={MUSTARD}
                stroke={MUSTARD_DARK}
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}