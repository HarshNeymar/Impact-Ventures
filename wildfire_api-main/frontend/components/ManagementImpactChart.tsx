import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, ComposedChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from './ui/badge';
import { ComputedRow } from '@/lib/computeSeries';

interface ManagementImpactChartProps {
  data: ComputedRow[];
  controls: {
    suppression: number;
    rxBurn: number;
    sevThresh: number;
    reforest: number;
  };
}

interface ManagementChartData {
  date: string;
  burnSeverity: number;
  responseComponent: number;
  aftermathComponent: number;
}

export function ManagementImpactChart({ data, controls }: ManagementImpactChartProps) {
  // Sample data for display (every 30 days)
  const chartData: ManagementChartData[] = data
    .filter((_, index) => index % 30 === 0)
    .map((row) => ({
      date: new Date(row.date).getFullYear().toString(),
      burnSeverity: Number((row.burn_severity * 100).toFixed(1)),
      responseComponent: Number((row.response * 100).toFixed(1)),
      aftermathComponent: Number((row.aftermath * 100).toFixed(1)),
    }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{`Year: ${label}`}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}%`}
            </p>
          ))}
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            <p>Current Settings:</p>
            <p>Suppression: {Math.round(controls.suppression * 100)}%</p>
            <p>Prescribed Burns: {controls.rxBurn}%/yr</p>
            <p>Reforestation: {controls.reforest}%/yr</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getSuppressionLevel = () => {
    const level = controls.suppression;
    if (level < 0.33) return { label: 'Low', color: 'bg-red-100 text-red-700' };
    if (level < 0.67) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'High', color: 'bg-green-100 text-green-700' };
  };

  const getManagementLevel = () => {
    const mgmtScore = (controls.rxBurn + controls.reforest) / 20; // Max = 1.0
    if (mgmtScore < 0.33) return { label: 'Reactive', color: 'bg-orange-100 text-orange-700' };
    if (mgmtScore < 0.67) return { label: 'Balanced', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Proactive', color: 'bg-green-100 text-green-700' };
  };

  const suppressionLevel = getSuppressionLevel();
  const managementLevel = getManagementLevel();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Management & Response Impact</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fire suppression effectiveness and forest management outcomes
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className={`px-2 py-1 text-xs ${suppressionLevel.color}`}>
              {suppressionLevel.label} Suppression
            </Badge>
            <Badge className={`px-2 py-1 text-xs ${managementLevel.color}`}>
              {managementLevel.label} Management
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            
            {/* Burn Severity as bars */}
            <Bar
              dataKey="burnSeverity"
              fill="#FFB84D"
              fillOpacity={0.7}
              name="Burn Severity"
              animationDuration={300}
            />
            {/* Response Impact as area */}
            <Area
              type="monotone"
              dataKey="responseComponent"
              stroke="#E74C3C"
              fill="#FADBD8"
              fillOpacity={0.4}
              strokeWidth={2}
              name="Response Impact"
              animationDuration={300}
            />
            {/* Recovery Impact as line */}
            <Line
              type="monotone"
              dataKey="aftermathComponent"
              stroke="#9B59B6"
              strokeWidth={3}
              dot={false}
              name="Recovery Impact"
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <p><strong>Response Impact:</strong> Lower values indicate better suppression effectiveness</p>
            <p><strong>Severity Threshold:</strong> {(controls.sevThresh * 100).toFixed(0)}% (fires above this are considered severe)</p>
          </div>
          <div>
            <p><strong>Recovery Impact:</strong> Lower values indicate better post-fire recovery</p>
            <p><strong>Management Strategy:</strong> {controls.rxBurn}% prescribed burns, {controls.reforest}% reforestation annually</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
