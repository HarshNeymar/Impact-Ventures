import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to prevent static generation timeouts
export const dynamic = 'force-dynamic';

// Backend base URL. Defaults to production so deployed behaviour is unchanged;
// set WILDFIRE_API_BASE_URL (e.g. http://localhost:8080) to test against a local API.
const WILDFIRE_API_BASE_URL = process.env.WILDFIRE_API_BASE_URL || 'https://wildfire-api-575281815403.us-central1.run.app';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    console.log('🔥 API Route: Received unified chat request:', {
      timestamp: new Date().toISOString(),
      hasFireData: !!body.fire_data,
      hasEmissionsData: !!body.emissions_data,
      query: body.query,
      sessionId: body.session_id
    });

    console.log('🔥 API Route: Making request to unified endpoint:', `${WILDFIRE_API_BASE_URL}/api/orchestrator/chat`);

    // Make the request to the unified orchestrator endpoint
    const response = await fetch(`${WILDFIRE_API_BASE_URL}/api/orchestrator/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Unified chat API response status:', response.status, response.statusText);

    // Check if the response is ok before trying to parse JSON
    if (!response.ok) {
      console.error('Unified chat API HTTP error:', response.status, response.statusText);
      
      // Try to get error details
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText;
          }
        }
      } catch (textError) {
        console.error('Failed to read error response:', textError);
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Parse and return the response
    const data = await response.json();
    console.log('🔥 API Route: External API response received:', {
      timestamp: new Date().toISOString(),
      responseData: JSON.stringify(data, null, 2),
      hasAnswer: !!data.answer,
      answerLength: data.answer?.length || 0,
      sessionId: data.session_id
    });
    
    console.log('🔥 API Route: Returning successful response to client');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in unified chat API proxy:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process chat request',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
