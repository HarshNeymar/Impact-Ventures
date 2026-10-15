"""
Wildfire AI Assistant - Dual Endpoint Implementation
1. Fire Analysis: Analyze specific fire predictions without RAG
2. General Query: RAG-based queries using GCS parquet data
"""

import os
import re
import logging
import asyncio
from typing import Optional, List, Dict, Any, Union, Tuple
import json
import hashlib

# FastAPI
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

# Google AI
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

# ChromaDB and embeddings
import chromadb
from chromadb.config import Settings

# Data processing
import pandas as pd
from google.cloud import storage
from google.cloud import bigquery
import numpy as np
from dotenv import load_dotenv
from datetime import datetime, timedelta
import threading

# Global session store
session_store: Dict[str, Dict] = {}
session_lock = threading.Lock()

# Session TTL (Time To Live)
SESSION_TTL_HOURS = 24

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Router for AI Assistant endpoints
router = APIRouter(prefix="/ai-assistant", tags=["ai-assistant"])

# Global variables
chroma_client = None
collection = None
storage_client = None
bq_client = None

# BigQuery config (use env vars so it's easy to change)
BQ_PROJECT_ID = os.getenv("BQ_PROJECT_ID", "code-for-planet")
BQ_DATASET = os.getenv("BQ_DATASET", "wildfire_dataset")
BQ_EMBEDDINGS_TABLE = os.getenv("BQ_EMBEDDINGS_TABLE", "sequential_events_embeddings")
BQ_INPUTS_TABLE = os.getenv("BQ_INPUTS_TABLE", "sequential_events")

# Configuration
CHROMA_PERSIST_DIR = os.getenv("CHROMADB_PERSIST_DIR", "/tmp/wildfire_chroma_db")
COLLECTION_NAME = os.getenv("CHROMADB_COLLECTION_NAME", "wildfire_events")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/embedding-001")
LLM_MODEL = os.getenv("LLM_MODEL", None)

# Central hardcoded override — always wins
from app import DEFAULT_LLM_MODEL
LLM_MODEL = DEFAULT_LLM_MODEL
GCS_BUCKET = "data_housee"
PARQUET_PATH = "wildfire_ml_data/featured_data_with_risk_parquet/"


def load_data_dictionary() -> str:
    """Load the data dictionary from file"""
    try:
        # Try multiple possible locations
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "data_dictionary.md"),
            os.path.join(os.path.dirname(__file__), "..", "data_dictionary.md"),
            "data_dictionary.md"
        ]

        for dict_path in possible_paths:
            if os.path.exists(dict_path):
                with open(dict_path, 'r') as f:
                    content = f.read()
                    logger.info(f"Loaded data dictionary from {dict_path}")
                    return content

        logger.warning("Data dictionary file not found, using embedded schema")
        return FALLBACK_SCHEMA

    except Exception as e:
        logger.error(f"Error loading data dictionary: {e}")
        return FALLBACK_SCHEMA


def load_knowledge_base() -> str:
    """Load the comprehensive platform knowledge base"""
    try:
        # Try multiple possible locations
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "platform_knowledge_base.md"),
            os.path.join(os.path.dirname(__file__), "..", "platform_knowledge_base.md"),
            "platform_knowledge_base.md",
            "/home/claude/platform_knowledge_base.md"
        ]

        for kb_path in possible_paths:
            if os.path.exists(kb_path):
                with open(kb_path, 'r') as f:
                    content = f.read()
                    logger.info(f"✓ Loaded knowledge base from {kb_path}")
                    return content

        logger.warning("Knowledge base file not found, using minimal fallback")
        return FALLBACK_KNOWLEDGE

    except Exception as e:
        logger.error(f"Error loading knowledge base: {e}")
        return FALLBACK_KNOWLEDGE


# Fallback knowledge if file not found
FALLBACK_KNOWLEDGE = """
# Wildfire Prediction Platform - Quick Reference

## Platform Overview
A comprehensive wildfire prediction and analysis platform using ML models trained on 7.5M fire records.

## Three Main Tabs:
1. **Fire Forecast**: Prediction, risk heat maps, fire analysis with AI explanations
2. **Emissions**: Historical emissions data with bubble map visualization
3. **Behind the Scenes**: ML model statistics and training data visualizations

## Key KPIs:
- Fire Danger Index (BI): 0-100 scale, >50 is very high risk
- Fuel Moisture (fm100, fm1000): Lower = higher risk, <10% is critical
- Predicted Duration: Expected fire burn time in days
- End Tomorrow Probability: Likelihood fire extinguishes in 24hrs
- Risk Level: 0-10 scale calculated from multiple factors

## Model Performance:
- XGBoost Duration: R²=0.74, MAE=2.8 days
- Hazard Classifier: 92% accuracy, AUC=0.93
- ConvLSTM Sequential: R²=0.66, MAE=0.5 days

## Climate Impact:
Wildfires are both affected by and contribute to climate change through greenhouse gas emissions (CO₂, CH₄, CO) and particulate matter (PM2.5).
"""

# Fallback schema if file not found
FALLBACK_SCHEMA = """
Table: code-for-planet.wildfire_dataset.sequential_events

Key Columns:
- global_fire_event_id (STRING): Unique fire identifier
- state (STRING): State name (e.g., 'California', 'Arizona')
- county (STRING): County name
- latitude (FLOAT64): Fire latitude
- longitude (FLOAT64): Fire longitude
- doy (INT64): Day of year (1-365)
- month (INT64): Month (1-12)
- season (INT64): Season (1=Winter, 2=Spring, 3=Summer, 4=Fall)
- duration (INT64): Fire duration in days
- risk (FLOAT64): Risk level (0-10 scale)

Weather Columns:
- bi_value (FLOAT64): Burning Index / Fire Danger Index
- fm100_value (FLOAT64): 100-hour fuel moisture (%)
- fm1000_value (FLOAT64): 1000-hour fuel moisture (%)
- rmax_value (FLOAT64): Maximum relative humidity (%)
- rmin_value (FLOAT64): Minimum relative humidity (%)
- vs_value (FLOAT64): Wind speed (m/s)
- vpd_value (FLOAT64): Vapor pressure deficit (kPa)
- tmmn_value (FLOAT64): Min temperature (Kelvin)
- tmmx_value (FLOAT64): Max temperature (Kelvin)

Fuel Columns:
- prefire_fuel (FLOAT64): Pre-fire fuel load
- cwd_frac (FLOAT64): Coarse woody debris fraction
- duff_frac (FLOAT64): Duff layer fraction
- fuelcode (INT64): Fuel type code
- fuel_moisture_class (INT64): Fuel moisture classification
- covertype (INT64): Vegetation cover type
- BSEV (INT64): Burn severity
"""

# Load data dictionary
DATA_DICTIONARY = load_data_dictionary()

# Pydantic Models
class FirePredictionData(BaseModel):
    input: Dict[str, Any]
    imputed: Dict[str, Any]
    predictions: Dict[str, Any]

class GeneralQueryRequest(BaseModel):
    query: str
    location_filter: Optional[Dict[str, str]] = None
    max_results: int = 5
    include_web_search: bool = False

class FireAnalysisRequest(BaseModel):
    fire_data: Optional[FirePredictionData] = None  # Now optional
    query: Optional[str] = "Analyze this wildfire prediction"
    include_web_search: bool = False
    session_id: Optional[str] = None  # NEW: for follow-up questions

class AIResponse(BaseModel):
    session_id: Optional[str] = None  # NEW: session ID for follow-ups
    answer: str
    sources: List[Dict[str, Any]]
    web_sources: Optional[List[Dict[str, Any]]] = None
    confidence_score: float
    query_type: str
    processing_time_ms: float
    is_relevant: bool = True


class DatabaseStatus(BaseModel):
    status: str
    document_count: int
    embedding_model: str
    llm_model: str
    last_updated: Optional[str] = None
    data_source: str = "GCS Parquet Files"

class SQLQueryRequest(BaseModel):
    query: str
    max_results: int = 5

class SQLQueryResponse(BaseModel):
    answer: str
    sql_query: str
    sources: List[Dict[str, Any]]
    rows_retrieved: int
    confidence_score: float
    query_type: str
    processing_time_ms: float
    is_relevant: bool = True

class QueryRequest(BaseModel):
    """Request model for general platform queries"""
    query: str
    session_id: Optional[str] = None  # For follow-up questions

