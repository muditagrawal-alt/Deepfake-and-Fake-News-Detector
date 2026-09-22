"""
ffprobe-based container/stream metadata signals (ported from the original
models/video_detector.analyze_metadata, made async).
"""
import asyncio
import json
import logging

log = logging.getLogger(__name__)

# Words that, when found in descriptive tags (description/comment/software/tool/
# creator/encoded_by/title), name an AI video generator or AI editing suite.
GENERATOR_KEYWORDS = [
    "gemini", "veo", "sora", "openai", "runway", "pika", "luma", "kling", "hailuo", "minimax",
    "invideo", "synthesia", "heygen", "wan2", "seedance", "midjourney", "ai generated", "ai-generated",
    "capcut", "canva",
]
# Gemini/Veo exports write exactly "Google" as the container encoder. YouTube
# downloads instead say "ISO Media file produced by Google Inc." in handler_name
# with an Lavf (ffmpeg/yt-dlp) encoder, which is NOT a generator signal.
GENERATOR_ENCODERS = ["google", "veo", "sora", "runway", "pika", "luma", "kling", "invideo", "synthesia", "heygen"]
PUBLIC_CONTEXT_KEYS = {"title", "artist", "album", "genre", "show", "episode_id"}


async def ffprobe_json(path: str) -> dict:
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path]
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    out, _ = await proc.communicate()
    try:
        return json.loads(out.decode("utf-8", "ignore") or "{}")
    except json.JSONDecodeError:
        return {}


def _f(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _t(value) -> str:
    return str(value or "").strip().lower()


async def analyze_video_metadata(path: str) -> dict:
    meta = await ffprobe_json(path)
    result = {
        "probe_ok": bool(meta),
        "duration_seconds": 0.0,
        "width": None,
        "height": None,
        "fps": None,
        "video_codec": None,
        "audio_codec": None,
        "has_audio": False,
        "has_metadata": False,
        "has_creation_time": False,
        "has_device_info": False,
        "encoder": None,
        "suspicious_encoder": False,
        "generator_detected": False,
        "generator_keyword": None,
        "public_context_metadata": False,
        "platform_hint": None,
        "raw_tags": {},
        "notes": [],
    }
    if not meta:
        result["notes"].append("ffprobe could not read the file.")
        return result

    fmt = meta.get("format", {}) or {}
    streams = meta.get("streams", []) or []
    result["duration_seconds"] = _f(fmt.get("duration"))

    all_tags = dict(fmt.get("tags", {}) or {})
    for s in streams:
        all_tags.update(s.get("tags", {}) or {})
        if s.get("codec_type") == "video" and result["video_codec"] is None:
            result["video_codec"] = s.get("codec_name")
            result["width"], result["height"] = s.get("width"), s.get("height")
            rate = s.get("avg_frame_rate") or s.get("r_frame_rate") or "0/1"
            try:
                num, den = rate.split("/")
                result["fps"] = round(float(num) / float(den), 2) if float(den) else None
            except Exception:
                pass
        if s.get("codec_type") == "audio":
            result["has_audio"] = True
            result["audio_codec"] = result["audio_codec"] or s.get("codec_name")

    # Keep the raw tags small; they are shown to the LLM verbatim.
    result["raw_tags"] = {k: str(v)[:200] for k, v in list(all_tags.items())[:40]}
    result["has_metadata"] = bool(all_tags)

    for key in all_tags:
        k = key.lower()
        if "creation" in k:
            result["has_creation_time"] = True
        if k in {"make", "model", "com.apple.quicktime.make", "com.apple.quicktime.model", "com.android.manufacturer", "com.android.model"}:
            result["has_device_info"] = True

    encoder_text = _t(all_tags.get("encoder"))
    result["encoder"] = all_tags.get("encoder")
    handler_text = " ".join(_t(all_tags.get(k)) for k in ("handler_name",) if all_tags.get(k))
    # handler_name is per-stream; ffprobe merges stream tags into all_tags, so check streams directly too.
    for s in streams:
        handler_text += " " + _t((s.get("tags") or {}).get("handler_name"))

    descriptive = [_t(all_tags.get(k)) for k in ("description", "comment", "software", "tool", "creator", "encoded_by", "title", "artist")]
    for kw in GENERATOR_KEYWORDS:
        if any(kw in f for f in descriptive if f):
            result["generator_detected"] = True
            result["generator_keyword"] = kw
            break
    if not result["generator_detected"] and encoder_text:
        for kw in GENERATOR_ENCODERS:
            # exact/leading match on the encoder tag, e.g. "Google" or "Runway ...", not "Lavf" etc.
            if encoder_text == kw or encoder_text.startswith(kw + " ") or encoder_text.startswith(kw + "/"):
                result["generator_detected"] = True
                result["generator_keyword"] = f"encoder:{kw}"
                break

    result["suspicious_encoder"] = str(result["generator_keyword"] or "").startswith("encoder:")
    result["platform_hint"] = None
    if "produced by google inc" in handler_text:
        result["platform_hint"] = "youtube_download"
    elif encoder_text.startswith("lavf") or encoder_text.startswith("lavc"):
        result["platform_hint"] = "ffmpeg_reencode"
    elif "com.apple.quicktime" in " ".join(k.lower() for k in all_tags):
        result["platform_hint"] = "apple_device"
    elif "com.android" in " ".join(k.lower() for k in all_tags):
        result["platform_hint"] = "android_device"
    result["public_context_metadata"] = any(_t(all_tags.get(k)) for k in PUBLIC_CONTEXT_KEYS)

    if result["generator_detected"]:
        result["notes"].append(f"Container metadata names a generator ('{result['generator_keyword']}'): strong FAKE signal, but trivially stripped by re-encoding.")
    if result["platform_hint"] == "youtube_download":
        result["notes"].append("File was served by YouTube (handler tag) and remuxed with ffmpeg; says nothing about authenticity by itself.")
    if not result["has_audio"]:
        result["notes"].append("No audio track (many AI generators output silent clips; screen recordings too).")
    if result["has_device_info"]:
        result["notes"].append("Device make/model tags present (weak REAL signal).")
    if not result["has_metadata"]:
        result["notes"].append("No container tags at all (neutral: typical of social-media re-encodes).")
    return result
