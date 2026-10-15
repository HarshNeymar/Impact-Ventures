# Sample Inputs for Wildfire AI Assistant Endpoints

## Overview

The AI Assistant has the following endpoint groups:

### Unified Chat (Recommended)
- **`POST /api/orchestrator/chat`** — Single endpoint with LLM-based intent classification. Routes to fire analysis, emissions analysis, or general queries automatically. Supports `web_search` toggle for Google Search grounded responses.

### Standalone Endpoints
1. **`POST /api/ai-assistant/analyze-fire`** — Analyzes a specific fire prediction (uses output from `/predict`)
2. **`POST /api/ai-assistant/query-bq`** — Answers general wildfire questions using RAG with BigQuery vector search
3. **`POST /api/analyze-emissions`** — Analyzes wildfire emission events

### Web-Search Grounded Endpoints (Standalone)
1. **`POST /api/web-search/analyze-fire`** — Fire analysis with Google Search grounding
2. **`POST /api/web-search/query`** — General queries with Google Search grounding
3. **`POST /api/web-search/analyze-emissions`** — Emissions analysis with Google Search grounding

---

## 0. `/api/orchestrator/chat` (Unified Chat)

### Description
Single chat endpoint that **automatically classifies intent** and routes to the appropriate handler. Supports multi-turn conversations with session management and an optional `web_search` toggle for Google Search grounded responses.

### Input Structure
```json
{
  "query": "Your question",
  "session_id": null,
  "fire_data": null,
  "emissions_data": null,
  "web_search": false
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | *(required)* | The user's question |
| `session_id` | `string \| null` | `null` | Session ID for multi-turn conversations |
| `fire_data` | `object \| null` | `null` | Output from `/predict` (for fire analysis) |
| `emissions_data` | `object \| null` | `null` | Emission event data (for emissions analysis) |
| `web_search` | `boolean` | `false` | `true` = Google Search grounded pipeline, `false` = regular pipeline |

### How `web_search` Works
- **`web_search: false`** (default) — Uses the regular AI pipeline (faster, no external web calls). Good for quick responses based on platform knowledge and provided data.
- **`web_search: true`** — Uses a two-step Google Search grounded pipeline: (1) searches the web for relevant context, (2) generates a clean answer using the web findings + provided data. Returns `web_sources`, `search_queries`, and `grounded: true` in the response.

### Intent Classification
The orchestrator uses an LLM to classify the user's intent:
- **`analyze_fire`** — When the query is about fire prediction data (requires `fire_data`)
- **`analyze_emissions`** — When the query is about emissions data (requires `emissions_data`)
- **`general_query`** — General wildfire/platform questions (no data required)

---

### ✅ Example #1: Fire Analysis (Regular)

```json
{
  "query": "What are the key risk factors for this fire?",
  "fire_data": {
    "input": {"latitude": 31.8409, "longitude": -109.294, "doy": 148},
    "imputed": {
      "state": "Arizona", "county": "Cochise",
      "latitude": 31.8383, "longitude": -109.2963,
      "risk": 3.88, "doy": 148, "season": 2, "month": 5,
      "bi_value": 114, "fm100_value": 3.4, "rmax_value": 31.8, "vs_value": 6.3
    },
    "predictions": {
      "duration": 0.24, "end_tomorrow_prob": 0.97,
      "end_tomorrow_label": 1, "adjusted_risk": 0.59
    }
  },
  "web_search": false
}
```

### ✅ Example #2: Fire Analysis with Web Search

```json
{
  "query": "What are the key risk factors and latest fire conditions in Arizona?",
  "fire_data": {
    "input": {"latitude": 31.8409, "longitude": -109.294, "doy": 148},
    "imputed": {
      "state": "Arizona", "county": "Cochise",
      "latitude": 31.8383, "longitude": -109.2963,
      "risk": 3.88, "doy": 148, "season": 2, "month": 5,
      "bi_value": 114, "fm100_value": 3.4, "rmax_value": 31.8, "vs_value": 6.3
    },
    "predictions": {
      "duration": 0.24, "end_tomorrow_prob": 0.97,
      "end_tomorrow_label": 1, "adjusted_risk": 0.59
    }
  },
  "web_search": true
}
```

### ✅ Example #3: General Query (Regular)

```json
{
  "query": "What is this platform?",
  "web_search": false
}
```

### ✅ Example #4: General Query with Web Search

```json
{
  "query": "What are the latest wildfire statistics in the US?",
  "web_search": true
}
```

### ✅ Example #5: Emissions Analysis

```json
{
  "query": "Analyze these emission levels",
  "emissions_data": {
    "state": "California",
    "county": "Los Angeles",
    "year": 2023,
    "emissions": {"co2": 5000, "ch4": 200, "co": 800, "pm2_5": 150},
    "emission_intensity": "High"
  },
  "web_search": false
}
```

### ✅ Example #6: Multi-Turn Conversation

**Turn 1:**
```json
{
  "query": "Analyze this fire prediction",
  "fire_data": { "input": {...}, "imputed": {...}, "predictions": {...} },
  "web_search": false
}
```
Response includes `"session_id": "unified_abc123..."`.

**Turn 2 (follow-up, no need to resend data):**
```json
{
  "query": "What suppression strategies would work best?",
  "session_id": "unified_abc123...",
  "web_search": false
}
```

**Turn 3 (switch to web search for deeper context):**
```json
{
  "query": "What are the latest containment strategies used in Arizona?",
  "session_id": "unified_abc123...",
  "web_search": true
}
```

### Response Structure

```json
{
  "session_id": "unified_abc123...",
  "answer": "Detailed analysis response...",
  "sources": [
    {
      "type": "fire_prediction",
      "location": "Cochise, Arizona",
      "coordinates": "(31.8383, -109.2963)",
      "risk_level": 3.88,
      "predicted_duration": 0.24
    }
  ],
  "web_sources": null,
  "search_queries": null,
  "confidence_score": 1.0,
  "query_type": "analyze_fire",
  "intent": "analyze_fire",
  "context_action": "new",
  "classification_confidence": 0.95,
  "processing_time_ms": 2341.56,
  "is_relevant": true,
  "grounded": false,
  "turns_since_data": 0
}
```

When `web_search: true`:
```json
{
  "web_sources": [
    {"index": 0, "title": "Arizona Wildfire Risk Report 2025", "url": "https://..."},
    {"index": 1, "title": "NIFC Fire Statistics", "url": "https://..."}
  ],
  "search_queries": ["Arizona wildfire risk factors 2025", "Cochise County fire conditions"],
  "grounded": true
}
```

### Session Management Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/orchestrator/sessions` | List all active sessions |
| GET | `/api/orchestrator/sessions/{session_id}` | Get session details |
| DELETE | `/api/orchestrator/sessions/{session_id}` | Delete a session |
| POST | `/api/orchestrator/sessions/cleanup` | Cleanup expired sessions |
| GET | `/api/orchestrator/health` | Health check |