class ProductionSQLGenerator:
    """Production-grade SQL generator with built-in error handling"""

    def __init__(self):
        self.llm_model = LLM_MODEL
        self.table_name = "`code-for-planet.wildfire_dataset.sequential_events`"
        self.max_retries = 2

    async def generate_sql(self, user_query: str, max_results: int = 5) -> str:
        """Generate SQL with automatic fallback"""

        # Try LLM generation first
        for attempt in range(self.max_retries):
            try:
                sql = await self._llm_generate_sql(user_query, max_results)
                sql = self._fix_and_validate_sql(sql, max_results)
                logger.info(f"✓ SQL generated successfully on attempt {attempt + 1}")
                return sql
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries - 1:
                    # Last attempt failed, use template
                    logger.warning("LLM generation failed, using template-based SQL")
                    return self._template_generate_sql(user_query, max_results)

        # Fallback if all attempts fail
        return self._template_generate_sql(user_query, max_results)

    async def _llm_generate_sql(self, user_query: str, max_results: int) -> str:
        """Generate SQL using LLM"""

        prompt = f"""Generate a BigQuery SQL query for this wildfire question.

TABLE: `code-for-planet.wildfire_dataset.sequential_events`

SCHEMA:
{DATA_DICTIONARY}

QUESTION: {user_query}

RULES:
1. Use EXACT table name: `code-for-planet.wildfire_dataset.sequential_events`
2. SELECT specific columns (not *)
3. ALWAYS include: global_fire_event_id, state, county
4. For weather questions, add: bi_value, fm100_value, rmax_value, vs_value
5. High-risk means: WHERE risk > 7
6. Use AVG() for averages, COUNT() for totals
7. Add ORDER BY for ranking
8. NO LIMIT clause (will be added automatically)

EXAMPLE:
SELECT 
  global_fire_event_id, state, county,
  AVG(bi_value) as avg_fire_danger,
  AVG(fm100_value) as avg_fuel_moisture
FROM `code-for-planet.wildfire_dataset.sequential_events`
WHERE risk > 7
GROUP BY global_fire_event_id, state, county
ORDER BY avg_fire_danger DESC

Return ONLY the SQL query:
"""

        model = genai.GenerativeModel(self.llm_model)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=400,
                temperature=0.1,
            )
        )

        sql = response.text.strip()
        # Remove markdown
        sql = re.sub(r'```sql\s*|\s*```', '', sql)
        return sql.strip()

    def _fix_and_validate_sql(self, sql: str, max_results: int) -> str:
        """Fix and validate SQL - production grade"""

        # Step 1: Remove any existing LIMIT
        sql = re.sub(r'\s*LIMIT\s+\d+\s*;?\s*$', '', sql, flags=re.IGNORECASE)

        # Step 2: Fix table name variations
        table_variations = [
            r'FROM\s+sequential_events\b',
            r'FROM\s+`sequential_events`',
            r'FROM\s+wildfire_dataset\.sequential_events',
            r'FROM\s+`wildfire_dataset\.sequential_events`',
        ]

        for variation in table_variations:
            sql = re.sub(variation, f'FROM {self.table_name}', sql, flags=re.IGNORECASE)

        # Step 3: Ensure FROM clause exists
        if not re.search(r'\bFROM\b', sql, re.IGNORECASE):
            # Insert FROM after SELECT
            match = re.search(r'(SELECT\s+.+?)(\s+WHERE|\s+GROUP|\s+ORDER|$)', sql, re.IGNORECASE | re.DOTALL)
            if match:
                select_part = match.group(1)
                rest_part = match.group(2)
                sql = f"{select_part}\nFROM {self.table_name}\n{rest_part}"

        # Step 4: Validate FROM clause is correct
        if not re.search(r'FROM\s+`code-for-planet\.wildfire_dataset\.sequential_events`', sql, re.IGNORECASE):
            raise ValueError("Invalid FROM clause after fix attempts")

        # Step 5: Validate SELECT exists
        if not re.search(r'\bSELECT\b', sql, re.IGNORECASE):
            raise ValueError("Missing SELECT clause")

        # Step 6: Block dangerous keywords
        dangerous = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'TRUNCATE', 'ALTER', 'CREATE']
        for keyword in dangerous:
            if re.search(rf'\b{keyword}\b', sql, re.IGNORECASE):
                raise ValueError(f"Dangerous keyword: {keyword}")

        # Step 7: Add LIMIT
        sql = sql.rstrip(';').strip() + f"\nLIMIT {max_results}"

        # Step 8: Clean up whitespace
        sql = '\n'.join(line.strip() for line in sql.split('\n') if line.strip())

        return sql

    def _template_generate_sql(self, user_query: str, max_results: int) -> str:
        """Template-based SQL generation as fallback"""

        query_lower = user_query.lower()

        # Detect intent
        is_weather = any(
            word in query_lower for word in ['weather', 'wind', 'humidity', 'temperature', 'fuel moisture'])
        is_high_risk = any(word in query_lower for word in ['high-risk', 'high risk', 'dangerous', 'severe'])
        is_aggregate = any(word in query_lower for word in ['average', 'mean', 'total', 'count'])

        # Detect state
        state_filter = self._detect_state(user_query)

        # Build SQL based on patterns
        if is_weather and is_high_risk:
            sql = self._weather_high_risk_template(state_filter, max_results)
        elif is_aggregate:
            sql = self._aggregate_template(state_filter, max_results)
        elif is_high_risk:
            sql = self._high_risk_template(state_filter, max_results)
        else:
            sql = self._general_template(state_filter, max_results)

        logger.info(f"Generated template SQL: {sql[:100]}...")
        return sql

    def _detect_state(self, query: str) -> Optional[str]:
        """Detect US state in query"""
        us_states = [
            "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
            "Connecticut", "Delaware", "Florida", "Georgia", "Idaho", "Illinois",
            "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
            "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
            "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
            "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
            "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
            "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
            "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
        ]

        for state in us_states:
            if state.lower() in query.lower():
                return state
        return None

    def _weather_high_risk_template(self, state: Optional[str], limit: int) -> str:
        """Template for weather + high-risk queries"""
        where_clause = "WHERE risk > 7"
        if state:
            where_clause += f" AND state = '{state}'"

        return f"""
SELECT 
  global_fire_event_id,
  state,
  county,
  AVG(bi_value) as avg_fire_danger,
  AVG(fm100_value) as avg_fuel_moisture_100hr,
  AVG(fm1000_value) as avg_fuel_moisture_1000hr,
  AVG(rmax_value) as avg_max_humidity,
  AVG(rmin_value) as avg_min_humidity,
  AVG(vs_value) as avg_wind_speed,
  AVG(vpd_value) as avg_vapor_deficit,
  COUNT(*) as fire_count
FROM {self.table_name}
{where_clause}
GROUP BY global_fire_event_id, state, county
ORDER BY avg_fire_danger DESC
LIMIT {limit}
""".strip()

    def _high_risk_template(self, state: Optional[str], limit: int) -> str:
        """Template for high-risk fire queries"""
        where_clause = "WHERE risk > 7"
        if state:
            where_clause += f" AND state = '{state}'"

        return f"""
SELECT 
  global_fire_event_id,
  state,
  county,
  latitude,
  longitude,
  risk,
  duration,
  bi_value,
  fm100_value,
  doy,
  season
FROM {self.table_name}
{where_clause}
ORDER BY risk DESC
LIMIT {limit}
""".strip()

    def _aggregate_template(self, state: Optional[str], limit: int) -> str:
        """Template for aggregation queries"""
        where_clause = ""
        if state:
            where_clause = f"WHERE state = '{state}'"

        return f"""
SELECT 
  state,
  COUNT(*) as total_fires,
  AVG(risk) as avg_risk,
  AVG(duration) as avg_duration,
  MAX(risk) as max_risk,
  MAX(duration) as max_duration
FROM {self.table_name}
{where_clause}
GROUP BY state
ORDER BY total_fires DESC
LIMIT {limit}
""".strip()

    def _general_template(self, state: Optional[str], limit: int) -> str:
        """Template for general queries"""
        where_clause = ""
        if state:
            where_clause = f"WHERE state = '{state}'"

        return f"""
SELECT 
  global_fire_event_id,
  state,
  county,
  latitude,
  longitude,
  risk,
  duration,
  doy,
  season,
  bi_value
FROM {self.table_name}
{where_clause}
ORDER BY risk DESC
LIMIT {limit}
""".strip()


# Global SQL generator
sql_generator = ProductionSQLGenerator()


async def execute_sql_query(sql: str) -> pd.DataFrame:
    """Execute SQL query on BigQuery"""
    global bq_client

    try:
        if bq_client is None:
            initialize_ai_components()

        logger.info(f"Executing SQL:\n{sql}")
        query_job = bq_client.query(sql)
        df = query_job.to_dataframe()

        logger.info(f"✓ Query returned {len(df)} rows")
        return df

    except Exception as e:
        logger.error(f"SQL execution error: {e}")
        raise


