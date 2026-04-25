import subprocess
import json
import math
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from models.image_detector import predict_base_images_pil


def extract_frames(video_path, frames_dir="frames", fps=1):
    """
    Legacy helper: extract frames to disk using ffmpeg.
    Kept for compatibility with any external scripts, but the main video
    pipeline now uses in-memory sampling (see `analyze_frames`).
    """
    frames_root = Path(frames_dir)
    frames_root.mkdir(parents=True, exist_ok=True)

    command = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"fps={fps}",
        str(frames_root / "frame_%03d.jpg"),
        "-loglevel", "quiet"
    ]

    subprocess.run(command, check=False)

    frames = sorted(
        str(frames_root / f)
        for f in os.listdir(frames_root)
        if f.endswith(".jpg")
    )

    return frames


def _safe_video_capture(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        cap.release()
        return None
    return cap


def _video_fps(cap) -> float:
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    return fps if fps > 0 else 30.0


def _video_frame_count(cap) -> int:
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    return count if count > 0 else 0


def _sample_frame_indices(frame_count: int, src_fps: float, target_fps: float, max_frames: int):
    if frame_count <= 0:
        return []

    target_fps = float(target_fps or 1.0)
    max_frames = int(max_frames or 32)

    if target_fps <= 0:
        target_fps = 1.0

    step = max(int(round(src_fps / target_fps)), 1)
    indices = list(range(0, frame_count, step))

    # Hard cap to keep runtime predictable for long videos.
    if len(indices) > max_frames:
        # Evenly subsample across the full set.
        picks = np.linspace(0, len(indices) - 1, num=max_frames, dtype=np.int32)
        indices = [indices[int(i)] for i in picks]

    return indices


def _bgr_to_pil(bgr_frame):
    rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _ensure_empty_dir(path: str):
    root = Path(path)
    if root.exists():
        for child in root.glob("*"):
            try:
                if child.is_file():
                    child.unlink()
            except Exception:
                pass
    root.mkdir(parents=True, exist_ok=True)
    return root


def analyze_frames(video_path, frames_dir="frames", fps=1, max_frames=32, batch_size=8):
    """
    Sample frames in-memory (no ffmpeg required) and run batched frame-level
    deepfake detection.

    If `frames_dir` is provided, a small number of sampled frames are written
    for debugging/inspection (and to keep the existing UI expectations intact).
    """
    cap = _safe_video_capture(video_path)
    if cap is None:
        return {
            "total_frames": 0,
            "real_frames": 0,
            "fake_frames": 0,
            "avg_fake_probability": 0.5,
            "frame_results": [],
            "error": "Unable to open video with OpenCV",
        }

    src_fps = _video_fps(cap)
    frame_count = _video_frame_count(cap)
    indices = _sample_frame_indices(frame_count, src_fps=src_fps, target_fps=fps, max_frames=max_frames)

    if not indices:
        cap.release()
        return {
            "total_frames": 0,
            "real_frames": 0,
            "fake_frames": 0,
            "avg_fake_probability": 0.5,
            "frame_results": [],
            "error": "No frames selected for sampling",
        }

    frames_out = None
    if frames_dir:
        frames_out = _ensure_empty_dir(frames_dir)

    results = []
    real_count = 0
    fake_count = 0
    fake_probabilities = []

    sampled = []
    sampled_meta = []

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, bgr = cap.read()
        if not ok or bgr is None:
            continue

        sampled.append(_bgr_to_pil(bgr))
        sampled_meta.append({"frame_index": int(idx)})

        # Best-effort debug frame dump.
        if frames_out is not None:
            out_path = frames_out / f"frame_{int(idx):06d}.jpg"
            try:
                cv2.imwrite(str(out_path), bgr)
                sampled_meta[-1]["frame_path"] = str(out_path)
            except Exception:
                sampled_meta[-1]["frame_path"] = None

    cap.release()

    if not sampled:
        return {
            "total_frames": 0,
            "real_frames": 0,
            "fake_frames": 0,
            "avg_fake_probability": 0.5,
            "frame_results": [],
            "error": "Failed to decode sampled frames",
        }

    batch_size = int(batch_size or 8)
    batch_size = max(batch_size, 1)

    for start in range(0, len(sampled), batch_size):
        batch = sampled[start : start + batch_size]
        meta_batch = sampled_meta[start : start + batch_size]

        try:
            predictions = predict_base_images_pil(batch)
        except Exception as e:
            for meta in meta_batch:
                results.append(
                    {
                        "frame": meta.get("frame_path") or meta.get("frame_index"),
                        "label": "ERROR",
                        "confidence": 0.0,
                        "fake_probability": 0.5,
                        "error": str(e),
                    }
                )
            continue

        for pred, meta in zip(predictions, meta_batch):
            label = pred.get("label") or "UNKNOWN"
            confidence = float(pred.get("confidence") or 0.0)
            fake_probability = float(pred.get("fake_probability") or 0.5)

            results.append(
                {
                    "frame": meta.get("frame_path") or meta.get("frame_index"),
                    "label": label,
                    "confidence": confidence,
                    "fake_probability": fake_probability,
                }
            )

            if label == "REAL":
                real_count += 1
            elif label == "FAKE":
                fake_count += 1
            else:
                # Unknown/other: treat as neutral, but keep probabilities for averaging.
                pass

            fake_probabilities.append(fake_probability)

    return {
        "total_frames": len(results),
        "real_frames": real_count,
        "fake_frames": fake_count,
        "avg_fake_probability": (
            sum(fake_probabilities) / len(fake_probabilities) if fake_probabilities else 0.5
        ),
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


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalized_text(value):
    return str(value or "").strip().lower()


def analyze_metadata(video_path):
    """
    Return metadata-based signals instead of a simple True/False.
    """
    metadata = get_video_metadata(video_path)

    result = {
        "has_metadata": False,
        "has_creation_time": False,
        "has_device_info": False,
        "duration_seconds": 0.0,
        "encoder": None,
        "suspicious_encoder": False,
        "generator_detected": False,
        "generator_keyword": None,
        "public_context_metadata": False,
        "raw_tags": {}
    }

    if not metadata:
        return result

    result["duration_seconds"] = _safe_float(metadata.get("format", {}).get("duration"), default=0.0)

    format_tags = metadata.get("format", {}).get("tags", {})
    streams = metadata.get("streams", [])

    result["raw_tags"] = format_tags

    all_tags = dict(format_tags)
    for stream in streams:
        tags = stream.get("tags", {})
        all_tags.update(tags)

    if all_tags:
        result["has_metadata"] = True

    for key in all_tags.keys():
        k = key.lower()

        if "creation" in k:
            result["has_creation_time"] = True

        if k in {"make", "model"}:
            result["has_device_info"] = True

    encoder = all_tags.get("encoder")
    if encoder:
        result["encoder"] = encoder

    encoder_text = _normalized_text(all_tags.get("encoder"))
    generator_fields = [
        encoder_text,
        _normalized_text(all_tags.get("description")),
        _normalized_text(all_tags.get("comment")),
        _normalized_text(all_tags.get("software")),
        _normalized_text(all_tags.get("tool")),
        _normalized_text(all_tags.get("creator")),
        _normalized_text(all_tags.get("encoded_by")),
    ]

    generator_keywords = [
        "google",
        "gemini",
        "invideo",
        "runway",
        "capcut",
        "canva",
        "pika",
        "luma",
        "synthesia",
        "heygen",
    ]

    for keyword in generator_keywords:
        if any(keyword in field for field in generator_fields if field):
            result["generator_detected"] = True
            result["generator_keyword"] = keyword
            break

    suspicious_keywords = [
        "google",
        "capcut",
        "canva",
        "invideo",
        "runway",
        "pika",
        "luma",
        "synthesia",
        "heygen",
    ]

    if any(word in encoder_text for word in suspicious_keywords):
        result["suspicious_encoder"] = True

    public_context_keys = {"title", "artist", "album", "genre", "show", "episode_id"}
    result["public_context_metadata"] = any(
        _normalized_text(all_tags.get(key))
        for key in public_context_keys
    )

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


def predict_video(video_path, frames_dir="frames", fps=1):
    """
    Final local video detector using:
    - frame model
    - audio presence
    - metadata signals
    - face ratio
    """
    frame_analysis = analyze_frames(video_path, frames_dir=frames_dir, fps=fps)
    audio_present = has_audio(video_path)
    metadata = analyze_metadata(video_path)

    # Face ratio uses extracted debug frames if available; otherwise we estimate
    # from whatever was written (or return 0.0).
    face_ratio = detect_face_ratio(frames_dir) if frames_dir else 0.0

    total_frames = frame_analysis["total_frames"]
    real_frames = frame_analysis["real_frames"]
    fake_frames = frame_analysis["fake_frames"]
    avg_fake_probability = frame_analysis.get("avg_fake_probability", 0.5)
    frame_fake_ratio = fake_frames / max(total_frames, 1)
    frame_real_ratio = real_frames / max(total_frames, 1)
    duration_seconds = float(metadata.get("duration_seconds") or 0.0)
    generator_detected = bool(metadata.get("generator_detected"))
    public_context_metadata = bool(metadata.get("public_context_metadata"))
    long_form_video = duration_seconds >= 30.0
    short_form_clip = 0.0 < duration_seconds <= 12.0

    if total_frames == 0:
        return "ERROR", 0.0, {
            "error": frame_analysis.get("error") or "No frames extracted"
        }

    real_score = 0
    fake_score = 0

    # Frame model signal
    if frame_real_ratio >= 0.75:
        real_score += 2
    elif frame_fake_ratio >= 0.75:
        fake_score += 2
    elif real_frames > fake_frames:
        real_score += 1
    elif fake_frames > real_frames:
        fake_score += 1
    else:
        real_score += 1
        fake_score += 1

    if avg_fake_probability >= 0.75:
        fake_score += 2
    elif avg_fake_probability >= 0.60:
        fake_score += 1
    elif avg_fake_probability <= 0.25:
        real_score += 2
    elif avg_fake_probability <= 0.40:
        real_score += 1
    else:
        real_score += 1
        fake_score += 1

    # Audio signal
    if audio_present:
        if not generator_detected:
            real_score += 1
    else:
        fake_score += 2

    # Metadata signal
    if generator_detected:
        fake_score += 4
    elif metadata.get("suspicious_encoder", False):
        fake_score += 1

    if metadata.get("has_creation_time", False):
        real_score += 1

    if metadata.get("has_device_info", False):
        real_score += 1

    if long_form_video and not generator_detected:
        real_score += 2

    if public_context_metadata and not generator_detected:
        real_score += 2

    if not generator_detected and audio_present and long_form_video and face_ratio >= 0.15:
        real_score += 1

    if not generator_detected and audio_present and face_ratio >= 0.95:
        real_score += 1

    if short_form_clip and generator_detected:
        fake_score += 1

    # Face ratio signal
    if generator_detected:
        if face_ratio < 0.2:
            fake_score += 1
    else:
        if face_ratio >= 0.8:
            real_score += 2
        elif face_ratio >= 0.3:
            real_score += 1
        elif not long_form_video:
            fake_score += 1

    # Final decision
    if fake_score > real_score:
        label = "FAKE"
    elif real_score > fake_score:
        label = "REAL"
    else:
        label = "UNCERTAIN"

    confidence = max(real_score, fake_score) / max((real_score + fake_score), 1)

    details = {
        "total_frames": total_frames,
        "real_frames": real_frames,
        "fake_frames": fake_frames,
        "avg_fake_probability": round(avg_fake_probability, 3),
        "frame_fake_ratio": round(frame_fake_ratio, 3),
        "has_audio": audio_present,
        "metadata": metadata,
        "face_ratio": round(face_ratio, 2),
        "scores": {
            "real_score": real_score,
            "fake_score": fake_score
        }
    }

    return label, confidence, details
