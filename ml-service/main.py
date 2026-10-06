"""
CampusNest ML inference service.

A small FastAPI app that serves the two scikit-learn models used by the Express
backend. It is internal: only the backend calls it, never the browser.

Endpoints:
  GET  /health              liveness check
  POST /predict/price       RandomForest fair-price estimate. The model was trained on
                            synthetic data, so treat the result as a rough estimate.
                            Categories the model was not trained on (e.g. "Other") are
                            rejected with a 400 instead of being mapped to another one.
  POST /predict/spam        TF-IDF + Logistic Regression spam risk for one listing
  POST /predict/spam/batch  the same spam check for many listings in one request

Both models are loaded once at startup and reused for every request.
"""
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from price_model import load_model, predict_price
from spam_model import is_spam, load_spam_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    load_spam_model()
    yield


app = FastAPI(
    title="CampusNest ML Service",
    description="Internal inference service for the price prediction and spam detection models",
    version="1.0.0",
    lifespan=lifespan,
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

    try:
        return predict_price(
            category=request.category,
            original_price=request.original_price,
            condition=request.condition,
            months_used=request.months_used,
            demand_score=request.demand_score,
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


class SpamRequest(BaseModel):
    title: str
    description: Optional[str] = ""


@app.post("/predict/spam")
def predict_spam_endpoint(request: SpamRequest):
    return is_spam(request.title or "", request.description or "")


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
    import os

    import uvicorn
    from dotenv import load_dotenv

    load_dotenv()
    port = int(os.getenv("ML_SERVICE_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
