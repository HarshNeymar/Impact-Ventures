import os
import threading
import joblib
import warnings
from google.cloud import storage

BUCKET_NAME = "data_housee"
MODEL_DIR = "wildfire_ml_models"
LOCAL_MODEL_DIR = "models"

os.makedirs(LOCAL_MODEL_DIR, exist_ok=True)

def download_if_needed(model_name: str):
    local_path = os.path.join(LOCAL_MODEL_DIR, model_name)
    if not os.path.exists(local_path):
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(f"{MODEL_DIR}/{model_name}")
        blob.download_to_filename(local_path)
        print(f"Downloaded {model_name} from GCS to {local_path}")
    else:
        print(f"Using cached model: {local_path}")
    return local_path


# ---------------------------------------------------------------------------
# Lazy loading.
#
# These used to be downloaded and unpickled at import time, which meant uvicorn
# could not bind its port until ~4.9GB of models were in memory. Cloud Run's
# startup TCP probe timed out long before that, so instances were killed and
# retried ("STARTUP TCP probe failed ... DEADLINE_EXCEEDED") and in-flight
# requests returned 500. Loading on first use lets the port open immediately.
#
# RandomForestRegressor_model.pkl (1.8GB) was downloaded and loaded here but was
# never used anywhere in the app, so it is no longer fetched at all.
# ---------------------------------------------------------------------------

_models = {}
_models_lock = threading.Lock()


def get_model(model_name: str):
    """Return a model, downloading and unpickling it once on first use."""
    cached = _models.get(model_name)
    if cached is not None:
        return cached
    with _models_lock:
        if model_name not in _models:
            local_path = download_if_needed(model_name)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", category=UserWarning)
                warnings.simplefilter("ignore", category=FutureWarning)
                warnings.simplefilter("ignore", category=Warning)
                _models[model_name] = joblib.load(local_path)
            print(f"Loaded model: {model_name}")
        return _models[model_name]


def get_xgb_best_model():
    """Fire duration regressor."""
    return get_model("xgb_best_model.pkl")


def get_xgb_hazard_model():
    """Calibrated end-tomorrow classifier."""
    return get_model("xgb_hazard_calibrated.pkl")
