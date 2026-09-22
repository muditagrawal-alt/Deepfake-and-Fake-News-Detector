"""
Entry points.

`analyze(...)` is the async dispatcher used by the API.
`run_pipeline(...)` keeps the original synchronous signature so evaluation
scripts can call it exactly like the old `app.run_pipeline`, and returns a dict
that also carries the legacy `final_verdict` key ("LIKELY REAL" / "LIKELY FAKE" / "UNCERTAIN").
"""
import asyncio
import logging

from detector.analyzers.image import analyze_image
from detector.analyzers.news import analyze_news
from detector.analyzers.video import analyze_video
from detector.schemas import AnalysisResult
from detector.services import Services, get_services

log = logging.getLogger(__name__)


async def analyze(
    *,
    url: str | None = None,
    image_path: str | None = None,
    video_path: str | None = None,
    services: Services | None = None,
    original_name: str | None = None,
    progress=None,
) -> AnalysisResult:
    services = services or get_services()
    provided = [x for x in (url, image_path, video_path) if x]
    if len(provided) != 1:
        raise ValueError("Provide exactly one of url, image_path, video_path.")
    if url:
        return await analyze_news(url, services)
    if image_path:
        return await analyze_image(image_path, services, original_name=original_name)
    return await analyze_video(video_path, services, original_name=original_name, progress=progress)


def legacy_verdict(verdict: str) -> str:
    return {"LIKELY_REAL": "LIKELY REAL", "LIKELY_FAKE": "LIKELY FAKE"}.get(verdict, "UNCERTAIN")


def run_pipeline(url=None, image_path=None, video_path=None, **_ignored) -> dict:
    """Synchronous wrapper with the old signature; extra kwargs are ignored."""
    result = asyncio.run(analyze(url=url, image_path=image_path, video_path=video_path))
    data = result.model_dump(mode="json")
    data["final_verdict"] = legacy_verdict(result.verdict)
    return data
