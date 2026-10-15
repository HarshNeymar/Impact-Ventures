"""
Web Search Grounded AI Assistant - Two-Step Pipeline
Provides grounded (web-searched) versions of all 3 chat endpoints:
  1. POST /api/web-search/analyze-fire
  2. POST /api/web-search/query
  3. POST /api/web-search/analyze-emissions

Pipeline:
  Step 1 — Call Gemini with GoogleSearch tool to gather web context.
  Step 2 — Extract useful web data, combine with fire/emissions data,
           then call Gemini *without* grounding to produce a clean response.

Uses the new google-genai SDK.  Shares session stores with existing endpoints.
"""

import os
import re
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# New Google GenAI SDK
from google import genai
from google.genai import types

# Reuse session management from existing modules (shared session stores)
from app.ai_assistant_wildfire import (
    create_session,
    get_session,
    add_to_conversation,
    build_conversation_context,
    create_general_session,
    cleanup_expired_sessions,
    load_knowledge_base,
    initialize_ai_components,
    collection,
    FirePredictionData,
    LLM_MODEL,
)
from app.emissions import (
    create_emissions_session,
    get_emissions_session,
    add_to_emissions_conversation,
    build_emissions_conversation_context,
    cleanup_expired_emissions_sessions,
    EmissionEventData,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/web-search", tags=["web-search"])

# ---------------------------------------------------------------------------
# Google GenAI client (new SDK)
# ---------------------------------------------------------------------------
_genai_client: Optional[genai.Client] = None


def get_genai_client() -> genai.Client:
    """Lazy-init the google-genai Client with the same API key."""
    global _genai_client
    if _genai_client is None:
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_AI_API_KEY environment variable not set")
        _genai_client = genai.Client(api_key=api_key)
        logger.info("google-genai Client initialised for web-search grounding")
    return _genai_client


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class WebSearchFireRequest(BaseModel):
    fire_data: Optional[FirePredictionData] = None
    query: Optional[str] = "Analyze this wildfire prediction"
    session_id: Optional[str] = None


class WebSearchQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class WebSearchEmissionsRequest(BaseModel):
    emission_data: Optional[EmissionEventData] = None
    query: Optional[str] = "Analyze these wildfire emissions"
    session_id: Optional[str] = None


class WebSource(BaseModel):
    index: int
    title: str
    url: str


class WebSearchResponse(BaseModel):
    session_id: Optional[str] = None
    answer: str
    sources: List[Dict[str, Any]]
    web_sources: Optional[List[WebSource]] = None
    search_queries: Optional[List[str]] = None
    confidence_score: float
    query_type: str
    processing_time_ms: float
    is_relevant: bool = True
    grounded: bool = True


# ---------------------------------------------------------------------------
# Step 1 — Web search via grounding (gather context only)
# ---------------------------------------------------------------------------

def _extract_web_data(response) -> tuple[str, List[WebSource], List[str]]:
    """
    Extract the raw grounded text (used as web context), source URLs,
    and search queries from a grounded Gemini response.
    Returns (raw_grounded_text, web_sources, search_queries).

    Tries multiple extraction paths since grounding_chunks is not always
    populated by the API:
      1. grounding_chunks  (primary — structured source list)
      2. grounding_supports (each support can reference chunks with URIs)
      3. search_entry_point (rendered HTML contains clickable source links)
    """
    raw_text = response.text or ""
    web_sources: List[WebSource] = []
    search_queries: List[str] = []

    candidate = response.candidates[0] if response.candidates else None
    if candidate is None:
        return raw_text, web_sources, search_queries

    grounding = getattr(candidate, "grounding_metadata", None)
    if grounding is None:
        return raw_text, web_sources, search_queries

    # Debug: log available attributes on grounding metadata
    attrs = [a for a in dir(grounding) if not a.startswith("_")]
    logger.debug(f"Grounding metadata attributes: {attrs}")

    # Search queries used by the model
    if getattr(grounding, "web_search_queries", None):
        search_queries = list(grounding.web_search_queries)

    # ---- Path 1: grounding_chunks (best-case) ----
    chunks = getattr(grounding, "grounding_chunks", None) or []
    logger.info(f"Grounding chunks: {len(chunks)}")
    for idx, chunk in enumerate(chunks):
        web = getattr(chunk, "web", None)
        if web:
            web_sources.append(WebSource(
                index=idx + 1,
                title=getattr(web, "title", "") or "",
                url=getattr(web, "uri", "") or "",
            ))

    # ---- Path 2: grounding_supports (each may reference web chunks) ----
    if not web_sources:
        supports = getattr(grounding, "grounding_supports", None) or []
        logger.info(f"Grounding supports: {len(supports)}")
        seen_urls: set[str] = set()
        for support in supports:
            # Some SDK versions embed chunk objects directly in supports
            support_chunks = getattr(support, "grounding_chunk_indices", None) or []
            segment = getattr(support, "segment", None)
            # Also try to access chunk references from the support itself
            s_chunks = getattr(support, "grounding_chunks", None) or []
            for chunk in s_chunks:
                web = getattr(chunk, "web", None)
                if web:
                    uri = getattr(web, "uri", "") or ""
                    if uri and uri not in seen_urls:
                        seen_urls.add(uri)
                        web_sources.append(WebSource(
                            index=len(web_sources) + 1,
                            title=getattr(web, "title", "") or "",
                            url=uri,
                        ))

    # ---- Path 3: search_entry_point rendered HTML (fallback) ----
    if not web_sources:
        sep = getattr(grounding, "search_entry_point", None)
        if sep:
            rendered = getattr(sep, "rendered_content", None) or ""
            logger.info(f"Search entry point HTML length: {len(rendered)} chars")
            if rendered:
                # Extract URLs and link text from the rendered HTML
                link_pattern = r'<a[^>]+href="(https?://[^"]+)"[^>]*>([^<]*)</a>'
                matches = re.findall(link_pattern, rendered)
                seen_urls_html: set[str] = set()
                for url, title in matches:
                    if url not in seen_urls_html:
                        seen_urls_html.add(url)
                        web_sources.append(WebSource(
                            index=len(web_sources) + 1,
                            title=title.strip() or url,
                            url=url,
                        ))

    logger.info(f"Final extracted web sources: {len(web_sources)}")
    return raw_text, web_sources, search_queries


async def _web_search(search_prompt: str, model_name: Optional[str] = None) -> tuple[str, List[WebSource], List[str]]:
    """
    Step 1: Call Gemini WITH GoogleSearch grounding to gather web context.
    Returns (web_context_text, web_sources, search_queries).
    """
    client = get_genai_client()
    model = model_name or LLM_MODEL

    search_tool = types.Tool(google_search=types.GoogleSearch())  # type: ignore[call-arg]
    config = types.GenerateContentConfig(
        tools=[search_tool],
        temperature=0.2,
        max_output_tokens=8192,
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=search_prompt,
            config=config,
        )
        return _extract_web_data(response)
    except Exception as e:
        logger.error(f"Web search step failed with {model}: {e}")
        fallback = "gemini-2.5-flash" if model != "gemini-2.5-flash" else "gemini-2.5-pro"
        try:
            response = client.models.generate_content(
                model=fallback,
                contents=search_prompt,
                config=config,
            )
            return _extract_web_data(response)
        except Exception as e2:
            logger.error(f"Fallback web search also failed: {e2}")
            raise


# ---------------------------------------------------------------------------
# Step 2 — Clean generation (no grounding, uses web context)
# ---------------------------------------------------------------------------

async def _generate_clean(prompt: str, model_name: Optional[str] = None) -> str:
    """
    Step 2: Call Gemini WITHOUT grounding to produce a clean answer
    that uses the fire/emissions data + web context already embedded
    in the prompt.
    """
    client = get_genai_client()
    model = model_name or LLM_MODEL

    config = types.GenerateContentConfig(
        temperature=0.3,
        max_output_tokens=4096,
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text or ""
    except Exception as e:
        logger.error(f"Clean generation failed with {model}: {e}")
        fallback = "gemini-2.5-flash" if model != "gemini-2.5-flash" else "gemini-2.5-pro"
        try:
            response = client.models.generate_content(
                model=fallback,
                contents=prompt,
                config=config,
            )
            return response.text or ""
        except Exception as e2:
            logger.error(f"Fallback clean generation also failed: {e2}")
            raise


# ---------------------------------------------------------------------------
# Search prompt builders (Step 1 — what to search for)
# ---------------------------------------------------------------------------

def _describe_doy(doy) -> str:
    """Human calendar description of a day-of-year, e.g. 208 -> 'late July'."""
    try:
        day = int(round(float(doy)))
    except (TypeError, ValueError):
        return "unknown time of year"
    if not 1 <= day <= 366:
        return "unknown time of year"
    from datetime import date, timedelta
    d = date(2021, 1, 1) + timedelta(days=day - 1)   # non-leap reference year
    part = "early" if d.day <= 10 else "mid" if d.day <= 20 else "late"
    return f"{part} {d.strftime('%B')}"


def _build_fire_search_prompt(fire_data: Dict, query: str) -> str:
    """Build a search-oriented prompt so Gemini searches the web for context."""
    imputed = fire_data.get("imputed", {})
    predictions = fire_data.get("predictions", {})

    state = imputed.get("state", "Unknown")
    county = imputed.get("county", "Unknown")
    doy = imputed.get("doy", "N/A")
    # Describe the actual date. This used to be the hardcoded string
    # "(late May/early June)" for every request, so the model was told the wrong
    # time of year whenever the user picked anything outside that window.
    date_label = _describe_doy(doy)
    season = imputed.get("season", "N/A")
    risk = imputed.get("risk", "N/A")
    fm100 = imputed.get("fm100_value", "N/A")
    bi = imputed.get("bi_value", "N/A")
    month = imputed.get("month", "N/A")

    return f"""Search the web and compile SPECIFIC FACTUAL DATA for this wildfire scenario.

FIRE CONTEXT:
- Location: {county} County, {state}
- Day of Year: {doy} (Month: {month}, Season: {season})
- Risk Level: {risk}/10
- 100-hr Fuel Moisture: {fm100}%
- Fire Danger Index (BI): {bi}

USER QUESTION: {query}

You MUST search and return ALL of the following, with specific numbers, names, and dates:

1. HISTORICAL WILDFIRES: Name at least 2-3 notable wildfires that have occurred in or near {county} County, {state} in the past 10-20 years. For each fire, include: fire name, year, month, acres burned, duration, and cause if known.

2. SEASONAL FIRE PATTERNS: What is the typical fire season pattern for {state} around Day {doy} ({date_label})? How does this time period compare to peak fire season? What weather patterns (monsoon timing, drought) typically affect fire risk at this time?

3. CURRENT/RECENT CONDITIONS: What are recent fire weather conditions, drought status, or fire danger levels for {state}? Any active Red Flag warnings or fire weather watches?

4. COMPARABLE CONDITIONS: Find examples of fires that started under similar conditions (fuel moisture around {fm100}%, BI around {bi}) and describe their outcomes.

FORMAT: Write a structured factual report with numbered sections matching the 4 categories above. Include SPECIFIC data points — fire names, exact acreage, dates, durations, temperature/humidity readings. Do NOT write generic statements."""


def _build_general_search_prompt(query: str) -> str:
    """Build a search prompt for general wildfire/platform queries.
    For platform-specific questions, we still search but guide the model
    to look for relevant wildfire/climate data rather than random platforms."""
    return f"""You are a research assistant for PyroPath, a wildfire prediction platform by Impact Ventures.

USER QUESTION: {query}

DETERMINE QUESTION TYPE:
- If the user is asking about "this platform", "this app", "PyroPath", "what can you do", "who built this", "how does this work", features, KPIs, behind the scenes, or any platform-specific question:
  → Search for recent wildfire statistics, climate change fire trends, and wildfire prediction technology advances that relate to the platform's mission. Do NOT search for other platforms or apps.

- If the user is asking about wildfire science, climate data, specific fires, emissions, or general knowledge:
  → Search for specific factual data answering their question.

You MUST search and return:
1. Latest statistics, data points, or research findings relevant to the question (include exact numbers, years, sources)
2. Authoritative data from NIFC, CAL FIRE, USFS, EPA, NASA, or peer-reviewed research
3. Recent news, reports, or developments relevant to wildfire prediction and climate change

IMPORTANT: Do NOT search for or return information about other wildfire platforms, competing products, or unrelated applications. Focus on wildfire science, climate data, and fire prediction research.

FORMAT: Write a structured factual report with specific data points — exact numbers, dates, fire names, acreage, percentages, study findings. Do NOT write generic or vague statements."""


def _build_emissions_search_prompt(emission_data: Dict, query: str) -> str:
    """Build a search prompt for emissions queries."""
    state = emission_data.get("state", "Unknown")
    county = emission_data.get("county", "Unknown")
    year = emission_data.get("year", "N/A")
    emissions_dict = emission_data.get("emissions", {})

    return f"""Search the web and compile SPECIFIC FACTUAL DATA for this wildfire emissions scenario.

EMISSIONS CONTEXT:
- Location: {county} County, {state}
- Year: {year}
- Fire Type: {emission_data.get('fire_type', 'N/A')}
- CO2: {emissions_dict.get('co2', 0):.2f} metric tons

USER QUESTION: {query}

You MUST search and return ALL of the following with specific numbers:

1. HISTORICAL EMISSIONS: What are the total wildfire emissions for {state} in recent years? Compare with national averages. Include specific CO2/PM2.5 tonnage figures.

2. AIR QUALITY DATA: What air quality impacts (AQI readings, PM2.5 levels) have wildfires caused in {county} County or {state}? Include specific AQI numbers and dates.

3. HEALTH IMPACT DATA: What are documented health effects from wildfire smoke in {state}? Include EPA thresholds, hospitalization data, or population exposure estimates.

4. COMPARABLE EVENTS: Find 2-3 specific wildfire emission events in {state} with known emission quantities and their environmental/health outcomes.

FORMAT: Write a structured factual report with specific data points — exact tonnage, AQI readings, dates, fire names, health statistics. Do NOT write generic statements."""


# ---------------------------------------------------------------------------
# Final answer prompt builders (Step 2 — combine data + web context)
# ---------------------------------------------------------------------------

def _build_fire_answer_prompt(fire_data: Dict, query: str,
                               web_context: str, conversation_context: str = "") -> str:
    """Build the final prompt combining fire data + web context for a clean answer."""
    imputed = fire_data.get("imputed", {})
    predictions = fire_data.get("predictions", {})

    context_block = ""
    if conversation_context:
        context_block = f"""
PREVIOUS CONVERSATION:
{conversation_context}
"""

    return f"""You are a wildfire expert AI assistant. Your job is to combine fire prediction data WITH real-time web intelligence to give the user a comprehensive, data-rich analysis.

FIRE PREDICTION DATA:
- Location: {imputed.get('county', 'Unknown')}, {imputed.get('state', 'Unknown')}
- Risk Level: {imputed.get('risk', 'N/A')}/10
- Predicted Duration: {predictions.get('duration', 'N/A')} days
- Day of Year: {imputed.get('doy', 'N/A')} (Season: {imputed.get('season', 'N/A')})
- Fire Danger Index (BI): {imputed.get('bi_value', 'N/A')}
- 100-hr Fuel Moisture: {imputed.get('fm100_value', 'N/A')}%
- Max Relative Humidity: {imputed.get('rmax_value', 'N/A')}%
- Wind Speed: {imputed.get('vs_value', 'N/A')}
- End Tomorrow Probability: {predictions.get('end_tomorrow_prob', 'N/A')}
- Burn Severity (BSEV): {imputed.get('BSEV', 'N/A')}
- Vapor Pressure Deficit: {imputed.get('vpd_value', 'N/A')}

WEB SEARCH FINDINGS (real-time data gathered from the web — you MUST use this):
{web_context}
{context_block}
USER QUESTION: {query}

CRITICAL INSTRUCTIONS:
1. Your response MUST blend BOTH the fire prediction data AND the web search findings.
2. Include 1-2 key facts from the WEB SEARCH FINDINGS (e.g., a notable historical fire name, seasonal pattern, or drought condition).
3. Produce a CLEAN response — NO citation links, NO numbered references, NO URLs in the text.
4. STRICT LIMIT: 60-100 words MAXIMUM. Be direct and concise — no filler, no introductory phrases, no lengthy explanations.
5. Write as one short paragraph. No headings, no bullet points, no lists.
6. Every sentence must deliver key insight. Cut anything that doesn't directly answer the question.
"""


def _build_general_answer_prompt(query: str, web_context: str,
                                  conversation_context: str = "") -> str:
    """Build the final prompt for general queries combining knowledge + web context."""
    knowledge_base = load_knowledge_base()

    context_block = ""
    if conversation_context:
        context_block = f"""
PREVIOUS CONVERSATION:
{conversation_context}
"""

    return f"""You are Fact Finder, the friendly and knowledgeable AI assistant for PyroPath — a wildfire prediction and analysis platform built by Impact Ventures to combat climate change.

YOUR IDENTITY:
- You are Fact Finder, the built-in assistant for the PyroPath platform.
- PyroPath is developed by Impact Ventures.
- When users ask "what is this platform", "what can you do", "who made this", "tell me about this app" — they are asking about PyroPath. Answer confidently about PyroPath using the platform knowledge below.
- NEVER describe yourself as a generic AI or refer to other platforms. You ARE Fact Finder, PyroPath's assistant.
- Use "we" and "our" when talking about the platform's mission and features.

PLATFORM KNOWLEDGE (this is YOUR platform — answer from this first):
{knowledge_base}

WEB SEARCH FINDINGS (supplementary real-world data):
{web_context}
{context_block}
USER QUESTION: {query}

RESPONSE GUIDELINES:
1. For platform questions ("what is this", "features", "how does it work", "KPIs", "behind the scenes", "who built this"):
   - Answer PRIMARILY from the Platform Knowledge above.
   - You may supplement with web findings to add real-world context (e.g., recent wildfire stats that show why PyroPath matters).
   - Always identify yourself as Fact Finder and the platform as PyroPath by Impact Ventures.

2. For wildfire science, climate, or general knowledge questions:
   - Blend platform knowledge WITH web search findings.
   - Include 1-2 specific facts or statistics from the web data.

3. Tone: Warm, conversational, helpful. Show genuine concern for climate change.
4. Produce a CLEAN response — NO citation links, NO numbered references, NO URLs.
5. STRICT LIMIT: 60-100 words MAXIMUM. Be direct and concise — no filler, no padding.
6. Write as one short paragraph. No headings, no bullet points, no lists.
7. Start with a brief warm greeting (under 10 words). End naturally without forced questions.
8. Every sentence must deliver key insight. Cut anything repetitive or obvious.
"""


def _build_emissions_answer_prompt(emission_data: Dict, query: str,
                                    web_context: str, conversation_context: str = "") -> str:
    """Build the final prompt for emissions combining data + web context."""
    emissions_dict = emission_data.get("emissions", {})
    co2 = emissions_dict.get("co2", 0)
    ch4 = emissions_dict.get("ch4", 0)
    co = emissions_dict.get("co", 0)
    pm2_5 = emissions_dict.get("pm2_5", 0)

    context_block = ""
    if conversation_context:
        context_block = f"""
PREVIOUS CONVERSATION:
{conversation_context}
"""

    return f"""You are an environmental scientist AI assistant specializing in wildfire emissions and air quality. Your job is to combine emission data WITH real-time web intelligence.

EMISSION EVENT DATA:
- Location: {emission_data.get('county', 'Unknown')}, {emission_data.get('state', 'Unknown')}
- Year: {emission_data.get('year', 'N/A')}
- Fire Type: {emission_data.get('fire_type', 'N/A')}
- Duration: {emission_data.get('duration_days', 'N/A')} days
- Spatial Extent: {emission_data.get('spatial_extent_km', 'N/A')} km²
- Fire Size: {emission_data.get('fire_size', 'N/A')} acres ({emission_data.get('fire_size_category', 'N/A')})
- Emission Intensity: {emission_data.get('emission_intensity', 'N/A')}
- Total Emissions: {emission_data.get('total_emissions', 'N/A')}

SPECIFIC EMISSIONS (metric tons):
- CO2: {co2:.2f}
- CH4: {ch4:.4f}
- CO: {co:.2f}
- PM2.5: {pm2_5:.4f}

WEB SEARCH FINDINGS (real-time data gathered from the web — you MUST use this):
{web_context}
{context_block}
USER QUESTION: {query}

CRITICAL INSTRUCTIONS:
1. Your response MUST blend BOTH the emission data AND the web search findings.
2. Include 1-2 key facts from the WEB SEARCH FINDINGS (e.g., comparable emission events, AQI readings, or health thresholds).
3. Produce a CLEAN response — NO citation links, NO numbered references, NO URLs in the text.
4. Focus on environmental impact, health implications, and comparisons.
5. STRICT LIMIT: 60-100 words MAXIMUM. Be direct and concise — no filler, no introductory phrases.
6. Write as one short paragraph. No headings, no bullet points, no lists.
"""


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze-fire", response_model=WebSearchResponse)
async def grounded_fire_analysis(request: WebSearchFireRequest):
    """Analyze fire prediction data using a two-step pipeline:
    1) Web search for context  2) Clean answer generation."""

    start_time = datetime.now()

    try:
        if collection is None:
            initialize_ai_components()

        # Session handling
        existing_session = None
        conversation_context = ""

        if request.session_id:
            existing_session = get_session(request.session_id)
            if existing_session:
                fire_data = existing_session["fire_data"]
                conversation_context = build_conversation_context(existing_session, max_turns=3)
            else:
                if not request.fire_data:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Session {request.session_id} not found or expired. Please provide fire_data.",
                    )
                fire_data = request.fire_data.dict()
        else:
            if not request.fire_data:
                raise HTTPException(status_code=400, detail="fire_data is required for new fire analysis")
            fire_data = request.fire_data.dict()

        query = request.query or "Analyze this wildfire prediction"

        # Step 1: Web search
        search_prompt = _build_fire_search_prompt(fire_data, query)
        web_context, web_sources, search_queries = await _web_search(search_prompt)
        logger.info(f"Step 1 complete: {len(web_sources)} web sources, {len(search_queries)} queries")
        logger.info(f"Web context (first 500 chars): {web_context[:500]}")

        # Step 2: Clean answer using fire data + web context
        answer_prompt = _build_fire_answer_prompt(
            fire_data, query, web_context, conversation_context
        )
        answer = await _generate_clean(answer_prompt)
        logger.info("Step 2 complete: clean answer generated")

        # Session create / update
        if existing_session:
            assert request.session_id is not None
            session_id = request.session_id
            add_to_conversation(session_id, query, answer)
        else:
            session_id = create_session(fire_data, query, answer)

        imputed = fire_data.get("imputed", {})
        source_info = {
            "type": "fire_prediction",
            "location": f"{imputed.get('county', 'Unknown')}, {imputed.get('state', 'Unknown')}",
            "coordinates": f"({imputed.get('latitude', 'N/A')}, {imputed.get('longitude', 'N/A')})",
            "risk_level": imputed.get("risk", "Unknown"),
            "predicted_duration": fire_data.get("predictions", {}).get("duration", "Unknown"),
        }

        # Build sources list including web context references
        sources_list = [source_info]
        if web_sources:
            sources_list.append({
                "type": "web_context",
                "description": "Web sources used to build context for this analysis",
                "count": len(web_sources),
                "links": [{"index": ws.index, "title": ws.title, "url": ws.url} for ws in web_sources],
            })

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        # If search ran but no structured sources extracted, inform the frontend
        final_web_sources = web_sources if web_sources else None
        if not final_web_sources and search_queries:
            final_web_sources = [WebSource(
                index=0,
                title="No relevant web source information available for this fire scenario",
                url="",
            )]

        return WebSearchResponse(
            session_id=session_id,
            answer=answer,
            sources=sources_list,
            web_sources=final_web_sources,
            search_queries=search_queries if search_queries else None,
            confidence_score=1.0,
            query_type="fire_analysis_grounded",
            processing_time_ms=round(processing_time, 2),
            is_relevant=True,
            grounded=bool(web_sources),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in grounded fire analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Web-search fire analysis error: {str(e)}")


@router.post("/query", response_model=WebSearchResponse)
async def grounded_general_query(request: WebSearchQueryRequest):
    """Answer general queries using a two-step pipeline:
    1) Web search for context  2) Clean answer generation."""

    start_time = datetime.now()

    try:
        if collection is None:
            initialize_ai_components()

        existing_session = None
        conversation_context = ""

        if request.session_id:
            existing_session = get_session(request.session_id)
            if existing_session:
                conversation_context = build_conversation_context(existing_session, max_turns=3)

        # Step 1: Web search
        search_prompt = _build_general_search_prompt(request.query)
        web_context, web_sources, search_queries = await _web_search(search_prompt)
        logger.info(f"Step 1 complete: {len(web_sources)} web sources, {len(search_queries)} queries")

        # Step 2: Clean answer using knowledge + web context
        answer_prompt = _build_general_answer_prompt(
            request.query, web_context, conversation_context
        )
        answer = await _generate_clean(answer_prompt)
        logger.info("Step 2 complete: clean answer generated")

        # Session create / update
        if existing_session:
            assert request.session_id is not None
            session_id = request.session_id
            add_to_conversation(session_id, request.query, answer)
        else:
            session_id = create_general_session(
                initial_query=request.query,
                initial_answer=answer,
                query_type="general_grounded",
            )

        cleanup_expired_sessions()

        source_info: Dict[str, Any] = {
            "type": "platform_knowledge",
            "description": "Wildfire Prediction Platform Documentation + Web Search",
        }

        # Build sources list including web context references
        sources_list: List[Dict[str, Any]] = [source_info]
        if web_sources:
            sources_list.append({
                "type": "web_context",
                "description": "Web sources used to build context for this query",
                "count": len(web_sources),
                "links": [{"index": ws.index, "title": ws.title, "url": ws.url} for ws in web_sources],
            })

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        final_web_sources = web_sources if web_sources else None
        if not final_web_sources and search_queries:
            final_web_sources = [WebSource(
                index=0,
                title="No relevant web source information available for this query",
                url="",
            )]

        return WebSearchResponse(
            session_id=session_id,
            answer=answer,
            sources=sources_list,
            web_sources=final_web_sources,
            search_queries=search_queries if search_queries else None,
            confidence_score=0.95,
            query_type="general_query_grounded",
            processing_time_ms=round(processing_time, 2),
            is_relevant=True,
            grounded=bool(web_sources),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in grounded general query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Web-search query error: {str(e)}")


@router.post("/analyze-emissions", response_model=WebSearchResponse)
async def grounded_emissions_analysis(request: WebSearchEmissionsRequest):
    """Analyze emissions data using a two-step pipeline:
    1) Web search for context  2) Clean answer generation."""

    start_time = datetime.now()

    try:
        existing_session = None
        conversation_context = ""

        if request.session_id:
            existing_session = get_emissions_session(request.session_id)
            if existing_session:
                emission_data = existing_session["emission_data"]
                conversation_context = build_emissions_conversation_context(existing_session, max_turns=3)
            else:
                if not request.emission_data:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Session {request.session_id} not found or expired. Please provide emission_data.",
                    )
                emission_data = request.emission_data.dict()
        else:
            if not request.emission_data:
                raise HTTPException(status_code=400, detail="emission_data is required for new emissions analysis")
            emission_data = request.emission_data.dict()

        query = request.query or "Analyze these wildfire emissions"

        # Step 1: Web search
        search_prompt = _build_emissions_search_prompt(emission_data, query)
        web_context, web_sources, search_queries = await _web_search(search_prompt)
        logger.info(f"Step 1 complete: {len(web_sources)} web sources, {len(search_queries)} queries")

        # Step 2: Clean answer using emission data + web context
        answer_prompt = _build_emissions_answer_prompt(
            emission_data, query, web_context, conversation_context
        )
        answer = await _generate_clean(answer_prompt)
        logger.info("Step 2 complete: clean answer generated")

        # Session create / update
        if existing_session:
            assert request.session_id is not None
            session_id = request.session_id
            add_to_emissions_conversation(session_id, query, answer)
        else:
            session_id = create_emissions_session(emission_data, query, answer)

        source_info = {
            "type": "emissions_analysis",
            "location": f"{emission_data.get('county', 'Unknown')}, {emission_data.get('state', 'Unknown')}",
            "year": emission_data.get("year", "Unknown"),
            "emission_intensity": emission_data.get("emission_intensity", "Unknown"),
            "total_emissions": emission_data.get("total_emissions", "Unknown"),
        }

        # Build sources list including web context references
        sources_list = [source_info]
        if web_sources:
            sources_list.append({
                "type": "web_context",
                "description": "Web sources used to build context for this analysis",
                "count": len(web_sources),
                "links": [{"index": ws.index, "title": ws.title, "url": ws.url} for ws in web_sources],
            })

        cleanup_expired_emissions_sessions()

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        final_web_sources = web_sources if web_sources else None
        if not final_web_sources and search_queries:
            final_web_sources = [WebSource(
                index=0,
                title="No relevant web source information available for this emissions event",
                url="",
            )]

        return WebSearchResponse(
            session_id=session_id,
            answer=answer,
            sources=sources_list,
            web_sources=final_web_sources,
            search_queries=search_queries if search_queries else None,
            confidence_score=1.0,
            query_type="emissions_analysis_grounded",
            processing_time_ms=round(processing_time, 2),
            is_relevant=True,
            grounded=bool(web_sources),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in grounded emissions analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Web-search emissions analysis error: {str(e)}")
