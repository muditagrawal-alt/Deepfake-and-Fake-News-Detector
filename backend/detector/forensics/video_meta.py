"""
Video file facts from ffprobe, reported verbatim: duration, codecs,
resolution, frame rate, audio presence, and every container and stream tag,
plus C2PA content credentials.

No keyword lists and no interpretation. Whether an encoder string or a
handler name indicates anything is for the model to reason about.
"""
import asyncio
import json
import logging

from detector.forensics.provenance import read_c2pa

log = logging.getLogger(__name__)


async def ffprobe_json(path: str) -> dict:
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path]
    try:
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    except OSError as exc:
        log.warning("ffprobe could not start: %s", exc)
        return {}
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=20.0)
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except ProcessLookupError:
            pass
        await proc.wait()
        log.warning("ffprobe timed out for uploaded media")
        return {}
    if proc.returncode != 0:
        return {}
    try:
        return json.loads(out.decode("utf-8", "ignore") or "{}")
    except json.JSONDecodeError:
        return {}


def _f(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


async def analyze_video_metadata(path: str) -> dict:
    meta = await ffprobe_json(path)
    result = {"probe_ok": bool(meta), "duration_seconds": 0.0, "width": None, "height": None, "fps": None,
              "video_codec": None, "audio_codec": None, "has_audio": False,
              "container_tags": {}, "stream_tags": {}, "c2pa": await asyncio.to_thread(read_c2pa, path)}
    if not meta:
        return result
    fmt = meta.get("format", {}) or {}
    result["duration_seconds"] = round(_f(fmt.get("duration")), 3)
    result["container_tags"] = {k: str(v)[:200] for k, v in (fmt.get("tags") or {}).items()}
    for s in meta.get("streams", []) or []:
        kind = s.get("codec_type")
        if s.get("tags"):
            result["stream_tags"][kind] = {k: str(v)[:200] for k, v in s["tags"].items()}
        if kind == "video" and result["video_codec"] is None:
            result["video_codec"] = s.get("codec_name")
            result["width"], result["height"] = s.get("width"), s.get("height")
            rate = s.get("avg_frame_rate") or s.get("r_frame_rate") or "0/1"
            try:
                num, den = rate.split("/")
                result["fps"] = round(float(num) / float(den), 3) if float(den) else None
            except Exception:
                pass
        if kind == "audio":
            result["has_audio"] = True
            result["audio_codec"] = result["audio_codec"] or s.get("codec_name")
    return result
