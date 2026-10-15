# Wildfire API - Sample Inputs & Outputs

## 📋 Table of Contents

1. [Unified Chat Orchestrator](#unified-chat-orchestrator-new)
2. [Fire Analysis Endpoint](#fire-analysis-endpoint)
3. [Emissions Analysis Endpoint](#emissions-analysis-endpoint)
4. [General Query Endpoint](#general-query-endpoint)
5. [Testing Workflow Examples](#testing-workflow-examples)

---

## 🎯 Unified Chat Orchestrator (NEW)

**Base URL:** `https://wildfire-api-575281815403.us-central1.run.app`

**Endpoint:** `POST /api/orchestrator/chat`

**Swagger Docs:** [View in Swagger](https://wildfire-api-575281815403.us-central1.run.app/docs#/orchestrator/unified_chat_api_orchestrator_chat_post)

This is the **NEW unified endpoint** that combines fire analysis, emissions analysis, and general queries into one seamless conversation.

---

### Test Case 1: New General Query (No Data)

**Description:** User asks a general question about the platform without clicking any fire or emissions data.

**Request:**
```json
{
  "query": "What is Fire Danger Index?"
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "Fire Danger Index (BI) is a composite measure from 0-100 that indicates wildfire risk based on weather and fuel conditions. Values above 50 indicate very high risk, while values below 20 suggest low risk. It combines factors like temperature, humidity, wind speed, and fuel moisture to predict fire behavior and spread potential.",
  "sources": [
    {
      "type": "platform_knowledge",
      "description": "Wildfire Prediction Platform Documentation",
      "coverage": "Platform features, KPIs, ML models, climate impact",
      "data_period": "2003-2015 training data"
    }
  ],
  "confidence_score": 0.95,
  "query_type": "general_query",
  "intent": "general_query",
  "context_action": "new",
  "classification_confidence": 1.0,
  "processing_time_ms": 1234.56,
  "is_relevant": true,
  "turns_since_data": null
}
```

**Key Points:**
- No `session_id` in request (new conversation)
- No `fire_data` or `emissions_data`
- Returns new `session_id` for follow-ups
- `intent`: "general_query"
- `context_action`: "new"

---

### Test Case 2: Fire Analysis (First Turn with Data)

**Description:** User clicks on a fire marker on the map and sends fire prediction data.

**Request:**
```json
{
  "query": "What are the key risk factors for this fire?",
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "fire_data": {
    "input": {
      "longitude": -109.294,
      "latitude": 31.8409,
      "doy": 148,
      "month": 5,
      "season": 2
    },
    "imputed": {
      "longitude": -109.2963,
      "latitude": 31.8383,
      "state": "Arizona",
      "county": "Cochise",
      "doy": 148,
      "month": 5,
      "season": 2,
      "risk": 3.878445379253894,
      "bi_value": 114,
      "fm100_value": 3.4,
      "fm1000_value": 4.5,
      "rmax_value": 31.8,
      "rmin_value": 5.3,
      "vs_value": 6.3,
      "vpd_value": 1.77,
      "tmmn_value": 277.8,
      "srad_value": 347,
      "prefire_fuel": 4488.574695,
      "cwd_frac": 0.11883,
      "duff_frac": 0.194947,
      "covertype": 3,
      "fuelcode": 1920,
      "fuel_moisture_class": 2,
      "BSEV": 1
    },
    "predictions": {
      "duration": 0.2363189458847046,
      "end_tomorrow_prob": 0.9717491467793783,
      "end_tomorrow_label": 1,
      "adjusted_risk": 0.5907973647117615
    }
  }
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "This Cochise County, Arizona fire shows moderate risk (3.88/10) with very brief predicted duration (0.24 days). Key risk factors include the Fire Danger Index of 114 (very high), critically low fuel moisture at 3.4%, and low relative humidity of 5.3%. Despite high fire danger conditions, the 97% probability of ending tomorrow suggests rapid suppression potential.",
  "sources": [
    {
      "type": "fire_prediction",
      "location": "Cochise, Arizona",
      "risk_level": 3.878445379253894,
      "predicted_duration": 0.2363189458847046
    }
  ],
  "confidence_score": 1.0,
  "query_type": "analyze_fire",
  "intent": "analyze_fire",
  "context_action": "switch",
  "classification_confidence": 1.0,
  "processing_time_ms": 2156.78,
  "is_relevant": true,
  "turns_since_data": 0
}
```

**Key Points:**
- Used existing `session_id` from previous general query
- Sent `fire_data` with full prediction information
- `context_action`: "switch" (switched from general to fire_analysis)
- `turns_since_data`: 0 (just received data)
- Fire data is now stored in session

---

### Test Case 3: Fire Analysis Follow-up (No Data)

**Description:** User asks a follow-up question about the same fire without re-sending data.

**Request:**
```json
{
  "query": "How soon can this fire end?",
  "session_id": "unified_a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "This fire is predicted to end very soon. The predicted duration is less than a quarter of a day (0.236 days), with a high 97.2% probability of ending tomorrow. However, severe conditions like extremely low fuel moisture (3.4%) and high Fire Danger Index (114) warrant vigilance for rapid spread should it persist or re-ignite.",
  "sources": [
    {
      "type": "fire_prediction",
      "location": "Cochise, Arizona",
      "risk_level": 3.878445379253894,
      "predicted_duration": 0.2363189458847046
    }
  ],
  "confidence_score": 1.0,
  "query_type": "analyze_fire",
  "intent": "analyze_fire",
  "context_action": "continue",
  "classification_confidence": 0.95,
  "processing_time_ms": 1845.23,
  "is_relevant": true,
  "turns_since_data": 1
}
```

**Key Points:**
- Only sent `query` and `session_id` (NO fire_data)
- System used stored fire_data from session
- `context_action`: "continue" (staying in fire_analysis context)
- `turns_since_data`: 1 (one turn since data was provided)

---

### Test Case 4: Context Switch to General Query

**Description:** User asks for a definition/explanation mid-conversation about fire.

**Request:**
```json
{
  "query": "What does fuel moisture mean?",
  "session_id": "unified_a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "Fuel moisture refers to the water content in dead vegetation and forest materials that can burn. It's expressed as a percentage - lower values mean drier fuels that ignite and burn more easily. The platform tracks fm100 (100-hour fuel moisture for medium-sized dead wood) and fm1000 (1000-hour moisture for large logs). Values below 10% are considered critically dry and indicate high fire risk.",
  "sources": [
    {
      "type": "platform_knowledge",
      "description": "Wildfire Prediction Platform Documentation",
      "coverage": "Platform features, KPIs, ML models, climate impact",
      "data_period": "2003-2015 training data"
    }
  ],
  "confidence_score": 0.95,
  "query_type": "general_query",
  "intent": "general_query",
  "context_action": "switch",
  "classification_confidence": 0.92,
  "processing_time_ms": 1567.89,
  "is_relevant": true,
  "turns_since_data": 2
}
```

**Key Points:**
- Still using same `session_id`
- `context_action`: "switch" (switched from fire_analysis to general)
- `turns_since_data`: 2 (two turns since fire data)
- Fire data still stored but not actively used

---

### Test Case 5: Back to Fire Analysis

**Description:** User returns to discussing the fire after asking a general question.

**Request:**
```json
{
  "query": "Going back to the fire, what about the wind conditions?",
  "session_id": "unified_a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "The wind conditions for this Cochise County fire are moderate with a wind speed of 6.3 m/s (about 14 mph). While not extreme, this wind speed combined with the very low fuel moisture (3.4%) and high Fire Danger Index (114) can still contribute to fire spread. The wind direction is 251 degrees (from the west-southwest).",
  "sources": [
    {
      "type": "fire_prediction",
      "location": "Cochise, Arizona",
      "risk_level": 3.878445379253894,
      "predicted_duration": 0.2363189458847046
    }
  ],
  "confidence_score": 1.0,
  "query_type": "analyze_fire",
  "intent": "analyze_fire",
  "context_action": "continue",
  "classification_confidence": 0.88,
  "processing_time_ms": 1923.45,
  "is_relevant": true,
  "turns_since_data": 3
}
```

**Key Points:**
- System detected user wants to return to fire analysis
- Loaded stored fire_data from session
- `context_action`: "continue" (back in fire_analysis)
- `turns_since_data`: 3 (three turns since data was fresh)

---

### Test Case 6: Switch to Emissions Analysis (New Data)

**Description:** User clicks on an emissions bubble and sends emissions data.

**Request:**
```json
{
  "query": "Analyze these wildfire emissions",
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "emissions_data": {
    "lat": 34.055525,
    "lng": -87.470875,
    "state": "ALABAMA",
    "county": "Winston",
    "year": 2006,
    "fire_type": "clustered",
    "duration_days": 3,
    "spatial_extent_km": 3.49,
    "fire_size": 10,
    "fire_size_category": "small",
    "emission_value": 4663.14,
    "total_emissions": 4220.02,
    "emission_intensity": "high",
    "size_category": "small",
    "emissions": {
      "co2": 4002.0993,
      "ch4": 5.3792,
      "co": 184.087,
      "pm2_5": 28.4498
    }
  }
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "This Winston County, Alabama wildfire (2006) produced high-intensity emissions despite its small size (10 acres). The 3-day fire released 4,220 tons of total emissions, including 4,002 tons of CO₂, 184 tons of CO, 28.4 tons of PM2.5, and 5.4 tons of CH₄. The high emission intensity relative to fire size suggests dense vegetation and complete combustion, creating significant air quality impacts for the local area.",
  "sources": [
    {
      "type": "emission_event",
      "location": "Winston, ALABAMA",
      "year": 2006,
      "emission_intensity": "high"
    }
  ],
  "confidence_score": 1.0,
  "query_type": "analyze_emissions",
  "intent": "analyze_emissions",
  "context_action": "switch",
  "classification_confidence": 1.0,
  "processing_time_ms": 2234.67,
  "is_relevant": true,
  "turns_since_data": 0
}
```

**Key Points:**
- Same `session_id` (still in same conversation!)
- Sent new `emissions_data`
- `context_action`: "switch" (from fire_analysis to emissions_analysis)
- `turns_since_data`: 0 (new emissions data just received)
- Emissions data now stored in session

---

### Test Case 7: Emissions Follow-up

**Description:** User asks follow-up about the emissions without re-sending data.

**Request:**
```json
{
  "query": "How does this compare to typical emissions for small fires?",
  "session_id": "unified_a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "This small 10-acre fire in Winston County produced unusually high emissions for its size category. The emission value of 4,663 and 'high' intensity classification indicates emissions well above typical levels for small fires. The 4,002 tons of CO₂ from just 3 days of burning suggests dense fuel loading and efficient combustion, producing roughly 3-4 times the emissions expected for a fire of this acreage.",
  "sources": [
    {
      "type": "emission_event",
      "location": "Winston, ALABAMA",
      "year": 2006,
      "emission_intensity": "high"
    }
  ],
  "confidence_score": 1.0,
  "query_type": "analyze_emissions",
  "intent": "analyze_emissions",
  "context_action": "continue",
  "classification_confidence": 0.93,
  "processing_time_ms": 1876.54,
  "is_relevant": true,
  "turns_since_data": 1
}
```

**Key Points:**
- Only sent `query` and `session_id`
- Used stored emissions_data
- `context_action`: "continue" (staying in emissions_analysis)
- `turns_since_data`: 1

---

### Test Case 8: Data Staleness Warning (After 5 Turns)

**Description:** After 5 turns without new fire/emissions data, system tracks staleness.

**Request:**
```json
{
  "query": "Tell me more about the environmental impact",
  "session_id": "unified_a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "session_id": "unified_a1b2c3d4e5f6g7h8",
  "answer": "The environmental impact of this Winston County fire includes significant greenhouse gas emissions - the 4,002 tons of CO₂ contribute to climate change, while the 28.4 tons of PM2.5 particulate matter affects local air quality and public health. The 184 tons of CO and 5.4 tons of methane also have warming effects. For a small fire, these emissions represent substantial environmental burden on the local ecosystem.",
  "sources": [
    {
      "type": "emission_event",
      "location": "Winston, ALABAMA",
      "year": 2006,
      "emission_intensity": "high"
    }
  ],
  "confidence_score": 1.0,
  "query_type": "analyze_emissions",
  "intent": "analyze_emissions",
  "context_action": "continue",
  "classification_confidence": 0.85,
  "processing_time_ms": 2012.34,
  "is_relevant": true,
  "turns_since_data": 6
}
```

**Key Points:**
- `turns_since_data`: 6 (data is now considered "stale")
- Still works, but system tracks staleness
- After ~5-7 turns, users might want to click new data

---

## 🔥 Fire Analysis Endpoint

**Endpoint:** `POST /api/ai-assistant/analyze-fire`

**Swagger Docs:** [View in Swagger](https://wildfire-api-575281815403.us-central1.run.app/docs#/ai-assistant/analyze_fire_prediction_api_ai_assistant_analyze_fire_post)

This is the **original fire analysis endpoint** - still fully functional!

---

### Test Case 1: First Conversation Turn (With Fire Data)

**Request:**
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
  "include_web_search": false,
  "session_id": ""
}
```

**Response:**
```json
{
  "session_id": "cochise_arizona_fire_148_20251230_041228",
  "answer": "This Cochise County, Arizona fire shows moderate risk (3.88/10) with very brief predicted duration (0.24 days). Key risk factors include the Fire Danger Index of 114 (very high), critically low fuel moisture at 3.4%, and low relative humidity of 5.3%. Despite high fire danger conditions, the 97% probability of ending tomorrow suggests rapid suppression potential.",
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
  "web_sources": null,
  "confidence_score": 1.0,
  "query_type": "fire_analysis",
  "processing_time_ms": 2815.52,
  "is_relevant": true
}
```

---

### Test Case 2: Follow-up Question (Session ID Only)

**Request:**
```json
{
  "query": "How soon can this fire end?",
  "session_id": "cochise_arizona_fire_148_20251230_041228"
}
```

**Response:**
```json
{
  "session_id": "cochise_arizona_fire_148_20251230_041228",
  "answer": "This fire is predicted to end very soon. The predicted duration is less than a quarter of a day (0.236 days), with a high 97.2% probability of ending tomorrow. However, as previously noted, severe conditions like extremely low fuel moisture and high Fire Danger Index still warrant vigilance for rapid spread should it persist or re-ignite, despite the optimistic end prediction.",
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
  "web_sources": null,
  "confidence_score": 1.0,
  "query_type": "fire_analysis_followup",
  "processing_time_ms": 2815.52,
  "is_relevant": true
}
```

---

## 💨 Emissions Analysis Endpoint

**Endpoint:** `POST /api/emissions/analyze-emissions`

**Swagger Docs:** [View in Swagger](https://wildfire-api-575281815403.us-central1.run.app/docs#/emissions/analyze_emissions_event_api_analyze_emissions_post)

This is the **original emissions analysis endpoint** - still fully functional!

---

### Test Case 1: First Conversation Turn (With Emissions Data)

**Request:**
```json
{
  "emission_data": {
    "lat": 34.055525,
    "lng": -87.470875,
    "state": "ALABAMA",
    "county": "Winston",
    "year": 2006,
    "fire_type": "clustered",
    "duration_days": 3,
    "spatial_extent_km": 3.49,
    "fire_size": 10,
    "fire_size_category": "small",
    "emission_value": 4663.14,
    "total_emissions": 4220.02,
    "emission_intensity": "high",
    "size_category": "small",
    "emissions": {
      "co2": 4002.0993,
      "ch4": 5.3792,
      "co": 184.087,
      "pm2_5": 28.4498
    }
  },
  "query": "Analyze these wildfire emissions",
  "session_id": ""
}
```

**Response:**
```json
{
  "session_id": "winston_alabama_emissions_2006_20251230_045612",
  "answer": "This Winston County, Alabama wildfire (2006) produced high-intensity emissions despite its small size (10 acres). The 3-day fire released 4,220 tons of total emissions, including 4,002 tons of CO₂, 184 tons of CO, 28.4 tons of PM2.5, and 5.4 tons of CH₄. The high emission intensity relative to fire size suggests dense vegetation and complete combustion, creating significant air quality impacts for the local area.",
  "sources": [
    {
      "type": "emission_event",
      "location": "Winston, ALABAMA",
      "coordinates": "(34.055525, -87.470875)",
      "year": 2006,
      "emission_intensity": "high",
      "total_emissions": 4220.02,
      "fire_type": "clustered",
      "duration_days": 3,
      "spatial_extent_km": 3.49
    }
  ],
  "confidence_score": 1.0,
  "query_type": "emissions_analysis",
  "processing_time_ms": 2543.67,
  "is_relevant": true
}
```

---

### Test Case 2: Follow-up Question (Session ID Only)

**Request:**
```json
{
  "query": "What is the environmental impact of these emissions?",
  "session_id": "winston_alabama_emissions_2006_20251230_045612"
}
```

**Response:**
```json
{
  "session_id": "winston_alabama_emissions_2006_20251230_045612",
  "answer": "The environmental impact includes significant greenhouse gas contributions - 4,002 tons of CO₂ accelerate climate warming, while 5.4 tons of methane have 25 times the warming potential. The 28.4 tons of PM2.5 particulate matter poses serious air quality and respiratory health risks locally. Carbon monoxide (184 tons) affects air quality and human health. For a small 10-acre fire, these emissions demonstrate substantial environmental burden.",
  "sources": [
    {
      "type": "emission_event",
      "location": "Winston, ALABAMA",
      "coordinates": "(34.055525, -87.470875)",
      "year": 2006,
      "emission_intensity": "high",
      "total_emissions": 4220.02,
      "fire_type": "clustered",
      "duration_days": 3,
      "spatial_extent_km": 3.49
    }
  ],
  "confidence_score": 1.0,
  "query_type": "emissions_analysis_followup",
  "processing_time_ms": 2234.89,
  "is_relevant": true
}
```

---

## 💬 General Query Endpoint

**Endpoint:** `POST /api/ai-assistant/query`

**Swagger Docs:** [View in Swagger](https://wildfire-api-575281815403.us-central1.run.app/docs#/ai-assistant/handle_general_query_api_ai_assistant_query_post)

This is the **original general query endpoint** - still fully functional!

---

### Test Case 1: First Query (No Session)

**Request:**
```json
{
  "query": "What does Fire Danger Index mean?",
  "session_id": null
}
```

**Response:**
```json
{
  "session_id": "query_f7e8d9c6b5a4",
  "answer": "Fire Danger Index (BI) is a composite measure from 0-100 that indicates wildfire risk based on weather and fuel conditions. Values above 50 indicate very high risk, while values below 20 suggest low risk. It combines factors like temperature, humidity, wind speed, and fuel moisture to predict fire behavior and spread potential. Our platform uses this as a key predictor for fire duration and intensity.",
  "sources": [
    {
      "type": "platform_knowledge",
      "description": "Wildfire Prediction Platform Documentation",
      "coverage": "Platform features, KPIs, ML models, climate impact",
      "data_period": "2003-2015 training data"
    }
  ],
  "confidence_score": 0.95,
  "query_type": "general_platform_query",
  "processing_time_ms": 1456.78,
  "is_relevant": true
}
```

---

### Test Case 2: Follow-up Question (With Session)

**Request:**
```json
{
  "query": "How is it calculated?",
  "session_id": "query_f7e8d9c6b5a4"
}
```

**Response:**
```json
{
  "session_id": "query_f7e8d9c6b5a4",
  "answer": "The Fire Danger Index is calculated by combining multiple weather and fuel variables. It considers temperature (both min and max), relative humidity levels, wind speed, fuel moisture content (100-hour and 1000-hour fuels), and vapor pressure deficit. These factors are weighted and combined using empirically-derived formulas to produce a single 0-100 score. Higher temperatures, lower humidity, stronger winds, and drier fuels all increase the index value.",
  "sources": [
    {
      "type": "platform_knowledge",
      "description": "Wildfire Prediction Platform Documentation",
      "coverage": "Platform features, KPIs, ML models, climate impact",
      "data_period": "2003-2015 training data"
    }
  ],
  "confidence_score": 0.95,
  "query_type": "general_platform_query",
  "processing_time_ms": 1678.92,
  "is_relevant": true
}
```

---

## 🔄 Testing Workflow Examples

### Workflow 1: Complete Unified Chat Flow

**Purpose:** Test seamless context switching in one conversation.

```bash
# Step 1: Start with general query
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/orchestrator/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "What is the platform about?"
  }'
# Save session_id from response

# Step 2: Switch to fire analysis (user clicked fire)
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/orchestrator/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "Analyze this fire",
    "session_id": "unified_...",
    "fire_data": {
      "imputed": {"state": "Arizona", "county": "Cochise", "risk": 3.88, ...},
      "predictions": {"duration": 0.24, ...}
    }
  }'

# Step 3: Follow-up on fire
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/orchestrator/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "What about fuel moisture?",
    "session_id": "unified_..."
  }'

# Step 4: Ask for definition (switches to general)
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/orchestrator/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "What does fuel moisture mean?",
    "session_id": "unified_..."
  }'

# Step 5: Switch to emissions (user clicked emissions)
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/orchestrator/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "Analyze these emissions",
    "session_id": "unified_...",
    "emissions_data": {
      "state": "ALABAMA",
      "county": "Winston",
      "total_emissions": 4220.02,
      ...
    }
  }'

# Step 6: Follow-up on emissions
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/orchestrator/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "How does this affect air quality?",
    "session_id": "unified_..."
  }'
