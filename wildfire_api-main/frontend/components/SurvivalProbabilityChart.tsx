'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FireData {
  fire_id: string;
  days: number[];
  survival_probability: number[];
}

export function SurvivalProbabilityChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fireData, setFireData] = useState<FireData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from JSON file
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/survival_curves_500.json');
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }
        const data = await response.json();
        
        console.log('Raw JSON data:', data);
        console.log('Is array?', Array.isArray(data));
        console.log('Data type:', typeof data);
        
        // Check if data is an array, if not convert it
        let fireArray: FireData[] = [];
        if (Array.isArray(data)) {
          fireArray = data;
        } else if (data && typeof data === 'object') {
          // If it's an object, try to extract array from a property or convert values to array
          if (data.fires && Array.isArray(data.fires)) {
            fireArray = data.fires;
          } else {
            // Convert object values to array
            fireArray = Object.values(data);
          }
        }
        
        console.log('Fire array length:', fireArray.length);
        console.log('First few fires:', fireArray.slice(0, 3));
        
        // Take only the first 10 fires for better visualization
        const limitedData = fireArray.slice(0, 10);
        console.log('Limited data:', limitedData);
        setFireData(limitedData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Generate distinct colors for each fire
  const getFireColor = (index: number): string => {
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    return colors[index % colors.length];
  };

  useEffect(() => {
    if (loading || error || fireData.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Chart dimensions - responsive margins for mobile
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    
    const margin = isMobile 
      ? { top: 30, right: 80, bottom: 50, left: 50 }  // Compact margins for mobile
      : isTablet 
      ? { top: 35, right: 120, bottom: 55, left: 60 } // Medium margins for tablet
      : { top: 40, right: 200, bottom: 60, left: 80 }; // Full margins for desktop
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Find max days for x-axis
    const maxDays = Math.max(...fireData.map(fire => Math.max(...fire.days)));

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Vertical grid lines (days)
    for (let day = 0; day <= maxDays; day += Math.ceil(maxDays / 10)) {
      const x = margin.left + (day / maxDays) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();
    }

    // Horizontal grid lines (probability)
    for (let prob = 0; prob <= 1; prob += 0.2) {
      const y = margin.top + chartHeight - (prob * chartHeight);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw chart border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, margin.top, chartWidth, chartHeight);

    // Draw title - responsive font size
    ctx.fillStyle = '#000000';
    ctx.font = isMobile ? 'bold 12px Arial' : isTablet ? 'bold 14px Arial' : 'bold 16px Arial';
    ctx.textAlign = 'center';
    const titleText = isMobile ? 'Survival Probability' : 'Cumulative Survival Probability for Multi-Day Fires';
    ctx.fillText(titleText, width / 2, isMobile ? 20 : 25);

    // Draw axes labels - responsive
    ctx.font = isMobile ? '10px Arial' : '12px Arial';
    ctx.textAlign = 'center';
    const xAxisLabel = isMobile ? 'Days' : 'Days since fire start';
    ctx.fillText(xAxisLabel, width / 2, height - (isMobile ? 5 : 10));
    
    if (!isMobile) { // Only show y-axis label on larger screens
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      const yAxisLabel = isTablet ? 'Survival Prob.' : 'Survival Probability (persistence)';
      ctx.fillText(yAxisLabel, 0, 0);
      ctx.restore();
    }

    // Draw x-axis ticks and labels - responsive font
    ctx.font = isMobile ? '8px Arial' : '10px Arial';
    ctx.textAlign = 'center';
    const tickInterval = Math.ceil(maxDays / (isMobile ? 5 : 10)); // Fewer ticks on mobile
    for (let day = 0; day <= maxDays; day += tickInterval) {
      const x = margin.left + (day / maxDays) * chartWidth;
      ctx.fillText(day.toString(), x, margin.top + chartHeight + (isMobile ? 12 : 15));
    }

    // Draw y-axis ticks and labels - responsive font
    ctx.font = isMobile ? '8px Arial' : '10px Arial';
    ctx.textAlign = 'right';
    const yTickInterval = isMobile ? 0.5 : 0.2; // Fewer y-axis labels on mobile
    for (let prob = 0; prob <= 1; prob += yTickInterval) {
      const y = margin.top + chartHeight - (prob * chartHeight);
      ctx.fillText(prob.toFixed(1), margin.left - (isMobile ? 5 : 10), y + 3);
    }

    // Draw fire lines and legend
    fireData.forEach((fire, index) => {
      const color = getFireColor(index);
      
      // Draw line - slightly thicker on mobile for better visibility
      ctx.strokeStyle = color;
      ctx.lineWidth = isMobile ? 2.5 : 2;
      ctx.beginPath();
      
      fire.days.forEach((day, dayIndex) => {
        const x = margin.left + (day / maxDays) * chartWidth;
        const y = margin.top + chartHeight - (fire.survival_probability[dayIndex] * chartHeight);
        
        if (dayIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points - larger on mobile for better visibility
      ctx.fillStyle = color;
      const pointRadius = isMobile ? 2.5 : 3;
      fire.days.forEach((day, dayIndex) => {
        const x = margin.left + (day / maxDays) * chartWidth;
        const y = margin.top + chartHeight - (fire.survival_probability[dayIndex] * chartHeight);
        
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw legend - responsive positioning and text
      const legendX = margin.left + chartWidth + 10;
      const legendY = margin.top + 20 + (index * (isMobile ? 15 : 20));
      
      // Legend line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY);
      ctx.lineTo(legendX + (isMobile ? 15 : 20), legendY);
      ctx.stroke();
      
      // Legend point
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(legendX + (isMobile ? 7.5 : 10), legendY, isMobile ? 2 : 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Legend text - simplified to show only days
      ctx.fillStyle = '#000000';
      ctx.font = isMobile ? '8px Arial' : isTablet ? '9px Arial' : '10px Arial';
      ctx.textAlign = 'left';
      const fireDuration = fire.days.length;
      const legendText = isMobile ? `${fireDuration}d` : `${fireDuration} days`;
      ctx.fillText(legendText, legendX + (isMobile ? 18 : 25), legendY + 3);
    });

  }, [fireData, loading, error]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cumulative Survival Probability for Multi-Day Fires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 md:h-80 lg:h-96">
            <div className="text-gray-500">Loading survival data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cumulative Survival Probability for Multi-Day Fires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 md:h-80 lg:h-96">
            <div className="text-red-500">Error loading data: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cumulative Survival Probability for Multi-Day Fires</CardTitle>
      </CardHeader>
      <CardContent>
        <canvas
          ref={canvasRef}
          className="w-full h-64 md:h-80 lg:h-96 border border-gray-200"
        />
      </CardContent>
    </Card>
  );
}