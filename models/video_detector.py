import os
import urllib.request
import torch
from timm import create_model

# Path to store model weights
weights_path = os.path.join(os.path.dirname(__file__), "deepfake_efficientnet.pth")

# Download pretrained weights if missing
if not os.path.exists(weights_path):
    print("Downloading pretrained EfficientNet-B0 weights...")
    url = "https://huggingface.co/Xicor9/efficientnet-b0-ffpp-c23/resolve/main/efficientnet_b0_ffpp_c23.pth"
    urllib.request.urlretrieve(url, weights_path)
    print("Download complete!")

def load_model():
    # Create EfficientNet-B0 model for binary classification
    model = create_model('efficientnet_b0', pretrained=False, num_classes=1)  # 1 output for sigmoid
    # Load weights (allow missing/unexpected keys)
    state_dict = torch.load(weights_path, map_location='cpu')
    model.load_state_dict(state_dict, strict=False)
    model.eval()
    return model