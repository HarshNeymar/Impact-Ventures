import { Slider } from '../components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import React from 'react';
import { SearchDropdowns } from '@/components/SearchDropdowns';
import { 
  actualValueToPercentage, 
  percentageToActualValue, 
  getPercentageStep,
  ParameterKey 
} from '@/lib/percentageUtils';

export interface GraphsControlsState {
  prefireFuel: number;
  coverType: number;
  temperature: number;
  humidity: number;
  dryness: number;
  duffFraction: number;
  coarseWoodyDebris: number;
  solarRadiation: number;
  // Advanced optional inputs
  longitude?: number;
  latitude?: number;
  day_of_year_sin?: number;
  fm1000_value?: number;
  day_of_year_cos?: number;
  bi_value?: number;
  fm100_value?: number;
  month?: number;
  season?: number;
  th_value?: number;
  burn_source?: number;
  rmin_value?: number;
  vs_value?: number;
  burnday_source?: number;
  vpd_value?: number;
  sph_value?: number;
  pet_value?: number;
  BSEV?: number;
  fuelcode?: number;
}

interface GraphsSideNavProps {
  controls: GraphsControlsState;
  onControlsChange: (controls: GraphsControlsState) => void;
  onResetAll?: () => void; // optional callback to allow parent to clear API / persisted data
  onWildfireApiResponse?: (response: any | null, error?: string) => void; // Add wildfire API callback
  onStateChange?: (state: string) => void;
  onCountyChange?: (county: string) => void;
  onDateChange?: (date: Date | null) => void;
  onClose?: () => void; // Add close callback
}

export const DEFAULT_GRAPHS_CONTROLS: GraphsControlsState = {
  prefireFuel: 4488.574695, // from API example
  coverType: 3, // from API example  
  temperature: 277.79998779296875, // tmmn_value from API example
  humidity: 31.80000114440918, // rmax_value from API example
  dryness: 2.0, // fuel_moisture_class from API example
  duffFraction: 0.194947, // duff_frac from API example
  coarseWoodyDebris: 0.11883, // cwd_frac from API example
  solarRadiation: 347.0, // srad_value from API example
  // Advanced fields from API example
  day_of_year_sin: 0.5610336065292358,
  fm1000_value: 4.5,
  day_of_year_cos: -0.8277930021286011,
  bi_value: 114.0,
  fm100_value: 3.4000000953674316,
  month: 5.0,
  season: 2.0,
  th_value: 251.0,
  burn_source: 1.0,
  rmin_value: 5.300000190734863,
  vs_value: 6.300000190734863,
  burnday_source: 15.0,
  vpd_value: 1.7699999809265137,
  sph_value: 0.0021899999119341373,
  pet_value: 8.300000190734863,
  BSEV: 1.0,
  fuelcode: 1920.0
};

