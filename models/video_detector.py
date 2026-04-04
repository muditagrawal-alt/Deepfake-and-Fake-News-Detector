import os
import shutil
import subprocess
from models.image_detector import predict_image


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