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
    
    console.log('🤖 API Route: Received ML query request:', {
      timestamp: new Date().toISOString(),
      requestBody: JSON.stringify(body, null, 2),
      query: body.query,
      sessionId: body.session_id
    });

    console.log('🤖 API Route: Making request to external API:', `${WILDFIRE_API_BASE_URL}/api/ai-assistant/query`);

    // Make the request to the external API
    const response = await fetch(`${WILDFIRE_API_BASE_URL}/api/ai-assistant/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('ML query API response status:', response.status, response.statusText);

    // Check if the response is ok before trying to parse JSON
    if (!response.ok) {
      console.error('ML query API HTTP error:', response.status, response.statusText);
      
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
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Parse and return the response
    const data = await response.json();
    
    console.log('🤖 API Route: ML query successful:', {
      hasSessionId: !!data.session_id,
      answerLength: data.answer?.length || 0,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in ML query API route:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
