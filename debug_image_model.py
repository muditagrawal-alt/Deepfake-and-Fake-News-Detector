import os
from PIL import Image
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
model_name = "Organika/sdxl-detector"

processor = AutoImageProcessor.from_pretrained(model_name)
model = AutoModelForImageClassification.from_pretrained(model_name)
model.to(device)
model.eval()


def predict_raw(image_path):
    image = Image.open(image_path).convert("RGB")

    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)[0]
    pred_idx = torch.argmax(probs).item()
    raw_label = model.config.id2label[pred_idx]

    return {
        "path": image_path,
        "pred_idx": pred_idx,
        "raw_label": raw_label,
        "probs": probs.cpu().tolist(),
        "confidence": float(probs[pred_idx].item())
    }


def sample_files(folder, n=5):
    files = sorted([
        os.path.join(folder, f)
        for f in os.listdir(folder)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ])
    return files[:n]


if __name__ == "__main__":
    real_samples = sample_files("data/evaluation/images/real", 5)
    fake_samples = sample_files("data/evaluation/images/fake", 5)

    print("\n===== REAL SAMPLES =====")
    for path in real_samples:
        result = predict_raw(path)
        print(result)

    print("\n===== FAKE SAMPLES =====")
    for path in fake_samples:
        result = predict_raw(path)
        print(result)