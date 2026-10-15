"""
Unified Chat Orchestrator for Wildfire AI Assistant

This orchestrator provides:
1. Single /chat endpoint that routes to fire analysis, emissions analysis, or general queries
2. LLM-based intent classification
3. Unified session management with context switching
4. N-turns (last 10 messages) context for intent classification
5. Data staleness detection (after 5 turns)
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
import threading

# FastAPI
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Google AI
import google.generativeai as genai

# Import existing handlers
from app.ai_assistant_wildfire import (
    FirePredictionData,
    generate_fire_analysis,
    generate_general_response,
    logger as ai_logger
)
from app.emissions import (
    EmissionEventData,
    generate_emissions_analysis,
    logger as emissions_logger
)

# Import web-search grounded pipeline
from app.web_search_assistant import (
    _web_search,
    _generate_clean,
    _build_fire_search_prompt,
    _build_fire_answer_prompt,
    _build_general_search_prompt,
    _build_general_answer_prompt,
    _build_emissions_search_prompt,
    _build_emissions_answer_prompt,
    WebSource,
)

# Configure logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])

# =============================================================================
# CONFIGURATION
# =============================================================================

# N-turns configuration
MAX_TURNS_FOR_CONTEXT = 10  # Last 10 messages for intent classification
MAX_TURNS_FOR_HANDLER = 3   # Last 3 turns for handler context
MAX_TURNS_FOR_STORED_DATA = 5  # After 10 turns (5*2), data is automatically cleared

# Session configuration
UNIFIED_SESSION_TTL_HOURS = 24

# LLM Models
from app import DEFAULT_LLM_MODEL
INTENT_CLASSIFIER_MODEL = DEFAULT_LLM_MODEL
INTENT_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"]

# Global unified session store
unified_session_store: Dict[str, Dict] = {}
unified_session_lock = threading.Lock()


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ChatRequest(BaseModel):
    """Unified chat request model"""
    query: str
    session_id: Optional[str] = None
    fire_data: Optional[Dict[str, Any]] = None  # FirePredictionData as dict
    emissions_data: Optional[Dict[str, Any]] = None  # EmissionEventData as dict
    web_search: Optional[bool] = True  # Toggle: True = web-search grounded, False = regular

    @classmethod
    def parse_obj(cls, obj):
        # Handle both 'emission_data' and 'emissions_data'
        if isinstance(obj, dict):
            if 'emission_data' in obj and 'emissions_data' not in obj:
                obj['emissions_data'] = obj.pop('emission_data')
        return super().parse_obj(obj)


class IntentClassification(BaseModel):
    """Intent classification result"""
    intent: str  # "analyze_fire" | "analyze_emissions" | "general_query"
    context_action: str  # "continue" | "switch" | "new"
    confidence: float
    reasoning: str
    data_needed: str  # "use_stored" | "use_new" | "none"


class ChatResponse(BaseModel):
    """Unified chat response"""
    session_id: str
    answer: str
    sources: List[Dict[str, Any]]
    web_sources: Optional[List[Dict[str, Any]]] = None
    search_queries: Optional[List[str]] = None
    confidence_score: float
    query_type: str
    intent: str
    context_action: str
    classification_confidence: float
    processing_time_ms: float
    is_relevant: bool = True
    grounded: bool = False
    turns_since_data: Optional[int] = None


# =============================================================================
# INTENT CLASSIFICATION PROMPT
# =============================================================================

INTENT_CLASSIFICATION_PROMPT = """You are an intent classifier for a wildfire prediction AI assistant.

**Available Handlers:**
1. **analyze_fire**: Analyzes specific wildfire data (requires fire_data)
2. **analyze_emissions**: Analyzes emissions from wildfires (requires emissions_data)  
3. **general_query**: Answers questions about platform, KPIs, wildfire science, climate

**Current Situation:**
- Current Context Type: {current_context_type}
- Has Stored Fire Data: {has_fire_data}
- Has Stored Emissions Data: {has_emissions_data}
- Turns Since Data Provided: {turns_since_data}
- New Fire Data Provided: {new_fire_data}
- New Emissions Data Provided: {new_emissions_data}

**Conversation History (Last {n} turns):**
{conversation_history}

**Current User Query:**
"{current_query}"

**Classification Rules (IN ORDER OF PRIORITY):**

1. **PRIORITY 1 - New Data Provided:**
   - If new fire_data provided → intent: "analyze_fire", action: "switch"
   - If new emissions_data provided → intent: "analyze_emissions", action: "switch"

