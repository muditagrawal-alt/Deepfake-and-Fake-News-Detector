"""Ollama backend: an out-of-range value is repaired by showing the model its error, not by a blind retry."""
import asyncio

import httpx

from detector.config import Settings
from detector.engine.backends import OllamaBackend
from detector.engine.parts import TextPart
from detector.schemas import LLMVerdict

VALID = ('{"claims": [], "signals": [], "caveats": [], "genre": null, "reasoning": "r", "summary": "s", '
         '"verdict": "LIKELY_REAL", "confidence": %s}')


def test_percent_confidence_is_repaired(monkeypatch):
    sent = []

    class FakeClient:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json):
            sent.append(json["messages"])
            value = "100" if len(sent) == 1 else "1.0"
            return httpx.Response(200, json={"message": {"content": VALID % value}}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    backend = OllamaBackend(Settings(llm_engine="ollama"))
    obj, meta = asyncio.run(backend.generate_json(system="s", parts=[TextPart("x")], schema=LLMVerdict))
    assert obj.confidence == 1.0 and meta.extra["repairs"] == 1
    assert sent[1][-2]["role"] == "assistant" and "schema" in sent[1][-1]["content"]
