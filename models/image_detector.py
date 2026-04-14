import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

model_name = "Organika/sdxl-detector"

processor = None
model = None


def load_image_model():
    global processor, model

    if processor is None or model is None:
        processor = AutoImageProcessor.from_pretrained(model_name)
        model = AutoModelForImageClassification.from_pretrained(model_name)
        model.to(device)
        model.eval()


def normalize_label(raw_label: str) -> str:
    label = (raw_label or "").strip().lower()

    fake_keywords = {
        "fake",
        "ai",
        "generated",
        "synthetic",
        "sdxl",
        "label_1",
    }

    real_keywords = {
        "real",
        "human",
        "authentic",
        "natural",
        "label_0",
    }

    if label in fake_keywords or any(word in label for word in ["fake", "ai", "synthetic", "generated"]):
        return "FAKE"

    if label in real_keywords or "real" in label:
        return "REAL"

    return raw_label.upper() if raw_label else "UNKNOWN"


def predict_image(image_path):
    load_image_model()

    image = Image.open(image_path).convert("RGB")

    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)
    confidence, predicted_class = torch.max(probs, dim=1)

    raw_label = model.config.id2label[predicted_class.item()]
    label = normalize_label(raw_label)

    return label, float(confidence.item())