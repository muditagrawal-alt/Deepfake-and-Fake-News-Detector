from transformers import pipeline

from utils.huggingface_local import local_model_only, resolve_local_model_source

classifier = None
model_name = "jy46604790/Fake-News-Bert-Detect"


def load_news_model():
    global classifier
    if classifier is None:
        required_files = ["config.json", "tokenizer_config.json"]
        model_source = resolve_local_model_source(model_name, required_files=required_files)
        classifier = pipeline(
            "text-classification",
            model=model_source,
            tokenizer=model_source,
            local_files_only=local_model_only(model_name, required_files=required_files)
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