2. **PRIORITY 2 - Query Content Analysis (MOST IMPORTANT):**
   First, analyze what the user is ACTUALLY asking about:
   
   **General Query Indicators (HIGH CONFIDENCE):**
   - Asks for definitions: "what is X", "what does Y mean", "define Z"
   - Asks about platform: "how does this work", "what can you do", "features"
   - Asks about KPIs: "Fire Danger Index", "fuel moisture", "PM2.5" (without "this fire's")
   - General concepts: "explain wildfire science", "climate impact", "emissions types"
   - Platform usage: "how do I", "can you", "what are your capabilities"
   - Unrelated questions: "behind the scenes", "how are you", "what's new"
   
   **Fire Analysis Indicators:**
   - Explicitly mentions "this fire", "the fire we're looking at", "this specific fire"
   - Asks about fire-specific metrics: "this fire's duration", "why is this fire dangerous"
   - Questions about prediction: "will it end", "how long will it burn"
   
   **Emissions Analysis Indicators:**
   - Explicitly mentions "these emissions", "this emissions event", "the emissions data"
   - Asks about specific emissions: "how much CO2", "what's the PM2.5 value"

3. **PRIORITY 3 - Contextual Follow-up (ONLY IF QUERY CLEARLY RELATES):**
   Only classify as continuation if BOTH:
   - Query uses specific pronouns: "it" (alone), "that fire", "these emissions"
   - AND query topic matches current context (fire questions for fire context)
   
   **Examples of TRUE follow-ups:**
   - "Why is it so dangerous?" (when discussing a fire) → analyze_fire
   - "How long will it last?" (when discussing a fire) → analyze_fire
   - "What caused it?" (when discussing emissions) → analyze_emissions
   
   **Examples of FALSE follow-ups (actually general):**
   - "What are behind the scenes?" → general_query (unrelated to fire)
   - "How does this platform work?" → general_query (platform question)
   - "What is fuel moisture?" → general_query (definition request)

4. **PRIORITY 4 - Data Staleness:**
   - If turns_since_data > 8 AND query is vague → likely general query
   - If current_context is None → intent: "general_query", action: "new"

**Critical Rules:**
- DO NOT classify as fire/emissions continuation just because of pronouns
- ALWAYS check if query topic matches context before continuing
- When in doubt, default to general_query (safer)
- "the", "this", "that" are common words - don't over-weight them

**Output Format (JSON only, no explanation):**
{{
    "intent": "analyze_fire" | "analyze_emissions" | "general_query",
    "context_action": "continue" | "switch" | "new",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation focusing on query content",
    "data_needed": "use_stored" | "use_new" | "none"
}}

**Example 1 - Clear Continuation:**
Current context: analyze_fire
Query: "why is this fire's fuel moisture so low?"
{{"intent": "analyze_fire", "context_action": "continue", "confidence": 0.95, "reasoning": "Directly asks about this fire's fuel moisture", "data_needed": "use_stored"}}

**Example 2 - Appears to Continue but Actually General:**
Current context: analyze_fire
Query: "what are behind the scenes?"
{{"intent": "general_query", "context_action": "switch", "confidence": 0.9, "reasoning": "Unrelated to fire analysis - asking about platform/process", "data_needed": "none"}}

**Example 3 - Definition Request:**
Current context: analyze_fire
Query: "what does Fire Danger Index mean?"
{{"intent": "general_query", "context_action": "switch", "confidence": 0.95, "reasoning": "Asking for KPI definition, not about this specific fire", "data_needed": "none"}}

**Example 4 - True Fire Follow-up:**
Current context: analyze_fire
Query: "how long will it last?"
{{"intent": "analyze_fire", "context_action": "continue", "confidence": 0.9, "reasoning": "Asking about fire duration - clear continuation", "data_needed": "use_stored"}}

**Example 5 - Platform Question:**
Current context: analyze_fire
Query: "how does this prediction model work?"
{{"intent": "general_query", "context_action": "switch", "confidence": 0.95, "reasoning": "Asking about platform's ML model, not the fire", "data_needed": "none"}}