---

## 1. `/api/ai-assistant/analyze-fire` (Standalone)

### Description
Standalone endpoint that takes the **output from the `/predict` endpoint** and provides AI-powered analysis. For new projects, prefer using the unified chat (`/api/orchestrator/chat`) which routes here automatically.

### Workflow
```
User → /predict (get fire prediction) → /analyze-fire (get AI analysis)
```

### Input Structure
Takes the **exact output** from `/predict` endpoint wrapped in a `fire_data` object:

```json
{
  "fire_data": {
    "input": { ... },      // Original input to /predict
    "imputed": { ... },    // Imputed features from /predict
    "predictions": { ... } // Predictions from /predict
  },
  "query": "Your question about this fire",
  "include_web_search": false
}
```

---

### ✅ Complete Example #1: Arizona Fire (from your actual data)

**Step 1: Get prediction from `/predict`**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
  "features": {
    "longitude": -109.294,
    "latitude": 31.8409,
    "prefire_fuel": 4488.574695,
    "cwd_frac": 0.11883,
    "duff_frac": 0.194947,
    "bi_value": 114.0,
    "fm100_value": 3.4,
    "fm1000_value": 4.5,
    "rmax_value": 31.8,
    "rmin_value": 5.3,
    "vs_value": 6.3,
    "doy": 148.0
  }
}'
```

**Step 2: Use that output for `/analyze-fire`**
```json
{
  "fire_data": {
    "input": {
      "longitude": -109.294,
      "prefire_fuel": 4488.574695,
      "cwd_frac": 0.11883,
      "duff_frac": 0.194947,
      "day_of_year_sin": 0.5610336065292358,
      "fm1000_value": 4.5,
      "srad_value": 347,
      "day_of_year_cos": -0.8277930021286011,
      "bi_value": 114,
      "fm100_value": 3.4000000953674316,
      "rmax_value": 31.80000114440918,
      "month": 5,
      "season": 2,
      "covertype": 3,
      "th_value": 251,
      "latitude": 31.8409,
      "burn_source": 1,
      "rmin_value": 5.300000190734863,
      "vs_value": 6.300000190734863,
      "burnday_source": 15,
      "vpd_value": 1.7699999809265137,
      "sph_value": 0.0021899999119341373,
      "pet_value": 8.300000190734863,
      "BSEV": 1,
      "tmmn_value": 277.79998779296875,
      "fuelcode": 1920,
      "fuel_moisture_class": 2,
      "doy": 148
    },
    "imputed": {
      "longitude": -109.2963,
      "prefire_fuel": 4488.574695,
      "cwd_frac": 0.11883,
      "duff_frac": 0.194947,
      "day_of_year_sin": 0.5610336262283677,
      "fm1000_value": 4.5,
      "srad_value": 347,
      "day_of_year_cos": -0.8277930117131022,
      "bi_value": 114,
      "fm100_value": 3.4000000953674316,
      "rmax_value": 31.80000114440918,
      "month": 5,
      "season": 2,
      "covertype": 3,
      "th_value": 251,
      "latitude": 31.8383,
      "burn_source": 1,
      "rmin_value": 5.300000190734863,
      "vs_value": 6.300000190734863,
      "burnday_source": 15,
      "vpd_value": 1.7699999809265137,
      "sph_value": 0.0021899999119341373,
      "pet_value": 8.300000190734863,
      "BSEV": 1,
      "tmmn_value": 277.79998779296875,
      "fuelcode": 1920,
      "fuel_moisture_class": 2,
      "state": "Arizona",
      "county": "Cochise",
      "global_fire_event_id": null,
      "duration": null,
      "doy": 148,
      "risk": 3.878445379253894
    },
    "predictions": {
      "duration": 0.2363189458847046,
      "end_tomorrow_prob": 0.9717491467793783,
      "end_tomorrow_label": 1,
      "adjusted_risk": 0.5907973647117615
    }
  },
  "query": "What are the key risk factors for this fire?",
  "include_web_search": false
}
```

**Expected Response:**
```json
{
  "answer": "This Arizona fire shows low risk (3.9/10) with brief predicted duration of 0.24 days. High end-tomorrow probability (97%) indicates quick containment likely. May timing (day 148) and moderate humidity (32% max) support limited spread. Fire danger index of 114 is elevated, but dry fuel moisture at 3.4% combined with strong containment probability suggests minimal suppression challenges.",
  "sources": [
    {
      "type": "fire_prediction",
      "location": "Cochise, Arizona",
      "coordinates": "(31.8383, -109.2963)",
      "risk_level": 3.878445379253894,
      "predicted_duration": 0.2363189458847046,
      "season": 2,
      "day_of_year": 148
    }
  ],
  "confidence_score": 1.0,
  "query_type": "fire_analysis",
  "processing_time_ms": 2341.56,
  "is_relevant": true
}
```

---

### ✅ Complete Example #2: Simplified Input (Minimal Required Fields)

If you want to test with **minimal data**, you can construct a simplified version:

```json
{
  "fire_data": {
    "input": {
      "latitude": 31.8409,
      "longitude": -109.294,
      "doy": 148
    },
    "imputed": {
      "state": "Arizona",
      "county": "Cochise",
      "latitude": 31.8383,
      "longitude": -109.2963,
      "risk": 3.88,
      "doy": 148,
      "season": 2,
      "month": 5,
      "bi_value": 114,
      "fm100_value": 3.4,
      "rmax_value": 31.8,
      "vs_value": 6.3
    },
    "predictions": {
      "duration": 0.24,
      "end_tomorrow_prob": 0.97,
      "end_tomorrow_label": 1,
      "adjusted_risk": 0.59
    }
  },
  "query": "Analyze this wildfire prediction",
  "include_web_search": false
}
```

---

### 📝 Sample Queries for `/analyze-fire`

You can ask different questions about the **same fire**:

```json
"query": "What are the key risk factors for this fire?"
"query": "Analyze this wildfire prediction"
"query": "What suppression strategies would be most effective?"
"query": "How does the weather impact fire duration?"
"query": "What are the evacuation recommendations?"
"query": "Is this fire likely to spread rapidly?"
"query": "How does this compare to typical fires in Arizona?"
"query": "What makes this fire high or low risk?"
```

---

### 🔧 cURL Command for `/analyze-fire`

```bash
curl -X POST http://localhost:8000/api/ai-assistant/analyze-fire \
  -H "Content-Type: application/json" \
  -d '{
  "fire_data": {
    "input": {"latitude": 31.8409, "longitude": -109.294, "doy": 148},
    "imputed": {
      "state": "Arizona",
      "county": "Cochise",
      "latitude": 31.8383,
      "longitude": -109.2963,
      "risk": 3.88,
      "doy": 148,
      "season": 2,
      "bi_value": 114,
      "fm100_value": 3.4,
      "rmax_value": 31.8,
      "vs_value": 6.3
    },
    "predictions": {
      "duration": 0.24,
      "end_tomorrow_prob": 0.97,
      "end_tomorrow_label": 1
    }
  },
  "query": "What are the key risk factors?"
}'
```

---

## 2. `/api/ai-assistant/query-bq` (Standalone)

### Description
Standalone endpoint that answers **general wildfire questions** using RAG (Retrieval-Augmented Generation) with BigQuery vector search. For new projects, prefer using the unified chat (`/api/orchestrator/chat`) which routes here automatically.

### Input Structure
Simple query with optional location filtering:

```json
{
  "query": "Your general wildfire question",
  "location_filter": {
    "state": "California",
    "county": "Los Angeles"
  },
  "max_results": 5,
  "include_web_search": false
}
```

---

### ✅ Example #1: Simple General Question (No Filter)

```json
{
  "query": "What weather conditions lead to high-risk wildfires?",
  "max_results": 5,
  "include_web_search": false
}
```

**cURL:**
```bash
curl -X POST http://localhost:8000/api/ai-assistant/query-bq \
  -H "Content-Type: application/json" \
  -d '{"query": "What weather conditions lead to high-risk wildfires?", "max_results": 5}'
