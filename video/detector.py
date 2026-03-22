import sys
import os
import cv2
import torch
import numpy as np
from facenet_pytorch import MTCNN

# Add the models folder to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../models")))

from video_detector import load_model  # now it works

# Load the model
model = load_model()
model.eval()

# Preprocess face to match EfficientNet-B0 input
def preprocess_face(face):
    face = cv2.resize(face, (224, 224))  # timm EfficientNet-B0 input size
    face = face / 255.0
    face = np.transpose(face, (2, 0, 1))  # HWC -> CHW
    face = np.expand_dims(face, axis=0)
    return torch.tensor(face, dtype=torch.float32)

def predict_video(video_path, frame_skip=5):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Cannot open video")
        return None

    mtcnn = MTCNN(keep_all=True)
    frame_count = 0
    face_count = 0
    scores = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        if frame_count % frame_skip != 0:
            continue

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        boxes, _ = mtcnn.detect(rgb_frame)

        if boxes is not None:
            for box in boxes:
                x1, y1, x2, y2 = map(int, box)
                face = rgb_frame[y1:y2, x1:x2]
                if face.size == 0:
                    continue

                face_tensor = preprocess_face(face)

                with torch.no_grad():
                    output = model(face_tensor)
                    prob = torch.sigmoid(output).item()

                scores.append(prob)
                face_count += 1

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0,255,0), 2)
                cv2.putText(frame, f"{prob:.2f}", (x1, y1-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)

        cv2.imshow("Video", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    print(f"Frames processed: {frame_count}")
    print(f"Faces processed: {face_count}")

    final_score = np.mean(scores) if scores else 0.0

    if final_score > 0.7:
        label = "Likely Fake"
    elif final_score < 0.3:
        label = "Likely Real"
    else:
        label = "Uncertain / Borderline"

    print(f"Deepfake score: {final_score:.2f}")
    print(f"Prediction: {label}")

    return {"video_fake_score": round(final_score, 2), "label": label}