Now classify the current user query based on its ACTUAL CONTENT first.
"""


# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

def create_unified_session(initial_query: str, initial_answer: str,
                          context_type: str, data: Optional[Dict] = None) -> str:
    """Create a new unified conversation session"""
    import uuid
    session_id = f"unified_{uuid.uuid4().hex[:16]}"

    # Normalize context type and determine data storage
    fire_data_to_store = None
    emissions_data_to_store = None

    if context_type in ["analyze_fire", "fire_analysis"]:
        fire_data_to_store = data
        normalized_type = "analyze_fire"
    elif context_type in ["analyze_emissions", "emissions_analysis"]:
        emissions_data_to_store = data
        normalized_type = "analyze_emissions"
    else:
        normalized_type = "general_query"

    session = {
        "session_id": session_id,
        "created_at": datetime.now(),
        "last_accessed": datetime.now(),
        "current_context": {
            "type": normalized_type,
            "fire_data": fire_data_to_store,
            "emissions_data": emissions_data_to_store,
            "data_timestamp": datetime.now() if data else None,
            "turns_since_data": 0 if data else 999
        },
        "conversation_history": [
            {
                "turn": 1,
                "role": "user",
                "content": initial_query,
                "context_type": normalized_type,
                "had_fire_data": bool(fire_data_to_store),
                "had_emissions_data": bool(emissions_data_to_store),
                "timestamp": datetime.now().isoformat()
            },
            {
                "turn": 1,
                "role": "assistant",
                "content": initial_answer,
                "handler": normalized_type,
                "confidence": 1.0,
                "timestamp": datetime.now().isoformat()
            }
        ],
        "metadata": {
            "total_turns": 1,
            "context_switches": 0
        }
    }

    with unified_session_lock:
        unified_session_store[session_id] = session

    logger.info(f"Created unified session: {session_id} with context: {normalized_type}, has_fire_data: {bool(fire_data_to_store)}, has_emissions_data: {bool(emissions_data_to_store)}")
    return session_id


def get_unified_session(session_id: str) -> Optional[Dict]:
    """Retrieve a unified session by ID, checking for expiry"""
    with unified_session_lock:
        session = unified_session_store.get(session_id)
        if session:
            # Check expiry
            age = datetime.now() - session['created_at']
            if age > timedelta(hours=UNIFIED_SESSION_TTL_HOURS):
                del unified_session_store[session_id]
                logger.info(f"Unified session expired: {session_id}")
                return None

            # Update last accessed
            session['last_accessed'] = datetime.now()
            return session
        return None


def update_session_context(session_id: str, new_context_type: str,
                          data: Optional[Dict] = None) -> bool:
    """Update session context when switching - preserves data across switches"""
    with unified_session_lock:
        session = unified_session_store.get(session_id)
        if session:
            old_type = session['current_context']['type']

            # Normalize context type
            if new_context_type in ["analyze_fire", "fire_analysis"]:
                normalized_type = "analyze_fire"
            elif new_context_type in ["analyze_emissions", "emissions_analysis"]:
                normalized_type = "analyze_emissions"
            else:
                normalized_type = "general_query"

            # PRESERVE existing data across context switches
            # Only update if new data is explicitly provided
            existing_fire_data = session['current_context'].get('fire_data')
            existing_emissions_data = session['current_context'].get('emissions_data')

            # Determine what data to store
            if normalized_type == "analyze_fire":
                # Update fire data only if new data provided, otherwise keep existing
                fire_data_to_store = data if data else existing_fire_data
                # Keep emissions data from previous context
                emissions_data_to_store = existing_emissions_data
            elif normalized_type == "analyze_emissions":
                # Keep fire data from previous context
                fire_data_to_store = existing_fire_data
                # Update emissions data only if new data provided, otherwise keep existing
                emissions_data_to_store = data if data else existing_emissions_data
            else:  # general_query
                # PRESERVE both fire and emissions data when switching to general
                fire_data_to_store = existing_fire_data
                emissions_data_to_store = existing_emissions_data

            session['current_context'] = {
                "type": normalized_type,
                "fire_data": fire_data_to_store,
                "emissions_data": emissions_data_to_store,
                "data_timestamp": datetime.now() if data else session['current_context'].get('data_timestamp'),
                "turns_since_data": 0 if data else session['current_context'].get('turns_since_data', 0)
            }

            if old_type != normalized_type:
                session['metadata']['context_switches'] += 1
                logger.info(f"Context switched in session {session_id}: {old_type} → {normalized_type} (preserved fire_data: {bool(fire_data_to_store)}, emissions_data: {bool(emissions_data_to_store)})")
            elif data:
                logger.info(f"Updated data in session {session_id} for context {normalized_type}")

            return True
        return False


def add_to_unified_conversation(session_id: str, user_query: str,
                                assistant_answer: str, context_type: str,
                                had_fire_data: bool, had_emissions_data: bool) -> bool:
    """Add conversation turn to unified session"""
    with unified_session_lock:
        session = unified_session_store.get(session_id)
        if session:
            turn_number = len([m for m in session['conversation_history'] if m['role'] == 'user']) + 1

            session['conversation_history'].extend([
                {
                    "turn": turn_number,
                    "role": "user",
                    "content": user_query,
                    "context_type": context_type,
                    "had_fire_data": had_fire_data,
                    "had_emissions_data": had_emissions_data,
                    "timestamp": datetime.now().isoformat()
                },
                {
                    "turn": turn_number,
                    "role": "assistant",
                    "content": assistant_answer,
                    "handler": context_type,
                    "confidence": 1.0,
                    "timestamp": datetime.now().isoformat()
                }
            ])

            session['metadata']['total_turns'] = turn_number
            session['last_accessed'] = datetime.now()

            # Increment turns_since_data if no new data provided
            if not (had_fire_data or had_emissions_data):
                session['current_context']['turns_since_data'] += 1

                # Clear data if it's been more than 10 turns since last data
                turns_since = session['current_context']['turns_since_data']
                if turns_since > MAX_TURNS_FOR_STORED_DATA * 2:  # 10 turns threshold
                    if session['current_context'].get('fire_data'):
                        session['current_context']['fire_data'] = None
                        logger.info(f"Cleared fire_data in session {session_id} after {turns_since} turns")
                    if session['current_context'].get('emissions_data'):
                        session['current_context']['emissions_data'] = None
                        logger.info(f"Cleared emissions_data in session {session_id} after {turns_since} turns")

            logger.info(f"Added turn {turn_number} to session {session_id}")
            return True
        return False


def calculate_turns_since_data(session: Dict) -> int:
    """Calculate how many turns since fire/emissions data was provided"""
    current_context = session.get('current_context', {})

    if not current_context.get('data_timestamp'):
        return 999  # No data ever provided

    data_timestamp_str = current_context['data_timestamp']

    # Handle both datetime objects and ISO strings
    if isinstance(data_timestamp_str, datetime):
        data_timestamp = data_timestamp_str
    else:
        try:
            data_timestamp = datetime.fromisoformat(data_timestamp_str)
        except:
            return 999

    turns_after = 0
    history = session.get('conversation_history', [])

    for msg in reversed(history):
        try:
            msg_timestamp = datetime.fromisoformat(msg['timestamp'])
            if msg_timestamp <= data_timestamp:
                break
            if msg['role'] == 'user':
                turns_after += 1
        except:
            continue

    return turns_after


def get_recent_history(conversation_history: List[Dict], n_messages: int = 10) -> List[Dict]:
    """Get last N messages from history"""
    return conversation_history[-n_messages:] if len(conversation_history) > n_messages else conversation_history


def build_handler_context(session: Dict, max_turns: int = 3) -> str:
    """Build conversation context for handlers (last N turns)"""
    history = session.get('conversation_history', [])
    recent = history[-(max_turns * 2):] if len(history) > max_turns * 2 else history

    context_lines = []
    for msg in recent:
        role = msg['role'].upper()
        content = msg['content']
        context_lines.append(f"{role}: {content}")

    return "\n".join(context_lines)


def cleanup_expired_unified_sessions() -> int:
    """Remove expired unified sessions"""
    with unified_session_lock:
        expired = []
        for session_id, session in unified_session_store.items():
            age = datetime.now() - session['created_at']
            if age > timedelta(hours=UNIFIED_SESSION_TTL_HOURS):
                expired.append(session_id)

        for session_id in expired:
            del unified_session_store[session_id]

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired unified sessions")

        return len(expired)


# =============================================================================
# INTENT CLASSIFICATION
# =============================================================================

async def classify_intent_with_llm(
    query: str,
    session: Optional[Dict],
    new_fire_data: bool,
    new_emissions_data: bool
) -> IntentClassification:
    """Classify user intent using LLM"""

    try:
        # Prepare context information
        if session:
            current_context = session.get('current_context', {})
            current_type = current_context.get('type', 'none')
            has_fire_data = bool(current_context.get('fire_data'))
            has_emissions_data = bool(current_context.get('emissions_data'))
            turns_since_data = calculate_turns_since_data(session)

            # Get recent history
            history = get_recent_history(session['conversation_history'], MAX_TURNS_FOR_CONTEXT)
            history_text = "\n".join([
                f"Turn {msg.get('turn', '?')} - {msg['role'].upper()}: {msg['content'][:150]}..."
                for msg in history
            ])
        else:
            current_type = "none"
            has_fire_data = False
            has_emissions_data = False
            turns_since_data = 999
            history_text = "No previous conversation"

        # Build prompt
        prompt = INTENT_CLASSIFICATION_PROMPT.format(
            current_context_type=current_type,
            has_fire_data=has_fire_data,
            has_emissions_data=has_emissions_data,
            turns_since_data=turns_since_data,
            new_fire_data=new_fire_data,
            new_emissions_data=new_emissions_data,
            n=len(history) if session else 0,
            conversation_history=history_text,
            current_query=query
        )

        # Try LLM classification
        models = [INTENT_CLASSIFIER_MODEL] + INTENT_FALLBACK_MODELS

        for model_name in models:
            try:
                logger.info(f"Attempting intent classification with {model_name}")

                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config={
                        "temperature": 0.3,  # Lower for consistent classification
                        "top_p": 0.8,
                        "max_output_tokens": 500
                    }
                )

                response = await model.generate_content_async(prompt)
                result_text = response.text.strip()

                # Parse JSON (handle markdown fences)
                result_text = result_text.replace('```json', '').replace('```', '').strip()
                classification_dict = json.loads(result_text)

                # Validate
                required_keys = ['intent', 'context_action', 'confidence', 'reasoning', 'data_needed']
                if all(k in classification_dict for k in required_keys):
                    logger.info(f"✓ Intent classified: {classification_dict['intent']} ({classification_dict['context_action']})")
                    return IntentClassification(**classification_dict)

            except Exception as e:
                logger.warning(f"Classification failed with {model_name}: {e}")
                continue

        # If all LLM attempts fail, use rule-based fallback
        logger.warning("All LLM classification attempts failed, using rule-based fallback")
        return rule_based_classification(query, session, new_fire_data, new_emissions_data)

    except Exception as e:
        logger.error(f"Error in intent classification: {e}")
        return rule_based_classification(query, session, new_fire_data, new_emissions_data)


def rule_based_classification(
    query: str,
    session: Optional[Dict],
    new_fire_data: bool,
    new_emissions_data: bool
) -> IntentClassification:
    """Rule-based intent classification fallback - prioritizes query content"""

    query_lower = query.lower()

    # Rule 1: New data = switch
    if new_fire_data:
        return IntentClassification(
            intent="analyze_fire",
            context_action="switch",
            confidence=1.0,
            reasoning="New fire data provided",
            data_needed="use_new"
        )

    if new_emissions_data:
        return IntentClassification(
            intent="analyze_emissions",
            context_action="switch",
            confidence=1.0,
            reasoning="New emissions data provided",
            data_needed="use_new"
        )

    # Rule 2: Check query content FIRST (most important)
    # General query indicators (HIGH PRIORITY)
    general_keywords = [
        'what is', 'what does', 'what are', 'define',
        'how does this work', 'how does the', 'platform', 'feature',
        'kpi', 'behind the scenes', 'capabilities', 'can you',
        'how do i', 'tell me about wildfire', 'climate', 'science'
    ]

    # Check if query is clearly asking for general information
    if any(kw in query_lower for kw in general_keywords):
        # BUT check if it's specifically about "this fire" or "these emissions"
        if 'this fire' in query_lower or 'the fire we' in query_lower:
            pass  # Continue to fire analysis check
        elif 'these emissions' in query_lower or 'this emissions' in query_lower:
            pass  # Continue to emissions analysis check
        else:
            return IntentClassification(
                intent="general_query",
                context_action="switch" if session else "new",
                confidence=0.85,
                reasoning="Query asks for general information/definitions",
                data_needed="none"
            )

    # Rule 3: Specific fire/emissions continuation (STRICT CRITERIA)
    if session:
        current_type = session.get('current_context', {}).get('type')

        # Fire continuation - must explicitly mention fire
        fire_continuations = ['this fire', 'the fire', 'it will burn', 'fire duration',
                            'will it end', 'how long will it']

        if current_type == "analyze_fire" and any(kw in query_lower for kw in fire_continuations):
            return IntentClassification(
                intent="analyze_fire",
                context_action="continue",
                confidence=0.8,
                reasoning="Asking about the specific fire",
                data_needed="use_stored"
            )

        # Emissions continuation - must explicitly mention emissions
        emissions_continuations = ['these emissions', 'the emissions', 'emission value',
                                   'co2', 'pm2.5', 'how much was released']

        if current_type == "analyze_emissions" and any(kw in query_lower for kw in emissions_continuations):
            return IntentClassification(
                intent="analyze_emissions",
                context_action="continue",
                confidence=0.8,
                reasoning="Asking about the specific emissions",
                data_needed="use_stored"
            )

    # Rule 4: Default to general query (safer)
    return IntentClassification(
        intent="general_query",
        context_action="new",
        confidence=0.6,
        reasoning="Default - no clear fire/emissions context",
        data_needed="none"
    )


# =============================================================================
# MAIN ORCHESTRATOR ENDPOINT
# =============================================================================

@router.post("/chat", response_model=ChatResponse)
async def unified_chat(request: ChatRequest):
    """
    Unified chat endpoint that routes to appropriate handler based on intent classification.
    Supports fire analysis, emissions analysis, and general queries with seamless context switching.
    """

    start_time = datetime.now()

    try:
        # Step 1: Load or create session
        existing_session = None
        if request.session_id:
            existing_session = get_unified_session(request.session_id)
            if not existing_session:
                logger.warning(f"Session {request.session_id} not found or expired")

        # Step 2: Classify intent
        classification = await classify_intent_with_llm(
            query=request.query,
            session=existing_session,
            new_fire_data=bool(request.fire_data),
            new_emissions_data=bool(request.emissions_data)
        )

        logger.info(f"Intent: {classification.intent}, Action: {classification.context_action}, Confidence: {classification.confidence}")

        # Step 3: Determine data to use - FIXED VERSION
        fire_data = None
        emissions_data = None

        if classification.intent == "analyze_fire":
            # Priority 1: Use new data if provided in request
            if request.fire_data:
                fire_data = request.fire_data
                logger.info("Using newly provided fire_data")
            # Priority 2: Use stored data from session
            elif existing_session and existing_session['current_context'].get('fire_data'):
                fire_data = existing_session['current_context'].get('fire_data')
                logger.info("Using stored fire_data from session")
            else:
                logger.warning("No fire_data available for analyze_fire intent")

        elif classification.intent == "analyze_emissions":
            # Priority 1: Use new data if provided in request
            if request.emissions_data:
                emissions_data = request.emissions_data
                logger.info("Using newly provided emissions_data")
            # Priority 2: Use stored data from session
            elif existing_session and existing_session['current_context'].get('emissions_data'):
                emissions_data = existing_session['current_context'].get('emissions_data')
                logger.info("Using stored emissions_data from session")
            else:
                logger.warning("No emissions_data available for analyze_emissions intent")

        # Step 4: Build conversation context for handler
        conversation_context = ""
        if existing_session:
            conversation_context = build_handler_context(existing_session, max_turns=MAX_TURNS_FOR_HANDLER)

        # Step 5: Route to appropriate handler
        answer = ""
        sources = []
        web_sources_list: List[WebSource] = []
        search_queries_list: List[str] = []
        confidence_score = 1.0
        grounded = False

        if request.web_search:
            # ── Web-search grounded pipeline ──
            logger.info(f"Using web-search grounded pipeline for intent: {classification.intent}")

            if classification.intent == "analyze_fire":
                if not fire_data:
                    raise HTTPException(
                        status_code=400,
                        detail="Fire data required for fire analysis. Please provide fire_data in your request."
                    )

                search_prompt = _build_fire_search_prompt(fire_data, request.query)
                web_context, web_sources_list, search_queries_list = await _web_search(search_prompt)
                logger.info(f"Fire web search: {len(web_sources_list)} sources, {len(search_queries_list)} queries")

                answer_prompt = _build_fire_answer_prompt(
                    fire_data, request.query, web_context, conversation_context
                )
                answer = await _generate_clean(answer_prompt)
                grounded = bool(web_sources_list)

                imputed = fire_data.get('imputed', {})
                sources = [{
                    "type": "fire_prediction",
                    "location": f"{imputed.get('county', 'Unknown')}, {imputed.get('state', 'Unknown')}",
                    "coordinates": f"({imputed.get('latitude', 'N/A')}, {imputed.get('longitude', 'N/A')})",
                    "risk_level": imputed.get('risk', 'Unknown'),
                    "predicted_duration": fire_data.get('predictions', {}).get('duration', 'Unknown')
                }]

            elif classification.intent == "analyze_emissions":
                if not emissions_data:
                    raise HTTPException(
                        status_code=400,
                        detail="Emissions data required for emissions analysis. Please provide emissions_data in your request."
                    )

                search_prompt = _build_emissions_search_prompt(emissions_data, request.query)
                web_context, web_sources_list, search_queries_list = await _web_search(search_prompt)
                logger.info(f"Emissions web search: {len(web_sources_list)} sources, {len(search_queries_list)} queries")

                answer_prompt = _build_emissions_answer_prompt(
                    emissions_data, request.query, web_context, conversation_context
                )
                answer = await _generate_clean(answer_prompt)
                grounded = bool(web_sources_list)

                sources = [{
                    "type": "emission_event",
                    "location": f"{emissions_data.get('county', 'Unknown')}, {emissions_data.get('state', 'Unknown')}",
                    "year": emissions_data.get('year', 'Unknown'),
                    "emission_intensity": emissions_data.get('emission_intensity', 'Unknown')
                }]

            else:  # general_query
                search_prompt = _build_general_search_prompt(request.query)
                web_context, web_sources_list, search_queries_list = await _web_search(search_prompt)
                logger.info(f"General web search: {len(web_sources_list)} sources, {len(search_queries_list)} queries")

                answer_prompt = _build_general_answer_prompt(
                    request.query, web_context, conversation_context
                )
                answer = await _generate_clean(answer_prompt)
                grounded = bool(web_sources_list)

                sources = [{
                    "type": "platform_knowledge",
                    "description": "Wildfire Prediction Platform Documentation + Web Search",
                    "coverage": "Platform features, KPIs, ML models, climate impact"
                }]
                confidence_score = 0.95

            # Add web context sources to sources list
            if web_sources_list:
                sources.append({
                    "type": "web_context",
                    "description": "Web sources used to build context for this analysis",
                    "count": len(web_sources_list),
                    "links": [{"index": ws.index, "title": ws.title, "url": ws.url} for ws in web_sources_list],
                })

        else:
            # ── Regular pipeline (no web search) ──
            logger.info(f"Using regular pipeline for intent: {classification.intent}")

            if classification.intent == "analyze_fire":
                if not fire_data:
                    raise HTTPException(
                        status_code=400,
                        detail="Fire data required for fire analysis. Please provide fire_data in your request."
                    )

                answer = await generate_fire_analysis(fire_data, request.query)

                imputed = fire_data.get('imputed', {})
                sources = [{
                    "type": "fire_prediction",
                    "location": f"{imputed.get('county', 'Unknown')}, {imputed.get('state', 'Unknown')}",
                    "coordinates": f"({imputed.get('latitude', 'N/A')}, {imputed.get('longitude', 'N/A')})",
                    "risk_level": imputed.get('risk', 'Unknown'),
                    "predicted_duration": fire_data.get('predictions', {}).get('duration', 'Unknown')
                }]

            elif classification.intent == "analyze_emissions":
                if not emissions_data:
                    raise HTTPException(
                        status_code=400,
                        detail="Emissions data required for emissions analysis. Please provide emissions_data in your request."
                    )

                answer = await generate_emissions_analysis(emissions_data, request.query)

                sources = [{
                    "type": "emission_event",
                    "location": f"{emissions_data.get('county', 'Unknown')}, {emissions_data.get('state', 'Unknown')}",
                    "year": emissions_data.get('year', 'Unknown'),
                    "emission_intensity": emissions_data.get('emission_intensity', 'Unknown')
                }]

            else:  # general_query
                answer = await generate_general_response(request.query, conversation_context)

                sources = [{
                    "type": "platform_knowledge",
                    "description": "Wildfire Prediction Platform Documentation",
                    "coverage": "Platform features, KPIs, ML models, climate impact"
                }]
                confidence_score = 0.95

        # Step 6: Update or create session - FIXED VERSION
        if existing_session:
            # Update existing session
            session_id = request.session_id

            # Determine what data to store based on what was actually used
            if classification.intent == "analyze_fire" and fire_data:
                # Store fire data that was used (new or existing)
                update_session_context(session_id, classification.intent, fire_data)
            elif classification.intent == "analyze_emissions" and emissions_data:
                # Store emissions data that was used (new or existing)
                update_session_context(session_id, classification.intent, emissions_data)
            elif classification.context_action == "switch":
                # Switching to general query - preserve existing data
                update_session_context(session_id, classification.intent, None)

            # Add conversation turn
            add_to_unified_conversation(
                session_id,
                request.query,
                answer,
                classification.intent,
                bool(fire_data),
                bool(emissions_data)
            )
        else:
            # Create new session
            data_to_store = fire_data if fire_data else emissions_data if emissions_data else None
            session_id = create_unified_session(
                request.query,
                answer,
                classification.intent,
                data_to_store
            )

        # Step 7: Calculate turns since data
        updated_session = get_unified_session(session_id)
        turns_since_data = calculate_turns_since_data(updated_session) if updated_session else None

        # Step 8: Cleanup expired sessions in background
        cleanup_expired_unified_sessions()

        # Step 9: Prepare response
        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        # Prepare web sources for response
        final_web_sources = None
        if request.web_search:
            if web_sources_list:
                final_web_sources = [{"index": ws.index, "title": ws.title, "url": ws.url} for ws in web_sources_list]
            elif search_queries_list:
                final_web_sources = [{"index": 0, "title": "No relevant web source information available", "url": ""}]

        return ChatResponse(
            session_id=session_id,
            answer=answer,
            sources=sources,
            web_sources=final_web_sources,
            search_queries=search_queries_list if search_queries_list else None,
            confidence_score=confidence_score,
            query_type=classification.intent,
            intent=classification.intent,
            context_action=classification.context_action,
            classification_confidence=classification.confidence,
            processing_time_ms=round(processing_time, 2),
            is_relevant=True,
            grounded=grounded,
            turns_since_data=turns_since_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in unified chat orchestrator: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")


# =============================================================================
# SESSION MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/sessions")
async def list_unified_sessions():
    """List all active unified sessions"""

    cleanup_expired_unified_sessions()

    with unified_session_lock:
        sessions = []
        for session_id, session in unified_session_store.items():
            sessions.append({
                "session_id": session_id,
                "created_at": session['created_at'].isoformat(),
                "last_accessed": session['last_accessed'].isoformat(),
                "current_context_type": session['current_context']['type'],
                "total_turns": session['metadata']['total_turns'],
                "context_switches": session['metadata']['context_switches'],
                "turns_since_data": calculate_turns_since_data(session),
                "age_hours": (datetime.now() - session['created_at']).total_seconds() / 3600
            })

        sessions.sort(key=lambda x: x['last_accessed'], reverse=True)

        return {
            "sessions": sessions,
            "total": len(sessions),
            "active_sessions": len(unified_session_store)
        }


@router.get("/sessions/{session_id}")
async def get_unified_session_details(session_id: str):
    """Get details of a specific unified session"""

    session = get_unified_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found or expired"
        )

    return {
        "session_id": session['session_id'],
        "created_at": session['created_at'].isoformat(),
        "last_accessed": session['last_accessed'].isoformat(),
        "current_context": session['current_context'],
        "conversation_history": session['conversation_history'],
        "metadata": session['metadata'],
        "turns_since_data": calculate_turns_since_data(session),
        "age_hours": (datetime.now() - session['created_at']).total_seconds() / 3600
    }


@router.delete("/sessions/{session_id}")
async def delete_unified_session(session_id: str):
    """Delete a specific unified session"""

    with unified_session_lock:
        if session_id in unified_session_store:
            del unified_session_store[session_id]
            logger.info(f"Deleted unified session: {session_id}")
            return {
                "message": "Session deleted successfully",
                "session_id": session_id
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )


@router.post("/sessions/cleanup")
async def manual_cleanup_unified_sessions():
    """Manually trigger cleanup of expired sessions"""

    cleaned_count = cleanup_expired_unified_sessions()

    with unified_session_lock:
        active_count = len(unified_session_store)

    return {
        "message": "Unified session cleanup completed",
        "expired_sessions_removed": cleaned_count,
        "active_sessions_remaining": active_count
    }


@router.get("/health")
async def orchestrator_health():
    """Health check for orchestrator"""

    with unified_session_lock:
        active_sessions = len(unified_session_store)

    return {
        "status": "healthy",
        "service": "Unified Chat Orchestrator",
        "active_sessions": active_sessions,
        "max_turns_context": MAX_TURNS_FOR_CONTEXT,
        "max_turns_handler": MAX_TURNS_FOR_HANDLER,
        "max_turns_stored_data": MAX_TURNS_FOR_STORED_DATA,
        "session_ttl_hours": UNIFIED_SESSION_TTL_HOURS
    }