export function GraphsSideNav({ controls, onControlsChange, onResetAll, onWildfireApiResponse, onStateChange, onCountyChange, onDateChange, onClose }: GraphsSideNavProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [loadingScenario, setLoadingScenario] = React.useState<number | null>(null);
  
  // Function to convert API scenario features to slider controls format
  const convertScenarioToControls = (features: any): GraphsControlsState => {
    return {
      prefireFuel: features.prefire_fuel || controls.prefireFuel,
      coverType: features.covertype || controls.coverType,
      temperature: features.tmmn_value || controls.temperature,
      humidity: features.rmax_value || controls.humidity,
      dryness: features.fuel_moisture_class || controls.dryness,
      duffFraction: features.duff_frac || controls.duffFraction,
      coarseWoodyDebris: features.cwd_frac || controls.coarseWoodyDebris,
      solarRadiation: features.srad_value || controls.solarRadiation,
      // Advanced fields
      longitude: features.longitude,
      latitude: features.latitude,
      day_of_year_sin: features.day_of_year_sin,
      fm1000_value: features.fm1000_value,
      day_of_year_cos: features.day_of_year_cos,
      bi_value: features.bi_value,
      fm100_value: features.fm100_value,
      month: features.month,
      season: features.season,
      th_value: features.th_value,
      burn_source: features.burn_source,
      rmin_value: features.rmin_value,
      vs_value: features.vs_value,
      burnday_source: features.burnday_source,
      vpd_value: features.vpd_value,
      sph_value: features.sph_value,
      pet_value: features.pet_value,
      BSEV: features.BSEV,
      fuelcode: features.fuelcode
    };
  };
  
  const updateControl = (key: keyof GraphsControlsState, percentageValue: number) => {
    // Convert percentage value back to actual API value
    const actualValue = percentageToActualValue(key as ParameterKey, percentageValue);
    onControlsChange({
      ...controls,
      [key]: actualValue,
    });
  };

  const getDisplayValue = (key: keyof GraphsControlsState): number => {
    // Convert actual API value to percentage for display
    const value = controls[key];
    if (typeof value !== 'number') return 50; // Default to 50% if undefined
    return actualValueToPercentage(key as ParameterKey, value);
  };

  const handleReset = () => {
    // Reset all control values to defaults
    onControlsChange({ ...DEFAULT_GRAPHS_CONTROLS });

    // Clear related persisted data (defensive try/catch for SSR safety)
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('riskHeatmapData'); } catch {}
      try { localStorage.removeItem('kpiData'); } catch {}
      try { localStorage.removeItem('bsevData'); } catch {}
    }

    // Let parent clear its own state (wildfireResponse etc.)
    onResetAll?.();
  };

  const handleFireScenario1 = async () => {
    if (!onWildfireApiResponse || loadingScenario) return;

    setLoadingScenario(1);
    try {
      // Random scenario data pool
      const randomScenarios = [
        {
          "features": {
            "longitude": -112.7554,
            "prefire_fuel": 15.69204,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.09233133494853973,
            "fm1000_value": 4.200000286102295,
            "srad_value": 273.3000183105469,
            "day_of_year_cos": -0.9957283139228821,
            "bi_value": 84.0,
            "fm100_value": 2.700000047683716,
            "rmax_value": 23.899999618530273,
            "month": 7.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 247.0,
            "latitude": 38.763,
            "burn_source": 1.0,
            "rmin_value": 4.599999904632568,
            "vs_value": 3.200000047683716,
            "burnday_source": 15.0,
            "vpd_value": 3.3299999237060547,
            "sph_value": 0.004299999680370092,
            "pet_value": 7.800000190734863,
            "BSEV": 1.0,
            "tmmn_value": 290.1000061035156,
            "fuelcode": 1.0,
            "fuel_moisture_class": 3.0,
            "doy": 188.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -112.6741,
            "prefire_fuel": 39.902616,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.10944576561450958,
            "fm1000_value": 4.400000095367432,
            "srad_value": 318.8000183105469,
            "day_of_year_cos": -0.9939927458763123,
            "bi_value": 71.0,
            "fm100_value": 3.200000047683716,
            "rmax_value": 31.5,
            "month": 7.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 14.0,
            "latitude": 38.8964,
            "burn_source": 1.0,
            "rmin_value": 10.5,
            "vs_value": 2.5,
            "burnday_source": 15.0,
            "vpd_value": 3.419999837875366,
            "sph_value": 0.004840000066906214,
            "pet_value": 7.5,
            "BSEV": 2.0,
            "tmmn_value": 290.8999938964844,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 189.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -120.1089,
            "prefire_fuel": 41.47182,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.7277014851570129,
            "fm1000_value": 5.200000286102295,
            "srad_value": 290.6000061035156,
            "day_of_year_cos": -0.6858940124511719,
            "bi_value": 69.0,
            "fm100_value": 5.099999904632568,
            "rmax_value": 44.70000076293945,
            "month": 8.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 287.0,
            "latitude": 40.4852,
            "burn_source": 1.0,
            "rmin_value": 7.5,
            "vs_value": 2.6000001430511475,
            "burnday_source": 81.0,
            "vpd_value": 3.069999933242798,
            "sph_value": 0.004220000002533197,
            "pet_value": 6.900000095367432,
            "BSEV": 1.0,
            "tmmn_value": 284.70001220703125,
            "fuelcode": 1.0,
            "fuel_moisture_class": 1.0,
            "doy": 230.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -118.3988,
            "prefire_fuel": 45.506916,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.7157953381538391,
            "fm1000_value": 5.099999904632568,
            "srad_value": 284.3999938964844,
            "day_of_year_cos": -0.698310136795044,
            "bi_value": 65.0,
            "fm100_value": 4.400000095367432,
            "rmax_value": 37.29999923706055,
            "month": 8.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 147.0,
            "latitude": 41.9121,
            "burn_source": 1.0,
            "rmin_value": 11.800000190734863,
            "vs_value": 2.4000000953674316,
            "burnday_source": 15.0,
            "vpd_value": 2.3899998664855957,
            "sph_value": 0.004789999686181545,
            "pet_value": 5.900000095367432,
            "BSEV": 1.0,
            "tmmn_value": 288.6000061035156,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 229.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -112.6273,
            "prefire_fuel": 47.188206,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.14357241988182068,
            "fm1000_value": 4.5,
            "srad_value": 321.8999938964844,
            "day_of_year_cos": -0.9896398186683655,
            "bi_value": 56.0,
            "fm100_value": 3.299999952316284,
            "rmax_value": 23.100000381469727,
            "month": 7.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 228.0,
            "latitude": 39.0522,
            "burn_source": 1.0,
            "rmin_value": 8.40000057220459,
            "vs_value": 0.9000000357627869,
            "burnday_source": 15.0,
            "vpd_value": 3.919999837875366,
            "sph_value": 0.003969999961555004,
            "pet_value": 5.700000286102295,
            "BSEV": 1.0,
            "tmmn_value": 291.6000061035156,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 191.0
          },
          "round_risk": false
        }
      ];

      // Randomly select one scenario
      const randomIndex = Math.floor(Math.random() * randomScenarios.length);
      const scenarioData = randomScenarios[randomIndex];

      console.log(`Fire Scenario 1: Randomly selected scenario ${randomIndex + 1} of ${randomScenarios.length}`);
      console.log('Fire Scenario 1: Making wildfire API call with random scenario data');

      // Update sliders to match the scenario being sent to API
      const newControls = convertScenarioToControls(scenarioData.features);
      onControlsChange(newControls);

      // Make the API call through our proxy
      const response = await fetch('/api/wildfire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(scenarioData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Fire Scenario 1: Wildfire API response:', data);
      
      // Call the parent callback with the response
      onWildfireApiResponse(data);
      
    } catch (error) {
      console.error('Fire Scenario 1: Error calling wildfire API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onWildfireApiResponse(null, errorMessage);
    } finally {
      setLoadingScenario(null);
    }
  };

  const handleFireScenario2 = async () => {
    if (!onWildfireApiResponse || loadingScenario) return;

    setLoadingScenario(2);
    try {
      // Random scenario data pool
      const randomScenarios = [
        {
          "features": {
            "longitude": -117.7282,
            "prefire_fuel": 51.783732,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.9350748658180237,
            "fm1000_value": 10.800000190734863,
            "srad_value": 204.40000915527344,
            "day_of_year_cos": 0.3544502258300781,
            "bi_value": 62.0,
            "fm100_value": 7.0,
            "rmax_value": 21.100000381469727,
            "month": 10.0,
            "season": 4.0,
            "covertype": 1.0,
            "th_value": 60.0,
            "latitude": 33.7866,
            "burn_source": 3.0,
            "rmin_value": 7.400000095367432,
            "vs_value": 4.200000286102295,
            "burnday_source": 81.0,
            "vpd_value": 2.5899999141693115,
            "sph_value": 0.00139999995008111,
            "pet_value": 6.400000095367432,
            "BSEV": 3.0,
            "tmmn_value": 286.3999938964844,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 295.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -92.5916,
            "prefire_fuel": 78.123942,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.9020987153053284,
            "fm1000_value": 16.0,
            "srad_value": 220.90000915527344,
            "day_of_year_cos": -0.4315297603607178,
            "bi_value": 38.0,
            "fm100_value": 13.40000057220459,
            "rmax_value": 83.80000305175781,
            "month": 9.0,
            "season": 4.0,
            "covertype": 1.0,
            "th_value": 91.0,
            "latitude": 47.4665,
            "burn_source": 4.0,
            "rmin_value": 22.600000381469727,
            "vs_value": 4.0,
            "burnday_source": 15.0,
            "vpd_value": 1.459999918937683,
            "sph_value": 0.005979999899864197,
            "pet_value": 5.200000286102295,
            "BSEV": 1.0,
            "tmmn_value": 282.1000061035156,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 248.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -117.5688,
            "prefire_fuel": 82.719468,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.1605745404958725,
            "fm1000_value": 7.0,
            "srad_value": 328.70001220703125,
            "day_of_year_cos": -0.9870237112045288,
            "bi_value": 61.0,
            "fm100_value": 5.099999904632568,
            "rmax_value": 50.900001525878906,
            "month": 7.0,
            "season": 3.0,
            "covertype": 2.0,
            "th_value": 287.0,
            "latitude": 42.3473,
            "burn_source": 1.0,
            "rmin_value": 10.800000190734863,
            "vs_value": 2.5,
            "burnday_source": 15.0,
            "vpd_value": 2.809999942779541,
            "sph_value": 0.005459999665617943,
            "pet_value": 7.300000190734863,
            "BSEV": 1.0,
            "tmmn_value": 285.70001220703125,
            "fuelcode": 2.0,
            "fuel_moisture_class": 1.0,
            "doy": 192.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -114.2818,
            "prefire_fuel": 82.719468,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.11371951550245285,
            "fm1000_value": 6.5,
            "srad_value": 254.40000915527344,
            "day_of_year_cos": -0.9935128688812256,
            "bi_value": 90.0,
            "fm100_value": 4.099999904632568,
            "rmax_value": 24.30000114440918,
            "month": 6.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 190.0,
            "latitude": 37.2406,
            "burn_source": 1.0,
            "rmin_value": 10.100000381469727,
            "vs_value": 5.400000095367432,
            "burnday_source": 15.0,
            "vpd_value": 2.740000009536743,
            "sph_value": 0.0034899997990578413,
            "pet_value": 8.800000190734863,
            "BSEV": 4.0,
            "tmmn_value": 291.8999938964844,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 176.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -115.6181,
            "prefire_fuel": 58.84515,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.29446160793304443,
            "fm1000_value": 7.400000095367432,
            "srad_value": 320.3000183105469,
            "day_of_year_cos": -0.9556633234024048,
            "bi_value": 63.0,
            "fm100_value": 7.0,
            "rmax_value": 59.0,
            "month": 7.0,
            "season": 3.0,
            "covertype": 2.0,
            "th_value": 209.0,
            "latitude": 41.9065,
            "burn_source": 1.0,
            "rmin_value": 12.300000190734863,
            "vs_value": 3.1000001430511475,
            "burnday_source": 15.0,
            "vpd_value": 1.5299999713897705,
            "sph_value": 0.005699999630451202,
            "pet_value": 6.200000286102295,
            "BSEV": 4.0,
            "tmmn_value": 282.1000061035156,
            "fuelcode": 2.0,
            "fuel_moisture_class": 2.0,
            "doy": 200.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -114.2486,
            "prefire_fuel": 63.104418,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.09661269932985306,
            "fm1000_value": 4.900000095367432,
            "srad_value": 352.1000061035156,
            "day_of_year_cos": -0.995322048664093,
            "bi_value": 86.0,
            "fm100_value": 3.200000047683716,
            "rmax_value": 22.0,
            "month": 6.0,
            "season": 3.0,
            "covertype": 2.0,
            "th_value": 183.0,
            "latitude": 37.0366,
            "burn_source": 1.0,
            "rmin_value": 6.5,
            "vs_value": 3.799999952316284,
            "burnday_source": 15.0,
            "vpd_value": 3.119999885559082,
            "sph_value": 0.0024500000290572643,
            "pet_value": 8.90000057220459,
            "BSEV": 4.0,
            "tmmn_value": 288.6000061035156,
            "fuelcode": 2.0,
            "fuel_moisture_class": 2.0,
            "doy": 177.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -106.0618,
            "prefire_fuel": 77.003082,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.9373419284820557,
            "fm1000_value": 5.599999904632568,
            "srad_value": 279.70001220703125,
            "day_of_year_cos": -0.34841081500053406,
            "bi_value": 83.0,
            "fm100_value": 3.799999952316284,
            "rmax_value": 12.40000057220459,
            "month": 4.0,
            "season": 2.0,
            "covertype": 2.0,
            "th_value": 237.0,
            "latitude": 32.3511,
            "burn_source": 1.0,
            "rmin_value": 4.099999904632568,
            "vs_value": 3.700000047683716,
            "burnday_source": 15.0,
            "vpd_value": 2.9800000190734863,
            "sph_value": 0.0015199999324977398,
            "pet_value": 7.800000190734863,
            "BSEV": 1.0,
            "tmmn_value": 285.70001220703125,
            "fuelcode": 2.0,
            "fuel_moisture_class": 2.0,
            "doy": 112.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -76.5802,
            "prefire_fuel": 118.362816,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.9738922119140625,
            "fm1000_value": 12.300000190734863,
            "srad_value": 280.70001220703125,
            "day_of_year_cos": 0.2270108163356781,
            "bi_value": 44.0,
            "fm100_value": 9.300000190734863,
            "rmax_value": 65.20000457763672,
            "month": 3.0,
            "season": 2.0,
            "covertype": 2.0,
            "th_value": 311.0,
            "latitude": 35.284,
            "burn_source": 1.0,
            "rmin_value": 21.700000762939453,
            "vs_value": 4.5,
            "burnday_source": 15.0,
            "vpd_value": 0.6299999952316284,
            "sph_value": 0.0021899999119341373,
            "pet_value": 3.6000001430511475,
            "BSEV": 1.0,
            "tmmn_value": 272.29998779296875,
            "fuelcode": 2.0,
            "fuel_moisture_class": 2.0,
            "doy": 78.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -98.7906,
            "prefire_fuel": 122.73417,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.0043005929328501225,
            "fm1000_value": 13.100000381469727,
            "srad_value": 136.90000915527344,
            "day_of_year_cos": 0.9999907612800598,
            "bi_value": 53.0,
            "fm100_value": 9.699999809265137,
            "rmax_value": 41.5,
            "month": 12.0,
            "season": 1.0,
            "covertype": 1.0,
            "th_value": 202.0,
            "latitude": 33.5231,
            "burn_source": 4.0,
            "rmin_value": 14.300000190734863,
            "vs_value": 4.800000190734863,
            "burnday_source": 77.0,
            "vpd_value": 1.1299999952316284,
            "sph_value": 0.001999999862164259,
            "pet_value": 4.099999904632568,
            "BSEV": 1.0,
            "tmmn_value": 272.3999938964844,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 365.0
          },
          "round_risk": false
        }
      ];

      // Randomly select one scenario
      const randomIndex = Math.floor(Math.random() * randomScenarios.length);
      const scenarioData = randomScenarios[randomIndex];

      console.log(`Fire Scenario 2: Randomly selected scenario ${randomIndex + 1} of ${randomScenarios.length}`);
      console.log('Fire Scenario 2: Making wildfire API call with random scenario data');

      // Update sliders to match the scenario being sent to API
      const newControls = convertScenarioToControls(scenarioData.features);
      onControlsChange(newControls);

      // Make the API call through our proxy
      const response = await fetch('/api/wildfire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(scenarioData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Fire Scenario 2: Wildfire API response:', data);
      
      // Call the parent callback with the response
      onWildfireApiResponse(data);
      
    } catch (error) {
      console.error('Fire Scenario 2: Error calling wildfire API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onWildfireApiResponse(null, errorMessage);
    } finally {
      setLoadingScenario(null);
    }
  };

  const handleFireScenario3 = async () => {
    if (!onWildfireApiResponse || loadingScenario) return;

    setLoadingScenario(3);
    try {
      // Random scenario data pool - high fuel load scenarios
      const randomScenarios = [
        {
          "features": {
            "longitude": -111.4433,
            "prefire_fuel": 133.494426,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.2447723001241684,
            "fm1000_value": 13.199999809265137,
            "srad_value": 284.8999938964844,
            "day_of_year_cos": -0.9695805907249451,
            "bi_value": 33.0,
            "fm100_value": 16.399999618530273,
            "rmax_value": 86.4000015258789,
            "month": 7.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 246.0,
            "latitude": 31.7008,
            "burn_source": 1.0,
            "rmin_value": 37.0,
            "vs_value": 2.700000047683716,
            "burnday_source": 77.0,
            "vpd_value": 1.899999976158142,
            "sph_value": 0.014179999940097332,
            "pet_value": 6.400000095367432,
            "BSEV": 1.0,
            "tmmn_value": 292.79998779296875,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 197.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -115.5368,
            "prefire_fuel": 150.531498,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.941758930683136,
            "fm1000_value": 10.0,
            "srad_value": 228.1999969482422,
            "day_of_year_cos": -0.336288720369339,
            "bi_value": 55.0,
            "fm100_value": 9.199999809265137,
            "rmax_value": 46.70000076293945,
            "month": 9.0,
            "season": 4.0,
            "covertype": 2.0,
            "th_value": 250.0,
            "latitude": 45.2513,
            "burn_source": 1.0,
            "rmin_value": 18.200000762939453,
            "vs_value": 3.6000001430511475,
            "burnday_source": 15.0,
            "vpd_value": 1.649999976158142,
            "sph_value": 0.0033699998166412115,
            "pet_value": 5.300000190734863,
            "BSEV": 4.0,
            "tmmn_value": 276.8999938964844,
            "fuelcode": 2.0,
            "fuel_moisture_class": 3.0,
            "doy": 254.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -103.5427,
            "prefire_fuel": 155.23911,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.4840885102748871,
            "fm1000_value": 13.800000190734863,
            "srad_value": 302.1000061035156,
            "day_of_year_cos": -0.8750190138816833,
            "bi_value": 38.0,
            "fm100_value": 12.699999809265137,
            "rmax_value": 87.0,
            "month": 7.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 243.0,
            "latitude": 42.0218,
            "burn_source": 4.0,
            "rmin_value": 19.899999618530273,
            "vs_value": 3.1000001430511475,
            "burnday_source": 77.0,
            "vpd_value": 1.5099999904632568,
            "sph_value": 0.007969999685883522,
            "pet_value": 6.0,
            "BSEV": 1.0,
            "tmmn_value": 283.79998779296875,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 212.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -111.8054,
            "prefire_fuel": 157.032486,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.883720338344574,
            "fm1000_value": 15.699999809265137,
            "srad_value": 157.1999969482422,
            "day_of_year_cos": 0.4680153429508209,
            "bi_value": 28.0,
            "fm100_value": 18.30000114440918,
            "rmax_value": 100.0,
            "month": 3.0,
            "season": 2.0,
            "covertype": 1.0,
            "th_value": 235.0,
            "latitude": 47.6519,
            "burn_source": 2.0,
            "rmin_value": 23.80000114440918,
            "vs_value": 2.799999952316284,
            "burnday_source": 12.0,
            "vpd_value": 0.28999999165534973,
            "sph_value": 0.00139999995008111,
            "pet_value": 1.399999976158142,
            "BSEV": 1.0,
            "tmmn_value": 255.10000610351562,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 63.0
          },
          "round_risk": false
        }
      ];

      // Randomly select one scenario
      const randomIndex = Math.floor(Math.random() * randomScenarios.length);
      const scenarioData = randomScenarios[randomIndex];

      console.log(`Fire Scenario 3: Randomly selected scenario ${randomIndex + 1} of ${randomScenarios.length}`);
      console.log('Fire Scenario 3: Making wildfire API call with random high fuel load scenario');

      // Update sliders to match the scenario being sent to API
      const newControls = convertScenarioToControls(scenarioData.features);
      onControlsChange(newControls);

      // Make the API call through our proxy
      const response = await fetch('/api/wildfire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(scenarioData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Fire Scenario 3: Wildfire API response:', data);
      
      // Call the parent callback with the response
      onWildfireApiResponse(data);
      
    } catch (error) {
      console.error('Fire Scenario 3: Error calling wildfire API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onWildfireApiResponse(null, errorMessage);
    } finally {
      setLoadingScenario(null);
    }
  };

  const handleFireScenario4 = async () => {
    if (!onWildfireApiResponse || loadingScenario) return;

    setLoadingScenario(4);
    try {
      // Random scenario data pool - low fuel load scenarios
      const randomScenarios = [
        {
          "features": {
            "longitude": -119.8151,
            "prefire_fuel": 46.964034,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": -0.8048257231712341,
            "fm1000_value": 6.5,
            "srad_value": 288.3000183105469,
            "day_of_year_cos": -0.593511164188385,
            "bi_value": 73.0,
            "fm100_value": 6.0,
            "rmax_value": 56.10000228881836,
            "month": 8.0,
            "season": 3.0,
            "covertype": 1.0,
            "th_value": 230.0,
            "latitude": 39.2878,
            "burn_source": 3.0,
            "rmin_value": 12.199999809265137,
            "vs_value": 3.9000000953674316,
            "burnday_source": 77.0,
            "vpd_value": 2.3299999237060547,
            "sph_value": 0.005219999700784683,
            "pet_value": 7.099999904632568,
            "BSEV": 1.0,
            "tmmn_value": 283.8999938964844,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 237.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -108.301,
            "prefire_fuel": 45.731088,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.8460288643836975,
            "fm1000_value": 5.200000286102295,
            "srad_value": 330.5,
            "day_of_year_cos": -0.5331370830535889,
            "bi_value": 89.0,
            "fm100_value": 4.900000095367432,
            "rmax_value": 41.70000076293945,
            "month": 5.0,
            "season": 2.0,
            "covertype": 1.0,
            "th_value": 269.0,
            "latitude": 31.583,
            "burn_source": 1.0,
            "rmin_value": 10.800000190734863,
            "vs_value": 4.900000095367432,
            "burnday_source": 77.0,
            "vpd_value": 2.109999895095825,
            "sph_value": 0.0032199998386204243,
            "pet_value": 8.0,
            "BSEV": 1.0,
            "tmmn_value": 280.8999938964844,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 124.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -108.3226,
            "prefire_fuel": 48.645324,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.8367329239845276,
            "fm1000_value": 5.200000286102295,
            "srad_value": 329.0,
            "day_of_year_cos": -0.5476111769676208,
            "bi_value": 96.0,
            "fm100_value": 4.800000190734863,
            "rmax_value": 35.70000076293945,
            "month": 5.0,
            "season": 2.0,
            "covertype": 1.0,
            "th_value": 278.0,
            "latitude": 31.5852,
            "burn_source": 1.0,
            "rmin_value": 10.600000381469727,
            "vs_value": 5.5,
            "burnday_source": 77.0,
            "vpd_value": 2.200000047683716,
            "sph_value": 0.003229999914765358,
            "pet_value": 8.600000381469727,
            "BSEV": 1.0,
            "tmmn_value": 282.20001220703125,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 125.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -108.3358,
            "prefire_fuel": 58.957236,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.7648913860321045,
            "fm1000_value": 4.599999904632568,
            "srad_value": 338.3000183105469,
            "day_of_year_cos": -0.6441592574119568,
            "bi_value": 102.0,
            "fm100_value": 3.700000047683716,
            "rmax_value": 33.29999923706055,
            "month": 5.0,
            "season": 2.0,
            "covertype": 1.0,
            "th_value": 252.0,
            "latitude": 31.6018,
            "burn_source": 1.0,
            "rmin_value": 5.5,
            "vs_value": 5.300000190734863,
            "burnday_source": 77.0,
            "vpd_value": 2.369999885559082,
            "sph_value": 0.0027099999133497477,
            "pet_value": 8.800000190734863,
            "BSEV": 1.0,
            "tmmn_value": 283.6000061035156,
            "fuelcode": 1.0,
            "fuel_moisture_class": 2.0,
            "doy": 132.0
          },
          "round_risk": false
        },
        {
          "features": {
            "longitude": -114.3679,
            "prefire_fuel": 90.565488,
            "cwd_frac": 0.0,
            "duff_frac": 0.0,
            "day_of_year_sin": 0.02795029804110527,
            "fm1000_value": 4.0,
            "srad_value": 346.8000183105469,
            "day_of_year_cos": -0.9996092915534973,
            "bi_value": 72.0,
            "fm100_value": 2.200000047683716,
            "rmax_value": 12.0,
            "month": 6.0,
            "season": 3.0,
            "covertype": 2.0,
            "th_value": 194.0,
            "latitude": 36.9933,
            "burn_source": 1.0,
            "rmin_value": 5.700000286102295,
            "vs_value": 2.1000001430511475,
            "burnday_source": 15.0,
            "vpd_value": 4.089999675750732,
            "sph_value": 0.0024999999441206455,
            "pet_value": 7.400000095367432,
            "BSEV": 1.0,
            "tmmn_value": 294.6000061035156,
            "fuelcode": 2.0,
            "fuel_moisture_class": 3.0,
            "doy": 181.0
          },
          "round_risk": false
        }
      ];

      // Randomly select one scenario
      const randomIndex = Math.floor(Math.random() * randomScenarios.length);
      const scenarioData = randomScenarios[randomIndex];

      console.log(`Fire Scenario 4: Randomly selected scenario ${randomIndex + 1} of ${randomScenarios.length}`);
      console.log('Fire Scenario 4: Making wildfire API call with random low fuel load scenario');

      // Update sliders to match the scenario being sent to API
      const newControls = convertScenarioToControls(scenarioData.features);
      onControlsChange(newControls);

      // Make the API call through our proxy
      const response = await fetch('/api/wildfire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(scenarioData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Fire Scenario 4: Wildfire API response:', data);
      
      // Call the parent callback with the response
      onWildfireApiResponse(data);
      
    } catch (error) {
      console.error('Fire Scenario 4: Error calling wildfire API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onWildfireApiResponse(null, errorMessage);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header with close button */}
      {onClose && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-teal-500 via-cyan-600 to-teal-700 shrink-0">
          <h2 className="font-semibold text-white">Environmental Parameters</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="hidden md:flex h-8 w-8 text-white hover:bg-teal-800/50">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 flex flex-col p-3 md:p-4 lg:p-4 bg-background text-foreground text-white shadow-sm border border-border/50 rounded-lg overflow-hidden">
        
        {/* Section 1: Location & Date - Fixed at top */}
        {onStateChange && onCountyChange && onDateChange && onWildfireApiResponse && (
          <div className="shrink-0 mb-3 pb-3 border-b border-border/50">
            <h2 className="text-sm md:text-base font-semibold mb-3">1. Select Location & Date</h2>
            <SearchDropdowns
              onStateChange={onStateChange}
              onCountyChange={onCountyChange}
              onDateChange={onDateChange}
              environmentalParameters={controls}
              onWildfireApiResponse={onWildfireApiResponse}
            />
          </div>
        )}

        {/* Section 2: Environmental Parameters */}
        <h2 className="text-sm md:text-base font-semibold mb-2 shrink-0">2. Adjust Environmental Parameters</h2>
        
        {/* Scrollable variables area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1 md:space-y-1.5 lg:space-y-2" data-tour="environmental-params">
          {/* Prefire Fuel */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Prefire Fuel</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('prefireFuel').toFixed(1)}%</span>
              </div>
              <Slider
                id="prefire-fuel"
                min={0}
                max={100}
                step={getPercentageStep('prefireFuel')}
                value={[getDisplayValue('prefireFuel')]}
                onValueChange={(value: number[]) => updateControl('prefireFuel', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {/* Cover Type */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Cover Type</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('coverType').toFixed(1)}%</span>
              </div>
              <Slider
                id="cover-type"
                min={0}
                max={100}
                step={getPercentageStep('coverType')}
                value={[getDisplayValue('coverType')]}
                onValueChange={(value: number[]) => updateControl('coverType', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {/* Temperature (tmmn_value) */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Temperature</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('temperature').toFixed(1)}%</span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={100}
                step={getPercentageStep('temperature')}
                value={[getDisplayValue('temperature')]}
                onValueChange={(value: number[]) => updateControl('temperature', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {/* Humidity (rmax_value) */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Humidity</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('humidity').toFixed(1)}%</span>
              </div>
              <Slider
                id="humidity"
                min={0}
                max={100}
                step={getPercentageStep('humidity')}
                value={[getDisplayValue('humidity')]}
                onValueChange={(value: number[]) => updateControl('humidity', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {/* Fuel Moisture Class */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Fuel Moisture Class</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('dryness').toFixed(1)}%</span>
              </div>
              <Slider
                id="dryness"
                min={0}
                max={100}
                step={getPercentageStep('dryness')}
                value={[getDisplayValue('dryness')]}
                onValueChange={(value: number[]) => updateControl('dryness', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {/* Duff Fraction */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Duff Layer Fraction</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('duffFraction').toFixed(1)}%</span>
              </div>
              <Slider
                id="duff-fraction"
                min={0}
                max={100}
                step={getPercentageStep('duffFraction')}
                value={[getDisplayValue('duffFraction')]}
                onValueChange={(value: number[]) => updateControl('duffFraction', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {/* Coarse Woody Debris Fraction */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Coarse Woody Debris Fraction</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('coarseWoodyDebris').toFixed(1)}%</span>
              </div>
              <Slider
                id="woody-debris"
                min={0}
                max={100}
                step={getPercentageStep('coarseWoodyDebris')}
                value={[getDisplayValue('coarseWoodyDebris')]}
                onValueChange={(value: number[]) => updateControl('coarseWoodyDebris', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {/* Solar Radiation Value */}
          <Card className="p-0">
            <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs md:text-sm lg:text-sm font-medium">Solar Radiation Value</span>
                <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{getDisplayValue('solarRadiation').toFixed(1)}%</span>
              </div>
              <Slider
                id="solar-radiation"
                min={0}
                max={100}
                step={getPercentageStep('solarRadiation')}
                value={[getDisplayValue('solarRadiation')]}
                onValueChange={(value: number[]) => updateControl('solarRadiation', value[0])}
                className="w-full"
              />
            </CardContent>
          </Card>
          {showAdvanced && (
            <div className="space-y-1 md:space-y-1.5 lg:space-y-2 mt-2">
              {Object.entries(ADVANCED_FIELD_META).map(([key, meta]) => {
                // Skip burn_source and burnday_source from UI display
                if (key === 'burn_source' || key === 'burnday_source') {
                  return null;
                }
                
                const actualVal = controls[key as keyof GraphsControlsState] as number | undefined;
                const percentageVal = actualVal !== undefined ? 
                  actualValueToPercentage(key as ParameterKey, actualVal) : 50;
                const step = getPercentageStep(key as ParameterKey);
                
                // Special handling for month parameter to show actual month names
                const isMonthParam = key === 'month';
                const getMonthName = (monthNum: number): string => {
                  const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  return monthNames[monthNum - 1] || 'June'; // Default to June if invalid
                };
                
                // Special handling for season parameter to show actual season names
                const isSeasonParam = key === 'season';
                const getSeasonName = (seasonNum: number): string => {
                  const seasonNames = {
                    1: 'Winter',
                    2: 'Spring', 
                    3: 'Summer',
                    4: 'Fall'
                  };
                  return seasonNames[seasonNum as keyof typeof seasonNames] || 'Spring'; // Default to Spring if invalid
                };
                
                const displayValue = isMonthParam ? 
                  (actualVal !== undefined ? getMonthName(actualVal) : 'June') : 
                  isSeasonParam ? 
                  (actualVal !== undefined ? getSeasonName(actualVal) : 'Spring') :
                  `${percentageVal.toFixed(1)}%`;
                
                return (
                  <Card key={key} className="p-0">
                    <CardContent className="px-2 md:px-3 lg:px-3 py-1 md:py-1.5 lg:py-1.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs md:text-sm lg:text-sm font-medium">{meta.label}</span>
                        <span className="text-xs md:text-xs lg:text-xs text-muted-foreground font-mono">{displayValue}</span>
                      </div>
                      <Slider
                        id={`adv-${key}`}
                        min={isMonthParam ? 1 : isSeasonParam ? 1 : 0}
                        max={isMonthParam ? 12 : isSeasonParam ? 4 : 100}
                        step={isMonthParam || isSeasonParam ? 1 : step}
                        value={isMonthParam || isSeasonParam ? [actualVal || (isMonthParam ? 6 : 2)] : [percentageVal]}
                        onValueChange={(value: number[]) => {
                          if (isMonthParam || isSeasonParam) {
                            // For month and season, directly use the slider value
                            onControlsChange({ ...controls, [key]: value[0] } as GraphsControlsState);
                          } else {
                            // For other parameters, convert from percentage
                            const actualValue = percentageToActualValue(key as ParameterKey, value[0]);
                            const finalValue = meta.integer ? Math.round(actualValue) : actualValue;
                            onControlsChange({ ...controls, [key]: finalValue } as GraphsControlsState);
                          }
                        }}
                        className="w-full"
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/70 font-mono">
                        {isMonthParam ? (
                          <>
                            <span>January</span>
                            <span>December</span>
                          </>
                        ) : isSeasonParam ? (
                          <>
                            <span>Winter</span>
                            <span>Fall</span>
                          </>
                        ) : (
                          <>
                            <span>0%</span>
                            <span>100%</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Sticky footer area (outside scroll) - Fixed at bottom */}
        <div className="shrink-0 pt-2 space-y-1 md:space-y-1 lg:space-y-1.5 border-t border-border/50 mt-2">
          {/* Tailwind-only button with no hover effects */}
          <button
            type="button"
            className="w-full h-7 md:h-8 lg:h-8 px-2 md:px-3 lg:px-3 rounded-md border border-border bg-transparent text-white text-foreground text-xs md:text-sm lg:text-sm font-medium shadow-none focus:outline-none focus:ring-0 transition-none"
            onClick={() => setShowAdvanced(v => !v)}
          >
            {showAdvanced ? 'Hide more input variables' : 'See more input variables'}
          </button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-7 md:h-8 lg:h-8 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 text-xs md:text-sm lg:text-sm" 
            onClick={handleReset}
            data-tour="reset-button"
          >
            Reset All Parameters
          </Button>
          
          {/* Fire buttons row */}
          <div className="grid grid-cols-4 gap-1 md:gap-1.5 lg:gap-2" data-tour="flame-buttons">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 md:h-8 lg:h-8 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 flex items-center justify-center" 
              onClick={handleFireScenario1}
              disabled={loadingScenario !== null}
            >
              {loadingScenario === 1 ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span className="text-xs">🔥</span>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 md:h-8 lg:h-8 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 flex items-center justify-center" 
              onClick={handleFireScenario2}
              disabled={loadingScenario !== null}
            >
              {loadingScenario === 2 ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <div className="flex items-center justify-center">
                  <span className="text-xs mr-0.5">🔥</span>
                  <span className="text-xs">🔥</span>
                </div>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 md:h-8 lg:h-8 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 flex items-center justify-center" 
              onClick={handleFireScenario3}
              disabled={loadingScenario !== null}
            >
              {loadingScenario === 3 ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <div className="flex items-center justify-center">
                  <span className="text-xs mr-0.5">🔥</span>
                  <span className="text-xs mr-0.5">🔥</span>
                  <span className="text-xs">🔥</span>
                </div>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 md:h-8 lg:h-8 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 flex items-center justify-center" 
              onClick={handleFireScenario4}
              disabled={loadingScenario !== null}
            >
              {loadingScenario === 4 ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span className="text-lg md:text-xl lg:text-2xl">🔥</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Advanced input metadata (dtype + ranges from provided table)
const ADVANCED_FIELD_META: Record<string, { label: string; min?: number; max?: number; step?: number; integer?: boolean } > = {
  // longitude and latitude intentionally hidden from UI per request
  day_of_year_sin: { label: 'Seasonal Cycle (Sine)', min: -0.999999, max: 0.999986, step: 0.000001 },
  day_of_year_cos: { label: 'Seasonal Cycle (Cosine)', min: -0.999979, max: 1.0, step: 0.000001 },
  fm1000_value: { label: '1000-hr Fuel Moisture', min: 2.2, max: 36.700001, step: 0.1 },
  fm100_value: { label: '100-hr Fuel Moisture', min: 1.43, max: 29.5, step: 0.01 },
  bi_value: { label: 'Burning Index', min: 0.0, max: 171.0, step: 0.1 },
  month: { label: 'Month', min: 1, max: 12, step: 1, integer: true },
  season: { label: 'Season', min: 1, max: 4, step: 1, integer: true },
  th_value: { label: 'Temperature Humidity Index', min: 0.0, max: 360.0, step: 0.1 },
  burn_source: { label: 'Burn Source', min: 1, max: 4, step: 1, integer: true },
  rmin_value: { label: 'Minimum Relative Humidity', min: 0.7, max: 100.0, step: 0.1 },
  vs_value: { label: 'VS Value', min: 0.4, max: 18.4, step: 0.1 },
  burnday_source: { label: 'Burnday Source', min: 12, max: 81, step: 1, integer: true },
  vpd_value: { label: 'VPD Value', min: 0.0, max: 6.91, step: 0.01 },
  sph_value: { label: 'SPH Value', min: 0.0, max: 0.0232, step: 0.0001 },
  pet_value: { label: 'PET Value', min: 0.0, max: 16.5, step: 0.1 },
  BSEV: { label: 'BSEV', min: 0, max: 6, step: 1, integer: true },
  // Removed override fields from UI per request
  fuelcode: { label: 'Fuel Code', min: 0, max: 2950, step: 1, integer: true }
};