async def generate_answer_from_sql_results(
        user_query: str,
        df: pd.DataFrame,
        sql_query: str
) -> str:
    """Generate natural language answer from SQL results"""

    if df.empty:
        return "No wildfire events matched your query criteria. Try broadening your search or asking about a different location or time period."

    # Convert DataFrame to readable summary
    df_summary = df.head(10)

    # Build statistics
    stats = f"Retrieved {len(df)} wildfire events."

    if 'risk' in df.columns and pd.notna(df['risk']).any():
        stats += f"\n- Risk range: {df['risk'].min():.2f} to {df['risk'].max():.2f}"
    if 'duration' in df.columns and pd.notna(df['duration']).any():
        stats += f"\n- Duration range: {df['duration'].min():.1f} to {df['duration'].max():.1f} days"

    # Create prompt for answer generation
    prompt = f"""You are a wildfire expert. Answer this question using the data provided.

USER QUESTION: {user_query}

DATA SUMMARY:
{stats}

Sample data (first 10 rows):
{df_summary.to_string(index=False, max_rows=10)}

INSTRUCTIONS:
1. Answer in 100-150 words
2. Use specific numbers from the data
3. Write in plain, professional language
4. Focus on key patterns and insights
5. Don't mention "the data" or "database"

Answer:
"""

    try:
        models_to_try = [LLM_MODEL, "gemini-2.5-flash", "gemini-2.5-pro"]

        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=300,
                        temperature=0.3,
                    ),
                    safety_settings=[
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                    ]
                )

                if getattr(response, "text", None):
                    return response.text.strip()

            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}")
                continue

        # Fallback
        return f"Based on {len(df)} wildfire events, the data shows varying conditions across different locations. For more detailed analysis, please refine your query."

    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        return "Retrieved wildfire data successfully."


def generate_session_id(imputed_data: Dict) -> str:
    """Generate unique, descriptive session ID from fire data"""
    county = str(imputed_data.get('county', 'unknown')).lower().replace(' ', '_')
    state = str(imputed_data.get('state', 'unknown')).lower().replace(' ', '_')
    doy = int(imputed_data.get('doy', 0))
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Format: county_state_fire_doy_timestamp
    # Example: cochise_arizona_fire_148_20241229_143022
    session_id = f"{county}_{state}_fire_{doy}_{timestamp}"
    return session_id


def create_general_session(initial_query: str, initial_answer: str, query_type: str = "general") -> str:
    """Create a new conversation session for general queries"""
    # Generate a simple session ID for general queries
    import uuid
    session_id = f"query_{uuid.uuid4().hex[:16]}"

    session = {
        "session_id": session_id,
        "created_at": datetime.now(),
        "last_accessed": datetime.now(),
        "session_type": "general_query",  # Different from fire analysis
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
            "query_type": query_type,
            "total_queries": 1
        }
    }

    with session_lock:
        session_store[session_id] = session

    logger.info(f"Created general query session: {session_id}")
    return session_id

def create_session(fire_data: Dict, initial_query: str, initial_answer: str) -> str:
    """Create a new conversation session and return session_id"""
    session_id = generate_session_id(fire_data.get('imputed', {}))

    session = {
        "session_id": session_id,
        "created_at": datetime.now(),
        "last_accessed": datetime.now(),
        "fire_data": fire_data,
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
            "location": f"{fire_data.get('imputed', {}).get('county', 'Unknown')}, {fire_data.get('imputed', {}).get('state', 'Unknown')}",
            "fire_event_id": str(fire_data.get('imputed', {}).get('doy', 'unknown')),
            "risk_level": fire_data.get('imputed', {}).get('risk', 0),
            "duration": fire_data.get('predictions', {}).get('duration', 0)
        }
    }

    with session_lock:
        session_store[session_id] = session

    logger.info(f"Created session: {session_id} for {session['metadata']['location']}")
    return session_id


def get_session(session_id: str) -> Optional[Dict]:
    """Retrieve a session by ID, checking for expiry"""
    with session_lock:
        session = session_store.get(session_id)
        if session:
            # Check if session has expired
            age = datetime.now() - session['created_at']
            if age > timedelta(hours=SESSION_TTL_HOURS):
                del session_store[session_id]
                logger.info(f"Session expired and removed: {session_id}")
                return None

            # Update last accessed time
            session['last_accessed'] = datetime.now()
            return session
        return None


def add_to_conversation(session_id: str, user_query: str, assistant_answer: str) -> bool:
    """Add a conversation turn to existing session"""
    with session_lock:
        session = session_store.get(session_id)
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
            logger.info(f"Added turn to session {session_id}, total turns: {len(session['conversation_history']) // 2}")
            return True
        return False


def cleanup_expired_sessions() -> int:
    """Remove expired sessions and return count of cleaned sessions"""
    with session_lock:
        expired = []
        for session_id, session in session_store.items():
            age = datetime.now() - session['created_at']
            if age > timedelta(hours=SESSION_TTL_HOURS):
                expired.append(session_id)

        for session_id in expired:
            del session_store[session_id]

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")

        return len(expired)


def build_conversation_context(session: Dict, max_turns: int = 3) -> str:
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

def initialize_ai_components():
    """Initialize AI components: Gemini, ChromaDB, GCS, and BigQuery"""
    global chroma_client, collection, storage_client, bq_client

    try:
        # Initialize Google AI
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_AI_API_KEY environment variable not set")

        genai.configure(api_key=api_key)
        logger.info("Google Gemini AI configured successfully")

        # Create ChromaDB directory (still used for /initialize-database if you want it)
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

        # Initialize ChromaDB
        chroma_client = chromadb.PersistentClient(
            path=CHROMA_PERSIST_DIR,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        try:
            collection = chroma_client.get_collection(COLLECTION_NAME)
            logger.info(f"Loaded existing ChromaDB collection: {COLLECTION_NAME}")
        except Exception:
            logger.info(f"Creating new ChromaDB collection: {COLLECTION_NAME}")
            collection = chroma_client.create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )

        # Initialize GCS
        storage_client = storage.Client()
        logger.info("Google Cloud Storage client initialized successfully")

        # NEW: initialize BigQuery client

        if bq_client is None:
            # This will use ADC (Cloud Run / local gcloud auth)
            logger.info("Initializing BigQuery client...")
            from google.cloud import bigquery as bq_mod
            globals()["bq_client"] = bq_mod.Client(project=BQ_PROJECT_ID)
            logger.info("BigQuery client initialized successfully")

        return True

    except Exception as e:
        logger.error(f"Error initializing AI components: {e}")
        raise


def generate_embedding(text: str) -> List[float]:
    """Generate embedding using Google's embedding model"""
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise

