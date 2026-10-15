# Wildfire API Documentation

This API provides wildfire feature imputation, fire prediction, AI-powered analysis with optional Google Search grounding, emissions tracking, and risk heatmap data.

---

## Core Endpoints

### 1. POST `/impute`

### Description
The `/impute` endpoint takes in partial wildfire feature data (e.g., state, county, prefire fuel, weather metrics) and imputes the missing values using a trained offline imputer model. The output includes a fully imputed feature set consistent with historical wildfire records.

### Input
- JSON body with the partial attributes nested under `features`.
- Example:

```json
{
  "features": {
    "state": "Wyoming",
    "county": "Park",
    "prefire_fuel": 50,
    "rmax_value": 25,
    "covertype": 3,
    "doy": 208
  },
  "round_risk": false
}
```

> **Location handling.** Supplying `state` **and** `county` pins both. Supplying `state`
> alone pins the state and picks the remaining geography from within it. Supplying
> neither imputes the whole location from the nearest neighbour, so treat the returned
> `state`/`county` as a guess rather than an input echo.
### Output
- JSON object containing: The original input & The imputed feature set with all missing values filled
- Example:
```json
{
  "input": {
    "state": "Wyoming",
    "county": "Park",
    "prefire_fuel": 50,
    "rmax_value": 25,
    "covertype": 3,
    "doy": 208
  },
  "imputed": {
    "longitude": -111.875,
    "prefire_fuel": 50,
    "cwd_frac": 0.0,
    "duff_frac": 0.0,
    "day_of_year_sin": -0.4227806579826773,
    "fm1000_value": 10.16,
    "srad_value": 282.67,
    "day_of_year_cos": -0.9062,
    "bi_value": 55.5,
    "fm100_value": 7.14,
    "rmax_value": 25,
    "month": 8,
    "season": 3,
    "covertype": 3,
    "th_value": 233,
    "latitude": 44.83,
    "burn_source": 1,
    "rmin_value": 16.54,
    "vs_value": 3.58,
    "burnday_source": 15,
    "vpd_value": 1.59,
    "sph_value": 0.00455,
    "pet_value": 5.94,
    "BSEV": 2,
    "tmmn_value": 282.02,
    "fuelcode": 1,
    "fuel_moisture_class": 2,
    "state": "Wyoming",
    "county": "Park",
    "global_fire_event_id": null,
    "duration": null,
    "doy": 208,
    "risk": 3.19
  }
}

```
## 2. POST `/predict`

### Description
The `/predict` endpoint uses the fully imputed wildfire features (such as the output from `/impute`) to predict two outcomes:
1. **Fire Duration** (regression) — Predicted number of days the fire will last, using the `xgb_best_model.pkl` model.
2. **End Tomorrow Probability** (classification) — Probability that the fire will end the next day, using the `xgb_hazard_calibrated.pkl` model.

---

### Input
Provide a JSON object containing wildfire attributes. These can be partial user inputs or the output from the `/impute` endpoint.  

**Example:**
```json
{
  "features": {
    "state": "Wyoming",
    "county": "Park",
    "prefire_fuel": 50,
    "rmax_value": 25,
    "covertype": 3,
    "doy": 208
  },
  "round_risk": false
}
```

> The request body is `{"features": {...}, "round_risk": bool}`, the same shape as
> `/impute`. Posting `{"input": {...}}` returns **HTTP 422**.
### Output
- JSON object containing: The original input, The imputed features & Predictions for duration and end-tomorrow probability

**Example:**
```json
{
  "input": {
    "state": "Wyoming",
    "county": "Park",
    "prefire_fuel": 50,
    "rmax_value": 25,
    "covertype": 3,
    "doy": 208
  },
  "imputed": {
    "longitude": -111.875,
    "prefire_fuel": 50,
    "cwd_frac": 0.0,
    "duff_frac": 0.0,
    "day_of_year_sin": -0.4228,
    "fm1000_value": 10.16,
    "srad_value": 282.67,
    "day_of_year_cos": -0.9062,
    "bi_value": 55.5,
    "fm100_value": 7.14,
    "rmax_value": 25,
    "month": 8,
    "season": 3,
    "covertype": 3,
    "th_value": 233,
    "latitude": 44.83,
    "burn_source": 1,
    "rmin_value": 16.54,
    "vs_value": 3.58,
    "burnday_source": 15,
    "vpd_value": 1.59,
    "sph_value": 0.00455,
    "pet_value": 5.94,
    "BSEV": 2,
    "tmmn_value": 282.02,
    "fuelcode": 1,
    "fuel_moisture_class": 2,
    "state": "Wyoming",
    "county": "Park",
    "global_fire_event_id": null,
    "duration": null,
    "doy": 208,
    "risk": 3.19
  },
  "predictions": {
    "duration": 6.77,
    "end_tomorrow_prob": 0.05,
    "end_tomorrow_label": 0
  }
}
```
### Notes
- Calling `/impute` first is optional: `/predict` imputes internally.
- The end_tomorrow_label is derived by applying a probability threshold (default: 0.5).
- Models load from the local `models/` directory, falling back to Google Cloud Storage.
- The response also contains two fields not shown in the abbreviated example above:
  - **`risk_events`** — array of historical fires near the request, each with
    `latitude`, `longitude`, `state`, `county`, `risk`. This is what the UI plots on the
    map. Sample size adapts to risk and time of year.
  - **`predictions.adjusted_risk`** — duration remapped onto a 0-10 scale.