```

---

### ✅ Example #2: State-Specific Question (Auto-Detected)

The system **automatically detects** state names in your query!

```json
{
  "query": "What are typical wildfire patterns in California during summer?",
  "max_results": 5,
  "include_web_search": false
}
```

**Note:** The word "California" is automatically detected and used as a location filter.

---

### ✅ Example #3: Explicit State Filter

```json
{
  "query": "What are the common causes of extended duration fires?",
  "location_filter": {
    "state": "Montana"
  },
  "max_results": 8,
  "include_web_search": false
}
```

**cURL:**
```bash
curl -X POST http://localhost:8000/api/ai-assistant/query-bq \
  -H "Content-Type: application/json" \
  -d '{
  "query": "What are the common causes of extended duration fires?",
  "location_filter": {"state": "Montana"},
  "max_results": 8
}'
```

---

### ✅ Example #4: State + County Filter

```json
{
  "query": "Describe the fuel conditions that lead to severe wildfires",
  "location_filter": {
    "state": "Arizona",
    "county": "Cochise"
  },
  "max_results": 5,
  "include_web_search": false
}
```

---

### ✅ Example #5: More Results for Comprehensive Analysis

```json
{
  "query": "How do fuel moisture levels affect fire duration?",
  "max_results": 10,
  "include_web_search": false
}
```

---

### ✅ Example #6: Seasonal Analysis

```json
{
  "query": "What makes summer wildfires more dangerous than spring fires?",
  "max_results": 5,
  "include_web_search": false
}
```

---

### 📝 Sample Queries for `/query-bq`

**General Wildfire Science:**
- `"What weather conditions lead to high-risk wildfires?"`
- `"How does fuel moisture affect fire behavior?"`
- `"What role does wind speed play in fire spread?"`
- `"Explain the relationship between humidity and fire risk"`
- `"What is the fire danger index and how is it calculated?"`

**Location-Specific (Auto-Detected):**
- `"What are wildfire patterns in California?"`
- `"Describe typical fires in Wyoming during August"`
- `"How do Colorado fires differ from Texas fires?"`
- `"What causes wildfires in Arizona?"`

**Comparative Analysis:**
- `"Compare high-risk and low-risk fire days"`
- `"What distinguishes short-duration fires from long-duration fires?"`
- `"How do summer fires differ from winter fires?"`

**Technical Questions:**
- `"What fuel types burn longest?"`
- `"How does vapor pressure deficit impact fire intensity?"`
- `"What fire danger index values indicate extreme risk?"`
- `"How does coarse woody debris affect fire duration?"`

**Seasonal/Temporal:**
- `"Why are wildfires more common in summer?"`
- `"What time of year has the lowest wildfire risk?"`
- `"How does day of year affect fire behavior?"`

---

### 🔧 cURL Commands for `/query-bq`

**Simple query:**
```bash
curl -X POST http://localhost:8000/api/ai-assistant/query-bq \
  -H "Content-Type: application/json" \
  -d '{"query": "What causes high-risk wildfires?", "max_results": 5}'