def create_fire_document_from_parquet(fire_data: Dict) -> str:
    """Create a comprehensive text document from parquet fire data"""

    # Extract key information safely
    state = fire_data.get('state', 'Unknown')
    county = fire_data.get('county', 'Unknown')
    location = f"{county}, {state}"
    coordinates = f"({fire_data.get('latitude', 'N/A')}, {fire_data.get('longitude', 'N/A')})"

    # Build comprehensive document
    document = f"""
Wildfire Data Point Analysis

LOCATION AND GEOGRAPHY:
Location: {location} {coordinates}
State: {state}
County: {county}
Latitude: {fire_data.get('latitude', 'Unknown')}
Longitude: {fire_data.get('longitude', 'Unknown')}

TEMPORAL INFORMATION:
Year: {fire_data.get('year', 'Unknown')}
Day of Year: {fire_data.get('doy', 'Unknown')}
Month: {fire_data.get('month', 'Unknown')}
Season: {fire_data.get('season', 'Unknown')}

FIRE CHARACTERISTICS:
Duration: {fire_data.get('duration', 'Unknown')} days
Risk Level: {fire_data.get('risk', 'Unknown')}/10
Cover Type: {fire_data.get('covertype', 'Unknown')}
Fuel Code: {fire_data.get('fuelcode', 'Unknown')}
Fuel Moisture Class: {fire_data.get('fuel_moisture_class', 'Unknown')}

FUEL CONDITIONS:
Prefire Fuel Load: {fire_data.get('prefire_fuel', 'Unknown')}
Coarse Woody Debris Fraction: {fire_data.get('cwd_frac', 'Unknown')}
Duff Fraction: {fire_data.get('duff_frac', 'Unknown')}

WEATHER CONDITIONS:
Fire Danger Index (BI): {fire_data.get('bi_value', 'Unknown')}
100-hour Fuel Moisture: {fire_data.get('fm100_value', 'Unknown')}
1000-hour Fuel Moisture: {fire_data.get('fm1000_value', 'Unknown')}
Minimum Relative Humidity: {fire_data.get('rmin_value', 'Unknown')}
Maximum Relative Humidity: {fire_data.get('rmax_value', 'Unknown')}
Vapor Pressure Deficit: {fire_data.get('vpd_value', 'Unknown')}
Wind Speed: {fire_data.get('vs_value', 'Unknown')}
Solar Radiation: {fire_data.get('srad_value', 'Unknown')}
Temperature Min: {fire_data.get('tmmn_value', 'Unknown')}
Temperature Max: {fire_data.get('tmmx_value', 'Unknown')}
Specific Humidity: {fire_data.get('sph_value', 'Unknown')}
Potential Evapotranspiration: {fire_data.get('pet_value', 'Unknown')}
Wind Direction: {fire_data.get('th_value', 'Unknown')}

FIRE BEHAVIOR INDICATORS:
Burn Source: {fire_data.get('burn_source', 'Unknown')}
Burn Day Source: {fire_data.get('burnday_source', 'Unknown')}
Burn Severity (BSEV): {fire_data.get('BSEV', 'Unknown')}

ENVIRONMENTAL CONTEXT:
This wildfire data point represents fire conditions in {location} during {fire_data.get('season', 'unknown season')} 
with a risk level of {fire_data.get('risk', 'unknown')}/10. The fire behavior and potential duration are influenced 
by the local fuel conditions, weather patterns, and environmental factors typical of this region.

FIRE SCIENCE INSIGHTS:
The combination of fuel moisture levels, weather conditions, and local fuel characteristics in this data point 
indicates specific fire behavior patterns that are important for understanding wildfire risk and management strategies.
    """

    return document.strip()

async def load_parquet_files_from_gcs(max_files: int = 10, batch_size: int = 500):
    """Load parquet files from GCS and embed them in ChromaDB"""

    try:
        logger.info("Fetching parquet files from GCS...")
        bucket = storage_client.bucket(GCS_BUCKET)

        # List all parquet files
        blobs = list(bucket.list_blobs(prefix=PARQUET_PATH))
        parquet_files = [blob for blob in blobs if blob.name.endswith('.parquet')]

        logger.info(f"Found {len(parquet_files)} parquet files in GCS")

        # Limit files for testing
        files_to_process = parquet_files[:max_files]
        logger.info(f"Processing {len(files_to_process)} files")

        total_rows_processed = 0

        for file_idx, blob in enumerate(files_to_process):
            logger.info(f"Processing file {file_idx + 1}/{len(files_to_process)}: {blob.name}")

            # Download and read parquet file
            gcs_path = f"gs://{GCS_BUCKET}/{blob.name}"

            try:
                df = pd.read_parquet(gcs_path)
                logger.info(f"Loaded {len(df)} rows from {blob.name}")

                # Process in batches
                num_batches = (len(df) + batch_size - 1) // batch_size

                for batch_idx in range(num_batches):
                    start_idx = batch_idx * batch_size
                    end_idx = min(start_idx + batch_size, len(df))
                    batch_df = df.iloc[start_idx:end_idx]

                    documents = []
                    metadatas = []
                    ids = []
                    embeddings = []

                    logger.info(f"  Processing batch {batch_idx + 1}/{num_batches} ({len(batch_df)} rows)")

                    for row_idx, (_, row) in enumerate(batch_df.iterrows()):
                        fire_data = row.to_dict()

                        # Convert NaN values to None
                        for key, value in fire_data.items():
                            if pd.isna(value):
                                fire_data[key] = None

                        # Create document
                        doc_text = create_fire_document_from_parquet(fire_data)
                        documents.append(doc_text)

                        # Generate embedding
                        try:
                            embedding = generate_embedding(doc_text)
                            embeddings.append(embedding)
                        except Exception as e:
                            logger.warning(f"Failed to generate embedding for row {row_idx}: {e}")
                            embeddings.append([0.0] * 768)  # Fallback

                        # Create metadata
                        metadata = {
                            "file_name": blob.name,
                            "row_index": str(start_idx + row_idx),
                            "state": str(fire_data.get('state', '')),
                            "county": str(fire_data.get('county', '')),
                            "year": int(fire_data.get('year', 0)) if fire_data.get('year') else 0,
                            "duration": float(fire_data.get('duration', 0) or 0),
                            "risk": float(fire_data.get('risk', 0) or 0),
                            "latitude": float(fire_data.get('latitude', 0) or 0),
                            "longitude": float(fire_data.get('longitude', 0) or 0),
                        }
                        metadatas.append(metadata)

                        # Create unique ID
                        unique_id = f"fire_{file_idx}_{start_idx + row_idx}"
                        ids.append(unique_id)

                    # Store batch in ChromaDB
                    if embeddings and documents:
                        try:
                            collection.add(
                                embeddings=embeddings,
                                documents=documents,
                                metadatas=metadatas,
                                ids=ids
                            )
                            total_rows_processed += len(documents)
                            logger.info(f"  Stored batch {batch_idx + 1} with {len(documents)} documents")
                        except Exception as e:
                            logger.error(f"Error storing batch: {e}")

                    # Small delay to avoid rate limits
                    await asyncio.sleep(0.1)

            except Exception as e:
                logger.error(f"Error processing file {blob.name}: {e}")
                continue

        logger.info(f"Embedding completed! Total rows processed: {total_rows_processed}")

    except Exception as e:
        logger.error(f"Error in load_parquet_files_from_gcs: {e}")
        raise

def check_query_relevance(query: str) -> bool:
    """Check if a query is relevant to wildfire topics"""

    wildfire_keywords = [
        'fire', 'wildfire', 'burn', 'smoke', 'flame', 'ignition', 'combustion',
        'forest', 'vegetation', 'fuel', 'weather', 'drought', 'wind', 'temperature',
        'humidity', 'precipitation', 'emission', 'risk', 'danger', 'hazard',
        'suppression', 'prevention', 'management', 'evacuation', 'safety',
        'climate', 'season', 'environmental', 'ecology', 'habitat'
    ]

    query_lower = query.lower()
    return any(keyword in query_lower for keyword in wildfire_keywords)

