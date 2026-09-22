"""
Image pipeline: EXIF + ONNX detector -> Gemini vision (optionally grounded).
"""
import asyncio
import io
import logging
from pathlib import Path

from google.genai import types
from PIL import Image

from detector.analyzers.common import Timer, build_result, signals_block, verify_with_research
from detector.analyzers.prompts import IMAGE_SYSTEM
from detector.forensics.exif import analyze_image_metadata
from detector.schemas import AnalysisResult, LLMVerdict
from detector.services import Services

log = logging.getLogger(__name__)


def _downscale_jpeg(path: Path, max_side: int) -> bytes:
    with Image.open(path) as img:
        img = img.convert("RGB")
        w, h = img.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()


async def analyze_image(path: str | Path, services: Services, *, original_name: str | None = None) -> AnalysisResult:
    path = Path(path)
    timer = Timer()

    with timer.track("forensics"):
        meta = await asyncio.to_thread(analyze_image_metadata, path)
        detector = await asyncio.to_thread(services.onnx.predict_path, path) if services.onnx.enabled else None
        jpeg = await asyncio.to_thread(_downscale_jpeg, path, services.settings.image_max_side)

    forensics = {
        "metadata": meta,
        "ai_image_detector": (
            {"model": services.settings.onnx_model_repo, **{k: v for k, v in detector.items() if k != "path"}}
            if detector
            else {"model": services.settings.onnx_model_repo, "status": services.onnx.load_error or "disabled"}
        ),
        "original_filename": original_name,
    }

    w, h = (meta.get("size") or [0, 0])[:2]
    low_res = max(w, h) < 500
    forensics["low_resolution"] = low_res

    task = (
        "Analyze the attached image."
        + (
            f"\n\nIMPORTANT: this is a LOW-RESOLUTION image ({w}x{h} px, likely a thumbnail or re-shared copy). "
            "Blurry or illegible text, soft skin and missing fine detail are expected at this size and are NOT "
            "generation artifacts. Only call text 'garbled' if letterforms are structurally wrong, not merely blurred. "
            "The AI-image detector is also less reliable on thumbnails. Cap confidence at 0.7 unless there is other "
            "strong evidence (generator metadata, impossible anatomy, contradicting web context)."
            if low_res else ""
        )
        + signals_block("FORENSIC SIGNALS", forensics)
        + "\n\nNote on ai_image_detector: trained on SDXL-era generations; on our benchmark it is right about 2 in 3 "
        "times and over-calls real photos of people as fake. Treat it as a WEAK-to-MODERATE signal, weaker still on "
        "screenshots, heavy compression, illustrations or small images. Your own artifact analysis and, where "
        "applicable, search-based context checks should carry more weight."
    )
    contents = [types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"), task]

    with timer.track("llm"):
        verdict, grounding = await services.gemini.generate_json(
            contents=contents,
            schema=LLMVerdict,
            system=IMAGE_SYSTEM,
            grounded=services.settings.image_grounding,
        )
    if services.settings.image_grounding:
        verdict, grounding = await verify_with_research(
            services, contents=contents, system=IMAGE_SYSTEM, first=verdict, grounding=grounding, timer=timer
        )

    return build_result(modality="image", verdict=verdict, grounding=grounding, forensics=forensics, timings=timer.t)
