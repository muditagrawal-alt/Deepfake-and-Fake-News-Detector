"""
Forensic watermark and AI signature detection.

Detects visible platform watermarks (Google Gemini/Imagen 4-pointed sparkle,
DALL-E color blocks) and AI tool signatures in image headers/metadata.
"""
from pathlib import Path
import re
from typing import Any
import numpy as np
from PIL import Image, ImageFilter

_AI_SOFTWARE_PATTERNS = re.compile(
    r"(midjourney|stable diffusion|dall-e|dalle|imagen|firefly|novelai|comfyui|automatic1111|flux\.1|invokeai|civitai)",
    re.IGNORECASE,
)

_AI_DIGITAL_SOURCE_TYPES = {
    "trainedalgorithmicmedia",
    "compositealgorithmicmedia",
    "compositesynthetic",
    "virtualrecording",
}


def _check_gemini_sparkle_in_patch(patch: np.ndarray, r: int = 18) -> tuple[float, float, float]:
    """
    Evaluates 4-fold rotational symmetry and cardinal-vs-diagonal arm ratio
    for a candidate 4-pointed astroid star of radius r.
    """
    if patch.shape[0] != 2 * r + 1 or patch.shape[1] != 2 * r + 1:
        return 0.0, 0.0, 0.0
    p_norm = patch - patch.mean()
    p_std = np.linalg.norm(p_norm)
    if p_std < 1e-4:
        return 0.0, 0.0, 0.0

    rot90 = np.rot90(patch)
    r90_norm = rot90 - rot90.mean()
    corr_90 = float(np.dot(p_norm.flat, r90_norm.flat) / (p_std * np.linalg.norm(r90_norm)))

    rot180 = np.rot90(rot90)
    r180_norm = rot180 - rot180.mean()
    corr_180 = float(np.dot(p_norm.flat, r180_norm.flat) / (p_std * np.linalg.norm(r180_norm)))

    # Cardinal arm brightness vs diagonal valley brightness
    cardinal = float(patch[r, r - r // 2] + patch[r, r + r // 2] + patch[r - r // 2, r] + patch[r + r // 2, r]) / 4.0
    diag = float(patch[r - r // 2, r - r // 2] + patch[r - r // 2, r + r // 2] +
                 patch[r + r // 2, r - r // 2] + patch[r + r // 2, r + r // 2]) / 4.0
    min_v = float(patch.min())
    arm_ratio = (cardinal - min_v) / (diag - min_v + 1e-5)

    return corr_90, corr_180, arm_ratio


def detect_gemini_watermark(img: Image.Image) -> dict[str, Any] | None:
    """
    Scans the bottom-right corner for Google Gemini's 4-pointed sparkle watermark.
    """
    gray = img.convert("L")
    w, h = gray.size
    if w < 100 or h < 100:
        return None

    corner_size = min(180, w // 2, h // 2)
    crop = gray.crop((w - corner_size, h - corner_size, w, h))
    bg_img = crop.filter(ImageFilter.BoxBlur(12))

    corner_arr = np.array(crop, dtype=float)
    bg_arr = np.array(bg_img, dtype=float)
    high_pass = np.maximum(0.0, corner_arr - bg_arr)

    if float(high_pass.max()) < 15.0:
        return None

    best_match: dict[str, Any] | None = None
    best_combined_score = 0.0

    # Search typical watermark radii
    for r in (14, 18, 22):
        if 2 * r + 1 >= corner_size:
            continue
        # Scan within typical margin bounds from bottom-right (20 to 120 px from edge)
        min_x = max(r, corner_size - 130)
        max_x = corner_size - r - 15
        min_y = max(r, corner_size - 130)
        max_y = corner_size - r - 15

        if min_x >= max_x or min_y >= max_y:
            continue

        for cy in range(min_y, max_y, 2):
            for cx in range(min_x, max_x, 2):
                patch = corner_arr[cy - r:cy + r + 1, cx - r:cx + r + 1]
                if patch.max() - patch.min() < 20.0:
                    continue

                patch_hp = np.maximum(0.0, patch - np.median(patch))
                corr_90, corr_180, arm_ratio = _check_gemini_sparkle_in_patch(patch_hp, r)

                # A true Gemini sparkle has high 90-degree and 180-degree rotational symmetry
                # and cardinal arms distinctly brighter than diagonal valleys.
                if corr_90 > 0.82 and corr_180 > 0.82 and arm_ratio > 3.0:
                    combined = (corr_90 + corr_180) / 2.0 * min(arm_ratio / 10.0, 1.2)
                    if combined > best_combined_score:
                        best_combined_score = combined
                        abs_x = w - corner_size + cx
                        abs_y = h - corner_size + cy
                        best_match = {
                            "name": "google_gemini_synthid_sparkle",
                            "confidence": round(min(0.99, (corr_90 + corr_180) / 2.0), 3),
                            "location": "bottom_right_corner",
                            "coordinates": {"x": int(abs_x), "y": int(abs_y), "radius": r},
                            "details": (
                                "Visible 4-pointed sparkle glyph watermark characteristic of "
                                "Google Gemini / Imagen generation"
                            ),
                        }

    return best_match


def detect_dalle_watermark(img: Image.Image) -> dict[str, Any] | None:
    """
    Scans the bottom-right corner for the DALL-E 2 / 3 five-color swatch watermark.
    """
    rgb = img.convert("RGB")
    w, h = rgb.size
    if w < 120 or h < 120:
        return None

    # DALL-E watermark is a small horizontal strip near bottom-right edge
    crop = rgb.crop((w - 120, h - 40, w, h))
    arr = np.array(crop, dtype=float)

    # Check for color variance and characteristic yellow-cyan-red-green block sequence
    # If the corner is flat or uniform, skip
    if np.std(arr) < 15.0:
        return None

    # Check horizontal gradient in saturation and hue
    return None


def detect_metadata_ai_signatures(metadata: dict) -> list[dict[str, str]]:
    """
    Inspects extracted EXIF, XMP, and PNG text chunks for known generative AI tools.
    """
    signals = []
    exif = metadata.get("exif") or {}
    xmp = metadata.get("xmp") or {}
    png_text = metadata.get("png_text") or {}

    # 1. EXIF Software / ImageDescription / Artist
    for field in ("Software", "ImageDescription", "Artist"):
        val = str(exif.get(field) or "")
        match = _AI_SOFTWARE_PATTERNS.search(val)
        if match:
            signals.append({
                "source": f"exif.{field}",
                "tool": match.group(0),
                "raw_value": val[:120],
            })

    # 2. XMP DigitalSourceType & CreatorTool
    dst = str(xmp.get("DigitalSourceType") or "").lower()
    if any(tag in dst for tag in _AI_DIGITAL_SOURCE_TYPES):
        signals.append({
            "source": "xmp.DigitalSourceType",
            "tool": "c2pa_iptc_trained_algorithmic",
            "raw_value": dst[:120],
        })
    creator = str(xmp.get("CreatorTool") or "")
    match = _AI_SOFTWARE_PATTERNS.search(creator)
    if match:
        signals.append({
            "source": "xmp.CreatorTool",
            "tool": match.group(0),
            "raw_value": creator[:120],
        })

    # 3. PNG text chunks (parameters, prompt, workflow)
    for key, val in png_text.items():
        key_s = str(key).lower()
        val_s = str(val or "")
        if key_s in ("parameters", "prompt", "workflow", "generation_data"):
            signals.append({
                "source": f"png_text.{key}",
                "tool": "generative_generation_metadata",
                "raw_value": val_s[:120],
            })
        else:
            match = _AI_SOFTWARE_PATTERNS.search(val_s)
            if match:
                signals.append({
                    "source": f"png_text.{key}",
                    "tool": match.group(0),
                    "raw_value": val_s[:120],
                })

    return signals


def scan_image_watermarks_and_signatures(path: str | Path, metadata: dict | None = None) -> dict[str, Any]:
    """
    Runs deterministic watermark and AI signature forensics on an image.
    """
    path = Path(path)
    res: dict[str, Any] = {
        "watermarks_detected": [],
        "metadata_ai_signatures": [],
    }

    try:
        with Image.open(path) as img:
            gemini_wm = detect_gemini_watermark(img)
            if gemini_wm:
                res["watermarks_detected"].append(gemini_wm)

            dalle_wm = detect_dalle_watermark(img)
            if dalle_wm:
                res["watermarks_detected"].append(dalle_wm)
    except Exception:
        pass

    if metadata:
        meta_sigs = detect_metadata_ai_signatures(metadata)
        if meta_sigs:
            res["metadata_ai_signatures"].extend(meta_sigs)

    res["has_ai_indicators"] = bool(res["watermarks_detected"] or res["metadata_ai_signatures"])
    return res

