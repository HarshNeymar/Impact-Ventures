'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SeasonalityData {
  doy: number;
  duration: number;
}

export function SeasonalityChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<SeasonalityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from CSV file
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading seasonality data...');
        const response = await fetch('/seasonality.csv');
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        console.log('CSV headers:', headers);
        console.log('Total lines:', lines.length);
        
        const csvData: SeasonalityData[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length >= 2) {
            const doy = parseInt(values[0]);
            const duration = parseFloat(values[1]);
            
            if (!isNaN(doy) && !isNaN(duration)) {
              csvData.push({ doy, duration });
            }
          }
        }
        
        console.log('Parsed data points:', csvData.length);
        console.log('Sample data:', csvData.slice(0, 5));
        console.log('DOY range:', Math.min(...csvData.map(d => d.doy)), 'to', Math.max(...csvData.map(d => d.doy)));
        console.log('Duration range:', Math.min(...csvData.map(d => d.duration)), 'to', Math.max(...csvData.map(d => d.duration)));
        
        setData(csvData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading seasonality data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (loading || error || data.length === 0) return;
    
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

    // Chart dimensions
    const margin = { top: 50, right: 40, bottom: 80, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Find data ranges
    const maxDOY = Math.max(...data.map(d => d.doy));
    const minDuration = Math.min(...data.map(d => d.duration));
    const maxDuration = Math.max(...data.map(d => d.duration));

    console.log('Chart ranges - DOY:', 0, 'to', maxDOY, 'Duration:', minDuration, 'to', maxDuration);

    // Draw grid
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;

    // Vertical grid lines (every 50 days)
    for (let day = 0; day <= maxDOY; day += 50) {
      const x = margin.left + (day / maxDOY) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    const durationRange = maxDuration - minDuration;
    const gridStep = Math.ceil(durationRange / 8); // About 8 grid lines
    for (let duration = Math.ceil(minDuration); duration <= maxDuration; duration += gridStep) {
      const y = margin.top + chartHeight - ((duration - minDuration) / durationRange) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw chart border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, margin.top, chartWidth, chartHeight);

    // Draw title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Seasonality of Fire Duration (by Day of Year)', width / 2, 25);

    // Draw axes labels
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Day of Year', width / 2, height - 20);
    
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Average Duration (days)', 0, 0);
    ctx.restore();

    // Draw x-axis ticks and labels
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333333';
    for (let day = 0; day <= maxDOY; day += 50) {
      const x = margin.left + (day / maxDOY) * chartWidth;
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(x, margin.top + chartHeight);
      ctx.lineTo(x, margin.top + chartHeight + 5);
      ctx.stroke();
      // Label
      ctx.fillText(day.toString(), x, margin.top + chartHeight + 20);
    }

    // Draw y-axis ticks and labels
    ctx.textAlign = 'right';
    for (let duration = Math.ceil(minDuration); duration <= maxDuration; duration += gridStep) {
      const y = margin.top + chartHeight - ((duration - minDuration) / durationRange) * chartHeight;
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(margin.left - 5, y);
      ctx.lineTo(margin.left, y);
      ctx.stroke();
      // Label
      ctx.fillText(duration.toString(), margin.left - 10, y + 4);
    }

    // Draw the main line
    ctx.strokeStyle = '#ff8c00'; // Orange color similar to the image
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Sort data by DOY to ensure proper line drawing
    const sortedData = [...data].sort((a, b) => a.doy - b.doy);

    sortedData.forEach((point, index) => {
      const x = margin.left + (point.doy / maxDOY) * chartWidth;
      const y = margin.top + chartHeight - ((point.duration - minDuration) / durationRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Optional: Add points for better visibility
    ctx.fillStyle = '#ff8c00';
    sortedData.forEach((point) => {
      const x = margin.left + (point.doy / maxDOY) * chartWidth;
      const y = margin.top + chartHeight - ((point.duration - minDuration) / durationRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [data, loading, error]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Seasonality of Fire Duration (by Day of Year)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 md:h-80 lg:h-96">
            <div className="text-gray-500">Loading seasonality data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Seasonality of Fire Duration (by Day of Year)</CardTitle>
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
        <CardTitle>Seasonality of Fire Duration (by Day of Year)</CardTitle>
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