### Time-of-year and location contract

`doy` and `season` describe the same thing at different resolutions, and the dataset
labels seasons meteorologically:

| Season | Months |
|---|---|
| 1 | Dec, Jan, Feb |
| 2 | Mar, Apr, May |
| 3 | Jun, Jul, Aug |
| 4 | Sep, Oct, Nov |

Formula: `season = (month % 12 // 3) + 1`. A client sending a season that disagrees with
its `doy` would previously cancel the historical-events query out and return an empty
map. `/predict` now prefers `doy` whenever both are present, and widens the day window
rather than returning nothing.

If `doy` is omitted it is recovered from `day_of_year_sin`/`day_of_year_cos` when those
are supplied, then from `month`. Send `doy` explicitly when you can: it is the most
precise signal and it drives the map window.

---

## Unified Chat Orchestrator

### 3. POST `/api/orchestrator/chat`

#### Description
Single chat endpoint that automatically classifies user intent and routes to the appropriate handler. Supports multi-turn conversations with session management.

The **`web_search`** toggle controls whether the response uses Google Search grounding:
- `web_search: false` — Regular AI pipeline using platform knowledge and provided data
- `web_search: true` — Two-step Google Search grounded pipeline that searches the web for real-time context before generating a response

#### Input
```json
{
  "query": "What are the key risk factors for this fire?",
  "session_id": null,
  "fire_data": { "input": {...}, "imputed": {...}, "predictions": {...} },
  "emissions_data": null,
  "web_search": false
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | *(required)* | User's question |
| `session_id` | `string \| null` | `null` | Session ID for multi-turn conversations |
| `fire_data` | `object \| null` | `null` | Output from `/predict` endpoint |
| `emissions_data` | `object \| null` | `null` | Emission event data |
| `web_search` | `boolean` | **`true`** | Enable Google Search grounding |

> **Default is `true`.** The field is optional, and the deployed frontend does not
> send it, so every chat request currently takes the slower grounded path (three
> Gemini calls: intent classification, grounded search, final answer). Send
> `"web_search": false` explicitly for the faster non-grounded pipeline.

#### Intent Classification
The orchestrator uses Gemini to classify intent into:
- **`analyze_fire`** — Fire prediction analysis (requires `fire_data`)
- **`analyze_emissions`** — Emissions analysis (requires `emissions_data`)
- **`general_query`** — General wildfire/platform questions

#### Output
```json
{
  "session_id": "unified_abc123...",
  "answer": "Detailed analysis...",
  "sources": [{"type": "fire_prediction", "location": "Cochise, Arizona", ...}],
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

When `web_search: true`, additional fields are populated:
- `web_sources` — Array of `{index, title, url}` objects from Google Search
- `search_queries` — Array of search queries used
- `grounded` — `true` when web sources were found

#### Session Management
Sessions persist for multi-turn conversations. The orchestrator:
- Creates a new session on first request (returns `session_id`)
- Continues existing sessions when `session_id` is provided
- Preserves fire_data/emissions_data across turns (no need to resend)
- Tracks conversation history (last 10 turns) for context
- Detects data staleness after 5 turns

#### Notes
- The `web_search` toggle can be changed per-turn within the same session
- Intent can switch mid-conversation (e.g., fire analysis → general question)
- Sessions expire after inactivity

---

### 4. GET `/api/orchestrator/sessions`
Lists all active unified chat sessions.

### 5. GET `/api/orchestrator/sessions/{session_id}`
Returns full session details including conversation history and stored data.

### 6. DELETE `/api/orchestrator/sessions/{session_id}`
Deletes a specific session.

### 7. POST `/api/orchestrator/sessions/cleanup`
Removes all expired sessions.

### 8. GET `/api/orchestrator/health`
Health check endpoint for the orchestrator.

---

## Standalone AI Assistant Endpoints

### 9. POST `/api/ai-assistant/analyze-fire`

#### Description
Analyzes a specific fire prediction using the regular Gemini pipeline (no web search).

#### Input
```json
{
  "fire_data": { "input": {...}, "imputed": {...}, "predictions": {...} },
  "query": "What are the key risk factors?"
}
```

#### Output
```json
{
  "answer": "Analysis of the fire prediction...",
  "sources": [{"type": "fire_prediction", "location": "...", ...}],
  "confidence_score": 1.0,
  "query_type": "fire_analysis",
  "processing_time_ms": 2341.56,
  "is_relevant": true
}
```

### 10. POST `/api/ai-assistant/query-bq`

#### Description
Answers general wildfire questions using RAG with BigQuery vector search over historical fire data.

#### Input
```json
{
  "query": "What weather conditions lead to high-risk wildfires?",
  "location_filter": {"state": "California"},
  "max_results": 5
}
```

### 11. POST `/api/ai-assistant/query`

#### Description
General platform Q&A using knowledge base (no BigQuery RAG).

#### Input
```json
{
  "query": "What is this platform?"
}
```

---

## Web-Search Grounded Endpoints (Standalone)

These endpoints always use the two-step Google Search grounded pipeline:
1. **Step 1**: Gemini with Google Search tool retrieves real-time web context
2. **Step 2**: Gemini generates a clean answer using the web context + provided data

### 12. POST `/api/web-search/analyze-fire`

#### Input
```json
{
  "fire_data": { "input": {...}, "imputed": {...}, "predictions": {...} },
  "query": "What are the latest conditions affecting this fire area?"
}
```

#### Output
```json
{
  "answer": "Analysis with web-grounded context...",
  "sources": [{"type": "fire_prediction", ...}, {"type": "web_context", "links": [...]}],
  "web_sources": [{"index": 0, "title": "...", "url": "..."}],
  "search_queries": ["query1", "query2"],
  "confidence_score": 1.0,
  "grounded": true
}
```

### 13. POST `/api/web-search/query`

#### Input
```json
{
  "query": "What are the latest wildfire statistics in the US?"
}
```

### 14. POST `/api/web-search/analyze-emissions`

#### Input
```json
{
  "emission_data": {
    "state": "California",
    "county": "Los Angeles",
    "year": 2023,
    "emissions": {"co2": 5000, "ch4": 200, "co": 800, "pm2_5": 150}
  },
  "query": "How do these emissions compare to national averages?"
}
```

---

## Emissions Endpoints

### 15. POST `/api/analyze-emissions`

#### Description
AI-powered analysis of wildfire emission event data.

#### Input
```json
{
  "emission_data": {
    "state": "California",
    "county": "Los Angeles",
    "year": 2023,
    "emissions": {"co2": 5000, "ch4": 200, "co": 800, "pm2_5": 150},
    "emission_intensity": "High"
  },
  "query": "Analyze the health impact of these emissions"
}
```

### 16. GET `/api/emissions`
Query emission events with filters (state, county, year).

### 17. GET `/api/emissions/summary`
Summary statistics for emission data.

### 18. GET `/api/emissions/states`
List of states with emission data.

### 19. GET `/api/emissions/counties`
List of counties (optionally filtered by state).

### 20. GET `/api/emissions/years`
Available years in the emission dataset.

### 21. GET `/api/emissions/filters`
All available filter options (states, counties, years).

### 22. GET `/api/emissions/sample`
Sample emission event data.

---

## Risk Heatmap

### 23. GET `/risk-heatmap`
Returns US state/county risk heatmap data for visualization.

---

## Architecture

```
Request → /api/orchestrator/chat
  ├─ Intent Classification (Gemini 2.0 Flash)
  ├─ Session Management (in-memory store)
  ├─ Data Resolution (request → session → none)
  │
  ├─ web_search: false
  │   ├─ analyze_fire → generate_fire_analysis()
  │   ├─ analyze_emissions → generate_emissions_analysis()
  │   └─ general_query → generate_general_response()
  │
  └─ web_search: true
      ├─ Step 1: Gemini + Google Search → web context
      └─ Step 2: Gemini (clean) → final answer with web context
```