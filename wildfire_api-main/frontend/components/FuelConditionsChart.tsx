import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComputedRow } from '@/lib/computeSeries';

interface FuelConditionsChartProps {
  data: ComputedRow[];
}

interface FuelChartData {
  date: string;
  fuelLoad: number;
  duffLayer: number;
  woodyDebris: number;
  treeCover: number;
}

export function FuelConditionsChart({ data }: FuelConditionsChartProps) {
  // Sample data for display (every 30 days)
  const chartData: FuelChartData[] = data
    .filter((_, index) => index % 30 === 0)
    .map((row) => ({
      date: new Date(row.date).getFullYear().toString(),
      fuelLoad: Number((row.prefire_fuel * 100).toFixed(1)),
      duffLayer: Number((row.duff_frac * 100).toFixed(1)),
      woodyDebris: Number((row.cwd_frac * 100).toFixed(1)),
      treeCover: Number(row.tree_cover.toFixed(1)),
    }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{`Year: ${label}`}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${entry.dataKey === 'treeCover' ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pre-Fire Fuel Conditions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vegetation and fuel load factors that influence fire potential
        </p>
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
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip content={customTooltip} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            
            {/* Fuel Load - Area chart */}
            <Area
              type="monotone"
              dataKey="fuelLoad"
              stroke="#8B4513"
              fill="#DEB887"
              fillOpacity={0.6}
              strokeWidth={2}
              name="Fuel Load"
              animationDuration={300}
            />
            {/* Duff Layer - Area chart */}
            <Area
              type="monotone"
              dataKey="duffLayer"
              stroke="#A0522D"
              fill="#D2B48C"
              fillOpacity={0.4}
              strokeWidth={2}
              name="Duff Layer"
              animationDuration={300}
            />
            {/* Tree Cover - Line chart */}
            <Line
              type="monotone"
              dataKey="treeCover"
              stroke="#228B22"
              strokeWidth={3}
              dot={false}
              name="Tree Cover %"
              animationDuration={300}
            />
            {/* Woody Debris - Line chart */}
            <Line
              type="monotone"
              dataKey="woodyDebris"
              stroke="#CD853F"
              strokeWidth={2}
              dot={false}
              name="Woody Debris"
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          Fuel load and duff layer increase fire risk. Higher tree cover affects fire spread patterns. Woody debris adds ground fuel.
        </p>
      </CardContent>
    </Card>
  );
}
