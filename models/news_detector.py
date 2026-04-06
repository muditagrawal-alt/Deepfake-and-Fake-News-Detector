from transformers import pipeline

classifier = None


def load_news_model():
    global classifier
    if classifier is None:
        classifier = pipeline(
            "text-classification",
            model="jy46604790/Fake-News-Bert-Detect"
        )


def predict_news(text):
    load_news_model()

    result = classifier(text)[0]

    label = result["label"]
    confidence = result["score"]

    if label.lower() in ["fake", "label_0"]:
        label = "FAKE"
    else:
        label = "REAL"

    return label, confidence