```

**With state filter:**
```bash
curl -X POST http://localhost:8000/api/ai-assistant/query-bq \
  -H "Content-Type: application/json" \
  -d '{
  "query": "Describe wildfire patterns",
  "location_filter": {"state": "California"},
  "max_results": 5
}'
```

**With state and county filter:**
```bash
curl -X POST http://localhost:8000/api/ai-assistant/query-bq \
  -H "Content-Type: application/json" \
  -d '{
  "query": "What are typical fire conditions?",
  "location_filter": {"state": "Arizona", "county": "Cochise"},
  "max_results": 5
}'
```

---

## Expected Response Formats

### Response from `/analyze-fire`:

```json
{
  "answer": "Detailed analysis of the specific fire prediction...",
  "sources": [
    {
      "type": "fire_prediction",
      "location": "Cochise, Arizona",
      "coordinates": "(31.8383, -109.2963)",
      "risk_level": 3.878445379253894,
      "predicted_duration": 0.2363189458847046,
      "season": 2,
      "day_of_year": 148
    }
  ],
  "confidence_score": 1.0,
  "query_type": "fire_analysis",
  "processing_time_ms": 2341.56,
  "is_relevant": true
}
```

### Response from `/query-bq`:

```json
{
  "answer": "High-risk wildfires typically occur when hot, dry, windy conditions combine with very dry fuels. Based on historical fires from Montana, California, and Wyoming, key factors include low fuel moisture (below 8%), high fire danger index (above 70), low relative humidity (below 20%), and strong winds (above 15 mph).",
  "sources": [
    {
      "type": "fire_data",
      "global_fire_event_id": "fire_2012_CA_12345",
      "location": "Los Angeles, California",
      "year": 2012,
      "duration": 15.2,
      "risk": 8.5,
      "relevance_score": 0.892,
      "rank": 1,
      "data_source": "code-for-planet.wildfire_dataset.sequential_events"
    },
    {
      "type": "fire_data",
      "global_fire_event_id": "fire_2014_MT_45678",
      "location": "Flathead, Montana",
      "year": 2014,
      "duration": 22.8,
      "risk": 9.1,
      "relevance_score": 0.856,
      "rank": 2,
      "data_source": "code-for-planet.wildfire_dataset.sequential_events"
    }
  ],
  "confidence_score": 0.874,
  "query_type": "general_analysis",
  "processing_time_ms": 4521.32,
  "is_relevant": true
}
```

---

## Complete Workflow Example

### Step 1: Get Fire Prediction
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
  "features": {
    "longitude": -109.294,
    "latitude": 31.8409,
    "bi_value": 114.0,
    "fm100_value": 3.4,
    "doy": 148.0
  }
}' > prediction.json
```

