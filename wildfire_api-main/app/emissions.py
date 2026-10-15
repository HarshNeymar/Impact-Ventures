from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any
from google.cloud import bigquery
from pydantic import BaseModel
import pandas as pd
import gcsfs
import json
import logging
import threading
import os
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
bq_client = bigquery.Client()

# Global session store for emissions conversations
emissions_session_store: Dict[str, Dict] = {}
emissions_session_lock = threading.Lock()

# Session TTL (Time To Live)
EMISSIONS_SESSION_TTL_HOURS = 24

# LLM Configuration
from app import DEFAULT_LLM_MODEL
LLM_MODEL = DEFAULT_LLM_MODEL

# Initialize Gemini API
api_key = os.getenv("GOOGLE_AI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    logger.info("Google Gemini AI configured for emissions analysis")

SAMPLE_JSON_PATH = "data_housee/wildfire_ml_models/ml_charts/wildfire_emissions_sample.json"
TABLE = "code-for-planet.data_housee.wildfire_event_emissions_clean"


# ============================================================================
# PYDANTIC MODELS FOR EMISSIONS ANALYSIS
# ============================================================================

class EmissionEventData(BaseModel):
    """Model for emission event data"""
    lat: float
    lng: float
    state: str
    county: str
    year: int
    fire_type: str
    duration_days: float
    spatial_extent_km: float
    fire_size: float
    fire_size_category: str
    emission_value: float
    total_emissions: float
    emission_intensity: str
    size_category: str
    emissions: Dict[str, float]  # co2, ch4, co, pm2_5


class EmissionsAnalysisRequest(BaseModel):
    """Request model for emissions analysis"""
    emission_data: Optional[EmissionEventData] = None
    query: Optional[str] = "Analyze these wildfire emissions"
    session_id: Optional[str] = None  # For follow-up questions


class EmissionsAnalysisResponse(BaseModel):
    """Response model for emissions analysis"""
    session_id: str
    answer: str
    sources: list[Dict[str, Any]]
    confidence_score: float
    query_type: str
    processing_time_ms: float
    is_relevant: bool = True


# ============================================================================
# SESSION MANAGEMENT FUNCTIONS
# ============================================================================

def generate_emissions_session_id(emission_data: Dict) -> str:
    """Generate unique session ID for emission data"""
    county = str(emission_data.get('county', 'unknown')).lower().replace(' ', '_')
    state = str(emission_data.get('state', 'unknown')).lower().replace(' ', '_')
    year = int(emission_data.get('year', 0))
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Format: county_state_emissions_year_timestamp
    # Example: winston_alabama_emissions_2006_20250120_143022
    session_id = f"{county}_{state}_emissions_{year}_{timestamp}"
    return session_id


def create_emissions_session(emission_data: Dict, initial_query: str, initial_answer: str) -> str:
    """Create a new emissions conversation session and return session_id"""
    session_id = generate_emissions_session_id(emission_data)

    session = {
        "session_id": session_id,
        "created_at": datetime.now(),
        "last_accessed": datetime.now(),
        "emission_data": emission_data,
        "conversation_history": [
            {
                "role": "user",
                "content": initial_query,
                "timestamp": datetime.now().isoformat()
            },
            {
                "role": "assistant",
                "content": initial_answer,
                "timestamp": datetime.now().isoformat()
            }
        ],
        "metadata": {
            "location": f"{emission_data.get('county', 'Unknown')}, {emission_data.get('state', 'Unknown')}",
            "year": emission_data.get('year', 0),
            "emission_intensity": emission_data.get('emission_intensity', 'unknown'),
            "total_emissions": emission_data.get('total_emissions', 0),
            "fire_size_category": emission_data.get('fire_size_category', 'unknown')
        }
    }

    with emissions_session_lock:
        emissions_session_store[session_id] = session

    logger.info(f"Created emissions session: {session_id} for {session['metadata']['location']}")
    return session_id


def get_emissions_session(session_id: str) -> Optional[Dict]:
    """Retrieve an emissions session by ID, checking for expiry"""
    with emissions_session_lock:
        session = emissions_session_store.get(session_id)
        if session:
            # Check if session has expired
            age = datetime.now() - session['created_at']
            if age > timedelta(hours=EMISSIONS_SESSION_TTL_HOURS):
                del emissions_session_store[session_id]
                logger.info(f"Emissions session expired and removed: {session_id}")
                return None

            # Update last accessed time
            session['last_accessed'] = datetime.now()
            return session
        return None


def add_to_emissions_conversation(session_id: str, user_query: str, assistant_answer: str) -> bool:
    """Add a conversation turn to existing emissions session"""
    with emissions_session_lock:
        session = emissions_session_store.get(session_id)
        if session:
            session['conversation_history'].extend([
                {
                    "role": "user",
                    "content": user_query,
                    "timestamp": datetime.now().isoformat()
                },
                {
                    "role": "assistant",
                    "content": assistant_answer,
                    "timestamp": datetime.now().isoformat()
                }
            ])
            session['last_accessed'] = datetime.now()
            logger.info(
                f"Added turn to emissions session {session_id}, total turns: {len(session['conversation_history']) // 2}")
            return True
        return False


def build_emissions_conversation_context(session: Dict, max_turns: int = 3) -> str:
    """Build conversation context from recent history"""
    history = session.get('conversation_history', [])
    # Get last N turns (each turn = user + assistant, so 2 messages)
    recent_messages = history[-(max_turns * 2):]

    context_lines = []
    for msg in recent_messages:
        role = msg['role'].upper()
        content = msg['content']
        context_lines.append(f"{role}: {content}")

    return "\n".join(context_lines)


def cleanup_expired_emissions_sessions() -> int:
    """Remove expired emissions sessions and return count of cleaned sessions"""
    with emissions_session_lock:
        expired = []
        for session_id, session in emissions_session_store.items():
            age = datetime.now() - session['created_at']
            if age > timedelta(hours=EMISSIONS_SESSION_TTL_HOURS):
                expired.append(session_id)

        for session_id in expired:
            del emissions_session_store[session_id]

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired emissions sessions")

        return len(expired)


# ============================================================================
# EMISSIONS ANALYSIS WITH AI
# ============================================================================

async def generate_emissions_analysis(emission_data: Dict, query: str) -> str:
    """Generate AI analysis for emission event data"""

    try:
        # Extract emission information
        emissions_dict = emission_data.get('emissions', {})

        # Calculate emission metrics
        co2 = emissions_dict.get('co2', 0)
        ch4 = emissions_dict.get('ch4', 0)
        co = emissions_dict.get('co', 0)
        pm2_5 = emissions_dict.get('pm2_5', 0)

        # Create comprehensive prompt
        prompt = f"""
Analyze this wildfire emission event and provide a direct, concise response.

EMISSION EVENT DATA:
- Location: {emission_data.get('state', 'Unknown')}, {emission_data.get('county', 'Unknown')}
- Year: {emission_data.get('year', 'N/A')}
- Fire Type: {emission_data.get('fire_type', 'N/A')}
- Duration: {emission_data.get('duration_days', 'N/A')} days
- Spatial Extent: {emission_data.get('spatial_extent_km', 'N/A')} km²
- Fire Size: {emission_data.get('fire_size', 'N/A')} acres
- Fire Size Category: {emission_data.get('fire_size_category', 'N/A')}

EMISSIONS CHARACTERISTICS:
- Emission Value: {emission_data.get('emission_value', 'N/A')} (calculated based on fire characteristics)
- Total Emissions: {emission_data.get('total_emissions', 'N/A')} (sum of all emission types)
- Emission Intensity: {emission_data.get('emission_intensity', 'N/A')} (classification: low, medium, high, very_high)
- Size Category: {emission_data.get('size_category', 'N/A')}

SPECIFIC EMISSIONS (in metric tons):
- CO2 (Carbon Dioxide): {co2:.2f}
- CH4 (Methane): {ch4:.4f}
- CO (Carbon Monoxide): {co:.2f}
- PM2.5 (Particulate Matter): {pm2_5:.4f}

EMISSION CALCULATIONS:
- Emission Value: Calculated from fire characteristics including size, duration, and spatial extent
- Total Emissions: Sum of CO2, CH4, CO, PM2.5, and other trace emissions
- Emission Intensity: Classified based on emission value relative to fire size and duration
  * Low: Minimal emissions relative to fire characteristics
  * Medium: Moderate emissions typical for fire size
  * High: Elevated emissions exceeding typical patterns
  * Very High: Exceptional emissions with significant air quality impact

USER QUESTION: {query}

Provide a direct analysis in exactly 60-80 words. Focus on:
1. The environmental impact of these emissions
2. The relationship between fire characteristics and emission levels
3. Air quality implications
4. Comparison to typical wildfire emissions if relevant

No introductory phrases. Be specific about the emission types and their impacts.
"""

        # Try different models in order of preference
        models_to_try = [
            LLM_MODEL,
            "gemini-2.5-flash",
            "gemini-2.5-pro"
        ]

        for model_name in models_to_try:
            try:
                logger.info(f"Trying model for emissions analysis: {model_name}")
                model = genai.GenerativeModel(model_name)

                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=2000,
                        temperature=0.3,
                        top_p=0.8,
                        top_k=40
                    ),
                    safety_settings=[
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
                    ]
                )

                # Check if response has valid content
                if response.candidates and response.candidates[0].content.parts:
                    logger.info(f"Successfully used model for emissions: {model_name}")
                    return response.text
                else:
                    logger.warning(f"Model {model_name} response blocked by safety filters")
                    continue

            except Exception as model_error:
                logger.warning(f"Model {model_name} failed: {model_error}")
                continue

        # If all models failed, provide a detailed fallback response
        return f"""This {emission_data.get('county', 'Unknown')}, {emission_data.get('state', 'Unknown')} wildfire ({emission_data.get('year', 'N/A')}) produced {emission_data.get('total_emissions', 'N/A')} total emissions with {emission_data.get('emission_intensity', 'unknown')} intensity. The {emission_data.get('duration_days', 'N/A')}-day fire burning across {emission_data.get('spatial_extent_km', 'N/A')} km² released {co2:.2f} tons CO2, {co:.2f} tons CO, {ch4:.4f} tons CH4, and {pm2_5:.4f} tons PM2.5. This {emission_data.get('fire_size_category', 'unknown')} fire's emissions reflect typical biomass combustion patterns for {emission_data.get('fire_type', 'unknown')} fires in this region."""

    except Exception as e:
        logger.error(f"Error generating emissions analysis: {e}")
        return f"I encountered an error while analyzing these emissions. The data shows a wildfire in {emission_data.get('state', 'unknown location')} with {emission_data.get('total_emissions', 'unknown')} total emissions and {emission_data.get('emission_intensity', 'unknown')} intensity level."


