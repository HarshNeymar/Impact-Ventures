import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
import { Badge } from './ui/badge';
import { COLORS, STROKE_COLORS, FILL_COLORS } from '@/lib/colors';
import { ComputedRow, rollingMean, getRiskLevel, getRiskColor } from '@/lib/computeSeries';

interface RiskLineProps {
  data: ComputedRow[];
}

interface RiskLineData {
  date: string;
  composite: number;
  smoothed7?: number;
  smoothed30?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

export function RiskLine({ data }: RiskLineProps) {
  const [smoothing, setSmoothing] = useState<'none' | '7day' | '30day'>('none');
  const [showConfidenceBand, setShowConfidenceBand] = useState(false);

  // Sample data for display (every 7 days to balance detail and performance)
  const sampledData = data.filter((_, index) => index % 7 === 0);
  
  // Compute smoothed values
  const compositeValues = sampledData.map(row => row.composite * 100);
  const smoothed7 = rollingMean(compositeValues, 7);
  const smoothed30 = rollingMean(compositeValues, 30);
  
  // Generate confidence bands (simple approximation)
  const generateConfidenceBand = (values: number[], windowSize: number = 30) => {
    const bands = values.map((value, index) => {
      const start = Math.max(0, index - windowSize);
      const end = Math.min(values.length, index + windowSize);
      const window = values.slice(start, end);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);
      
      return {
        lower: Math.max(0, value - stdDev * 0.5),
        upper: Math.min(100, value + stdDev * 0.5),
      };
    });
    return bands;
  };

  const confidenceBands = showConfidenceBand ? generateConfidenceBand(compositeValues) : [];

  const chartData: RiskLineData[] = sampledData.map((row, index) => ({
    date: new Date(row.date).getFullYear().toString(), // Show year for cleaner display
    composite: Number((row.composite * 100).toFixed(1)),
    smoothed7: Number(smoothed7[index].toFixed(1)),
    smoothed30: Number(smoothed30[index].toFixed(1)),
    confidenceLower: showConfidenceBand ? Number(confidenceBands[index]?.lower.toFixed(1)) : undefined,
    confidenceUpper: showConfidenceBand ? Number(confidenceBands[index]?.upper.toFixed(1)) : undefined,
  }));

  const currentRisk = data.length > 0 ? data[data.length - 1].composite : 0;
  const riskLevel = getRiskLevel(currentRisk);
  const riskColorClass = getRiskColor(riskLevel);

  const getDisplayValue = () => {
    switch (smoothing) {
      case '7day': return 'smoothed7';
      case '30day': return 'smoothed30';
      default: return 'composite';
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{`Year: ${label}`}</p>
          <p className="text-sm" style={{ color: STROKE_COLORS.composite }}>
            {`Risk: ${data.composite}%`}
          </p>
          {smoothing === '7day' && (
            <p className="text-sm text-blue-600">
              {`7-day smooth: ${data.smoothed7}%`}
            </p>
          )}
          {smoothing === '30day' && (
            <p className="text-sm text-purple-600">
              {`30-day smooth: ${data.smoothed30}%`}
            </p>
          )}
          {showConfidenceBand && data.confidenceLower !== undefined && (
            <p className="text-xs text-muted-foreground">
              {`Confidence: ${data.confidenceLower}% - ${data.confidenceUpper}%`}
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
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg">Composite Risk Over Time</CardTitle>
          <Badge className={`px-2 py-1 text-xs ${riskColorClass}`}>
            {riskLevel} Risk
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfidenceBand(!showConfidenceBand)}
            className="text-xs"
          >
            {showConfidenceBand ? 'Hide Band' : 'Show Band'}
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={smoothing === 'none' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSmoothing('none')}
              className="text-xs rounded-r-none"
            >
              Raw
            </Button>
            <Button
              variant={smoothing === '7day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSmoothing('7day')}
              className="text-xs rounded-none border-x"
            >
              7-day
            </Button>
            <Button
              variant={smoothing === '30day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSmoothing('30day')}
              className="text-xs rounded-l-none"
            >
              30-day
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            syncId="scenario"
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
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={customTooltip} />
            
            {/* Confidence band */}
            {showConfidenceBand && (
              <Area
                type="monotone"
                dataKey="confidenceUpper"
                stroke="none"
                fill={FILL_COLORS.composite}
                fillOpacity={0.2}
                strokeWidth={0}
                animationDuration={300}
                connectNulls={false}
              />
            )}
            
            {/* Main risk line */}
            <Line
              type="monotone"
              dataKey={getDisplayValue()}
              stroke={STROKE_COLORS.composite}
              strokeWidth={2.5}
              dot={false}
              name="Composite Risk"
              animationDuration={300}
            />
            
            {/* Raw data line (faint) when smoothing is enabled */}
            {smoothing !== 'none' && (
              <Line
                type="monotone"
                dataKey="composite"
                stroke={STROKE_COLORS.composite}
                strokeWidth={1}
                strokeOpacity={0.3}
                dot={false}
                name="Raw Data"
                animationDuration={300}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        
        <div className="flex justify-between items-center mt-3">
          <p className="text-xs text-muted-foreground">
            {smoothing === 'none' && "Showing raw daily composite risk values"}
            {smoothing === '7day' && "Showing 7-day rolling average (blue line) with raw data (faint)"}
            {smoothing === '30day' && "Showing 30-day rolling average (purple line) with raw data (faint)"}
          </p>
          <div className="text-xs text-muted-foreground">
            Current: {Math.round(currentRisk * 100)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
