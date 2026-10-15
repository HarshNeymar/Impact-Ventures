import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, ComposedChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from './ui/badge';
import { COLORS, STROKE_COLORS, FILL_COLORS } from '@/lib/colors';
import { ComputedRow, rollingMean, getRiskLevel, getRiskColor } from '@/lib/computeSeries';

interface CompositeRiskChartProps {
  data: ComputedRow[];
}

interface CompositeChartData {
  date: string;
  composite: number;
  fuel: number;
  weather: number;
  response: number;
  aftermath: number;
  smoothed7?: number;
  smoothed30?: number;
}

export function CompositeRiskChart({ data }: CompositeRiskChartProps) {
  const [viewMode, setViewMode] = useState<'composite' | 'components' | 'smoothed'>('composite');

  // Sample data for display (every 7 days)
  const sampledData = data.filter((_, index) => index % 7 === 0);
  
  // Compute smoothed values
  const compositeValues = sampledData.map(row => row.composite * 100);
  const smoothed7 = rollingMean(compositeValues, 7);
  const smoothed30 = rollingMean(compositeValues, 30);

  const chartData: CompositeChartData[] = sampledData.map((row, index) => ({
    date: new Date(row.date).getFullYear().toString(),
    composite: Number((row.composite * 100).toFixed(1)),
    fuel: Number((row.fuel * 100).toFixed(1)),
    weather: Number((row.weather * 100).toFixed(1)),
    response: Number((row.response * 100).toFixed(1)),
    aftermath: Number((row.aftermath * 100).toFixed(1)),
    smoothed7: Number(smoothed7[index].toFixed(1)),
    smoothed30: Number(smoothed30[index].toFixed(1)),
  }));

  const currentRisk = data.length > 0 ? data[data.length - 1].composite : 0;
  const riskLevel = getRiskLevel(currentRisk);
  const riskColorClass = getRiskColor(riskLevel);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{`Year: ${label}`}</p>
          {viewMode === 'composite' && (
            <p className="text-sm" style={{ color: STROKE_COLORS.composite }}>
              {`Composite Risk: ${data.composite}%`}
            </p>
          )}
          {viewMode === 'components' && payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}%`}
            </p>
          ))}
          {viewMode === 'smoothed' && (
            <>
              <p className="text-sm" style={{ color: STROKE_COLORS.composite }}>
                {`Raw Risk: ${data.composite}%`}
              </p>
              <p className="text-sm text-blue-600">
                {`7-day smooth: ${data.smoothed7}%`}
              </p>
              <p className="text-sm text-purple-600">
                {`30-day smooth: ${data.smoothed30}%`}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Wildfire Risk Analysis</CardTitle>
            <Badge className={`px-2 py-1 text-xs ${riskColorClass}`}>
              {riskLevel} Risk
            </Badge>
          </div>
          <div className="flex gap-2">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'composite' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('composite')}
                className="text-xs rounded-r-none"
              >
                Overall
              </Button>
              <Button
                variant={viewMode === 'components' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('components')}
                className="text-xs rounded-none border-x"
              >
                Components
              </Button>
              <Button
                variant={viewMode === 'smoothed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('smoothed')}
                className="text-xs rounded-l-none"
              >
                Trends
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Overall Wildfire Risk</h3>
            <div className="flex gap-2">
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'composite' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('composite')}
                  className="text-xs rounded-r-none"
                >
                  Risk Level
                </Button>
                <Button
                  variant={viewMode === 'components' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('components')}
                  className="text-xs rounded-none border-x"
                >
                  Breakdown
                </Button>
                <Button
                  variant={viewMode === 'smoothed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('smoothed')}
                  className="text-xs rounded-l-none"
                >
                  Trends
                </Button>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={chartData}
              syncId="scenario"
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false} 
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={customTooltip} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />
              
              {/* Composite Risk View - Large prominent area chart */}
              {viewMode === 'composite' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="composite"
                    stroke={STROKE_COLORS.composite}
                    fill={FILL_COLORS.composite}
                    fillOpacity={0.6}
                    strokeWidth={3}
                    name="Wildfire Risk"
                    animationDuration={300}
                  />
                </>
              )}
              
              {/* Component Breakdown View */}
              {viewMode === 'components' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="fuel"
                    stroke={STROKE_COLORS.fuel}
                    strokeWidth={2}
                    dot={false}
                    name="Fuel"
                    animationDuration={300}
                  />
                  <Line
                    type="monotone"
                    dataKey="weather"
                    stroke={STROKE_COLORS.weather}
                    strokeWidth={2}
                    dot={false}
                    name="Weather"
                    animationDuration={300}
                  />
                  <Line
                    type="monotone"
                    dataKey="response"
                    stroke={STROKE_COLORS.response}
                    strokeWidth={2}
                    dot={false}
                    name="Response"
                    animationDuration={300}
                  />
                  <Line
                    type="monotone"
                    dataKey="aftermath"
                    stroke={STROKE_COLORS.aftermath}
                    strokeWidth={2}
                    dot={false}
                    name="Recovery"
                    animationDuration={300}
                  />
                </>
              )}
              
              {/* Smoothed Trends View */}
              {viewMode === 'smoothed' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="composite"
                    stroke={STROKE_COLORS.composite}
                    fill={FILL_COLORS.composite}
                    fillOpacity={0.1}
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    name="Raw Data"
                  />
                  <Line
                    type="monotone"
                    dataKey="smoothed7"
                    stroke="#4A90E2"
                    strokeWidth={2}
                    dot={false}
                    name="7-day Trend"
                  />
                  <Line
                    type="monotone"
                    dataKey="smoothed30"
                    stroke="#9B59B6"
                    strokeWidth={3}
                    dot={false}
                    name="30-day Trend"
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend and Current Status */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              {viewMode === 'composite' && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-green-400 rounded"></div>
                    <span>Low (0-33%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-yellow-400 rounded"></div>
                    <span>Medium (34-66%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-red-400 rounded"></div>
                    <span>High (67-100%)</span>
                  </div>
                </>
              )}
              {viewMode === 'components' && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded" style={{ backgroundColor: COLORS.fuel }}></div>
                    <span>Fuel</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded" style={{ backgroundColor: COLORS.weather }}></div>
                    <span>Weather</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded" style={{ backgroundColor: COLORS.response }}></div>
                    <span>Response</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded" style={{ backgroundColor: COLORS.aftermath }}></div>
                    <span>Recovery</span>
                  </div>
                </>
              )}
              {viewMode === 'smoothed' && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
                    <span>7-day average</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-1 bg-purple-500 rounded"></div>
                    <span>30-day trend</span>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Current: {Math.round(currentRisk * 100)}% • <span className={riskColorClass.split(' ')[0]}>{riskLevel}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          {viewMode === 'composite' && (
            <p>Overall wildfire risk combining all factors. Current risk: {Math.round(currentRisk * 100)}%</p>
          )}
          {viewMode === 'components' && (
            <p>Individual contribution of each component to overall risk. Adjust controls to see how each factor responds.</p>
          )}
          {viewMode === 'smoothed' && (
            <p>Trend analysis with 7-day and 30-day rolling averages to identify patterns and seasonal variations.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