async def load_embeddings_from_bigquery(
    max_rows: int = 50000,
    batch_size: int = 512,
) -> None:
    """
    Load precomputed embeddings from BigQuery into ChromaDB.

    Uses:
      - BQ_EMBEDDINGS_TABLE: global_fire_event_id + embedding
      - BQ_INPUTS_TABLE:     feature row per global_fire_event_id

    For each row, we:
      1) Build a RAG document with `create_fire_document_from_parquet`
      2) Add (embedding, document, metadata, id) into Chroma
    """
    global bq_client, collection

    try:
        logger.info(
            f"Starting BigQuery → ChromaDB load for up to {max_rows} rows "
            f"from {BQ_PROJECT_ID}.{BQ_DATASET}.{BQ_EMBEDDINGS_TABLE}"
        )

        # Ensure clients exist
        if bq_client is None or collection is None:
            initialize_ai_components()

        # BigQuery query to join embeddings + inputs
        sql = f"""
        SELECT
          e.global_fire_event_id,
          e.embedding,
          TO_JSON_STRING(i) AS instance_json
        FROM `{BQ_PROJECT_ID}.{BQ_DATASET}.{BQ_EMBEDDINGS_TABLE}` AS e
        JOIN `{BQ_PROJECT_ID}.{BQ_DATASET}.{BQ_INPUTS_TABLE}` AS i
        USING (global_fire_event_id)
        LIMIT @max_rows
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("max_rows", "INT64", max_rows),
            ]
        )

        query_job = bq_client.query(sql, job_config=job_config)

        batch_docs: List[str] = []
        batch_embs: List[List[float]] = []
        batch_meta: List[Dict[str, Any]] = []
        batch_ids: List[str] = []
        total_added = 0

        def flush_batch():
            nonlocal batch_docs, batch_embs, batch_meta, batch_ids, total_added
            if not batch_ids:
                return
            try:
                collection.add(
                    embeddings=batch_embs,
                    documents=batch_docs,
                    metadatas=batch_meta,
                    ids=batch_ids,
                )
                total_added += len(batch_ids)
                logger.info(
                    f"Added batch of {len(batch_ids)} embeddings to ChromaDB "
                    f"(total={total_added})"
                )
            except Exception as e:
                logger.error(f"Failed to add batch to ChromaDB: {e}")
            # reset batch
            batch_docs, batch_embs, batch_meta, batch_ids = [], [], [], []

        # Stream rows and build Chroma docs
        for row in query_job:
            gid = row["global_fire_event_id"]
            embedding = list(row["embedding"]) if row["embedding"] is not None else []

            # Features as dict
            instance_dict = json.loads(row["instance_json"])

            # Build RAG document from your existing helper
            doc_text = create_fire_document_from_parquet(instance_dict)

            # Minimal but useful metadata
            meta = {
                "global_fire_event_id": gid,
                "state": instance_dict.get("state"),
                "county": instance_dict.get("county"),
                "year": instance_dict.get("year"),
                "duration": instance_dict.get("duration"),
                "risk": instance_dict.get("risk"),
                "latitude": instance_dict.get("latitude"),
                "longitude": instance_dict.get("longitude"),
                "season": instance_dict.get("season"),
                "month": instance_dict.get("month"),
                "doy": instance_dict.get("doy"),
            }

            batch_ids.append(str(gid))
            batch_embs.append(embedding)
            batch_docs.append(doc_text)
            batch_meta.append(meta)

            if len(batch_ids) >= batch_size:
                flush_batch()
                # yield control a bit so we don't block event loop too hard
                await asyncio.sleep(0.05)

        # Final partial batch
        flush_batch()
        logger.info(
            f"Completed BigQuery → ChromaDB embedding load; total events added: {total_added}"
        )

    except Exception as e:
        logger.error(f"Error in load_embeddings_from_bigquery: {e}")
        raise



async def search_similar_fires(
    query: str,
    location_filter: Optional[Dict] = None,
    max_results: int = 5,
) -> List[Dict[str, Any]]:
    """
    Search for similar fire events using precomputed embeddings in BigQuery
    with the VECTOR_SEARCH function (COSINE distance).

    Steps:
      1) Embed the user query with Gemini.
      2) Use VECTOR_SEARCH over `{BQ_EMBEDDINGS_TABLE}.embedding` to get top-k
         `global_fire_event_id` + cosine distance.
      3) Join those IDs to the feature/input table (BQ_INPUTS_TABLE).
      4) Build RAG-ready documents + metadata in Python.

    Returns a list of dicts:
      {
        "document": <string for RAG>,
        "metadata": {...},
        "distance": <float>,   # smaller = more similar (COSINE)
      }
    """
    global bq_client

    try:
        if bq_client is None:
            initialize_ai_components()

        # 1) Embed the user query with Gemini (same model as in BQ)
        query_embedding = generate_embedding(query)  # length 768

        # Ask for more candidates than final max_results
        candidate_k = max_results * 5

        # ---------- STEP 1: VECTOR_SEARCH on embeddings table ----------

        # We pass the embedding as an ARRAY<FLOAT64> parameter and feed it
        # into VECTOR_SEARCH via a small query table:
        #
        #   (SELECT @query_embedding AS embedding, 'query_vector' AS id)
        #
        # The embedding column name must match the second argument to VECTOR_SEARCH.
        query_params_step1: List[bigquery.ScalarQueryParameter] = [
            bigquery.ArrayQueryParameter(
                "query_embedding", "FLOAT64", query_embedding
            ),
            bigquery.ScalarQueryParameter("candidate_k", "INT64", candidate_k),
        ]

        sql_step1 = f"""
        WITH search_results AS (
          SELECT
            base.global_fire_event_id AS global_fire_event_id,
            distance
          FROM VECTOR_SEARCH(
            TABLE `{BQ_PROJECT_ID}.{BQ_DATASET}.{BQ_EMBEDDINGS_TABLE}`,
            'embedding',
            (SELECT @query_embedding AS embedding, 'query_vector' AS id),
            top_k      => @candidate_k,
            distance_type => 'COSINE'
          )
        )
        SELECT
          global_fire_event_id,
          distance
        FROM search_results
        ORDER BY distance ASC
        """

        job_config_step1 = bigquery.QueryJobConfig(query_parameters=query_params_step1)
        rows_step1 = list(bq_client.query(sql_step1, job_config=job_config_step1))

        if not rows_step1:
            return []

        id_list: List[str] = []
        dist_map: Dict[str, float] = {}
        for row in rows_step1:
            gid = row["global_fire_event_id"]
            dist = float(row["distance"])
            id_list.append(gid)
            dist_map[gid] = dist

        # ---------- STEP 2: fetch feature rows for those IDs ----------

        if not id_list:
            return []

        query_params_step2: List[bigquery.ScalarQueryParameter] = [
            bigquery.ArrayQueryParameter("id_list", "STRING", id_list),
        ]

        sql_step2 = f"""
        SELECT
          global_fire_event_id,
          TO_JSON_STRING(i) AS instance_json
        FROM `{BQ_PROJECT_ID}.{BQ_DATASET}.{BQ_INPUTS_TABLE}` AS i
        WHERE global_fire_event_id IN UNNEST(@id_list)
        """

        job_config_step2 = bigquery.QueryJobConfig(query_parameters=query_params_step2)
        rows_step2 = list(bq_client.query(sql_step2, job_config=job_config_step2))

        # Map ID -> full instance dict
        instance_map: Dict[str, Dict[str, Any]] = {}
        for row in rows_step2:
            gid = row["global_fire_event_id"]
            instance_dict = json.loads(row["instance_json"])
            instance_map[gid] = instance_dict

        # ---------- STEP 3: build results list and apply optional location_filter ----------

        results: List[Dict[str, Any]] = []

        def matches_location(meta: Dict[str, Any]) -> bool:
            if not location_filter:
                return True
            lf_state = location_filter.get("state")
            lf_county = location_filter.get("county")
            if lf_state and (meta.get("state") != lf_state):
                return False
            if lf_county and (meta.get("county") != lf_county):
                return False
            return True

        for gid in id_list:
            instance_dict = instance_map.get(gid)
            if not instance_dict:
                continue

            # Build the human-readable document from the instance dict
            doc_text = create_fire_document_from_parquet(instance_dict)

            meta = {
                "global_fire_event_id": gid,
                "state": instance_dict.get("state"),
                "county": instance_dict.get("county"),
                "duration": instance_dict.get("duration"),
                "risk": instance_dict.get("risk"),
                "latitude": instance_dict.get("latitude"),
                "longitude": instance_dict.get("longitude"),
                "doy": instance_dict.get("doy"),
                "month": instance_dict.get("month"),
                "season": instance_dict.get("season"),
            }

            if not matches_location(meta):
                continue

            distance = dist_map.get(gid, 0.0)

            results.append(
                {
                    "document": doc_text,
                    "metadata": meta,
                    "distance": float(distance),
                }
            )

            if len(results) >= max_results:
                break

        return results

    except Exception as e:
        logger.error(f"Error searching similar fires via BigQuery VECTOR_SEARCH: {e}")
        raise

async def generate_fire_analysis(fire_data: Dict, query: str) -> str:
    """Generate analysis for specific fire prediction data (no RAG needed)"""

    try:
        # Extract key information
        input_data = fire_data.get('input', {})
        imputed_data = fire_data.get('imputed', {})
        predictions = fire_data.get('predictions', {})

        # Create comprehensive prompt
        prompt = f"""
Analyze this wildfire prediction data and provide a direct, concise response.

FIRE DATA:
- Location: {imputed_data.get('state', 'Unknown')}, {imputed_data.get('county', 'Unknown')}
- Risk Level: {imputed_data.get('risk', 'N/A')}/10
- Predicted Duration: {predictions.get('duration', 'N/A')} days
- Day of Year: {imputed_data.get('doy', 'N/A')} (Season: {imputed_data.get('season', 'N/A')})
- Fire Danger Index: {imputed_data.get('bi_value', 'N/A')}
- Fuel Moisture: {imputed_data.get('fm100_value', 'N/A')}%
- Humidity: {imputed_data.get('rmax_value', 'N/A')}%
- Wind Speed: {imputed_data.get('vs_value', 'N/A')}
- End Tomorrow Probability: {predictions.get('end_tomorrow_prob', 'N/A')}

USER QUESTION: {query}

