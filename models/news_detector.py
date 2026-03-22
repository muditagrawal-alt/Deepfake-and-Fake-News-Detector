from transformers import pipeline

# Load ONCE
classifier = pipeline(
    "text-classification",
    model="jy46604790/Fake-News-Bert-Detect"
)

def predict_news(text):
    result = classifier(text)[0]

    label = result["label"]
    confidence = result["score"]

    if label.lower() in ["fake", "label_0"]:
        label = "FAKE"
    else:
        label = "REAL"

    return label, confidence