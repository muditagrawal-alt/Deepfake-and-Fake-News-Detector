"""
Image: measured file facts (EXIF/XMP/C2PA, optional detector score), then
analyse -> retrieve -> verify on the image itself.
"""
import asyncio
import io
from pathlib import Path

from PIL import Image

from detector.analyzers.common import Timer, build_result
from detector.analyzers.prompts import ANALYSE, VERIFY
from detector.engine.parts import ImagePart, TextPart
from detector.engine.pipeline import run_stages
from detector.forensics.exif import analyze_image_metadata
from detector.schemas import AnalysisResult
from detector.services import Services


def _to_jpeg(path: Path, max_side: int) -> bytes:
    with Image.open(path) as img:
        img = img.convert("RGB")
        w, h = img.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()


async def analyze_image(path: str | Path, services: Services, *, original_name: str | None = None,
                        caption: str | None = None, progress=None) -> AnalysisResult:
    """`caption`: text published with the image (image-text benchmarks such as MMFakeBench, NewsCLIPpings)."""
    path = Path(path)
    timer = Timer()
    with timer.track("forensics"):
        meta = await asyncio.to_thread(analyze_image_metadata, path)
        jpeg = await asyncio.to_thread(_to_jpeg, path, services.settings.image_max_side)
        facts: dict = {"metadata": meta}
        if services.onnx.enabled:
            det = await asyncio.to_thread(services.onnx.predict_path, path)
            if det:
                facts["pixel_classifier"] = {"model": services.settings.onnx_model_repo,
                                             "fake_probability": det.get("fake_probability")}

    parts = [ImagePart(jpeg)]
    if caption:
        parts.append(TextPart(f"TEXT PUBLISHED WITH THE IMAGE:\n{caption}"))
    stage = await run_stages(
        services, modality="image", parts=parts, facts=facts,
        system_analyse=ANALYSE["image"], system_verify=VERIFY["image"], timer=timer, progress=progress,
    )
    return build_result(modality="image", stage=stage, facts=facts, timings=timer.t)
