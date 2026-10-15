import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COLORS, STROKE_COLORS } from '@/lib/colors';
import { ComputedRow } from '@/lib/computeSeries';

interface StackedAreaProps {
  data: ComputedRow[];
}

interface StackedAreaData {
  date: string;
  fuel: number;
  weather: number;
  response: number;
  aftermath: number;
}

export function StackedArea({ data }: StackedAreaProps) {
  const [isPercentageStack, setIsPercentageStack] = useState(false);

  // Sample data for display (every 30 days to avoid cluttered chart)
  const chartData: StackedAreaData[] = data
    .filter((_, index) => index % 30 === 0) // Show every 30th day
    .map((row) => ({
      date: new Date(row.date).getFullYear().toString(), // Show just the year for cleaner display
      fuel: Number((row.fuel * 100).toFixed(1)),
      weather: Number((row.weather * 100).toFixed(1)),
      response: Number((row.response * 100).toFixed(1)),
      aftermath: Number((row.aftermath * 100).toFixed(1)),
    }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{`Year: ${label}`}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${isPercentageStack ? '%' : ''}`}
            </p>
          ))}
          {!isPercentageStack && (
            <p className="text-xs text-muted-foreground mt-2">
              Total: {payload.reduce((sum: number, entry: any) => sum + entry.value, 0).toFixed(1)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Component Contributions Over Time</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPercentageStack(!isPercentageStack)}
          className="text-xs"
        >
          {isPercentageStack ? 'Show Absolute' : '100% Stacked'}
        </Button>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            syncId="scenario"
            stackOffset={isPercentageStack ? "expand" : undefined}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              domain={isPercentageStack ? [0, 1] : undefined}
              tickFormatter={(value) => isPercentageStack ? `${(value * 100).toFixed(0)}%` : value.toString()}
            />
            <Tooltip content={customTooltip} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="rect"
            />
            
            <Area
              type="monotone"
              dataKey="fuel"
              stackId="1"
              stroke={STROKE_COLORS.fuel}
              fill={COLORS.fuel}
              strokeWidth={2.5}
              name="Fuel"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="weather"
              stackId="1"
              stroke={STROKE_COLORS.weather}
              fill={COLORS.weather}
              strokeWidth={2.5}
              name="Weather"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="response"
              stackId="1"
              stroke={STROKE_COLORS.response}
              fill={COLORS.response}
              strokeWidth={2.5}
              name="Response"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="aftermath"
              stackId="1"
              stroke={STROKE_COLORS.aftermath}
              fill={COLORS.aftermath}
              strokeWidth={2.5}
              name="Aftermath"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          {isPercentageStack 
            ? "Showing relative contribution of each component (normalized to 100%)"
            : "Showing absolute component values (0-100 scale)"
          }
        </p>
      </CardContent>
    </Card>
  );
}
