/**
 * Service functions for emissions API integration
 */

import type { EmissionsData, EmissionsApiResponse, EmissionsApiError } from '@/types/emissions';

// Use our local API route to avoid CORS issues
const EMISSIONS_API_ENDPOINT = '/api/emissions';

/**
 * Make a GET request to the emissions sample API
 * @returns Promise resolving to the API response with 5000 sample emissions
 */
export async function callEmissionsApi(): Promise<EmissionsApiResponse> {
  try {
    console.log('🌐 Calling emissions sample API...');

    // Make the API call through our proxy (no parameters needed)
    const response = await fetch(EMISSIONS_API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
    });

    console.log('📡 API response status:', response.status, response.statusText);

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      
      try {
        const errorJson = JSON.parse(errorText) as EmissionsApiError;
        errorMessage = errorJson.error || `API request failed with status ${response.status}`;
      } catch {
        errorMessage = `API request failed with status ${response.status}: ${errorText}`;
      }
      
      console.error('❌ API Error:', errorMessage);
      throw new Error(errorMessage);
    }

    // Parse and return the response
    const data: EmissionsApiResponse = await response.json();
    
    console.log('✅ Emissions API response received:', {
      message: data.message,
      eventCount: data.events?.length,
      hasEvents: !!data.events
    });
    
    return data;

  } catch (error) {
    console.error('💥 Error calling emissions API:', error);
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred while calling emissions API');
    }
  }
}

/**
 * Get a human-readable summary of the API call
 * @returns Formatted summary string
 */
export function getEmissionsParameterSummary(): string {
  return `
Emissions Data Request:
• Sample: 5000 records
• Source: External Emissions Sample API
  `.trim();
}