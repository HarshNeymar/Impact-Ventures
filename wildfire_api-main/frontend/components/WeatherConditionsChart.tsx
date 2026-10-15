import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, ComposedChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComputedRow } from '@/lib/computeSeries';

interface WeatherConditionsChartProps {
  data: ComputedRow[];
}

interface WeatherChartData {
  date: string;
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  vaporPressure: number;
  humidity: number;
  windSpeed: number;
  fuelMoisture100: number;
  fuelMoisture1000: number;
}

export function WeatherConditionsChart({ data }: WeatherConditionsChartProps) {
  // Sample data for display (every 30 days)
  const chartData: WeatherChartData[] = data
    .filter((_, index) => index % 30 === 0)
    .map((row) => ({
      date: new Date(row.date).getFullYear().toString(),
      maxTemp: Number(row.tmmx.toFixed(1)),
      minTemp: Number(row.tmmn.toFixed(1)),
      avgTemp: Number(((row.tmmx + row.tmmn) / 2).toFixed(1)),
      vaporPressure: Number((row.vpd * 10).toFixed(1)), // Scale for visibility
      humidity: Number(((row.rmin + row.rmax) / 2).toFixed(1)),
      windSpeed: Number(row.vs.toFixed(1)),
      fuelMoisture100: Number(row.fm100.toFixed(1)),
      fuelMoisture1000: Number(row.fm1000.toFixed(1)),
    }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{`Year: ${label}`}</p>
          {payload.map((entry: any) => {
            let unit = '';
            let value = entry.value;
            
            if (entry.dataKey.includes('Temp')) unit = '°C';
            else if (entry.dataKey === 'humidity') unit = '%';
            else if (entry.dataKey === 'windSpeed') unit = ' m/s';
            else if (entry.dataKey === 'vaporPressure') {
              unit = ' kPa';
              value = (entry.value / 10).toFixed(2); // Convert back from scaled value
            }
            else if (entry.dataKey.includes('fuelMoisture')) unit = '%';
            
            return (
              <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
                {`${entry.name}: ${value}${unit}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Weather Conditions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Temperature, humidity, wind, and moisture conditions affecting fire behavior
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
              yAxisId="temp"
              orientation="left"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `${value}°C`}
            />
            <YAxis 
              yAxisId="other"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={customTooltip} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            
            {/* Temperature area with better styling */}
            <Area
              yAxisId="temp"
              type="monotone"
              dataKey="maxTemp"
              stroke="#FF4444"
              fill="#FFE5E5"
              fillOpacity={0.6}
              strokeWidth={2}
              name="Max Temperature"
              animationDuration={300}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="avgTemp"
              stroke="#FF0000"
              strokeWidth={3}
              dot={false}
              name="Avg Temperature"
              animationDuration={300}
            />
            
            {/* Humidity with area fill */}
            <Area
              yAxisId="other"
              type="monotone"
              dataKey="humidity"
              stroke="#4A90E2"
              fill="#E3F2FD"
              fillOpacity={0.4}
              strokeWidth={2}
              name="Humidity %"
              animationDuration={300}
            />
            
            {/* Wind Speed as bars */}
            <Bar
              yAxisId="other"
              dataKey="windSpeed"
              fill="#FF8C42"
              fillOpacity={0.7}
              name="Wind Speed"
            />
            
            {/* Fuel Moisture */}
            <Line
              yAxisId="other"
              type="monotone"
              dataKey="fuelMoisture100"
              stroke="#228B22"
              strokeWidth={2}
              dot={false}
              name="Fuel Moisture"
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          Higher temperatures, lower humidity, higher wind speeds, and lower fuel moisture increase fire risk. 
          Left axis: Temperature (°C). Right axis: Other variables (%, m/s).
        </p>
      </CardContent>
    </Card>
  );
}