# ============================================================================
# EMISSIONS ANALYSIS ENDPOINT
# ============================================================================

@router.post("/analyze-emissions", response_model=EmissionsAnalysisResponse)
async def analyze_emissions_event(request: EmissionsAnalysisRequest):
    """Analyze specific emission event data with conversation memory support"""

    start_time = datetime.now()

    try:
        # Determine if this is a new conversation or follow-up
        existing_session = None
        conversation_context = ""

        if request.session_id:
            # This is a follow-up question
            existing_session = get_emissions_session(request.session_id)

            if existing_session:
                logger.info(f"Follow-up query for emissions session: {request.session_id}")
                # Use emission_data from session
                emission_data = existing_session['emission_data']

                # Build conversation context from history
                conversation_context = build_emissions_conversation_context(existing_session, max_turns=3)

            else:
                # Session not found or expired
                logger.warning(f"Emissions session not found: {request.session_id}")
                if not request.emission_data:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Session {request.session_id} not found or expired. Please provide emission_data for new analysis."
                    )
                # Fall back to new session with provided emission_data
                emission_data = request.emission_data.dict()
        else:
            # New conversation - emission_data is required
            if not request.emission_data:
                raise HTTPException(
                    status_code=400,
                    detail="emission_data is required for new emissions analysis"
                )
            emission_data = request.emission_data.dict()

        # Generate analysis with or without conversation context
        if conversation_context:
            # Include previous conversation in prompt
            enhanced_query = f"""Previous conversation about these emissions:
{conversation_context}

Current question: {request.query}

Please answer the current question naturally, referencing previous context when relevant. Keep your response focused and concise (60-80 words).
"""
            answer = await generate_emissions_analysis(
                emission_data=emission_data,
                query=enhanced_query
            )
        else:
            # First question - no context needed
            answer = await generate_emissions_analysis(
                emission_data=emission_data,
                query=request.query
            )

        # Create or update session
        if existing_session:
            # Add this turn to existing session
            session_id = request.session_id
            add_to_emissions_conversation(session_id, request.query, answer)
        else:
            # Create new session
            session_id = create_emissions_session(emission_data, request.query, answer)

        # Prepare response
        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        source_info = {
            "type": "emission_event",
            "location": f"{emission_data.get('county', 'Unknown')}, {emission_data.get('state', 'Unknown')}",
            "coordinates": f"({emission_data.get('lat', 'N/A')}, {emission_data.get('lng', 'N/A')})",
            "year": emission_data.get('year', 'Unknown'),
            "emission_intensity": emission_data.get('emission_intensity', 'Unknown'),
            "total_emissions": emission_data.get('total_emissions', 'Unknown'),
            "fire_type": emission_data.get('fire_type', 'Unknown'),
            "duration_days": emission_data.get('duration_days', 'Unknown'),
            "spatial_extent_km": emission_data.get('spatial_extent_km', 'Unknown')
        }

        return EmissionsAnalysisResponse(
            session_id=session_id,
            answer=answer,
            sources=[source_info],
            confidence_score=1.0,
            query_type="emissions_analysis_followup" if existing_session else "emissions_analysis",
            processing_time_ms=round(processing_time, 2),
            is_relevant=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in emissions analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Emissions analysis error: {str(e)}")


# ============================================================================
# EMISSIONS SESSION MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/emissions/sessions")
async def list_emissions_sessions():
    """List all active emissions conversation sessions"""

    # Clean up expired sessions first
    cleanup_expired_emissions_sessions()

    with emissions_session_lock:
        sessions = []
        for session_id, session in emissions_session_store.items():
            sessions.append({
                "session_id": session_id,
                "created_at": session['created_at'].isoformat(),
                "last_accessed": session['last_accessed'].isoformat(),
                "location": session['metadata']['location'],
                "year": session['metadata']['year'],
                "emission_intensity": session['metadata']['emission_intensity'],
                "age_hours": (datetime.now() - session['created_at']).total_seconds() / 3600,
                "conversation_turns": len(session['conversation_history']) // 2
            })

        # Sort by last accessed (most recent first)
        sessions.sort(key=lambda x: x['last_accessed'], reverse=True)

        return {
            "sessions": sessions,
            "total": len(sessions),
            "active_sessions": len(emissions_session_store)
        }


@router.get("/emissions/sessions/{session_id}")
async def get_emissions_session_details(session_id: str):
    """Get full details of a specific emissions conversation session"""
    session = get_emissions_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Emissions session {session_id} not found or has expired"
        )

    return {
        "session_id": session['session_id'],
        "created_at": session['created_at'].isoformat(),
        "last_accessed": session['last_accessed'].isoformat(),
        "metadata": session['metadata'],
        "conversation_history": session['conversation_history'],
        "total_turns": len(session['conversation_history']) // 2,
        "age_hours": (datetime.now() - session['created_at']).total_seconds() / 3600
    }


