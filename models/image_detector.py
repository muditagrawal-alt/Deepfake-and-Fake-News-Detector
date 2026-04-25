import csv
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from sklearn.ensemble import RandomForestClassifier
from transformers import AutoImageProcessor, AutoModelForImageClassification

from utils.dataset_resolver import resolve_existing_path
from utils.huggingface_local import local_model_only, resolve_local_model_source

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

model_name = "Organika/sdxl-detector"
default_metadata_path = (
    Path(__file__).resolve().parents[1] / "data" / "evaluation" / "images" / "metadata.csv"
)

processor = None
model = None
calibrator = None


def load_image_model():
    global processor, model

    if processor is None or model is None:
        required_files = ["config.json", "preprocessor_config.json"]
        model_source = resolve_local_model_source(model_name, required_files=required_files)
        model_kwargs = {"local_files_only": local_model_only(model_name, required_files=required_files)}

        processor = AutoImageProcessor.from_pretrained(
            model_source,
            use_fast=False,
            **model_kwargs,
        )
        model = AutoModelForImageClassification.from_pretrained(model_source, **model_kwargs)
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
        "artificial",
        "label_0",
    }

    real_keywords = {
        "real",
        "human",
        "authentic",
        "natural",
        "label_1",
    }

    if label in fake_keywords or any(
        word in label for word in ["fake", "ai", "synthetic", "generated", "artificial"]
    ):
        return "FAKE"

    if label in real_keywords or "real" in label or "human" in label:
        return "REAL"

    return raw_label.upper() if raw_label else "UNKNOWN"


def predict_base_image(image_path):
    load_image_model()

    resolved_path = resolve_existing_path(image_path)
    image = Image.open(resolved_path).convert("RGB")

    inputs = processor(images=image, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)[0]
    confidence, predicted_class = torch.max(probs, dim=0)

    raw_label = model.config.id2label[predicted_class.item()]
    label = normalize_label(raw_label)

    fake_index = next(
        (
            index
            for index, raw in model.config.id2label.items()
            if normalize_label(raw) == "FAKE"
        ),
        predicted_class.item(),
    )

    return {
        "path": resolved_path,
        "label": label,
        "confidence": float(confidence.item()),
        "raw_label": raw_label,
        "fake_probability": float(probs[fake_index].item()),
        "real_probability": float(1.0 - probs[fake_index].item()),
    }


def predict_base_images_pil(images):
    """
    Batched base predictions for in-memory PIL images.
    Returns a list of dicts (one per input image) with the same keys as
    `predict_base_image`, except `path` is None.
    """
    load_image_model()

    if not images:
        return []

    rgb_images = [img.convert("RGB") for img in images]
    inputs = processor(images=rgb_images, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)
    confidences, predicted_classes = torch.max(probs, dim=1)

    fake_index = next(
        (
            index
            for index, raw in model.config.id2label.items()
            if normalize_label(raw) == "FAKE"
        ),
        int(predicted_classes[0].item()),
    )

    results = []
    for idx in range(probs.shape[0]):
        predicted_class = int(predicted_classes[idx].item())
        raw_label = model.config.id2label[predicted_class]
        label = normalize_label(raw_label)
        confidence = float(confidences[idx].item())
        fake_probability = float(probs[idx, fake_index].item())

        results.append(
            {
                "path": None,
                "label": label,
                "confidence": confidence,
                "raw_label": raw_label,
                "fake_probability": fake_probability,
                "real_probability": float(1.0 - fake_probability),
            }
        )

    return results


def _colorfulness(rgb_array: np.ndarray) -> float:
    red = rgb_array[..., 0].astype(np.float32)
    green = rgb_array[..., 1].astype(np.float32)
    blue = rgb_array[..., 2].astype(np.float32)

    rg = np.abs(red - green)
    yb = np.abs(0.5 * (red + green) - blue)

    return float(
        np.sqrt(rg.std() ** 2 + yb.std() ** 2)
        + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)
    )


def extract_image_features(image_path, base_prediction=None):
    resolved_path = resolve_existing_path(image_path)
    base_prediction = base_prediction or predict_base_image(resolved_path)

    image = Image.open(resolved_path).convert("RGB")
    rgb_array = np.array(image)
    gray = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2HSV)

    laplacian_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    edges = cv2.Canny(gray, 100, 200)
    edge_density = float(edges.mean() / 255.0)

    histogram = cv2.calcHist([gray], [0], None, [256], [0, 256]).ravel()
    histogram = histogram / histogram.sum()
    entropy = float(-(histogram[histogram > 0] * np.log2(histogram[histogram > 0])).sum())

    height, width = gray.shape
    resized_gray = cv2.resize(gray, (256, 256))
    fft = np.fft.fftshift(np.fft.fft2(resized_gray))
    power = np.abs(fft) ** 2
    grid_y, grid_x = np.ogrid[:256, :256]
    radius = np.sqrt((grid_y - 128) ** 2 + (grid_x - 128) ** 2)

    power_sum = float(power.sum()) or 1.0
    high_frequency_ratio = float(power[radius > 64].sum() / power_sum)
    mid_frequency_ratio = float(power[(radius > 32) & (radius <= 64)].sum() / power_sum)

    saturation = hsv[..., 1]
    value = hsv[..., 2]

    return np.array(
        [
            base_prediction["fake_probability"],
            base_prediction["confidence"],
            1.0 if base_prediction["label"] == "FAKE" else 0.0,
            float(width),
            float(height),
            float(width / max(height, 1)),
            float(gray.mean()),
            float(gray.std()),
            float(saturation.mean()),
            float(saturation.std()),
            float(value.mean()),
            float(value.std()),
            laplacian_variance,
            edge_density,
            entropy,
            high_frequency_ratio,
            mid_frequency_ratio,
            _colorfulness(rgb_array),
        ],
        dtype=np.float32,
    )


def make_image_calibrator():
    return RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        class_weight="balanced",
    )


def load_image_calibrator(metadata_path=None):
    global calibrator

    if calibrator is not None:
        return calibrator

    metadata_file = Path(metadata_path or default_metadata_path)
    if not metadata_file.exists():
        return None

    features = []
    labels = []

    with open(metadata_file, newline="", encoding="utf-8") as csv_file:
        rows = list(csv.DictReader(csv_file))

    for row in rows:
        image_path = resolve_existing_path(row["path"])
        if not Path(image_path).exists():
            continue

        base_prediction = predict_base_image(image_path)
        features.append(extract_image_features(image_path, base_prediction))
        labels.append(1 if row["label"].strip().upper() == "FAKE" else 0)

    if not features:
        return None

    calibrator = make_image_calibrator()
    calibrator.fit(np.vstack(features), np.array(labels))
    return calibrator


def predict_image(image_path):
    base_prediction = predict_base_image(image_path)
    image_calibrator = load_image_calibrator()

    if image_calibrator is None:
        return base_prediction["label"], base_prediction["confidence"]

    features = extract_image_features(base_prediction["path"], base_prediction).reshape(1, -1)
    fake_probability = float(image_calibrator.predict_proba(features)[0][1])

    label = "FAKE" if fake_probability >= 0.5 else "REAL"
    confidence = fake_probability if label == "FAKE" else 1.0 - fake_probability

    return label, confidence