```

**Expected Results:**
- Same session_id throughout entire conversation
- Context switches automatically (general → fire → general → emissions)
- No data re-sent on follow-ups
- Natural conversational flow

---

### Workflow 2: Test Legacy Endpoints

**Purpose:** Verify backward compatibility - old endpoints still work.

```bash
# Test fire analysis endpoint
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/ai-assistant/analyze-fire' \
  -H 'Content-Type: application/json' \
  -d '{
    "fire_data": {...},
    "query": "Analyze this fire"
  }'

# Test emissions endpoint
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/emissions/analyze-emissions' \
  -H 'Content-Type: application/json' \
  -d '{
    "emission_data": {...},
    "query": "Analyze emissions"
  }'

# Test general query endpoint
curl -X POST 'https://wildfire-api-575281815403.us-central1.run.app/api/ai-assistant/query' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "What is Fire Danger Index?"
  }'
```

**Expected Results:**
- All endpoints return 200 OK
- Responses match expected format
- Session IDs are endpoint-specific (not unified)

---

### Workflow 3: Session Management

**Purpose:** Test session lifecycle.

```bash
# Create session
curl -X POST '.../api/orchestrator/chat' \
  -d '{"query": "Hello"}'
# Get session_id

# Check session exists
curl -X GET '.../api/orchestrator/sessions'