### Step 2: Analyze That Specific Fire
```bash
curl -X POST http://localhost:8000/api/ai-assistant/analyze-fire \
  -H "Content-Type: application/json" \
  -d '{
  "fire_data": '"$(cat prediction.json)"',
  "query": "What are the key risk factors?"
}'
```

### Step 3: Ask General Questions
```bash
curl -X POST http://localhost:8000/api/ai-assistant/query-bq \
  -H "Content-Type: application/json" \
  -d '{"query": "What causes fires like this in Arizona?", "max_results": 5}'
```

---

## Important Notes

### For `/analyze-fire`:
- ✅ **Use the EXACT output from `/predict`** - just wrap it in `fire_data`
- ✅ All three sections required: `input`, `imputed`, `predictions`
- ✅ The `risk_events` array from `/predict` is not needed for AI analysis
- ✅ Query can be customized to ask different questions about the same fire

### For `/query-bq`:
- ✅ **Simple text query** - just ask your question naturally
- ✅ State names are **auto-detected** from the query text
- ✅ Use **full state names** (e.g., "California" not "CA")
- ✅ `max_results` controls how many historical fires are retrieved (1-15)
- ✅ Higher `max_results` = more context but slower response

### Location Filter Format:
```json
{
  "state": "Arizona",      // Full state name
  "county": "Cochise"      // County name (optional)
}
```

