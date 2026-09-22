"""
Lazily constructed singletons shared by the API and the eval scripts.
"""
from functools import lru_cache

from detector.config import Settings, get_settings
from detector.forensics.onnx_detector import OnnxImageDetector
from detector.providers.gemini import GeminiProvider
from detector.providers.groq_provider import GroqProvider
from detector.providers.openai_compat import OpenAICompatProvider
from detector.providers.research import pick_researcher
from detector.quota import LLMGate


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
        self.gemini = GeminiProvider(settings, self.gate, researcher=self.researcher)
        self.fallback_llm = OpenAICompatProvider(settings)
        self.onnx = OnnxImageDetector(settings)

    def status(self) -> dict:
        return {
            "providers": self.settings.configured_providers(),
            "models": {
                "gemini_primary": self.settings.gemini_primary_model,
                "gemini_secondary": self.settings.gemini_secondary_model,
                "fallback_llm": f"{self.fallback_llm.name}:{self.fallback_llm.model}" if self.fallback_llm.enabled else None,
                "onnx_detector": self.settings.onnx_model_repo if self.onnx.enabled else None,
                "researcher": self.researcher.name if self.researcher else None,
            },
            "gemini_grounding_available": self.gemini.grounding_available,
            "onnx_ready": self.onnx.ready,
            "onnx_error": self.onnx.load_error,
            "quota": self.gate.remaining(),
            "video_strategy": self.settings.video_strategy,
        }


@lru_cache
def get_services() -> Services:
    return Services(get_settings())
