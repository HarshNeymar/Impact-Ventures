# Wildfire API – CI/CD with Google Cloud Run

This project contains a FastAPI service for wildfire prediction, imputation, AI-powered analysis, and emissions tracking, deployed automatically to **Google Cloud Run** using **Google Cloud Build**.

## Features

- **Fire Prediction & Imputation** — ML models for wildfire risk scoring, duration prediction, and missing feature imputation
- **Unified AI Chat** (`/api/orchestrator/chat`) — Single endpoint with LLM-based intent classification, multi-turn session management, and optional Google Search grounding via `web_search` toggle
- **Emissions Analysis** — Wildfire emission event analysis with AI insights
- **Risk Heatmap** — US state/county risk heatmap data
- **Web-Search Grounded Pipeline** — Two-step pipeline using Google Gemini with Google Search tool for real-time web context

## API Endpoints

### Core
| Method | Path | Description |
|---|---|---|
| POST | `/impute` | Impute missing wildfire features |
| POST | `/predict` | Predict fire duration & risk |
| GET | `/risk-heatmap` | US wildfire risk heatmap data |

### Unified Chat (Recommended)
| Method | Path | Description |
|---|---|---|
| POST | `/api/orchestrator/chat` | Unified chat with intent routing & `web_search` toggle |
| GET | `/api/orchestrator/sessions` | List active chat sessions |
| GET | `/api/orchestrator/sessions/{id}` | Get session details |
| DELETE | `/api/orchestrator/sessions/{id}` | Delete a session |
| GET | `/api/orchestrator/health` | Health check |

### Standalone AI Assistant
| Method | Path | Description |
|---|---|---|
| POST | `/api/ai-assistant/analyze-fire` | Fire prediction analysis |
| POST | `/api/ai-assistant/query-bq` | General wildfire Q&A (BigQuery RAG) |
| POST | `/api/ai-assistant/query` | General platform Q&A |
| GET | `/api/ai-assistant/status` | AI assistant status |

### Web-Search Grounded (Standalone)
| Method | Path | Description |
|---|---|---|
| POST | `/api/web-search/analyze-fire` | Fire analysis + Google Search |
| POST | `/api/web-search/query` | General Q&A + Google Search |
| POST | `/api/web-search/analyze-emissions` | Emissions analysis + Google Search |

### Emissions
| Method | Path | Description |
|---|---|---|
| POST | `/api/analyze-emissions` | AI emissions analysis |
| GET | `/api/emissions` | Query emission events |
| GET | `/api/emissions/summary` | Emission summary stats |
| GET | `/api/emissions/filters` | Available filter options |

## Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn
- **ML Models**: XGBoost (fire duration, hazard classification), loaded from GCS
- **AI/LLM**: Google Gemini (`gemini-3.1-flash-lite-preview` for generation, intent classification, and web-search grounding)
- **SDKs**: `google-generativeai` (regular pipeline), `google-genai` (web-search grounded pipeline)
- **Data**: BigQuery (vector search, emissions), ChromaDB (local embeddings)
- **Deployment**: Docker, Google Cloud Build, Google Cloud Run

---

## Deployment Workflow

### Branching Strategy
- **`dev` branch**  
  - Used for development and testing.  
  - Cloud Build trigger `cloudbuild-dev.yaml` deploys to the **`wildfire-api-dev`** Cloud Run service.  
  - Live URL: `https://wildfire-api-dev-575281815403.us-central1.run.app`  
  - Allows validation of new endpoints and features before merging.  

  **Test a change here before production.** Push to `dev`, wait for the build, then point
  a test run at the dev URL:

  ```bash
  curl https://wildfire-api-dev-575281815403.us-central1.run.app/health
  ```

  The frontend can be aimed at it too, without a redeploy, by setting
  `WILDFIRE_API_BASE_URL` to the dev URL in `frontend/.env.local`.  

- **`main` branch**  
  - Production-ready branch.  
  - Cloud Build Trigger deploys automatically when new commits are pushed.  
  - Deploys to the production Cloud Run service.  

**Flow:**  
```text
   [dev branch]  --->  Test deployment (staging)
        |
        v
   Merge into main  --->  Production deployment (Cloud Run)
```

### CI/CD Pipeline (for `main`)
1. **Push Code to GitHub (`main` branch)**  
   - Cloud Build Trigger fires automatically.  
   - Builds Docker image.  
   - Pushes image to Artifact Registry.  
   - Deploys service to Cloud Run.  

2. **Service is Live**  
   - Accessible at your Cloud Run service URL.  
   - Example:  
     ```
     https://wildfire-api-575281815403.us-central1.run.app/docs#
     ```

---

## Requirements

- GitHub repository: [Jithendra-k/wildfire_api](https://github.com/Jithendra-k/wildfire_api)  
- Google Cloud Project: `code-for-planet`  
- Artifact Registry Repository: `wildfire-repo`  
- Cloud Build Trigger: `wildfire-api` (push to `main`)  
- Cloud Run Service: `wildfire-api` (region: `us-central1`)  

---

## Files

- **`Dockerfile`** – Defines container build (Python 3.12 + FastAPI + requirements).  
- **`requirements.txt`** – Python dependencies.  
- **`cloudbuild.yaml`** – CI/CD pipeline configuration:
  - Step 1: Build Docker image.  
  - Step 2: Push to Artifact Registry.  
  - Step 3: Deploy to Cloud Run.  

---

## Manual Deploy (Optional)

If you want to deploy manually (instead of waiting for a trigger):

```bash
# Build and push image
docker build -t us-central1-docker.pkg.dev/code-for-planet/wildfire-repo/wildfire-api:latest .
docker push us-central1-docker.pkg.dev/code-for-planet/wildfire-repo/wildfire-api:latest

# Deploy to Cloud Run
gcloud run deploy wildfire-api \
  --image us-central1-docker.pkg.dev/code-for-planet/wildfire-repo/wildfire-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 16Gi \
  --cpu 4
```