**Valid State Names:**
Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming

---

## Testing Checklist

### Core Endpoints
- [ ] Test `/predict` endpoint first to get valid fire data
- [ ] Test `/impute` with partial data

### Unified Chat (Recommended)
- [ ] Test `/api/orchestrator/chat` with general query (`web_search: false`)
- [ ] Test `/api/orchestrator/chat` with general query (`web_search: true`)
- [ ] Test `/api/orchestrator/chat` with fire_data (`web_search: false`)
- [ ] Test `/api/orchestrator/chat` with fire_data (`web_search: true`)
- [ ] Test `/api/orchestrator/chat` with emissions_data
- [ ] Test multi-turn conversation (send session_id from first response)
- [ ] Verify `grounded: true` when `web_search: true`
- [ ] Verify `web_sources` returned when `web_search: true`

### Standalone Endpoints
- [ ] Test `/api/ai-assistant/analyze-fire` with predict output
- [ ] Test `/api/ai-assistant/query-bq` with simple general question
- [ ] Test `/api/ai-assistant/query-bq` with state-specific question
- [ ] Test `/api/analyze-emissions` with emission data
- [ ] Test `/api/web-search/analyze-fire` with predict output
- [ ] Test `/api/web-search/query` with general question
- [ ] Test `/api/web-search/analyze-emissions` with emission data

### General
- [ ] Verify response times are reasonable (2-5 seconds regular, 5-10 seconds web search)
- [ ] Check that confidence scores make sense
- [ ] Verify sources are being returned correctly

---

## Common Mistakes to Avoid

1. ❌ **Using `/analyze-fire` with raw user input**
   - ✅ Always use output from `/predict` endpoint

2. ❌ **State abbreviations in location_filter**
   - ✅ Use full state names: "California" not "CA"

3. ❌ **Malformed location_filter**
   - ❌ `"location_filter": "California"`
   - ✅ `"location_filter": {"state": "California"}`

4. ❌ **Missing required fire_data structure**
   - ✅ Must include `input`, `imputed`, and `predictions`

5. ❌ **Asking `/analyze-fire` general questions**
   - ✅ Use `/query-bq` for general wildfire questions
   - ✅ Use `/analyze-fire` only for specific fire predictions

6. ❌ **Not using the unified chat endpoint**
   - ✅ Prefer `/api/orchestrator/chat` — it handles intent routing automatically
   - ✅ Use standalone endpoints only if you need direct access

7. ❌ **Expecting web_sources when `web_search: false`**
   - ✅ `web_sources`, `search_queries`, and `grounded` are only populated when `web_search: true`

---

## 3. `/api/web-search/*` (Standalone Web-Search Endpoints)

These endpoints always use Google Search grounding (two-step pipeline). They are the standalone equivalents of using the unified chat with `web_search: true`.

### `POST /api/web-search/analyze-fire`

```json
{
  "fire_data": {
    "input": {"latitude": 31.8409, "longitude": -109.294, "doy": 148},
    "imputed": {
      "state": "Arizona", "county": "Cochise",
      "latitude": 31.8383, "longitude": -109.2963,
      "risk": 3.88, "bi_value": 114, "fm100_value": 3.4
    },
    "predictions": {"duration": 0.24, "end_tomorrow_prob": 0.97}
  },
  "query": "What are the latest conditions for this fire area?"
}
```

### `POST /api/web-search/query`

```json
{
  "query": "What are the latest wildfire statistics in the United States?"
}
```

### `POST /api/web-search/analyze-emissions`

```json
{
  "emission_data": {
    "state": "California",
    "county": "Los Angeles",
    "year": 2023,
    "emissions": {"co2": 5000, "ch4": 200, "co": 800, "pm2_5": 150},
    "emission_intensity": "High"
  },
  "query": "How do these emissions compare to national averages?"
}
```

---

## 4. `/api/analyze-emissions` (Standalone Emissions)

### Description
Standalone endpoint for AI-powered analysis of wildfire emission events.

### Input Structure
```json
{
  "emission_data": {
    "state": "California",
    "county": "Los Angeles",
    "year": 2023,
    "emissions": {
      "co2": 5000,
      "ch4": 200,
      "co": 800,
      "pm2_5": 150
    },
    "emission_intensity": "High",
    "area_burned": 12500
  },
  "query": "Analyze the health impact of these emissions"
}
```