Provide a direct analysis in exactly 50-75 words. Focus on key risk factors and management implications. No introductory phrases.
"""

        # Try different models in order of preference
        models_to_try = [
            LLM_MODEL,  # User's configured model
            "gemini-2.5-flash",  # Fallback
            "gemini-2.5-pro"  # Fallback
        ]

        for model_name in models_to_try:
            try:
                logger.info(f"Trying model: {model_name}")
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
                        {
                            "category": "HARM_CATEGORY_HARASSMENT",
                            "threshold": "BLOCK_NONE"
                        },
                        {
                            "category": "HARM_CATEGORY_HATE_SPEECH",
                            "threshold": "BLOCK_NONE"
                        },
                        {
                            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            "threshold": "BLOCK_NONE"
                        },
                        {
                            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                            "threshold": "BLOCK_NONE"
                        }
                    ]
                )

                # Check if response has valid content
                if response.candidates and response.candidates[0].content.parts:
                    logger.info(f"Successfully used model: {model_name}")
                    return response.text
                else:
                    logger.warning(f"Model {model_name} response blocked by safety filters")
                    continue

            except Exception as model_error:
                logger.warning(f"Model {model_name} failed: {model_error}")
                continue

        # If all models failed, provide a detailed fallback response
        return f"""This Park County, Wyoming fire shows moderate risk ({imputed_data.get('risk', 'N/A')}/10) with {predictions.get('duration', 'N/A')}-day predicted duration. Summer timing (day {imputed_data.get('doy', 'N/A')}) and {imputed_data.get('bi_value', 'N/A')} fire danger index indicate active conditions. Low end-probability ({predictions.get('end_tomorrow_prob', 'N/A')}) suggests multi-day suppression needed. Fuel moisture at {imputed_data.get('fm100_value', 'N/A')}% requires monitoring."""

    except Exception as e:
        logger.error(f"Error generating fire analysis: {e}")
        return f"I encountered an error while analyzing this fire prediction. The data shows this fire in {imputed_data.get('state', 'unknown location')} with a predicted duration of {predictions.get('duration', 'unknown')} days and risk level of {imputed_data.get('risk', 'unknown')}/10."


async def generate_general_rag_response(query: str, context_docs: List[str],
                                    metadata: List[Dict]) -> str:
    """Generate response for general queries using RAG."""

    try:
        # Use only the first few docs for context
        context_text = "\n\n".join(context_docs[:3])

        # Create locations summary
        locations = []
        for meta in metadata[:3]:
            location = f"{meta.get('county', '')}, {meta.get('state', '')}"
            if location not in locations and location.strip() != ",":
                locations.append(location)

        location_context = f"Based on historical fires from: {', '.join(locations)}" if locations else ""

        prompt = f"""
You are an expert wildfire analyst.

USER QUESTION:
{query}

RETRIEVED FIRE DATA (may contain missing values):
{context_text}

{location_context}

Instructions:
- Give a clear, technically accurate answer to the USER QUESTION.
- Use patterns from the retrieved fire data when they are informative,
  but do NOT complain about missing or "Unknown" values.
- You may also rely on general wildfire science knowledge.
- Focus on weather, fuel, and fire-behavior mechanisms as relevant.
- Write in plain language for an educated public audience.

CRITICAL CONSTRAINT:
- Answer in 100–125 words, one concise paragraph. No headings, no lists.
"""

        models_to_try = [
            LLM_MODEL,
            "gemini-2.5-flash",
            "gemini-2.5-pro"
        ]

        for model_name in models_to_try:
            try:
                logger.info(f"Trying model: {model_name}")
                model = genai.GenerativeModel(model_name)

                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=220,  # ~100–125 words
                        temperature=0.3,
                        top_p=0.8,
                        top_k=40,
                    ),
                    safety_settings=[
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                    ],
                )

                #New: trust response.text instead of inspecting candidates/parts
                if getattr(response, "text", None):
                    logger.info(f"Successfully used model: {model_name}")
                    return response.text.strip()
                else:
                    logger.warning(
                        f"Model {model_name} returned no text. Raw response: {response}"
                    )
                    continue

            except Exception as model_error:
                logger.warning(f"Model {model_name} failed: {model_error}")
                continue

        # Fallback if all models fail
        if context_text:
            return (
                f"Here is a brief analysis of your question about wildfires: {query}. "
                "High-risk days usually combine hot, dry, windy weather with very dry fine fuels, "
                "while low-risk days are cooler, more humid, and follow recent rain, keeping fuels moist. "
                "These differences strongly affect ignition likelihood, rate of spread, and fire intensity."
            )
        else:
            return (
                "High wildfire risk days are typically hotter, drier, and windier, with very dry fuels that "
                "ignite and spread easily. Low-risk days are cooler, more humid, and often follow rain, so "
                "fuels remain moist and resistant to ignition."
            )

    except Exception as e:
        logger.error(f"Error generating general response: {e}")
        return (
            "I encountered an error while processing your query, but in general, high wildfire risk days "
            "feature hot, dry, windy conditions and dry fuels, while low-risk days have cooler, more humid "
            "weather and moist fuels."
        )

def infer_location_from_query(query: str) -> Optional[Dict[str, str]]:
    """
    Very simple NER-lite: look for US state names in the query and return
    a location_filter dict if found.
    """
    query_lower = query.lower()

    us_states = [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
        "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
        "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
        "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
        "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
        "New Hampshire", "New Jersey", "New Mexico", "New York",
        "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
        "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
        "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
        "West Virginia", "Wisconsin", "Wyoming"
    ]

    for state_name in us_states:
        if state_name.lower() in query_lower:
            # Your BQ table uses full names like "Florida", so we keep that form
            return {"state": state_name}

    return None


async def generate_general_response(query: str, conversation_context: str = "") -> str:
    """
    Generate friendly, conversational response to general queries about the platform.
    Uses knowledge base and focuses on being helpful, warm, and climate-conscious.
    """

    try:
        # Load knowledge base
        knowledge_base = load_knowledge_base()

        # Build system prompt - friendly, conversational, climate-focused
        system_prompt = """You are a friendly and knowledgeable AI assistant for a wildfire prediction platform designed to combat climate change.

PERSONALITY & TONE:
- Be warm, conversational, and enthusiastic about helping
- Show genuine concern for climate change and wildfire impacts
- Use natural, flowing language - avoid bullet points unless specifically requested
- Be encouraging and supportive
- Keep responses concise (60-80 words) — short and crisp, no filler
- Use "we" and "our" when talking about the platform's mission

KNOWLEDGE:
You have access to comprehensive information about:
- The platform's three tabs (Fire Forecast, Emissions, Behind the Scenes)
- Key Performance Indicators (KPIs) and what they mean
- Machine learning models and their performance
- How wildfires contribute to climate change
- How to use different features
- Historical wildfire patterns and data

CONVERSATION STYLE:
- Start with a warm acknowledgment
- Explain concepts clearly without being condescending
- Connect information to the bigger picture (climate impact) when relevant
- Offer to explain more if the topic is complex
- End naturally without forced questions

AVOID:
- Overly technical jargon without explanation
- Lengthy bullet-pointed lists (use prose instead)
- Robotic or corporate language
- Apologizing unnecessarily
- Saying "I don't have access" (you do have the knowledge base!)

PLATFORM KNOWLEDGE:
"""

        system_prompt += f"\n{knowledge_base}\n"

        # Build user prompt with context if available
        if conversation_context:
            user_prompt = f"""Previous conversation:
{conversation_context}

Current question: {query}

Please answer naturally, building on our previous conversation when relevant. Stay conversational and warm."""
        else:
            user_prompt = f"""User's question: {query}

Please provide a friendly, conversational response that helps them understand. Remember to stay warm and connect to our mission of combating climate change through better wildfire prediction."""

        # Try Gemini models in order
        models_to_try = [
            LLM_MODEL,
            "gemini-2.5-flash",
            "gemini-2.5-pro"
        ]

        for model_name in models_to_try:
            try:
                logger.info(f"Attempting general response with {model_name}")

                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config={
                        "temperature": 0.8,  # More creative for conversational tone
                        "top_p": 0.9,
                        "top_k": 40,
                        "max_output_tokens": 2000,
                    }
                )

                full_prompt = f"{system_prompt}\n\n{user_prompt}"

                response = model.generate_content(full_prompt)

                if response and response.text:
                    answer = response.text.strip()
                    logger.info(f"✓ Generated response with {model_name}")
                    return answer

            except Exception as model_error:
                logger.warning(f"Model {model_name} failed: {model_error}")
                continue

        # Fallback if all models fail
        return f"""Thanks for asking! I'd love to help you understand more about our wildfire prediction platform. 

While I'm having a brief technical hiccup accessing my full knowledge base, I can tell you that we're working with over 7.5 million wildfire records to help predict and understand fire behavior. Our platform has three main sections: Fire Forecast for predictions, Emissions for environmental impact, and Behind the Scenes for model transparency.

