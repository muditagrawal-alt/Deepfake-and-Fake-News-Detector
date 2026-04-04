import os
import shutil
import subprocess


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