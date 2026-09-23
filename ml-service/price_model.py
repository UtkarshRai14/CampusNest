"""
Fair-price prediction model.

Ported verbatim (loading, preprocessing, feature order, prediction, chart
generation) from the original FastAPI backend's `ml/price_model.py`. The
only change from the original is import paths (this file now lives
standalone in ml-service/ instead of backend/ml/), and that the chart is
generated exactly as before with matplotlib, unchanged.
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import pickle
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import base64
from io import BytesIO
from price_data import generate_price_data

MODEL_PATH = os.path.join(os.path.dirname(__file__), "price_model.pkl")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "label_encoder.pkl")


def train_model():
    df = generate_price_data()

    le = LabelEncoder()
    df["category_encoded"] = le.fit_transform(df["category"])

    X = df[["category_encoded", "original_price", "condition", "months_used", "demand_score"]]
    y = df["fair_price"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Model trained successfully")
    print(f"Mean Absolute Error: ₹{mae:.2f}")
    print(f"R2 Score: {r2:.4f}")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(le, f)

    print(f"Model saved to {MODEL_PATH}")
    return model, le


def load_model():
    if not os.path.exists(MODEL_PATH):
        print("Model not found. Training now...")
        return train_model()
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(ENCODER_PATH, "rb") as f:
        le = pickle.load(f)
    return model, le


def predict_price(category: str, original_price: float, condition: int, months_used: int, demand_score: float = 0.5):
    model, le = load_model()

    if category not in le.classes_:
        category = "Electronics"

    category_encoded = le.transform([category])[0]
    features = np.array([[category_encoded, original_price, condition, months_used, demand_score]])
    predicted_price = model.predict(features)[0]

    lower_bound = round(predicted_price * 0.9, 2)
    upper_bound = round(predicted_price * 1.1, 2)
    predicted_price = round(predicted_price, 2)

    chart = generate_price_chart(original_price, lower_bound, predicted_price, upper_bound)

    return {
        "predicted_price": predicted_price,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "chart": chart
    }


def generate_price_chart(original_price, lower_bound, predicted_price, upper_bound):
    fig, ax = plt.subplots(figsize=(6, 3))

    bars = ax.barh(
        ["Original Price", "Min Fair Price", "Suggested Price", "Max Fair Price"],
        [original_price, lower_bound, predicted_price, upper_bound],
        color=["#E0E0E0", "#81C784", "#1565C0", "#42A5F5"],
        height=0.5
    )

    for bar, val in zip(bars, [original_price, lower_bound, predicted_price, upper_bound]):
        ax.text(bar.get_width() + original_price * 0.01, bar.get_y() + bar.get_height() / 2,
                f"₹{val:,.0f}", va="center", fontsize=9)

    ax.set_xlabel("Price (₹)", fontsize=9)
    ax.set_title("CampusNest Fair Price Analysis", fontsize=10, fontweight="bold")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()

    buffer = BytesIO()
    plt.savefig(buffer, format="png", dpi=100, bbox_inches="tight")
    buffer.seek(0)
    chart_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close()

    return f"data:image/png;base64,{chart_base64}"


if __name__ == "__main__":
    train_model()
