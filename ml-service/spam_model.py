import pickle
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

MODEL_PATH = os.path.join(os.path.dirname(__file__), "spam_model.pkl")

SPAM_LISTINGS = [
    "FREE laptop give away click here now",
    "Win iPhone 15 pro max totally free",
    "Earn money fast work from home",
    "Click link below to get free stuff",
    "Limited offer buy now before gone",
    "Make money online easily from home",
    "Free gift card claim now urgent",
    "Best price guaranteed call now",
    "Urgent sale everything must go today",
    "Amazing deal you wont believe this price",
    "Get rich quick scheme investment opportunity",
    "Free seminar earn lakhs per month",
    "Miracle product works instantly guaranteed",
    "Act now limited time offer expires soon",
    "You have been selected for free prize",
    "Double your money guaranteed investment",
    "Free iPhone winner claim your prize now",
    "Exclusive deal only for you today only",
    "Warning account suspended verify now",
    "Congratulations you won click to claim",
    "Sell kidney urgent cash needed immediately",
    "Buy fake certificate degree diploma cheap",
    "Illegal items available contact privately",
    "Stolen goods cheap price no questions",
    "100 percent guaranteed results or money back",
    "Pay advance booking amount to secure this laptop today",
    "Send registration fee to unlock free scholarship offer",
    "Investment scheme doubles your pocket money in a week",
    "DM for crypto trading tips guaranteed daily profit",
    "Hostel room available pay deposit via this UPI link only",
    "Job vacancy part time data entry no interview needed",
    "Loan available instant approval no documents required student",
    "Sell your assignment solutions earn 5000 rupees daily",
    "Selling exam leaked question paper contact urgently",
    "Free recharge offer limited stock hurry click now",
    "Resell this for double price guaranteed buyer waiting",
    "Cheap branded shoes wholesale price bulk only no returns",
    "Get verified blue tick instantly pay small fee",
    "Forex trading masterclass free seats limited register now",
    "Win scholarship just share this message to 10 friends",
]

REAL_LISTINGS = [
    "Selling my second semester data structures book good condition",
    "Casio fx 991es scientific calculator lightly used",
    "Laptop Dell Inspiron 15 used for one year good condition",
    "Architecture drawing set compass T square for sale",
    "Room fan table fan working condition hostel use",
    "Python programming book by Dennis Ritchie semester 3",
    "Air cooler symphony 40L used one summer good condition",
    "Mechanical engineering drawing instruments set complete",
    "Selling BCA first year books all subjects bundle",
    "MacBook Air M1 2022 excellent condition barely used",
    "Scientific calculator Casio fx 100ms two years old",
    "MBA marketing management books Kotler semester 2",
    "Table lamp study lamp hostel use good condition",
    "Headphones Sony WH 1000XM4 selling due to upgrade",
    "Civil engineering AutoCAD software book with CD",
    "Bedsheet pillow cover set hostel room barely used",
    "Pharmacy reference book Goodman Gilman original edition",
    "Drawing board A1 size architecture student selling",
    "Laptop bag 15 inch waterproof barely used",
    "Printer HP DeskJet 2331 working condition with ink",
    "Extension board surge protector hostel approved",
    "Physics chemistry maths books class 12 for JEE",
    "Nanotechnology research papers printed collection",
    "Biotechnology lab manual semester 4 good condition",
    "MBA finance books hull options futures derivatives",
    "Immersion water heater rod 500W good working condition",
    "Stapler heavy duty with extra staples included",
    "RD Sharma maths book semester 3 like new condition",
    "HP laptop available for rent during exam week only",
    "Wooden study table foldable hostel room size",
    "Single bed mattress 4 inch thick barely used one year",
    "Electric kettle 1 litre boiling water hostel approved",
    "USB C to USB A cable 1 metre fast charging",
    "Engineering graphics drafter complete set unused",
    "Iron box hostel use selling before leaving campus",
    "Bicycle single speed good condition for campus commute",
    "Steel almirah cupboard hostel room storage selling",
    "Chemistry lab coat size large used one semester",
    "Wifi router TP-Link selling moving out of hostel",
    "Guitar acoustic Yamaha beginner good condition",
]

def generate_training_data():
    texts = SPAM_LISTINGS + REAL_LISTINGS
    labels = [1] * len(SPAM_LISTINGS) + [0] * len(REAL_LISTINGS)

    augmented_texts = []
    augmented_labels = []

    for text, label in zip(texts, labels):
        augmented_texts.append(text)
        augmented_labels.append(label)
        augmented_texts.append(text.upper())
        augmented_labels.append(label)
        augmented_texts.append(text + " contact on whatsapp" if label == 1 else text + " price negotiable")
        augmented_labels.append(label)

    return augmented_texts, augmented_labels

def train_spam_model():
    texts, labels = generate_training_data()

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            stop_words="english"
        )),
        ("classifier", LogisticRegression(random_state=42, max_iter=1000))
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("Spam Model Training Complete")
    print(classification_report(y_test, y_pred, target_names=["Real", "Spam"]))

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"Spam model saved to {MODEL_PATH}")
    return pipeline

def load_spam_model():
    if not os.path.exists(MODEL_PATH):
        print("Spam model not found. Training now...")
        return train_spam_model()
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    return model

def is_spam(title: str, description: str = "") -> dict:
    model = load_spam_model()
    text = f"{title} {description}".strip()
    prediction = model.predict([text])[0]
    probability = model.predict_proba([text])[0]
    spam_probability = round(float(probability[1]), 3)
    is_flagged = bool(prediction == 1)

    return {
        "is_spam": is_flagged,
        "spam_probability": spam_probability,
        "confidence": "high" if spam_probability > 0.8 or spam_probability < 0.2 else "medium"
    }

if __name__ == "__main__":
    train_spam_model()
    print("\nTesting spam detection:")
    test_cases = [
        ("FREE laptop give away click now", ""),
        ("Selling data structures book semester 2", "Good condition used for one semester"),
        ("Win iPhone free click here", "Limited offer"),
        ("Casio calculator good condition", "Used for 2 semesters price negotiable"),
    ]
    for title, desc in test_cases:
        result = is_spam(title, desc)
        status = "🚨 SPAM" if result["is_spam"] else "✅ REAL"
        print(f"{status} | {title[:40]} | probability: {result['spam_probability']}")