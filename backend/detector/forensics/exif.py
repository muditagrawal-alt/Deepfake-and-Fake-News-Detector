"""
Image metadata forensics with Pillow only.

Returns a compact dict that is both shown in the UI and handed to the LLM as
context. Nothing here is proof on its own: real photos lose EXIF on social
platforms, and generators can write fake EXIF.
"""
import re
from pathlib import Path

from PIL import ExifTags, Image

_AI_MARKERS = (
    "midjourney", "dall-e", "dall·e", "dalle", "stable diffusion", "stablediffusion",
    "firefly", "adobe firefly", "imagen", "gemini", "grok", "flux", "leonardo",
    "ideogram", "runway", "sora", "veo", "kling", "trainedalgorithmicmedia",
    "generative ai", "genai", "comfyui", "automatic1111", "invokeai", "nightcafe",
)
_CAMERA_MAKERS = ("apple", "samsung", "canon", "nikon", "sony", "google", "xiaomi", "oneplus", "huawei", "fujifilm", "olympus", "panasonic", "leica", "gopro", "dji")


def _has_c2pa(path: Path) -> bool:
    try:
        with open(path, "rb") as fh:
            head = fh.read(4 * 1024 * 1024)
        return b"c2pa" in head or b"jumb" in head or b"contentauth" in head
    except Exception:
        return False


def analyze_image_metadata(path: str | Path) -> dict:
    path = Path(path)
    out = {
        "format": None,
        "size": None,
        "has_exif": False,
        "camera_make": None,
        "camera_model": None,
        "software": None,
        "datetime_original": None,
        "has_gps": False,
        "png_text_keys": [],
        "ai_markers": [],
        "has_c2pa_manifest": _has_c2pa(path),
        "notes": [],
    }
    try:
        img = Image.open(path)
    except Exception as exc:
        out["notes"].append(f"Could not open image: {exc}")
        return out

    out["format"] = img.format
    out["size"] = list(img.size)

    haystack = []

    try:
        exif = img.getexif()
    except Exception:
        exif = None
    if exif:
        tags = {ExifTags.TAGS.get(k, str(k)): v for k, v in exif.items()}
        try:
            ifd = exif.get_ifd(ExifTags.IFD.Exif)
            tags.update({ExifTags.TAGS.get(k, str(k)): v for k, v in ifd.items()})
        except Exception:
            pass
        try:
            out["has_gps"] = bool(exif.get_ifd(ExifTags.IFD.GPSInfo))
        except Exception:
            pass
        out["has_exif"] = len(tags) > 0
        out["camera_make"] = _s(tags.get("Make"))
        out["camera_model"] = _s(tags.get("Model"))
        out["software"] = _s(tags.get("Software"))
        out["datetime_original"] = _s(tags.get("DateTimeOriginal") or tags.get("DateTime"))
        haystack.extend(str(v) for v in tags.values() if isinstance(v, (str, bytes)))

    info = getattr(img, "info", {}) or {}
    for key, val in info.items():
        if key in ("exif", "icc_profile"):
            continue
        if isinstance(val, (str, bytes)):
            out["png_text_keys"].append(key)
            haystack.append(f"{key}={val[:500] if isinstance(val, str) else val[:500]}")

    blob = " ".join(h if isinstance(h, str) else h.decode("utf-8", "ignore") for h in haystack).lower()
    out["ai_markers"] = sorted({m for m in _AI_MARKERS if m in blob})
    if "parameters" in out["png_text_keys"]:
        out["ai_markers"].append("sd_webui_parameters_chunk")

    make = (out["camera_make"] or "").lower()
    if make and any(m in make for m in _CAMERA_MAKERS):
        out["notes"].append("Camera make/model present (weak REAL signal; can be forged).")
    if not out["has_exif"]:
        out["notes"].append("No EXIF (neutral: social platforms strip metadata; generators omit it).")
    if out["ai_markers"]:
        out["notes"].append("Metadata names an AI generation tool (strong FAKE signal).")
    if out["has_c2pa_manifest"]:
        out["notes"].append("C2PA/JUMBF manifest bytes present; provenance credentials may be embedded.")
    return out


def _s(value):
    if value is None:
        return None
    if isinstance(value, bytes):
        value = value.decode("utf-8", "ignore")
    value = re.sub(r"\s+", " ", str(value)).strip("\x00 ")
    return value or None