@router.delete("/emissions/sessions/{session_id}")
async def delete_emissions_session(session_id: str):
    """Delete a specific emissions conversation session"""
    with emissions_session_lock:
        if session_id in emissions_session_store:
            metadata = emissions_session_store[session_id]['metadata']
            del emissions_session_store[session_id]
            logger.info(f"Manually deleted emissions session: {session_id}")
            return {
                "message": "Emissions session deleted successfully",
                "session_id": session_id,
                "location": metadata['location']
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Emissions session {session_id} not found"
            )


@router.post("/emissions/sessions/cleanup")
async def manual_cleanup_emissions_sessions():
    """Manually trigger cleanup of expired emissions sessions"""
    cleaned_count = cleanup_expired_emissions_sessions()

    with emissions_session_lock:
        active_count = len(emissions_session_store)

    return {
        "message": "Emissions session cleanup completed",
        "expired_sessions_removed": cleaned_count,
        "active_sessions_remaining": active_count
    }


# ============================================================================
# EXISTING EMISSIONS ENDPOINTS (unchanged)
# ============================================================================

@router.get("/emissions")
def get_emissions(
        state: Optional[str] = Query(None),
        county: Optional[str] = Query(None),
        year: Optional[int] = Query(None),
        emission_intensity: Optional[str] = Query(None),
        size_category: Optional[str] = Query(None),
        limit: int = Query(10000, ge=1, le=1028764)
):
    """Retrieve wildfire emission events with optional filters."""

    filters = []
    params = []

    if state:
        filters.append("UPPER(state) = UPPER(@state)")
        params.append(bigquery.ScalarQueryParameter("state", "STRING", state))

    if county and state:
        filters.append("UPPER(county) LIKE UPPER(@county)")
        params.append(bigquery.ScalarQueryParameter("county", "STRING", f"%{county}%"))

    if year:
        filters.append("year = @year")
        params.append(bigquery.ScalarQueryParameter("year", "INT64", year))

    if emission_intensity and emission_intensity.lower() in ['low', 'medium', 'high', 'very_high']:
        filters.append("emission_intensity = @emission_intensity")
        params.append(bigquery.ScalarQueryParameter("emission_intensity", "STRING", emission_intensity.lower()))

    if size_category and size_category.lower() in ['small', 'medium', 'large', 'very_large']:
        filters.append("size_category = @size_category")
        params.append(bigquery.ScalarQueryParameter("size_category", "STRING", size_category.lower()))

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    # Separate queries for better reliability
    events_query = f"""
    SELECT 
        ROUND(lat, 6) as lat,
        ROUND(lon, 6) as lng,
        state,
        county,
        year,
        fire_type,
        ROUND(duration_days, 1) as duration_days,
        ROUND(spatial_extent_km, 2) as spatial_extent_km,
        ROUND(fire_size, 1) as fire_size,
        fire_size_original as fire_size_category,
        ROUND(emission_value, 2) as emission_value,
        ROUND(total_emissions, 2) as total_emissions,
        emission_intensity,
        size_category,
        ROUND(avg_eco2, 4) as co2,
        ROUND(avg_ech4, 4) as ch4,
        ROUND(avg_eco, 4) as co,
        ROUND(avg_epm2_5, 4) as pm2_5
    FROM `{TABLE}`
    {where_clause}
    ORDER BY emission_value DESC, total_emissions DESC
    LIMIT {limit}
    """

    try:
        job_config = bigquery.QueryJobConfig(query_parameters=params) if params else None
        df = bq_client.query(events_query, job_config=job_config).to_dataframe()

        if df.empty:
            return {
                "message": "No emission events found",
                "events": [],
                "count": 0,
                "summary": {}
            }

        # Convert to events list
        events = []
        for _, row in df.iterrows():
            events.append({
                "lat": row["lat"],
                "lng": row["lng"],
                "state": row["state"],
                "county": row["county"],
                "year": int(row["year"]),
                "fire_type": row["fire_type"],
                "duration_days": row["duration_days"],
                "spatial_extent_km": row["spatial_extent_km"],
                "fire_size": row["fire_size"],
                "fire_size_category": row["fire_size_category"],
                "emission_value": row["emission_value"],
                "total_emissions": row["total_emissions"],
                "emission_intensity": row["emission_intensity"],
                "size_category": row["size_category"],
                "emissions": {
                    "co2": row["co2"],
                    "ch4": row["ch4"],
                    "co": row["co"],
                    "pm2_5": row["pm2_5"]
                }
            })

        # Calculate summary
        summary = {
            "total_events": len(events),
            "total_fire_size": float(df["fire_size"].sum()),
            "avg_duration": float(df["duration_days"].mean()),
            "avg_spatial_extent": float(df["spatial_extent_km"].mean()),
            "total_emissions": float(df["total_emissions"].sum()),
            "max_emission_value": float(df["emission_value"].max()),
            "years_covered": sorted(df["year"].unique().tolist()),
            "states_covered": sorted(df["state"].unique().tolist())
        }

        return {
            "message": f"Successfully retrieved {len(events)} emission events",
            "events": events,
            "count": len(events),
            "summary": summary
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving emission data: {str(e)}")


@router.get("/emissions/sample")
def get_emissions_sample():
    """Retrieve pre-sampled 5000 wildfire emission events from GCS JSON."""

    try:
        fs = gcsfs.GCSFileSystem()
        with fs.open(SAMPLE_JSON_PATH, "r") as f:
            data = json.load(f)

        return {
            "message": f"Loaded {data.get('count', len(data.get('events', [])))} sample emission events",
            "events": data.get("events", []),
            "count": data.get("count", len(data.get("events", [])))
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading emission sample: {str(e)}")


@router.get("/emissions/summary")
def get_emissions_summary(
        state: Optional[str] = Query(None),
        year: Optional[int] = Query(None)
):
    """Get aggregated emissions summary by state and year."""

    filters = []
    params = []

    if state:
        filters.append("UPPER(state) = UPPER(@state)")
        params.append(bigquery.ScalarQueryParameter("state", "STRING", state))

    if year:
        filters.append("year = @year")
        params.append(bigquery.ScalarQueryParameter("year", "INT64", year))

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    query = f"""
    SELECT 
        state,
        year,
        COUNT(*) as event_count,
        ROUND(AVG(duration_days), 2) as avg_duration,
        ROUND(AVG(spatial_extent_km), 2) as avg_spatial_extent,
        ROUND(SUM(avg_eco2), 2) as total_co2,
        ROUND(SUM(avg_ech4), 4) as total_ch4,
        ROUND(SUM(avg_eco), 2) as total_co,
        ROUND(SUM(avg_epm2_5), 4) as total_pm25,
        ROUND(SUM(emission_value), 2) as total_emission_value,
        ROUND(SUM(fire_size), 2) as total_fire_size,
        ROUND(SUM(total_emissions), 2) as total_all_emissions,
        COUNTIF(emission_intensity = 'very_high') as very_high_events,
        COUNTIF(size_category = 'large') as large_fires,
        COUNTIF(size_category = 'very_large') as very_large_fires
    FROM `{TABLE}`
    {where_clause}
    GROUP BY state, year 
    ORDER BY total_emission_value DESC 
    LIMIT 500
    """

    try:
        job_config = bigquery.QueryJobConfig(query_parameters=params) if params else None
        df = bq_client.query(query, job_config=job_config).to_dataframe()

        if df.empty:
            return {"message": "No summary data found", "data": [], "count": 0}

        data = df.to_dict('records')
        for row in data:
            row['total_emissions'] = {
                "co2": row.pop('total_co2'),
                "ch4": row.pop('total_ch4'),
                "co": row.pop('total_co'),
                "pm2_5": row.pop('total_pm25')
            }
            row['high_impact_events'] = {
                "very_high_emission": row.pop('very_high_events'),
                "large_fires": row.pop('large_fires'),
                "very_large_fires": row.pop('very_large_fires')
            }

        return {
            "message": f"Retrieved summary for {len(data)} state-year combinations",
            "data": data,
            "count": len(data)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving summary: {str(e)}")


@router.get("/emissions/states")
def get_available_states():
    """Get list of available states with emission statistics."""

    query = f"""
    SELECT 
        state,
        COUNT(*) as event_count,
        MIN(year) as first_year,
        MAX(year) as last_year,
        ROUND(SUM(total_emissions), 2) as total_emissions,
        ROUND(AVG(emission_value), 2) as avg_emission_value,
        COUNTIF(emission_intensity = 'very_high') as high_impact_events
    FROM `{TABLE}`
    GROUP BY state
    ORDER BY total_emissions DESC
    """

    try:
        df = bq_client.query(query).to_dataframe()

        states = []
        for _, row in df.iterrows():
            states.append({
                "state": row["state"],
                "event_count": int(row["event_count"]),
                "year_range": f"{int(row['first_year'])}-{int(row['last_year'])}",
                "total_emissions": row["total_emissions"],
                "avg_emission_value": row["avg_emission_value"],
                "high_impact_events": int(row["high_impact_events"])
            })

        return {"states": states, "count": len(states)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving states: {str(e)}")


@router.get("/emissions/counties")
def get_available_counties(state: str = Query(...)):
    """Get list of available counties for a specific state."""

    query = f"""
    SELECT 
        county,
        COUNT(*) as event_count,
        ROUND(SUM(total_emissions), 2) as total_emissions,
        ROUND(AVG(duration_days), 2) as avg_duration,
        COUNTIF(emission_intensity = 'very_high') as high_impact_events
    FROM `{TABLE}`
    WHERE UPPER(state) = UPPER(@state)
    GROUP BY county
    ORDER BY total_emissions DESC
    """

    try:
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("state", "STRING", state)]
        )
        df = bq_client.query(query, job_config=job_config).to_dataframe()

        counties = df.to_dict('records')
        for county in counties:
            county['event_count'] = int(county['event_count'])
            county['high_impact_events'] = int(county['high_impact_events'])

        return {"state": state, "counties": counties, "count": len(counties)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving counties: {str(e)}")


@router.get("/emissions/years")
def get_available_years():
    """Get list of available years with comprehensive statistics."""

    query = f"""
    SELECT 
        year,
        COUNT(*) as event_count,
        COUNT(DISTINCT state) as states_affected,
        ROUND(SUM(total_emissions), 2) as total_emissions,
        ROUND(AVG(duration_days), 2) as avg_duration,
        ROUND(SUM(fire_size), 2) as total_fire_size,
        COUNTIF(emission_intensity = 'very_high') as very_high_events,
        COUNTIF(size_category IN ('large', 'very_large')) as large_fires
    FROM `{TABLE}`
    GROUP BY year
    ORDER BY year DESC
    """

    try:
        df = bq_client.query(query).to_dataframe()

        years = df.to_dict('records')
        for year_data in years:
            year_data['event_count'] = int(year_data['event_count'])
            year_data['states_affected'] = int(year_data['states_affected'])
            year_data['very_high_events'] = int(year_data['very_high_events'])
            year_data['large_fires'] = int(year_data['large_fires'])

        year_values = [y["year"] for y in years]

        return {
            "years": years,
            "count": len(years),
            "range": {
                "min": min(year_values) if year_values else None,
                "max": max(year_values) if year_values else None
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving years: {str(e)}")


@router.get("/emissions/filters")
def get_available_filters():
    """Get all available filter options and endpoint information."""
    return {
        "filters": {
            "emission_intensity": ["low", "medium", "high", "very_high"],
            "size_category": ["small", "medium", "large", "very_large"],
            "state": "US state name (e.g., CALIFORNIA)",
            "county": "County name - requires state",
            "year": "Year (2003-2015)"
        },
        "endpoints": {
            "/emissions": "Get emission events with filters",
            "/emissions/summary": "Get aggregated summary by state/year",
            "/emissions/states": "Get available states",
            "/emissions/counties?state=X": "Get counties for state",
            "/emissions/years": "Get available years",
            "/emissions/filters": "Get filter options",
            "/analyze-emissions": "AI-powered emission event analysis with conversation support",
            "/emissions/sessions": "List active emission conversation sessions",
            "/emissions/sessions/{session_id}": "Get session details",
            "DELETE /emissions/sessions/{session_id}": "Delete session",
            "/emissions/sessions/cleanup": "Clean up expired sessions"
        }
    }