import { NextResponse } from 'next/server';
import countiesData from '@/lib/counties-optimized.json';
import { states } from 'states-us';

// Force dynamic rendering to prevent static generation timeouts
export const dynamic = 'force-dynamic';

// Process data immediately when module loads to cache it
const stateNameToAbbrev: { [name: string]: string } = {};
states.forEach((state: any) => {
  stateNameToAbbrev[state.name] = state.abbreviation;
});

const countiesByState: { [state: string]: string[] } = {};
const allCounties: string[] = [];

// Process data once on module load
countiesData.forEach((county: { name: string; state: string }) => {
  if (!countiesByState[county.state]) {
    countiesByState[county.state] = [];
  }
  countiesByState[county.state].push(county.name);
  allCounties.push(county.name);
});

// Sort counties within each state
Object.keys(countiesByState).forEach(state => {
  countiesByState[state].sort();
});
allCounties.sort();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const stateName = searchParams.get('state');

  if (!search) {
    return NextResponse.json([]);
  }
  
  // Convert state name to abbreviation if provided
  const stateAbbrev = stateName ? stateNameToAbbrev[stateName] : null;
  
  // If state is provided, filter by state first (much faster)
  const sourceCounties = stateAbbrev && countiesByState[stateAbbrev] 
    ? countiesByState[stateAbbrev] 
    : allCounties;

  const filteredCounties = sourceCounties.filter((county: string) =>
    county.toLowerCase().includes(search.toLowerCase())
  );

  return NextResponse.json(filteredCounties.slice(0, 10));
}
