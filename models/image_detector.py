import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

model_name = "dima806/deepfake_vs_real_image_detection"

processor = AutoImageProcessor.from_pretrained(model_name)
model = AutoModelForImageClassification.from_pretrained(model_name)

model.to(device)
model.eval()


def predict_image(image_path):
    image = Image.open(image_path).convert("RGB")

    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)
    confidence, predicted_class = torch.max(probs, dim=1)

    label = model.config.id2label[predicted_class.item()]

    return label, float(confidence.item())