"""
Lazily constructed singletons shared by the API and the eval scripts.
"""
import logging
from functools import lru_cache

from detector.config import Settings, get_settings
from detector.engine.backends import make_backend
from detector.forensics.onnx_detector import OnnxImageDetector
from detector.providers.gemini import GeminiProvider
from detector.providers.groq_provider import GroqProvider
from detector.providers.research import pick_researcher
from detector.quota import LLMGate

log = logging.getLogger(__name__)


class Services:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.gate = LLMGate(
            rpm=settings.gemini_rpm,
            daily=settings.gemini_daily_quota,
            concurrency=settings.gemini_concurrency,
        )
        self.groq = GroqProvider(settings)
        self.researcher = pick_researcher(settings, self.groq)
        self.gemini = GeminiProvider(settings, self.gate)
        self.llm = make_backend(settings, self.gemini)
        self.onnx = OnnxImageDetector(settings)

    async def research(self, query: str, *, exclude_domain: str | None = None,
                       blocklist: frozenset[str] = frozenset()) -> tuple[str, list[dict], str | None]:
        """Web retrieval. Failures return no evidence; they never raise into the analysis."""
        if not self.researcher or not query:
            return "", [], None
        try:
            notes, sources = await self.researcher.research(query, exclude_domain=exclude_domain, blocklist=blocklist)
            return notes, sources, self.researcher.name
        except Exception as exc:
            log.warning("retrieval failed for %r: %s", query[:80], exc)
            return "", [], None

    def status(self) -> dict:
        return {
            "providers": self.settings.configured_providers(),
            "engine": {
                "backend": self.llm.name,
                "model": self.llm.model,
                "pinned": self.settings.pin_model,
                "research_mode": self.settings.research_mode,
                "researcher": self.researcher.name if self.researcher else None,
                "video_strategy": self.settings.video_strategy,
                "onnx_detector": self.settings.onnx_model_repo if self.onnx.enabled else None,
            },
            "onnx_ready": self.onnx.ready,
            "onnx_error": self.onnx.load_error,
            "quota": self.gate.remaining(),
        }


@lru_cache
def get_services() -> Services:
    return Services(get_settings())
