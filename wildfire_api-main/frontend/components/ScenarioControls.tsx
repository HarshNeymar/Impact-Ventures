import { Slider } from "../components/ui/slider";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { ScenarioControls } from "@/lib/computeSeries";

interface ScenarioControlsProps {
  controls: ScenarioControls;
  onControlsChange: (controls: ScenarioControls) => void;
}

interface TooltipSliderProps {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  tooltip: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function TooltipSlider({ id, label, value, displayValue, tooltip, min, max, step, onChange }: TooltipSliderProps) {
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Label htmlFor={id} className="text-xs flex justify-between items-center cursor-help">
            <span className="flex items-center gap-1">
              {label}
              <Info className="w-3 h-3 opacity-50" />
            </span>
            <span className="text-xs text-muted-foreground font-mono">{displayValue}</span>
          </Label>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 text-sm">
          <div className="space-y-1">
            <div className="font-semibold">{label}</div>
            <div className="text-muted-foreground">{tooltip}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Range: {min} - {max} | Current: {displayValue}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
      <div className="mt-0.5">
        <Slider
          id={id}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(values: number[]) => onChange(values[0])}
          className="w-full"
        />
      </div>
    </div>
  );
}

export function ScenarioControlsComponent({ controls, onControlsChange }: ScenarioControlsProps) {
  const updateControl = (key: keyof ScenarioControls, value: number | { fuel: number; weather: number; response: number; aftermath: number }) => {
    onControlsChange({
      ...controls,
      [key]: value,
    });
  };

  const updateWeight = (component: keyof ScenarioControls['weights'], value: number) => {
    const newWeights = { ...controls.weights, [component]: value };
    // Auto-normalize weights to 100
    const total = Object.values(newWeights).reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      const normalizedWeights = {
        fuel: Math.round((newWeights.fuel / total) * 100),
        weather: Math.round((newWeights.weather / total) * 100),
        response: Math.round((newWeights.response / total) * 100),
        aftermath: Math.round((newWeights.aftermath / total) * 100),
      };
      updateControl('weights', normalizedWeights);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mb-3">
        {/* Main Controls - Ultra compact like MIT Climate Interactive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 mb-2">
          {/* Pre-Fire Fuel Conditions */}
          <Card className="lg:col-span-2 xl:col-span-2">
            <CardHeader className="pb-1 pt-2 px-2">
              <CardTitle className="text-xs font-medium">Pre-Fire Fuel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-2 pb-2">
              <TooltipSlider
                id="fuel-load"
                label="Fuel load"
                value={controls.fuelMult}
                displayValue={`${controls.fuelMult.toFixed(1)}×`}
                tooltip="Multiplier for pre-fire fuel quantity (0.5-1.5×). Higher values indicate more available fuel for burning, leading to more intense fires and longer burn duration. Influenced by forest management, drought conditions, and vegetation density."
                min={0.5}
                max={1.5}
                step={0.1}
                onChange={(value) => updateControl('fuelMult', value)}
              />

              <TooltipSlider
                id="duff-layer"
                label="Duff layer"
                value={controls.duffOff}
                displayValue={`${controls.duffOff > 0 ? '+' : ''}${controls.duffOff.toFixed(2)}`}
                tooltip="Adjustment to duff layer thickness (-0.2 to +0.2). Duff is the organic layer of decomposing leaves and debris on the forest floor. Thicker duff layers can smolder for extended periods and are difficult to extinguish completely."
                min={-0.2}
                max={0.2}
                step={0.05}
                onChange={(value) => updateControl('duffOff', value)}
              />

              <TooltipSlider
                id="woody-debris"
                label="Woody debris"
                value={controls.cwdOff}
                displayValue={`${controls.cwdOff > 0 ? '+' : ''}${controls.cwdOff.toFixed(2)}`}
                tooltip="Coarse woody debris adjustment (-0.2 to +0.2). Large fallen logs and branches that create fuel continuity and can sustain fire spread. More debris increases fire intensity and creates challenging suppression conditions."
                min={-0.2}
                max={0.2}
                step={0.05}
                onChange={(value) => updateControl('cwdOff', value)}
              />

              <TooltipSlider
                id="tree-cover"
                label="Tree cover"
                value={controls.treeCoverDelta}
                displayValue={`${controls.treeCoverDelta > 0 ? '+' : ''}${controls.treeCoverDelta}%`}
                tooltip="Tree cover percentage change (-30% to +30%). Higher tree cover can create ladder fuels that allow fires to reach the canopy, while also providing more shade and moisture retention. The relationship to fire risk is complex and location-dependent."
                min={-30}
                max={30}
                step={5}
                onChange={(value) => updateControl('treeCoverDelta', value)}
              />
            </CardContent>
          </Card>

          {/* Weather Conditions */}
          <Card className="lg:col-span-2 xl:col-span-2">
            <CardHeader className="pb-1 pt-2 px-2">
              <CardTitle className="text-xs font-medium">Weather</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-2 pb-2">
              <TooltipSlider
                id="hot-days"
                label="Temperature"
                value={controls.tmmxMult}
                displayValue={`${controls.tmmxMult.toFixed(2)}×`}
                tooltip="Temperature multiplier (0.8-1.2×). Higher temperatures dry out vegetation, reduce fuel moisture, and increase fire danger. Even small temperature increases can significantly impact fire behavior and spread rates."
                min={0.8}
                max={1.2}
                step={0.05}
                onChange={(value) => {
                  updateControl('tmmxMult', value);
                  updateControl('tmmnMult', value);
                }}
              />

              <TooltipSlider
                id="dry-air"
                label="Vapor pressure"
                value={controls.vpdMult}
                displayValue={`${controls.vpdMult.toFixed(2)}×`}
                tooltip="Vapor pressure deficit multiplier (0.8-1.2×). Higher VPD indicates drier air that rapidly draws moisture from vegetation, creating more flammable conditions. Critical for predicting fire ignition and spread."
                min={0.8}
                max={1.2}
                step={0.05}
                onChange={(value) => updateControl('vpdMult', value)}
              />

              <TooltipSlider
                id="humidity"
                label="Humidity"
                value={controls.rhOff}
                displayValue={`${controls.rhOff > 0 ? '+' : ''}${controls.rhOff}%`}
                tooltip="Relative humidity adjustment (-10% to +10%). Lower humidity increases fire danger by reducing fuel moisture content. Humidity below 30% creates critical fire weather conditions."
                min={-10}
                max={10}
                step={1}
                onChange={(value) => updateControl('rhOff', value)}
              />

              <TooltipSlider
                id="wind"
                label="Wind"
                value={controls.windPercentile}
                displayValue={`${controls.windPercentile}%`}
                tooltip="Wind speed percentile (10-90%). Higher percentiles represent stronger winds that increase fire spread rate, change fire direction, and make suppression efforts more dangerous and difficult."
                min={10}
                max={90}
                step={5}
                onChange={(value) => updateControl('windPercentile', value)}
              />

              <TooltipSlider
                id="fuel-moisture"
                label="Fuel moisture"
                value={controls.fm100Off}
                displayValue={`${controls.fm100Off > 0 ? '+' : ''}${controls.fm100Off}%`}
                tooltip="Fuel moisture content adjustment (-5% to +5%). Lower fuel moisture makes vegetation more flammable and fires more intense. Dead fuels respond quickly to weather changes, while live fuels change seasonally."
                min={-5}
                max={5}
                step={0.5}
                onChange={(value) => {
                  updateControl('fm100Off', value);
                  updateControl('fm1000Off', value);
                }}
              />
            </CardContent>
          </Card>

          {/* Response & Management */}
          <Card className="lg:col-span-4 xl:col-span-2">
            <CardHeader className="pb-1 pt-2 px-2">
              <CardTitle className="text-xs font-medium">Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-2 pb-2">
              <TooltipSlider
                id="suppression"
                label="Suppression"
                value={controls.suppression}
                displayValue={`${Math.round(controls.suppression * 100)}%`}
                tooltip="Fire suppression effectiveness (0-100%). Higher values represent better firefighting capabilities including resources, response time, and tactics. Effectiveness varies by terrain, weather, and fire intensity."
                min={0}
                max={1}
                step={0.1}
                onChange={(value) => updateControl('suppression', value)}
              />

              <TooltipSlider
                id="prescribed-burns"
                label="Prescribed burns"
                value={controls.rxBurn}
                displayValue={`${controls.rxBurn}%/yr`}
                tooltip="Annual prescribed burning rate (0-10% per year). Controlled burns reduce fuel accumulation and create firebreaks, but require careful timing and conditions. Essential for long-term fire risk reduction."
                min={0}
                max={10}
                step={0.5}
                onChange={(value) => updateControl('rxBurn', value)}
              />

              <TooltipSlider
                id="severity-threshold"
                label="Severity threshold"
                value={controls.sevThresh}
                displayValue={`${controls.sevThresh.toFixed(1)}`}
                tooltip="Fire severity classification threshold (0.2-0.9). Determines what constitutes high-severity fire damage. Lower thresholds classify more areas as severely burned, affecting recovery and management strategies."
                min={0.2}
                max={0.9}
                step={0.1}
                onChange={(value) => updateControl('sevThresh', value)}
              />

              <TooltipSlider
                id="reforestation"
                label="Reforestation"
                value={controls.reforest}
                displayValue={`${controls.reforest}%/yr`}
                tooltip="Annual reforestation rate (0-10% per year). Post-fire replanting and natural regeneration rates. Higher rates restore forest cover but may increase future fuel loads without proper management."
                min={0}
                max={10}
                step={0.5}
                onChange={(value) => updateControl('reforest', value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Component Weights - Single compact row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card rounded border p-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label htmlFor="weight-fuel" className="text-xs flex justify-between mb-0.5 cursor-help items-center">
                  <span className="flex items-center gap-1">
                    Fuel
                    <Info className="w-3 h-3 opacity-50" />
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{controls.weights.fuel}%</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 text-sm">
                <div className="space-y-1">
                  <div className="font-semibold">Fuel Weight</div>
                  <div className="text-muted-foreground">Relative importance of fuel conditions (load, moisture, debris) in the overall risk calculation. Higher weights emphasize fuel-related factors in determining fire behavior.</div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Slider
              id="weight-fuel"
              min={0}
              max={100}
              step={5}
              value={[controls.weights.fuel]}
              onValueChange={(value: number[]) => updateWeight('fuel', value[0])}
              className="w-full"
            />
          </div>

          <div className="bg-card rounded border p-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label htmlFor="weight-weather" className="text-xs flex justify-between mb-0.5 cursor-help items-center">
                  <span className="flex items-center gap-1">
                    Weather
                    <Info className="w-3 h-3 opacity-50" />
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{controls.weights.weather}%</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 text-sm">
                <div className="space-y-1">
                  <div className="font-semibold">Weather Weight</div>
                  <div className="text-muted-foreground">Relative importance of weather conditions (temperature, humidity, wind) in fire risk assessment. Weather often drives short-term fire behavior and ignition probability.</div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Slider
              id="weight-weather"
              min={0}
              max={100}
              step={5}
              value={[controls.weights.weather]}
              onValueChange={(value: number[]) => updateWeight('weather', value[0])}
              className="w-full"
            />
          </div>

          <div className="bg-card rounded border p-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label htmlFor="weight-response" className="text-xs flex justify-between mb-0.5 cursor-help items-center">
                  <span className="flex items-center gap-1">
                    Response
                    <Info className="w-3 h-3 opacity-50" />
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{controls.weights.response}%</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 text-sm">
                <div className="space-y-1">
                  <div className="font-semibold">Response Weight</div>
                  <div className="text-muted-foreground">Relative importance of firefighting response and suppression capabilities. Higher weights reflect regions with better emergency response infrastructure and resources.</div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Slider
              id="weight-response"
              min={0}
              max={100}
              step={5}
              value={[controls.weights.response]}
              onValueChange={(value: number[]) => updateWeight('response', value[0])}
              className="w-full"
            />
          </div>

          <div className="bg-card rounded border p-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label htmlFor="weight-aftermath" className="text-xs flex justify-between mb-0.5 cursor-help items-center">
                  <span className="flex items-center gap-1">
                    Aftermath
                    <Info className="w-3 h-3 opacity-50" />
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{controls.weights.aftermath}%</span>
                </Label>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 text-sm">
                <div className="space-y-1">
                  <div className="font-semibold">Aftermath Weight</div>
                  <div className="text-muted-foreground">Relative importance of post-fire recovery and long-term ecosystem impacts. Includes reforestation rates, erosion potential, and ecological recovery capacity.</div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Slider
              id="weight-aftermath"
              min={0}
              max={100}
              step={5}
              value={[controls.weights.aftermath]}
              onValueChange={(value: number[]) => updateWeight('aftermath', value[0])}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

