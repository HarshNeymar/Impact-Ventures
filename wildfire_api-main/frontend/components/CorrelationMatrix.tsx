'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CorrelationData {
  [key: string]: number[];
}

export function CorrelationMatrix() {
  const [correlationData, setCorrelationData] = useState<CorrelationData>({});
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCorrelationData = async () => {
      try {
        const response = await fetch('/wildfire_ml_group_corr.csv');
        if (!response.ok) {
          throw new Error('Failed to fetch correlation data');
        }
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        // First line contains the feature names (starting from column 1)
        const headerLine = lines[0];
        const headers = headerLine.split(',').slice(1); // Remove first empty column
        setFeatures(headers);
        
        // Parse the correlation matrix
        const data: CorrelationData = {};
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const featureName = values[0];
          const correlations = values.slice(1).map(val => parseFloat(val));
          data[featureName] = correlations;
        }
        
        setCorrelationData(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadCorrelationData();
  }, []);

  const getColorFromCorrelation = (value: number): string => {
    // Color scale from blue (negative) to white (0) to red (positive)
    const intensity = Math.abs(value);
    
    if (value > 0) {
      // Positive correlation - red scale
      const alpha = intensity;
      return `rgba(215, 25, 28, ${alpha})`;
    } else {
      // Negative correlation - blue scale
      const alpha = intensity;
      return `rgba(69, 117, 180, ${alpha})`;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Feature Correlation Matrix (Wildfire Dataset)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            Loading correlation data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Feature Correlation Matrix (Wildfire Dataset)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Feature Correlation Matrix (Wildfire Dataset)</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full">
          <div className="w-full">
            <table className="border-collapse w-full table-auto">
              <thead>
                <tr>
                  <th className="w-16 p-1 text-xs font-medium text-left bg-gray-50 sticky left-0 z-10"></th>
                  {features.map((feature, index) => (
                    <th 
                      key={index} 
                      className="p-1 text-xs font-medium text-center bg-gray-50 [writing-mode:vertical-rl] [text-orientation:mixed] [height:100px] [min-width:32px] [max-width:48px]"
                      style={{ 
                        width: `${100 / features.length}%`
                      }}
                    >
                      <div className="h-full flex items-end justify-center">
                        <span className="block text-xs">
                          {feature.length > 8 ? feature.substring(0, 8) + '...' : feature}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((rowFeature, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="w-16 p-1 text-xs font-medium text-right bg-gray-50 sticky left-0 z-10 border-r border-gray-300">
                      <div className="truncate text-xs" title={rowFeature}>
                        {rowFeature.length > 8 ? rowFeature.substring(0, 8) + '...' : rowFeature}
                      </div>
                    </td>
                    {features.map((colFeature, colIndex) => {
                      const correlationValue = correlationData[rowFeature]?.[colIndex] || 0;
                      return (
                        <td
                          key={colIndex}
                          className="p-0 border border-gray-200 text-center relative cursor-pointer hover:ring-1 hover:ring-blue-300 [min-width:32px] [max-width:48px] h-8"
                          style={{ 
                            backgroundColor: getColorFromCorrelation(correlationValue),
                            width: `${100 / features.length}%`
                          }}
                          title={`${rowFeature} vs ${colFeature}: ${correlationValue.toFixed(3)}`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium text-white mix-blend-difference">
                              {Math.abs(correlationValue) < 0.01 ? '0' : 
                               Math.abs(correlationValue) >= 1 ? correlationValue.toFixed(0) :
                               Math.abs(correlationValue) >= 0.1 ? correlationValue.toFixed(1) : 
                               correlationValue.toFixed(2)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Color scale legend */}
          <div className="mt-3 flex items-center justify-center space-x-2 bg-white p-2 border-t">
            <div className="flex items-center space-x-2 text-xs">
              <div className="text-sm font-medium">Correlation:</div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-[rgba(69,117,180,1)]"></div>
                <span>-1</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-[rgba(69,117,180,0.5)]"></div>
                <span>-0.5</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-white border border-gray-300"></div>
                <span>0</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-[rgba(215,25,28,0.5)]"></div>
                <span>0.5</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-[rgba(215,25,28,1)]"></div>
                <span>1</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}