# Get session details
curl -X GET '.../api/orchestrator/sessions/{session_id}'

# Use session for multiple turns
# ... (multiple requests with same session_id)

# Delete session
curl -X DELETE '.../api/orchestrator/sessions/{session_id}'

# Verify deletion
curl -X GET '.../api/orchestrator/sessions/{session_id}'
# Should return 404
```

---

## 📊 Response Field Explanations

### Common Fields Across All Endpoints:

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | Unique identifier for conversation. Save this for follow-ups! |
| `answer` | string | AI-generated response to user's query |
| `sources` | array | Information about data sources used |
| `confidence_score` | float | How confident the system is (0.0-1.0) |
| `query_type` | string | Type of query processed |
| `processing_time_ms` | float | Time taken to process request (milliseconds) |
| `is_relevant` | boolean | Whether query is relevant to wildfire topics |

### Orchestrator-Specific Fields:

| Field | Type | Description |
|-------|------|-------------|
| `intent` | string | Detected user intent: "analyze_fire", "analyze_emissions", or "general_query" |
| `context_action` | string | Action taken: "new" (new conversation), "continue" (same context), "switch" (changed context) |
| `classification_confidence` | float | Confidence in intent classification (0.0-1.0) |
| `turns_since_data` | int | Number of turns since fire/emissions data was provided. Null for general queries. |

---

## 🎯 Quick Reference

### When to Use Each Endpoint:

| Scenario | Recommended Endpoint | Why? |
|----------|---------------------|------|
| **New project / want unified experience** | `/api/orchestrator/chat` | Best UX, seamless context switching |
| **Existing integration, don't want to change** | Legacy endpoints | Backward compatible, no changes needed |
| **Need specific fire analysis only** | `/api/ai-assistant/analyze-fire` | Direct access, simpler |
| **Need specific emissions analysis only** | `/api/emissions/analyze-emissions` | Direct access, simpler |
| **General questions only** | `/api/ai-assistant/query` | Simple knowledge base queries |

### Data Requirements:

| Endpoint | First Turn | Follow-up Turns |
|----------|-----------|----------------|
| `/orchestrator/chat` | Optional: fire_data OR emissions_data | Only session_id + query |
| `/analyze-fire` | Required: fire_data | Only session_id + query |
| `/analyze-emissions` | Required: emissions_data | Only session_id + query |
| `/query` | None | Only session_id + query |

---

## 🔍 Testing Tips

### For Developers:

1. **Save Session IDs:** Always save the `session_id` from first response
2. **Don't Re-send Data:** On follow-ups, only send `query` + `session_id`
3. **Check Context Action:** Look at `context_action` to verify switching behavior
4. **Monitor Staleness:** Watch `turns_since_data` to track data freshness
5. **Test All Flows:** Try switching between all three contexts in one session

### Common Mistakes:

❌ **Sending data on every follow-up** → Wastes bandwidth, creates new context
✅ **Send data only when user clicks new fire/emissions**

❌ **Creating new session for each context** → Loses conversation history
✅ **Keep same session_id across contexts**

❌ **Not checking `context_action`** → Miss understanding of what system did
✅ **Log `context_action` to see routing decisions**

---

## 📞 Support

If you encounter issues:

1. Check the response `query_type` and `context_action` fields
2. Verify `session_id` is being saved and reused correctly
3. Look at `turns_since_data` - if > 5, data may be stale
4. Check logs for intent classification reasoning
5. Ensure data structure matches examples exactly

For the unified orchestrator, check:
- Classification confidence (should be > 0.7)
- Intent matches expected behavior
- Context switching works as intended

---

**End of Sample Inputs Guide** 🎉

All endpoints tested and ready to use! Choose the orchestrator for the best experience, or continue using legacy endpoints for backward compatibility.