"""
ffmpeg helpers: sample frames to JPEG and extract a small mono audio track.
No OpenCV dependency.
"""
import asyncio
import logging
from pathlib import Path

log = logging.getLogger(__name__)


async def _run(cmd: list[str]) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    _, err = await proc.communicate()
    return proc.returncode, err.decode("utf-8", "ignore")


async def extract_frames(video_path: str, out_dir: str | Path, *, duration: float, max_frames: int = 8, fps: float = 0.5, max_side: int = 768) -> list[Path]:
    """Sample up to `max_frames` frames spread across the clip."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    # Spread `max_frames` evenly across the clip: an 8 s clip is sampled at 1 fps,
    # a 4 min clip every 30 s. `fps` is only an upper cap for very short clips.
    if duration and duration > 0:
        eff_fps = min(fps, max_frames / duration)
    else:
        eff_fps = min(fps, 0.5)
    eff_fps = max(eff_fps, 0.02)
    pattern = str(out_dir / "frame_%03d.jpg")
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", video_path,
        "-vf", f"fps={eff_fps},scale='min({max_side},iw)':-2",
        "-frames:v", str(max_frames),
        "-q:v", "3",
        pattern,
    ]
    code, err = await _run(cmd)
    if code != 0:
        log.warning("ffmpeg frame extraction failed: %s", err.strip()[:300])
    return sorted(out_dir.glob("frame_*.jpg"))


async def extract_audio(video_path: str, out_path: str | Path) -> Path | None:
    """Mono 16 kHz AAC (small, accepted by Whisper endpoints). None if no audio."""
    out_path = Path(out_path)
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", video_path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "aac", "-b:a", "48k",
        str(out_path),
    ]
    code, err = await _run(cmd)
    if code != 0 or not out_path.exists() or out_path.stat().st_size < 1024:
        log.info("audio extraction skipped/failed: %s", err.strip()[:200])
        return None
    return out_path
