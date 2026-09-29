"""
LLM / VLM backends behind one interface.

  GeminiBackend  hosted Gemini (native video via the Files API)
  OllamaBackend  a local model served by Ollama (images; video as frames)

A backend is chosen once per process (settings.llm_engine) and never switched
mid-run: changing models part-way through a benchmark would change the system
under test. Provider overload is handled by waiting and resuming, not by
silently substituting another model.
"""
import asyncio
import base64
import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from detector.config import Settings
from detector.engine.parts import ImagePart, Part, TextPart, VideoPart

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class BackendError(Exception):
    """A model call failed after retries. Never to be scored as a prediction."""


@dataclass
class CallMeta:
    backend: str
    model: str
    seconds: float = 0.0
    prompt_tokens: int | None = None
    output_tokens: int | None = None
    extra: dict = field(default_factory=dict)


def _parse_json(text: str, schema: type[T]) -> T:
    text = (text or "").strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.S)
    if m:
        text = m.group(1)
    try:
        return schema.model_validate_json(text)
    except ValidationError:
        m = re.search(r"\{.*\}", text, flags=re.S)
        if m:
            try:
                return schema.model_validate(json.loads(m.group(0)))
            except Exception:
                pass
        raise


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------
class GeminiBackend:
    supports_native_video = True

    def __init__(self, settings: Settings, provider):
        self.settings = settings
        self.provider = provider          # detector.providers.gemini.GeminiProvider
        self.name = "gemini"
        self.model = settings.gemini_primary_model
        self._uploads: dict[str, Any] = {}   # path -> uploaded file, reused across stages

    async def release(self) -> None:
        for f in self._uploads.values():
            await self.provider.delete_file(f.name)
        self._uploads.clear()

    @property
    def enabled(self) -> bool:
        return self.provider.enabled

    async def generate_json(self, *, system: str, parts: list[Part], schema: type[T],
                            temperature: float | None = None) -> tuple[T, CallMeta]:
        from google.genai import types
        from detector.providers.gemini import ProviderError

        contents: list[Any] = []
        try:
            for p in parts:
                if isinstance(p, TextPart):
                    contents.append(p.text)
                elif isinstance(p, ImagePart):
                    if p.label:
                        contents.append(p.label)
                    contents.append(types.Part.from_bytes(data=p.data, mime_type=p.mime))
                elif isinstance(p, VideoPart):
                    key = str(p.path)
                    if key not in self._uploads:
                        self._uploads[key] = await self.provider.upload_file(p.path, mime_type=p.mime)
                    contents.append(self._uploads[key])
            t0 = time.perf_counter()
            obj, g = await self.provider.generate_json(
                contents=contents, schema=schema, system=system, grounded=False, temperature=temperature)
            return obj, CallMeta(backend=self.name, model=g.model, seconds=time.perf_counter() - t0,
                                 prompt_tokens=g.usage.get("prompt_tokens"),
                                 output_tokens=g.usage.get("output_tokens"),
                                 extra={"thinking_tokens": g.usage.get("thinking_tokens")})
        except ProviderError as exc:
            raise BackendError(str(exc)) from exc


# ---------------------------------------------------------------------------
# Ollama (local)
# ---------------------------------------------------------------------------
def _ollama_schema(schema: type[BaseModel]) -> dict:
    """Pydantic JSON Schema -> self-contained form for Ollama's grammar: $refs inlined, titles/defaults dropped."""
    raw = schema.model_json_schema()
    defs = raw.pop("$defs", {})

    def walk(node):
        if isinstance(node, dict):
            if "$ref" in node:
                return walk(defs[node["$ref"].split("/")[-1]])
            return {k: walk(v) for k, v in node.items() if k not in ("title", "default")}
        if isinstance(node, list):
            return [walk(v) for v in node]
        return node

    return walk(raw)


class OllamaBackend:
    supports_native_video = False

    def __init__(self, settings: Settings):
        self.settings = settings
        self.name = "ollama"
        self.model = settings.ollama_model
        self.url = settings.ollama_url.rstrip("/")
        self._sem = asyncio.Semaphore(1)     # one generation at a time on a laptop GPU
        self.enabled = True

    async def release(self) -> None:
        return None

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f"{self.url}/api/tags")
                return any(m.get("name", "").startswith(self.model.split(":")[0]) for m in r.json().get("models", []))
        except Exception:
            return False

    async def generate_json(self, *, system: str, parts: list[Part], schema: type[T],
                            temperature: float | None = None) -> tuple[T, CallMeta]:
        text_chunks, images = [], []
        for p in parts:
            if isinstance(p, TextPart):
                text_chunks.append(p.text)
            elif isinstance(p, ImagePart):
                if p.label:
                    text_chunks.append(f"[Image {len(images) + 1}: {p.label}]")
                images.append(base64.b64encode(p.data).decode())
            elif isinstance(p, VideoPart):
                raise BackendError("OllamaBackend has no native video; pass frames as ImageParts")
        user = {"role": "user", "content": "\n\n".join(text_chunks)}
        if images:
            user["images"] = images
        body = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, user],
            "format": _ollama_schema(schema),
            "stream": False,
            "think": self.settings.ollama_think,
            "keep_alive": self.settings.ollama_keep_alive,
            "options": {
                "temperature": self.settings.gemini_temperature if temperature is None else temperature,
                "num_ctx": self.settings.ollama_num_ctx,
                "seed": self.settings.ollama_seed,
            },
        }
        last = None
        base_messages = body["messages"]
        async with self._sem:
            for attempt in range(3):
                t0 = time.perf_counter()
                content = None
                try:
                    async with httpx.AsyncClient(timeout=self.settings.ollama_timeout_seconds) as c:
                        r = await c.post(f"{self.url}/api/chat", json=body)
                        r.raise_for_status()
                        data = r.json()
                    msg = data.get("message") or {}
                    content = msg.get("content", "")
                    obj = _parse_json(content, schema)
                    return obj, CallMeta(backend=self.name, model=self.model, seconds=time.perf_counter() - t0,
                                         prompt_tokens=data.get("prompt_eval_count"),
                                         output_tokens=data.get("eval_count"),
                                         extra={"thinking_chars": len(msg.get("thinking") or ""),
                                                "repairs": attempt})
                except (ValidationError, json.JSONDecodeError) as exc:
                    # Ollama's grammar fixes the JSON shape but not value ranges (e.g. confidence 100 for 1.0),
                    # and with a fixed seed a plain retry repeats the same output. Show the model its output
                    # and the validation error, and ask for a corrected object.
                    last = exc
                    log.warning("ollama output invalid (attempt %d): %s", attempt + 1, str(exc)[:200])
                    body["messages"] = base_messages + [
                        {"role": "assistant", "content": (content or "")[:8000]},
                        {"role": "user", "content": "That JSON does not satisfy the required schema:\n"
                                                    f"{str(exc)[:1500]}\nReturn the corrected JSON object only."}]
                except httpx.HTTPError as exc:
                    last = exc
                    log.warning("ollama attempt %d failed: %s", attempt + 1, str(exc)[:200])
                    await asyncio.sleep(2 * (attempt + 1))
        raise BackendError(f"Ollama ({self.model}) failed: {last}")


def make_backend(settings: Settings, gemini_provider=None):
    engine = settings.llm_engine.lower()
    if engine == "gemini":
        return GeminiBackend(settings, gemini_provider)
    if engine == "ollama":
        return OllamaBackend(settings)
    raise ValueError(f"unknown llm_engine {settings.llm_engine!r} (expected 'gemini' or 'ollama')")
