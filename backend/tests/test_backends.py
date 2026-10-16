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


def test_openrouter_pins_google_and_reports_cost(monkeypatch):
    from detector.engine.backends import OpenRouterBackend
    from detector.engine.parts import ImagePart
    sent = []

    class FakeClient:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json, headers):
            sent.append(json)
            return httpx.Response(200, request=httpx.Request("POST", url), json={
                "model": "google/gemini-3.5-flash-lite", "provider": "Google AI Studio",
                "choices": [{"message": {"content": VALID % "0.9"}}],
                "usage": {"prompt_tokens": 100, "completion_tokens": 20, "cost": 0.00008}})

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    b = OpenRouterBackend(Settings(llm_engine="openrouter", openrouter_api_key="x"))
    obj, meta = asyncio.run(b.generate_json(system="s", parts=[TextPart("t"), ImagePart(b"\xff\xd8", label="img")],
                                            schema=LLMVerdict))
    body = sent[0]
    assert body["model"] == "google/gemini-3.5-flash-lite"
    assert body["provider"]["allow_fallbacks"] is False and body["provider"]["data_collection"] == "deny"
    assert set(body["provider"]["only"]) <= {"google-ai-studio", "google-vertex"}
    assert any(c["type"] == "image_url" for c in body["messages"][1]["content"])
    assert obj.confidence == 0.9 and meta.extra["cost_usd"] == 0.00008 and meta.prompt_tokens == 100
