import React from 'react';
import { LEGEND_GRADIENT, legendTicks } from '@/lib/utils/aqCloudLayer';

const TICK_POSITIONS = [0, 16.7, 33.3, 50, 66.7, 100];

function formatTons(value: number) {
  if (value < 1000) return Math.round(value).toString();
  const k = value / 1000;
  return `${k < 10 ? k.toFixed(1) : Math.round(k)}k`;
}

export function AirPollutionLegend({ domainMax }: { domainMax: number }) {
  const ticks = legendTicks(domainMax);

  return (
    <div className="absolute bottom-3 left-3 z-10 w-[320px] rounded-lg bg-white/[0.94] px-4 py-3 text-slate-800 shadow-md">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider">Pollutant Emissions (tons)</div>
      <div className="h-3 rounded-sm border border-slate-200" style={{ background: LEGEND_GRADIENT }} />
      <div className="relative mt-1 h-4 text-[11px] text-slate-600">
        {ticks.map((value, i) => {
          const last = i === ticks.length - 1;
          const align = i === 0 ? '' : last ? '-translate-x-full' : '-translate-x-1/2';
          return (
            <span key={i} className={`absolute ${align}`} style={{ left: `${TICK_POSITIONS[i]}%` }}>
              {formatTons(value)}{last ? '+' : ''}
            </span>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-600">
        <span>Low emissions</span>
        <span>High emissions</span>
      </div>
    </div>
  );
}
