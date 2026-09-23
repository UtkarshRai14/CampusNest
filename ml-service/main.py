"""
CampusNest ML Inference Service
================================

This is a standalone Python service that wraps the project's original
scikit-learn artifacts (price_model.pkl, label_encoder.pkl, spam_model.pkl)
and the original preprocessing/prediction code from the FastAPI backend's
`ml/` package, unchanged.

In the original monolith, `predict_price()` and `is_spam()` were plain
Python functions called in-process from FastAPI route handlers. Now that
the main backend is Node.js/Express, this service exposes the exact same
logic over a small internal HTTP API so Express can call it. Nothing about
the models, preprocessing, feature order, encodings, or outputs has
changed - only the transport (in-process function call -> HTTP call).

Endpoints:
  GET  /health                - basic liveness/readiness check (new; ops-only)
  POST /predict/price         - same contract as the original FastAPI
                                 POST /predict/price route (category,
                                 original_price, condition, months_used,
                                 demand_score) -> predicted_price,
                                 lower_bound, upper_bound, chart
  POST /predict/spam          - wraps the original is_spam(title, description)
                                 function, which previously had no public
                                 HTTP route of its own (it was only called
                                 in-process from routers/listings.py). This
                                 endpoint is required so Express can reach
                                 the same logic across the process boundary.
  POST /predict/spam/batch    - internal-only convenience endpoint (not
                                 present in the original code) that scores
                                 a list of {title, description} items in one
                                 call. It does not change is_spam's inputs,
                                 outputs, or behavior for any single item -
                                 it exists purely so Express doesn't have to
                                 make N sequential HTTP round-trips when
                                 listing_to_dict() needs a spam score for
                                 every listing in a GET /listings/ response
                                 (the original code recomputed a spam score
                                 for every listing on every fetch; that
                                 behavior is preserved exactly, just batched
                                 at the transport level).

This service is internal-only: it is not exposed to the browser. Only the
Express backend talks to it (see ML_SERVICE_URL in backend/.env.example).
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from price_model import predict_price
from spam_model import is_spam

app = FastAPI(
    title="CampusNest ML Service",
    description="Internal inference service for the price prediction and spam detection models",
    version="1.0.0",
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "campusnest-ml-service"}


class PriceRequest(BaseModel):
    category: str
    original_price: float
    condition: int
    months_used: int
    demand_score: float = 0.5


@app.post("/predict/price")
def predict_price_endpoint(request: PriceRequest):
    if request.condition < 1 or request.condition > 5:
        raise HTTPException(status_code=400, detail="Condition must be between 1 and 5")
    if request.original_price <= 0:
        raise HTTPException(status_code=400, detail="Original price must be greater than 0")
    if request.months_used < 0:
        raise HTTPException(status_code=400, detail="Months used cannot be negative")

    result = predict_price(
        category=request.category,
        original_price=request.original_price,
        condition=request.condition,
        months_used=request.months_used,
        demand_score=request.demand_score,
    )
    return result


class SpamRequest(BaseModel):
    title: str
    description: Optional[str] = ""


@app.post("/predict/spam")
def predict_spam_endpoint(request: SpamRequest):
    result = is_spam(request.title or "", request.description or "")
    return result


class SpamBatchItem(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = ""


class SpamBatchRequest(BaseModel):
    items: List[SpamBatchItem]


@app.post("/predict/spam/batch")
def predict_spam_batch_endpoint(request: SpamBatchRequest):
    results = []
    for item in request.items:
        result = is_spam(item.title or "", item.description or "")
        results.append({"id": item.id, **result})
    return {"results": results}


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.getenv("ML_SERVICE_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