Could you ask your question again? I should be able to give you a better answer!"""

    except Exception as e:
        logger.error(f"Error generating general response: {e}")
        return f"""I appreciate your question about our platform! We're building tools to predict wildfire behavior and understand their climate impact using advanced machine learning.

I'd love to help you specifically, but I'm experiencing a technical issue. Could you try asking again, or let me know if you'd like information about a specific feature like our risk heat maps, emissions data, or prediction models?"""


# API Endpoints

@router.post("/analyze-fire", response_model=AIResponse)
async def analyze_fire_prediction(request: FireAnalysisRequest):
    """Analyze specific fire prediction data with conversation memory support"""

    start_time = datetime.now()

    try:
        # Ensure AI components are initialized
        if collection is None:
            initialize_ai_components()

        # Determine if this is a new conversation or follow-up
        existing_session = None
        conversation_context = ""

        if request.session_id:
            # This is a follow-up question
            existing_session = get_session(request.session_id)

            if existing_session:
                logger.info(f"Follow-up query for session: {request.session_id}")
                # Use fire_data from session
                fire_data = existing_session['fire_data']

                # Build conversation context from history
                conversation_context = build_conversation_context(existing_session, max_turns=3)

            else:
                # Session not found or expired
                logger.warning(f"Session not found: {request.session_id}")
                if not request.fire_data:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Session {request.session_id} not found or expired. Please provide fire_data for new analysis."
                    )
                # Fall back to new session with provided fire_data
                fire_data = request.fire_data.dict()
        else:
            # New conversation - fire_data is required
            if not request.fire_data:
                raise HTTPException(
                    status_code=400,
                    detail="fire_data is required for new fire analysis"
                )
            fire_data = request.fire_data.dict()

        # Generate analysis with or without conversation context
        if conversation_context:
            # Include previous conversation in prompt
            enhanced_query = f"""Previous conversation about this fire:
{conversation_context}

Current question: {request.query}

Please answer the current question naturally, referencing previous context when relevant. Keep your response focused and concise (50-75 words).
"""
            answer = await generate_fire_analysis(
                fire_data=fire_data,
                query=enhanced_query
            )
        else:
            # First question - no context needed
            answer = await generate_fire_analysis(
                fire_data=fire_data,
                query=request.query
            )

        # Create or update session
        if existing_session:
            # Add this turn to existing session
            session_id = request.session_id
            add_to_conversation(session_id, request.query, answer)
        else:
            # Create new session
            session_id = create_session(fire_data, request.query, answer)

        # Prepare response
        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        imputed = fire_data.get('imputed', {})
        source_info = {
            "type": "fire_prediction",
            "location": f"{imputed.get('county', 'Unknown')}, {imputed.get('state', 'Unknown')}",
            "coordinates": f"({imputed.get('latitude', 'N/A')}, {imputed.get('longitude', 'N/A')})",
            "risk_level": imputed.get('risk', 'Unknown'),
            "predicted_duration": fire_data.get('predictions', {}).get('duration', 'Unknown'),
            "season": imputed.get('season', 'Unknown'),
            "day_of_year": imputed.get('doy', 'Unknown')
        }

        return AIResponse(
            session_id=session_id,  # Return session_id for follow-ups
            answer=answer,
            sources=[source_info],
            confidence_score=1.0,
            query_type="fire_analysis_followup" if existing_session else "fire_analysis",
            processing_time_ms=round(processing_time, 2),
            is_relevant=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in fire analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Fire analysis error: {str(e)}")


@router.post("/query-sql", response_model=SQLQueryResponse)
async def query_with_sql_generation(request: SQLQueryRequest):
    """Production-grade SQL query endpoint"""

    start_time = datetime.now()

    try:
        # Relevance check
        if not check_query_relevance(request.query):
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return SQLQueryResponse(
                answer="Please ask questions about wildfires, fire behavior, weather conditions, or fire management.",
                sql_query="",
                sources=[],
                rows_retrieved=0,
                confidence_score=0.0,
                query_type="irrelevant",
                processing_time_ms=round(processing_time, 2),
                is_relevant=False
            )

        # Generate SQL
        logger.info(f"Processing query: {request.query}")
        sql_query = await sql_generator.generate_sql(request.query, request.max_results)

        # Execute SQL
        df = await execute_sql_query(sql_query)

        # Handle empty results
        if df.empty:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return SQLQueryResponse(
                answer="No wildfire events matched your criteria. Try broadening your search parameters or asking about a different location or time period.",
                sql_query=sql_query,
                sources=[],
                rows_retrieved=0,
                confidence_score=0.0,
                query_type="sql_query",
                processing_time_ms=round(processing_time, 2),
                is_relevant=True
            )

        # Generate answer
        answer = await generate_answer_from_sql_results(request.query, df, sql_query)

        # Format sources
        sources = []
        for idx, row in df.head(request.max_results).iterrows():
            source = {"type": "sql_result", "rank": idx + 1}

            for col in ['global_fire_event_id', 'state', 'county', 'risk', 'duration',
                        'latitude', 'longitude', 'bi_value', 'fm100_value']:
                if col in row:
                    val = row[col]
                    if pd.notna(val):
                        source[col] = float(val) if isinstance(val, (np.integer, np.floating)) else val

            if 'county' in row and 'state' in row:
                county = row['county'] if pd.notna(row['county']) else 'Unknown'
                state = row['state'] if pd.notna(row['state']) else 'Unknown'
                source['location'] = f"{county}, {state}"

            sources.append(source)

        # Calculate confidence
        confidence_score = min(1.0, len(df) / (request.max_results * 2))

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return SQLQueryResponse(
            answer=answer,
            sql_query=sql_query,
            sources=sources,
            rows_retrieved=len(df),
            confidence_score=round(confidence_score, 3),
            query_type="sql_query",
            processing_time_ms=round(processing_time, 2),
            is_relevant=True
        )

    except Exception as e:
        logger.error(f"Error in SQL query endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Query processing error: {str(e)}"
        )

@router.post("/query-bq", response_model=AIResponse)
async def general_wildfire_query(request: GeneralQueryRequest):
    """Answer general wildfire questions using RAG over BigQuery embeddings"""

    start_time = datetime.now()

    try:
        # 1) Relevancy check
        if not check_query_relevance(request.query):
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return AIResponse(
                answer=(
                    "I apologize, but your query doesn't appear to be related to "
                    "wildfire topics. Please ask questions about wildfires, fire behavior, "
                    "environmental conditions, fire management, or related topics."
                ),
                sources=[],
                confidence_score=0.0,
                query_type="irrelevant",
                processing_time_ms=round(processing_time, 2),
                is_relevant=False,
            )

        # 2) Ensure AI components (including BigQuery) are ready
        if bq_client is None:
            initialize_ai_components()

        # NEW: derive an effective location_filter
        effective_location_filter = request.location_filter
        if effective_location_filter is None:
            inferred = infer_location_from_query(request.query)
            if inferred:
                logger.info(f"Inferred location filter from query: {inferred}")
                effective_location_filter = inferred

        # 3) Vector search in BigQuery
        neighbors = await search_similar_fires(
            query=request.query,
            location_filter=effective_location_filter,
            max_results=request.max_results,
        )

        if not neighbors:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return AIResponse(
                answer=(
                    "I couldn't find relevant wildfire events for your query in the "
                    "historical dataset. Try narrowing the question to a specific "
                    "state, season, or risk pattern."
                ),
                sources=[],
                confidence_score=0.0,
                query_type="general_analysis",
                processing_time_ms=round(processing_time, 2),
                is_relevant=True,
            )

        documents = [n["document"] for n in neighbors]
        metadatas = [n["metadata"] for n in neighbors]
        distances = [n["distance"] for n in neighbors]

        # 4) Confidence: smaller distance => higher similarity
        avg_distance = sum(distances) / len(distances)
        confidence_score = max(0.0, 1.0 - avg_distance)

        # 5) LLM RAG response
        answer = await generate_general_response(request.query, documents, metadatas)

        # 6) Prepare sources
        sources: List[Dict[str, Any]] = []
        for rank, (meta, dist) in enumerate(zip(metadatas, distances), start=1):
            relevance_score = max(0.0, 1.0 - dist)
            sources.append(
                {
                    "type": "fire_data",
                    "global_fire_event_id": meta.get("global_fire_event_id"),
                    "location": f"{meta.get("county", "")}, {meta.get("state", "")}",
                    "year": meta.get("year", ""),
                    "duration": meta.get("duration", 0),
                    "risk": meta.get("risk", 0),
                    "relevance_score": round(relevance_score, 3),
                    "rank": rank,
                    "data_source": f"{BQ_PROJECT_ID}.{BQ_DATASET}.{BQ_INPUTS_TABLE}",
                }
            )

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return AIResponse(
            answer=answer,
            sources=sources,
            confidence_score=round(confidence_score, 3),
            query_type="general_analysis",
            processing_time_ms=round(processing_time, 2),
            is_relevant=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in general query: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing error: {str(e)}")


@router.post("/query", response_model=AIResponse)
async def handle_general_query(request: QueryRequest):
    """
    Handle general conversational queries about the platform, wildfires, KPIs, and features.
    Supports follow-up questions through session management.
    """

    start_time = datetime.now()

    try:
        # Ensure AI components are initialized
        if collection is None:
            initialize_ai_components()

        # Check for existing session (follow-up question)
        existing_session = None
        conversation_context = ""

        if request.session_id:
            existing_session = get_session(request.session_id)

            if existing_session:
                logger.info(f"Follow-up query for session: {request.session_id}")
                # Build conversation context
                conversation_context = build_conversation_context(existing_session, max_turns=3)
            else:
                logger.warning(f"Session not found: {request.session_id}")
                # Continue with new session

        # Generate conversational response
        answer = await generate_general_response(
            query=request.query,
            conversation_context=conversation_context
        )

        # Create or update session
        if existing_session:
            # Add to existing session
            session_id = request.session_id
            add_to_conversation(session_id, request.query, answer)
        else:
            # Create new session
            session_id = create_general_session(
                initial_query=request.query,
                initial_answer=answer,
                query_type="general"
            )

        # Clean up expired sessions in background
        cleanup_expired_sessions()

        # Prepare response
        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        source_info = {
            "type": "platform_knowledge",
            "description": "Wildfire Prediction Platform Documentation",
            "coverage": "Platform features, KPIs, ML models, climate impact",
            "data_period": "2003-2015 training data"
        }

        return AIResponse(
            session_id=session_id,
            answer=answer,
            sources=[source_info],
            confidence_score=0.95,
            query_type="general_platform_query",
            processing_time_ms=processing_time,
            is_relevant=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in general query endpoint: {e}", exc_info=True)

        # Return friendly error message
        error_response = """I'm really sorry, but I'm experiencing a technical issue right now. 

Our wildfire prediction platform is still working great - this is just a hiccup with the chat assistant. You can still explore the risk heat map, check emissions data, and use all the prediction features.

Please try your question again in a moment, or feel free to explore the platform while I get back up to speed!"""

        return AIResponse(
            session_id=None,
            answer=error_response,
            sources=[],
            confidence_score=0.0,
            query_type="error",
            processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            is_relevant=False
        )

@router.get("/sessions")
async def list_sessions():
    """List all active conversation sessions"""
    with session_lock:
        sessions = []
        for session_id, session in session_store.items():
            sessions.append({
                "session_id": session_id,
                "created_at": session['created_at'].isoformat(),
                "last_accessed": session['last_accessed'].isoformat(),
                "location": session['metadata']['location'],
                "risk_level": session['metadata']['risk_level'],
                "conversation_turns": len(session['conversation_history']) // 2
            })

        # Sort by last accessed (most recent first)
        sessions.sort(key=lambda x: x['last_accessed'], reverse=True)

        return {
            "sessions": sessions,
            "total": len(sessions),
            "active_sessions": len(session_store)
        }


@router.get("/sessions/{session_id}")
async def get_session_details(session_id: str):
    """Get full details of a specific conversation session"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found or has expired"
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


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a specific conversation session"""
    with session_lock:
        if session_id in session_store:
            metadata = session_store[session_id]['metadata']
            del session_store[session_id]
            logger.info(f"Manually deleted session: {session_id}")
            return {
                "message": "Session deleted successfully",
                "session_id": session_id,
                "location": metadata['location']
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )


@router.post("/sessions/cleanup")
async def manual_cleanup_sessions():
    """Manually trigger cleanup of expired sessions"""
    cleaned_count = cleanup_expired_sessions()

    with session_lock:
        active_count = len(session_store)

    return {
        "message": "Session cleanup completed",
        "expired_sessions_removed": cleaned_count,
        "active_sessions_remaining": active_count
    }


@router.post("/initialize-database")
async def initialize_database(background_tasks: BackgroundTasks, max_files: int = 10):
    """Initialize the ChromaDB database with GCS parquet data"""

    try:
        if collection is None:
            initialize_ai_components()

        # Clear existing data
        try:
            # ChromaDB requires a where clause for delete, so delete all with a catch-all
            try:
                collection.delete(where={"file_name": {"$ne": ""}})
            except:
                # If that fails, try alternative approaches
                collection.delete(ids=collection.get()["ids"])
            logger.info("Cleared existing ChromaDB data")
        except Exception as e:
            logger.warning(f"Could not clear existing data: {e}")

        # Start background task
        background_tasks.add_task(load_parquet_files_from_gcs, max_files=max_files)

        return {
            "message": "Database initialization started",
            "status": "processing",
            "max_files": max_files,
            "data_source": f"gs://{GCS_BUCKET}/{PARQUET_PATH}",
            "estimated_time_minutes": max_files * 2  # Rough estimate
        }

    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise HTTPException(status_code=500, detail=f"Database initialization error: {str(e)}")

@router.post("/initialize-embeddings")
async def initialize_embeddings(
    background_tasks: BackgroundTasks,
    max_rows: int = 50000,
    batch_size: int = 512,
):
    """
    Initialize the ChromaDB collection using *precomputed embeddings* from BigQuery.

    - Clears existing Chroma vectors
    - Streams up to `max_rows` rows from BQ_EMBEDDINGS_TABLE joined with BQ_INPUTS_TABLE
    - Rebuilds the vector store purely from those embeddings
    """

    try:
        # Ensure AI components are ready
        if collection is None or bq_client is None:
            initialize_ai_components()

        # Clear existing data in ChromaDB (same pattern as /initialize-database)
        try:
            try:
                # delete everything via where-clause
                collection.delete(where={"global_fire_event_id": {"$ne": ""}})
            except Exception:
                # fallback: delete by explicit ids
                existing = collection.get()
                ids = existing.get("ids", []) if existing else []
                if ids:
                    collection.delete(ids=ids)
            logger.info("Cleared existing ChromaDB data before loading embeddings")
        except Exception as e:
            logger.warning(f"Could not clear existing ChromaDB data: {e}")

        # Kick off BigQuery → Chroma load in the background
        background_tasks.add_task(
            load_embeddings_from_bigquery,
            max_rows=max_rows,
            batch_size=batch_size,
        )

        return {
            "message": "Embedding initialization started",
            "status": "processing",
            "source": "bigquery",
            "project_id": BQ_PROJECT_ID,
            "dataset": BQ_DATASET,
            "embeddings_table": BQ_EMBEDDINGS_TABLE,
            "inputs_table": BQ_INPUTS_TABLE,
            "max_rows": max_rows,
            "batch_size": batch_size,
        }

    except Exception as e:
        logger.error(f"Error initializing embeddings: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Embedding initialization error: {str(e)}",
        )


@router.get("/status", response_model=DatabaseStatus)
async def get_status():
    """Get AI Assistant status"""

    try:
        if collection is None:
            try:
                initialize_ai_components()
            except Exception as e:
                return DatabaseStatus(
                    status="error",
                    document_count=0,
                    embedding_model=EMBEDDING_MODEL,
                    llm_model=LLM_MODEL
                )

        # Get document count
        try:
            document_count = collection.count()
            status = "ready" if document_count > 0 else "empty"
        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            document_count = 0
            status = "error"

        return DatabaseStatus(
            status=status,
            document_count=document_count,
            embedding_model=EMBEDDING_MODEL,
            llm_model=LLM_MODEL,
            last_updated=datetime.now().isoformat(),
            data_source=f"GCS: gs://{GCS_BUCKET}/{PARQUET_PATH}"
        )

    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return DatabaseStatus(
            status="error",
            document_count=0,
            embedding_model=EMBEDDING_MODEL,
            llm_model=LLM_MODEL
        )

@router.delete("/reset-database")
async def reset_database():
    """Reset the ChromaDB database"""

    try:
        if collection is None:
            initialize_ai_components()

        # Delete all documents
        try:
            collection.delete(ids=collection.get()["ids"])
        except:
            pass  # Collection might be empty

        return {"message": "Database reset successfully", "status": "empty"}

    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail=f"Database reset error: {str(e)}")

# Initialize on module import
try:
    initialize_ai_components()
    logger.info("AI Assistant components initialized successfully")
except Exception as e:
    logger.warning(f"Could not initialize AI components on import: {e}")