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
    
    console.log('Proxying wildfire API request:', JSON.stringify(body, null, 2));

    // Make the request to the external API
    const response = await fetch(`${WILDFIRE_API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Wildfire API response status:', response.status, response.statusText);
    console.log('Wildfire API response headers:', Object.fromEntries(response.headers.entries()));

    // Check if the response is ok before trying to parse JSON
    if (!response.ok) {
      console.error('Wildfire API HTTP error:', response.status, response.statusText);
      
      // Try to get error details, but handle non-JSON responses
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          // Try to parse as JSON first
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            // If not JSON, use the raw text
            errorMessage = errorText;
          }
        }
      } catch (textError) {
        console.error('Failed to read error response:', textError);
      }

      return NextResponse.json(
        { 
          error: 'Wildfire API request failed',
          details: errorMessage,
          status_code: response.status 
        },
        { status: response.status }
      );
    }

    // Get the response text first, then try to parse as JSON
    const responseText = await response.text();
    
    if (!responseText) {
      console.error('Empty response from wildfire API');
      return NextResponse.json(
        { 
          error: 'Empty response from wildfire API',
          details: 'The API returned an empty response',
          status_code: 500 
        },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse wildfire API response as JSON:', parseError);
      console.error('Response text:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from wildfire API',
          details: `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
          status_code: 502,
          raw_response: responseText.substring(0, 200) // Include first 200 chars for debugging
        },
        { status: 502 }
      );
    }

    console.log('Wildfire API success:', data);

    // Return the response with proper CORS headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error proxying wildfire API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        status_code: 500
      },
      { status: 500 }
    );
  }
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}