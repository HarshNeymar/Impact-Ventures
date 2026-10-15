"use client";

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wind, Flame, Clock, Activity, CheckCircle, X, Info } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  unit?: string;
  status?: string;
  icon: React.ReactNode;
  color: 'red' | 'orange' | 'purple' | 'blue' | 'green';
  tooltip?: string;
}

function KPICard({ title, value, unit, status, icon, color, tooltip, openKey, setOpenKey }: KPICardProps & { openKey?: string | null; setOpenKey?: (k: string | null) => void }) {
  const colorClasses = {
    red: {
      border: 'border-l-red-500',
      icon: 'text-red-500',
      value: 'text-gray-900'
    },
    orange: {
      border: 'border-l-orange-500',
      icon: 'text-orange-500',
      value: 'text-gray-900'
    },
    purple: {
      border: 'border-l-purple-500',
      icon: 'text-purple-500',
      value: 'text-gray-900'
    },
    blue: {
      border: 'border-l-blue-500',
      icon: 'text-blue-500',
      value: 'text-gray-900'
    },
    green: {
      border: 'border-l-green-500',
      icon: 'text-green-500',
      value: 'text-gray-900'
    }
  };

  const classes = colorClasses[color];

  const cardContent = (
    <Card className={`p-2 bg-white border ${classes.border} border-l-4 cursor-help h-full min-h-[75px] flex flex-col`}>
      <div className="flex items-start justify-between flex-1">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className={`${classes.icon}`}>
              {icon}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {title}
              {tooltip && <Info className="w-3 h-3 opacity-50" />}
            </h3>
          </div>
          
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-2xl font-bold ${classes.value}`}>
              {value}
            </span>
            {unit && (
              <span className="text-base font-medium text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          
          <div className="mt-auto min-h-[20px]">
            {status && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {status}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (tooltip) {
    const isOpen = openKey === title;
    const [cardRect, setCardRect] = useState<DOMRect | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isOpen && cardRef.current) {
        setCardRect(cardRef.current.getBoundingClientRect());
      }
    }, [isOpen]);

    return (
      <div className="w-full" ref={cardRef}>
        <div className="w-full" onClick={() => setOpenKey?.(isOpen ? null : title)}>
          {cardContent}
        </div>
        {isOpen && cardRect && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed z-[99999] w-80 max-w-[90vw] p-3 text-sm bg-gray-900 text-white border border-gray-700 rounded-md shadow-xl whitespace-normal break-words"
            style={{
              left: `${cardRect.left + cardRect.width / 2}px`,
              top: `${cardRect.top - 8}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="space-y-1">
              <div className="font-semibold text-white">{title}</div>
              <div className="text-gray-300 leading-relaxed">{tooltip}</div>
            </div>
            <div 
              className="absolute left-1/2 transform -translate-x-1/2"
              style={{ top: '100%' }}
            >
              <div className="border-[6px] border-transparent border-t-gray-900"></div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return cardContent;
}
interface KPICardsProps {
  data?: {
    input?: any;
    imputed?: {
      risk: number;
      vs_value?: number;
      bi_value?: number;
      BSEV?: number;
      [key: string]: any;
    };
    predictions?: {
      duration: number;
      end_tomorrow_prob?: number;
      end_tomorrow_label?: number;
    };
  };
  showEmptyState?: boolean;
}

export function KPICards(props: KPICardsProps) {
  const { data, showEmptyState = false } = props;
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click-away handler: close any open tooltip when clicking outside the KPI grid
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpenTooltip(null);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);
  // Use API response if available, otherwise fallback to mock data
  const defaultData = {
    imputed: {
      risk: 4.0,
      vs_value: 3.2,
      bi_value: 50.3
    },
    predictions: {
      duration: 0.0,
      end_tomorrow_label: 0
    }
  };

  // State for KPI data
  const [kpiData, setKpiData] = useState<any>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasStoredData, setHasStoredData] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // On mount, load from localStorage if available (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);
  

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const stored = localStorage.getItem('kpiData');
          if (stored) {
        try {
          const parsedData = JSON.parse(stored);
          // Only use localStorage data if no fresh props data is available
          if (!data || (!data.imputed && !data.predictions)) {
            setKpiData(parsedData);
            setHasStoredData(true);
          }
        } catch {}
      }
      setIsLoaded(true);
    }
  }, [data, isMounted]);
  

  // Persist & update KPI data whenever new API data arrives (even if values are identical)
  // This avoids stale UI when consecutive calls return the same numeric values.
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined' && data && (data.imputed || data.predictions)) {
      console.log('Updating kpiData with fresh data:', data);
      console.log('Fresh API risk value:', data.imputed?.risk);
      const enriched = { 
        ...data, 
        _ts: Date.now(),
        // Ensure imputed object is properly copied
        imputed: data.imputed ? { ...data.imputed } : {},
        predictions: data.predictions ? { ...data.predictions } : {}
      };
      console.log('Enriched data with timestamp:', enriched._ts);
      setKpiData(enriched);
      setHasStoredData(true);
      // Clear localStorage first, then set new data
      try { 
        localStorage.removeItem('kpiData');
        localStorage.setItem('kpiData', JSON.stringify(enriched)); 
      } catch {}
    }
  }, [data, isMounted]);

  // Use fresh props data if available, otherwise fall back to kpiData (localStorage)
  const riskValue = data?.imputed?.risk ?? kpiData.imputed?.risk ?? defaultData.imputed.risk;
  // Truncate to one decimal place without rounding (3.9547... becomes 3.9)
  const displayRisk = (Math.floor(riskValue * 10) / 10).toFixed(1);

  // Debug logging - more detailed
  console.log('KPICards Debug:', {
    propsData: data,
    propsDataImputedRisk: data?.imputed?.risk,
    kpiData: kpiData,
    kpiDataImputedRisk: kpiData.imputed?.risk,
    riskValue: riskValue,
    riskValueType: typeof riskValue,
    mathFloorCalculation: Math.floor(riskValue * 10),
    mathFloorDivided: Math.floor(riskValue * 10) / 10,
    displayRisk: displayRisk,
    hasStoredData: hasStoredData,
    dataKeys: data ? Object.keys(data) : 'no data',
    kpiDataKeys: kpiData ? Object.keys(kpiData) : 'no kpiData',
    localStorageKpiData: typeof window !== 'undefined' ? localStorage.getItem('kpiData') : 'N/A'
  });

  // Empty state component
  function EmptyKPICard({ title, icon, color, tooltip, openKey, setOpenKey }: { title: string; icon: React.ReactNode; color: 'red' | 'orange' | 'purple' | 'blue' | 'green'; tooltip?: string; openKey?: string | null; setOpenKey?: (k: string | null) => void }) {
    const colorClasses = {
      red: { border: 'border-l-red-500', icon: 'text-red-500' },
      orange: { border: 'border-l-orange-500', icon: 'text-orange-500' },
      purple: { border: 'border-l-purple-500', icon: 'text-purple-500' },
      blue: { border: 'border-l-blue-500', icon: 'text-blue-500' },
      green: { border: 'border-l-green-500', icon: 'text-green-500' }
    };
    
    const classes = colorClasses[color];
    
    const cardContent = (
      <Card className={`p-3 bg-white border ${classes.border} border-l-4 cursor-help h-full min-h-[110px] flex flex-col`}>
        <div className="flex items-start justify-between flex-1">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className={`${classes.icon}`}>
                {icon}
              </div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                {title}
                {tooltip && <Info className="w-3 h-3 opacity-50" />}
              </h3>
            </div>
            
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-300">
                0.0
              </span>
            </div>
            
            <div className="mt-auto min-h-[20px]">
            </div>
          </div>
        </div>
      </Card>
    );

    if (tooltip) {
      const isOpen = openKey === title;
      const [cardRect, setCardRect] = useState<DOMRect | null>(null);
      const cardRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (isOpen && cardRef.current) {
          setCardRect(cardRef.current.getBoundingClientRect());
        }
      }, [isOpen]);

      return (
        <div className="w-full" ref={cardRef}>
          <div className="w-full" onClick={() => setOpenKey?.(isOpen ? null : title)}>
            {cardContent}
          </div>
          {isOpen && cardRect && typeof window !== 'undefined' && createPortal(
            <div 
              className="fixed z-[99999] w-80 max-w-[90vw] p-3 text-sm bg-gray-900 text-white border border-gray-700 rounded-md shadow-xl whitespace-normal break-words"
              style={{
                left: `${cardRect.left + cardRect.width / 2}px`,
                top: `${cardRect.top - 8}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="space-y-1">
                <div className="font-semibold text-white">{title}</div>
                <div className="text-gray-300 leading-relaxed">{tooltip}</div>
              </div>
              <div 
                className="absolute left-1/2 transform -translate-x-1/2"
                style={{ top: '100%' }}
              >
                <div className="border-[6px] border-transparent border-t-gray-900"></div>
              </div>
            </div>,
            document.body
          )}
        </div>
      );
    }

    return cardContent;
  }

  // Only show empty state if explicitly requested AND we don't have stored data
  if (showEmptyState && !hasStoredData) {
    return (
      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <EmptyKPICard
            title="Current Risk Level"
            icon={<Flame className="w-5 h-5" />}
            color="red"
            tooltip="Wildfire risk assessment on a scale of 1.8 to 6.4, calculated using environmental factors like fuel load, weather conditions, and terrain. Higher values indicate greater fire danger and potential for rapid spread."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
          
          <EmptyKPICard
            title="Wind Speed"
            icon={<Wind className="w-5 h-5" />}
            color="blue"
            tooltip="Current wind speed in miles per hour (0.4-18.4 mph range). Wind is critical for fire behavior as it affects fire spread rate, direction, and intensity. Higher winds can rapidly escalate fire danger."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
          
          <EmptyKPICard
            title="Fire Duration"
            icon={<Clock className="w-5 h-5" />}
            color="purple"
            tooltip="Predicted number of days the fire will continue burning based on current conditions, fuel availability, weather patterns, and suppression efforts. Helps with resource planning and evacuation timing."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />

          <EmptyKPICard
            title="Ends Tomorrow"
            icon={<X className="w-5 h-5" />}
            color="red"
            tooltip="Machine learning prediction indicating whether the fire is likely to be contained or naturally extinguished within 24 hours. Based on weather forecasts, fuel consumption, and current fire behavior patterns."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
          
          <EmptyKPICard
            title="Burning Index"
            icon={<Activity className="w-5 h-5" />}
            color="orange"
            tooltip="Composite measure of fire behavior potential (0-171 scale) combining fuel moisture, wind speed, and atmospheric conditions. Higher values indicate more intense fire behavior and difficulty in suppression."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
      </div>
    );
  }

  // During SSR or before component is mounted, show the same structure but with default data
  if (!isMounted) {
    return (
      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KPICard
            title="Current Risk Level"
            value="4.0"
            unit="/10"
            icon={<Flame className="w-5 h-5" />}
            color="red"
            tooltip="Wildfire risk assessment on a scale of 1.8 to 6.4, calculated using environmental factors like fuel load, weather conditions, and terrain. Higher values indicate greater fire danger and potential for rapid spread."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
          
          <KPICard
            title="Wind Speed"
            value="3.20"
            unit="mph"
            icon={<Wind className="w-5 h-5" />}
            color="blue"
            tooltip="Current wind speed in miles per hour (0.4-18.4 mph range). Wind is critical for fire behavior as it affects fire spread rate, direction, and intensity. Higher winds can rapidly escalate fire danger."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
          
          <KPICard
            title="Fire Duration"
            value="0.0"
            unit="days"
            icon={<Clock className="w-5 h-5" />}
            color="purple"
            tooltip="Predicted number of days the fire will continue burning based on current conditions, fuel availability, weather patterns, and suppression efforts. Helps with resource planning and evacuation timing."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />

          <KPICard
            title="Ends Tomorrow"
            value="No"
            icon={<X className="w-5 h-5" />}
            color="red"
            tooltip="Machine learning prediction indicating whether the fire is likely to be contained or naturally extinguished within 24 hours. Based on weather forecasts, fuel consumption, and current fire behavior patterns."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
          
          <KPICard
            title="Burning Index"
            value="50"
            unit="/171"
            icon={<Activity className="w-5 h-5" />}
            color="orange"
            tooltip="Composite measure of fire behavior potential (0-171 scale) combining fuel moisture, wind speed, and atmospheric conditions. Higher values indicate more intense fire behavior and difficulty in suppression."
            openKey={openTooltip}
            setOpenKey={setOpenTooltip}
          />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          title="Current Risk Level"
          value={displayRisk}
          unit="/10"
          icon={<Flame className="w-5 h-5" />}
          color="red"
          tooltip="Wildfire risk assessment on a scale of 1.8 to 6.4, calculated using environmental factors like fuel load, weather conditions, and terrain. Higher values indicate greater fire danger and potential for rapid spread."
          openKey={openTooltip}
          setOpenKey={setOpenTooltip}
        />
        
        <KPICard
          title="Wind Speed"
          value={(
            Math.min(
              Math.max(kpiData.imputed?.vs_value ?? 3.2, 0.4),
              18.4
            )
          ).toFixed(2)}
          unit="mph"
          icon={<Wind className="w-5 h-5" />}
          color="blue"
          tooltip="Current wind speed in miles per hour (0.4-18.4 mph range). Wind is critical for fire behavior as it affects fire spread rate, direction, and intensity. Higher winds can rapidly escalate fire danger."
          openKey={openTooltip}
          setOpenKey={setOpenTooltip}
        />
        
        <KPICard
          title="Fire Duration"
          value={Math.max(0, (kpiData.predictions?.duration ?? defaultData.predictions.duration)).toFixed(1)}
          unit="days"
          icon={<Clock className="w-5 h-5" />}
          color="purple"
          tooltip="Predicted number of days the fire will continue burning based on current conditions, fuel availability, weather patterns, and suppression efforts. Helps with resource planning and evacuation timing."
          openKey={openTooltip}
          setOpenKey={setOpenTooltip}
        />

        <KPICard
          title="Ends Tomorrow"
          value={kpiData.predictions?.end_tomorrow_label === 1 ? "Yes" : "No"}
          icon={kpiData.predictions?.end_tomorrow_label === 1 ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
          color={kpiData.predictions?.end_tomorrow_label === 1 ? "green" : "red"}
          tooltip="Machine learning prediction indicating whether the fire is likely to be contained or naturally extinguished within 24 hours. Based on weather forecasts, fuel consumption, and current fire behavior patterns."
          openKey={openTooltip}
          setOpenKey={setOpenTooltip}
        />
        
        <KPICard
          title="Burning Index"
          value={(
            Math.min(
              Math.max(kpiData.imputed?.bi_value ?? 50.3, 0.0),
              171.0
            )
          ).toString()}
          unit="/171"
          icon={<Activity className="w-5 h-5" />}
          color="orange"
          tooltip="Composite measure of fire behavior potential (0-171 scale) combining fuel moisture, wind speed, and atmospheric conditions. Higher values indicate more intense fire behavior and difficulty in suppression."
          openKey={openTooltip}
          setOpenKey={setOpenTooltip}
        />
    </div>
  );
}