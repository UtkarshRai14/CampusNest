"""
Synthetic training-data generator for the fair-price model.

Ported verbatim from the original FastAPI backend's `ml/price_data.py`.
Only used if `price_model.pkl` / `label_encoder.pkl` are missing and the
model needs to be retrained from scratch (see price_model.py:train_model).
Behavior, feature engineering, and randomness (np.random.seed(42)) are
unchanged from the original implementation.
"""
import pandas as pd
import numpy as np


def generate_price_data():
    np.random.seed(42)
    n = 600

    categories = ["Books", "Laptop", "Calculator", "Drawing Instruments", "Stationery", "Fan", "Cooler", "Hostel Items", "Electronics"]

    category_base_prices = {
        "Books": 400,
        "Laptop": 45000,
        "Calculator": 1200,
        "Drawing Instruments": 2500,
        "Stationery": 300,
        "Fan": 1800,
        "Cooler": 6000,
        "Hostel Items": 1500,
        "Electronics": 3000
    }

    data = []
    for _ in range(n):
        category = np.random.choice(categories)
        base_price = category_base_prices[category]
        original_price = base_price * np.random.uniform(0.8, 1.5)
        condition = np.random.randint(1, 6)
        months_used = np.random.randint(1, 48)
        demand_score = np.random.uniform(0.1, 1.0)

        depreciation = 1 - (months_used / 60) * 0.5
        condition_factor = condition / 5
        demand_factor = 0.8 + demand_score * 0.4
        fair_price = original_price * depreciation * condition_factor * demand_factor
        fair_price = max(fair_price, original_price * 0.1)
        fair_price = round(fair_price, 2)

        data.append({
            "category": category,
            "original_price": round(original_price, 2),
            "condition": condition,
            "months_used": months_used,
            "demand_score": round(demand_score, 2),
            "fair_price": fair_price
        })

    df = pd.DataFrame(data)
    return df


if __name__ == "__main__":
    df = generate_price_data()
    print(df.head(10))
    print(f"\nTotal rows: {len(df)}")
    print(f"\nPrice ranges:")
    print(df.groupby("category")["fair_price"].describe()[["min", "mean", "max"]])
