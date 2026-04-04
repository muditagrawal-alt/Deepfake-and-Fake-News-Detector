import os
import shutil
import subprocess
from models.image_detector import predict_image
import json
import cv2


def extract_frames(video_path, frames_dir="frames", fps=1):
    """
    Extract frames from a video using ffmpeg.
    """
    if os.path.exists(frames_dir):
        shutil.rmtree(frames_dir)
    os.makedirs(frames_dir, exist_ok=True)

    command = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"fps={fps}",
        os.path.join(frames_dir, "frame_%03d.jpg"),
        "-loglevel", "quiet"
    ]

    subprocess.run(command, check=False)

    frames = sorted(
        os.path.join(frames_dir, f)
        for f in os.listdir(frames_dir)
        if f.endswith(".jpg")
    )

    return frames


def analyze_frames(video_path, frames_dir="frames", fps=1):
    """
    Extract frames and run frame-level deepfake detection.
    """
    frames = extract_frames(video_path, frames_dir=frames_dir, fps=fps)

    results = []
    real_count = 0
    fake_count = 0

    for frame_path in frames:
        try:
            label, confidence = predict_image(frame_path)
            results.append({
                "frame": frame_path,
                "label": label,
                "confidence": confidence
            })

            if label.lower() == "real":
                real_count += 1
            else:
                fake_count += 1

        except Exception as e:
            results.append({
                "frame": frame_path,
                "label": "ERROR",
                "confidence": 0.0,
                "error": str(e)
            })

    return {
        "total_frames": len(frames),
        "real_frames": real_count,
        "fake_frames": fake_count,
        "frame_results": results
    }

def has_audio(video_path):
    """
    Check whether the video contains an audio stream.
    """
    command = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "a",
        "-show_entries", "stream=codec_type",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path
    ]

    result = subprocess.run(command, capture_output=True, text=True)

    return "audio" in result.stdout.lower()

def get_video_metadata(video_path):
    """
    Extract metadata using ffprobe.
    """
    command = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path
    ]

    result = subprocess.run(command, capture_output=True, text=True)

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}
    
def analyze_metadata(video_path):
    """
    Return metadata-based signals instead of a simple True/False.
    """
    metadata = get_video_metadata(video_path)

    result = {
        "has_metadata": False,
        "has_creation_time": False,
        "has_device_info": False,
        "encoder": None,
        "suspicious_encoder": False,
        "raw_tags": {}
    }

    if not metadata:
        return result

    format_tags = metadata.get("format", {}).get("tags", {})
    streams = metadata.get("streams", [])

    result["raw_tags"] = format_tags

    # Collect all tags from format + streams
    all_tags = dict(format_tags)
    for stream in streams:
        tags = stream.get("tags", {})
        all_tags.update(tags)

    if all_tags:
        result["has_metadata"] = True

    # creation time
    for key, value in all_tags.items():
        k = key.lower()
        if "creation" in k:
            result["has_creation_time"] = True

        if k in {"make", "model"}:
            result["has_device_info"] = True

    # encoder
    encoder = all_tags.get("encoder")
    if encoder:
        result["encoder"] = encoder

        suspicious_keywords = [
            "google",
            "lavf",
            "libx264",
            "capcut",
            "canva",
            "invideo",
            "runway"
        ]

        if any(word in encoder.lower() for word in suspicious_keywords):
            result["suspicious_encoder"] = True
    
    return result

def detect_face_ratio(frames_dir="frames"):
    """
    Detect how many extracted frames contain at least one face.
    Returns a ratio between 0 and 1.
    """
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)

    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])

    if len(frames) == 0:
        return 0.0

    face_frames = 0

    for frame in frames:
        img = cv2.imread(os.path.join(frames_dir, frame))
        if img is None:
            continue

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(40, 40)
        )

        if len(faces) > 0:
            face_frames += 1

    return face_frames / len(frames)
