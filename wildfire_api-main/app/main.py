from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.imputer import impute_features
from app.orchestrator import router as orchestrator_router
from app.model_download import get_xgb_best_model, get_xgb_hazard_model
from app import risk_heatmap, emissions
from dotenv import load_dotenv
import os
import threading

# Load environment variables from .env file
load_dotenv()

# Import AI Assistant
from app.ai_assistant_wildfire import router as ai_assistant_router
from app.web_search_assistant import router as web_search_router

app = FastAPI(title="Wildfire API", version="1.0")


# ---------- Request Models ----------
class ImputeRequest(BaseModel):
    features: Dict[str, Any]
    round_risk: Optional[bool] = False


# ---------- Root ----------
@app.get("/")
def read_root():
    return {"message": "Wildfire API running with AI Assistant"}


# ---------- Imputation Endpoint ----------
@app.post("/impute")
def impute_endpoint(request: ImputeRequest):
    result = impute_features(request.features, round_risk=request.round_risk)
    return {"input": request.features, "imputed": result}


def map_duration_to_risk(duration: float) -> float:
    if duration >= 10:
        # Map duration ≥ 10 into [6, 10], capped at 10
        return min(10, 6 + (duration - 10) / 20 * 4)
        # every +20 days adds ~4 risk, but max at 10
    elif duration >= 5:
        # Map duration [5,10) → risk [3,6]
        return 3 + (duration - 5) / 5 * 3
    elif duration >= 1:
        # Map duration [1,5) → risk [1,3]
        return 1 + (duration - 1) / 4 * 2
    else:
        # Map duration [0,1) → risk [0,1]
        return max(0, min(1, duration * 2.5))


# ---------- Prediction Endpoint ----------
@app.post("/predict")
def predict_endpoint(request: ImputeRequest):
    import pandas as pd
    from app.bigquery_utils import fetch_risk_events

    # Step 1: impute missing features
    imputed = impute_features(request.features, round_risk=request.round_risk)

    # Step 2: drop excluded columns
    exclude_cols = ['duration', 'global_fire_event_id', 'state', 'county', 'end_tomorrow', 'risk']
    feature_vector = {k: v for k, v in imputed.items() if k not in exclude_cols}

    X = pd.DataFrame([feature_vector])

    # Step 3: predictions
    duration_pred = abs(float(get_xgb_best_model().predict(X)[0]))
    proba = get_xgb_hazard_model().predict_proba(X)
    end_probability = float(proba[0, 1])  # probability fire continues tomorrow
    end_label = int(end_probability >= 0.5)

    # Step 4: determine query filters for risk events
    # state/county previously had no fallback to the imputed values, unlike doy/season.
    # So when the user gave no location the imputer still inferred one (e.g. Cochise,
    # Arizona) while the map query ran nationwide -- the analysis and the dots on the
    # map then described completely different places.
    state = request.features.get("state") or imputed.get("state")
    # Only an explicitly chosen county narrows the map. Falling back to the imputed
    # county would shrink it to a handful of dots; the state keeps it regional and
    # still consistent with whatever location the analysis talks about.
    county = request.features.get("county")
    doy = request.features.get("doy") or imputed.get("doy")
    # `season` is deliberately NOT forwarded when we have a doy: the two can contradict
    # each other and cancel the query out. fetch_risk_events prefers doy when both exist.
    season = request.features.get("season") or imputed.get("season")

    # Step 5: fetch historical risk events from BigQuery
    risk_events = fetch_risk_events(
        state=state,
        county=county,
        season=season,
        doy=doy,
        risk=imputed.get("risk")
    )
    risk_adjusted = map_duration_to_risk(duration_pred)
    if risk_adjusted > 10:
        risk_adjusted = 8.97645

    # Final response
    return {
        "input": request.features,
        "imputed": imputed,
        "predictions": {
            "duration": duration_pred,
            "end_tomorrow_prob": end_probability,
            "end_tomorrow_label": end_label,
            "adjusted_risk": risk_adjusted
        },
        "risk_events": risk_events
    }


# ---------- Include Routers ----------

# AI Assistant endpoints
app.include_router(ai_assistant_router, prefix="/api")

# Risk Heatmap endpoints
app.include_router(risk_heatmap.router)

# Emissions endpoints
app.include_router(emissions.router, prefix="/api", tags=["emissions"])

app.include_router(orchestrator_router, prefix="/api", tags=["orchestrator"])

# Web Search Grounded AI Assistant endpoints
app.include_router(web_search_router, prefix="/api", tags=["web-search"])


# ---------- Model warm-up ----------
# Models load lazily so the port binds immediately and Cloud Run's startup probe
# passes. This kicks the loads off in the background right after startup so the
# first real request does not pay for them. The thread is started and not waited
# on: uvicorn runs lifespan startup BEFORE creating the listening socket, so
# blocking here would reintroduce the very timeout we are fixing.
@app.on_event("startup")
def warm_models():
    def _load():
        try:
            from app.imputer import get_imputer
            get_imputer()
            get_xgb_best_model()
            get_xgb_hazard_model()
            print("Model warm-up complete")
        except Exception as exc:  # non-fatal: each getter retries on demand
            print(f"Model warm-up failed, will load on first use: {exc}")

    threading.Thread(target=_load, name="model-warmup", daemon=True).start()


# ---------- Health Check ----------
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Wildfire API",
        "features": [
            "Fire prediction",
            "Risk assessment",
            "Emissions analysis",
            "AI Assistant - Fire Analysis",
            "AI Assistant - General Queries"
        ]
    }