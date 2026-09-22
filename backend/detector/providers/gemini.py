"""
Gemini provider (google-genai SDK).

`generate_json` forces a pydantic schema on the output and, when `grounded=True`:
  1. tries Google Search grounding in the same call (re-tried at most once an hour
     after a quota refusal - free keys currently get 429 for grounding),
  2. otherwise uses the external `researcher` (Groq browser search / Tavily) on
     `research_query` and feeds the notes + URLs into a plain schema call.
Rate-limit errors on the model itself fall over to the secondary model.

Files API helpers (`upload_file` / `delete_file`) are used by the video path.
"""
import asyncio
import json
import logging
import mimetypes
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence, TypeVar

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from detector.config import Settings
from detector.quota import LLMGate, with_retries

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

GROUNDING_RETRY_SECONDS = 3600


class ProviderError(Exception):
    """Non-retryable provider failure surfaced to the API layer."""


@dataclass
class Grounding:
    sources: list[dict] = field(default_factory=list)   # {"title", "url"}
    queries: list[str] = field(default_factory=list)
    grounded: bool = False            # Gemini's own Google Search was used
    research_provider: str | None = None  # external researcher used instead
    two_step: bool = False
    model: str = ""
    usage: dict = field(default_factory=dict)

    @property
    def web_checked(self) -> bool:
        return self.grounded or self.research_provider is not None


def _is_rate_limited(exc: Exception) -> bool:
    return isinstance(exc, errors.APIError) and getattr(exc, "code", None) in (429, 503)


def _is_server_error(exc: Exception) -> bool:
    return isinstance(exc, errors.APIError) and (getattr(exc, "code", 0) or 0) >= 500


def _looks_like_unsupported_combo(exc: Exception) -> bool:
    if not isinstance(exc, errors.APIError) or getattr(exc, "code", None) != 400:
        return False
    msg = str(getattr(exc, "message", exc)).lower()
    return any(n in msg for n in ("tool", "function", "response_schema", "response_mime_type", "json", "not supported", "unsupported"))


def _strip_fences(text: str) -> str:
    text = text.strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.S)
    return m.group(1) if m else text


class GeminiProvider:
    def __init__(self, settings: Settings, gate: LLMGate, researcher=None):
        self.settings = settings
        self.gate = gate
        self.researcher = researcher
        self.enabled = bool(settings.gemini_api_key)
        self._combo_ok: dict[str, bool] = {}
        self._grounding_blocked_until = 0.0
        self.client = (
            genai.Client(
                api_key=settings.gemini_api_key,
                http_options=types.HttpOptions(timeout=int(settings.gemini_timeout_seconds * 1000)),
            )
            if self.enabled
            else None
        )

    @property
    def grounding_available(self) -> bool:
        return time.time() >= self._grounding_blocked_until

    # ------------------------------------------------------------------
    async def generate_json(
        self,
        *,
        contents: Sequence[Any],
        schema: type[T],
        system: str,
        grounded: bool = False,
        research_query: str | None = None,
        exclude_domain: str | None = None,
        extra_context: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
    ) -> tuple[T, Grounding]:
        if not self.enabled:
            raise ProviderError("GEMINI_API_KEY is not configured.")

        models = [model or self.settings.gemini_primary_model]
        if self.settings.gemini_secondary_model and self.settings.gemini_secondary_model not in models:
            models.append(self.settings.gemini_secondary_model)
        temp = self.settings.gemini_temperature if temperature is None else temperature
        contents = list(contents)
        if extra_context:
            contents = contents + [extra_context]

        last_exc: Exception | None = None
        for idx, model_id in enumerate(models):
            try:
                return await self._generate_with_model(model_id, contents, schema, system, grounded, research_query, exclude_domain, temp)
            except errors.APIError as exc:
                last_exc = exc
                if (_is_rate_limited(exc) or getattr(exc, "code", None) == 404) and idx < len(models) - 1:
                    log.warning("model %s failed (%s); falling over to %s", model_id, getattr(exc, "code", "?"), models[idx + 1])
                    continue
                raise ProviderError(f"Gemini error ({getattr(exc, 'code', '?')}): {getattr(exc, 'message', exc)}") from exc
        assert last_exc is not None
        raise ProviderError(str(last_exc))

    async def research(self, query: str, exclude_domain: str | None = None) -> tuple[str, list[dict], str | None]:
        """Run the external researcher (DuckDuckGo / Tavily / Groq)."""
        if not self.researcher or not query:
            return "", [], None
        try:
            notes, sources = await self.researcher.research(query, exclude_domain=exclude_domain)
            return notes, sources, self.researcher.name
        except Exception as exc:
            log.warning("external research failed: %s", exc)
            return "", [], None

    async def upload_file(self, path: str | Path, mime_type: str | None = None, *, wait_seconds: float = 180.0):
        if not self.enabled:
            raise ProviderError("GEMINI_API_KEY is not configured.")
        path = Path(path)
        mime_type = mime_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        cfg = types.UploadFileConfig(mime_type=mime_type, display_name=path.name)
        try:
            uploaded = await self.client.aio.files.upload(file=str(path), config=cfg)
        except errors.APIError as exc:
            raise ProviderError(f"Gemini upload failed ({getattr(exc, 'code', '?')}): {getattr(exc, 'message', exc)}") from exc
        deadline = time.monotonic() + wait_seconds
        while True:
            state = str(getattr(uploaded, "state", "") or "").upper()
            if "ACTIVE" in state:
                return uploaded
            if "FAILED" in state:
                raise ProviderError(f"Gemini file processing failed for {path.name}")
            if time.monotonic() > deadline:
                raise ProviderError("Timed out waiting for Gemini to process the uploaded file.")
            await asyncio.sleep(2.0)
            uploaded = await self.client.aio.files.get(name=uploaded.name)

    async def delete_file(self, name: str) -> None:
        try:
            await self.client.aio.files.delete(name=name)
        except Exception as exc:
            log.debug("could not delete Gemini file %s: %s", name, exc)

    def list_models(self) -> list[str]:
        if not self.enabled:
            return []
        out = []
        for m in self.client.models.list():
            actions = getattr(m, "supported_actions", None) or []
            if not actions or "generateContent" in actions:
                out.append(m.name.replace("models/", ""))
        return sorted(out)

    # ------------------------------------------------------------------
    async def _generate_with_model(self, model_id, contents, schema, system, grounded, research_query, exclude_domain, temperature):
        grounding = Grounding(model=model_id)

        # 1) Gemini's own Google Search, if it is (still) available on this key.
        if grounded and self.grounding_available:
            try:
                return await self._grounded_call(model_id, contents, schema, system, temperature, grounding)
            except errors.APIError as exc:
                if not _is_rate_limited(exc):
                    raise
                # Distinguish "grounding quota" from "model quota" by falling through to a
                # plain call: if that also 429s, generate_json moves to the next model.
                self._grounding_blocked_until = time.time() + GROUNDING_RETRY_SECONDS
                log.warning("Google Search grounding refused (%s); using external research for the next hour", getattr(exc, "code", "?"))

        # 2) External research notes (Groq browser search / Tavily) on a plain schema call.
        call_contents = list(contents)
        if grounded and research_query:
            notes, sources, provider = await self.research(research_query, exclude_domain)
            if notes:
                grounding.research_provider = provider
                grounding.sources = sources
                grounding.queries = [research_query[:200]]
                call_contents.append(self.notes_block(notes, sources))

        resp = await self._call(model_id, call_contents, system, temperature, tools=False, schema=schema)
        return self._parse(resp, schema), grounding

    async def _grounded_call(self, model_id, contents, schema, system, temperature, grounding):
        if self._combo_ok.get(model_id, True):
            try:
                resp = await self._call(model_id, contents, system, temperature, tools=True, schema=schema)
                parsed = self._parse(resp, schema)
                self._combo_ok[model_id] = True
                self._read_grounding(resp, grounding)
                grounding.grounded = True
                return parsed, grounding
            except errors.APIError as exc:
                if not _looks_like_unsupported_combo(exc):
                    raise
                self._combo_ok[model_id] = False
        # Two-step for models that reject tools + schema together.
        research_system = system + (
            "\n\nFor this step, do NOT output JSON. Use Google Search as needed and write thorough research notes: "
            "what you found, which sources say what (with URLs), and your provisional assessment."
        )
        resp1 = await self._call(model_id, contents, research_system, temperature, tools=True, schema=None)
        self._read_grounding(resp1, grounding)
        grounding.grounded = True
        grounding.two_step = True
        resp2 = await self._call(
            model_id, list(contents) + [self.notes_block(resp1.text or "", grounding.sources)], system, temperature, tools=False, schema=schema
        )
        return self._parse(resp2, schema), grounding

    @staticmethod
    def notes_block(notes: str, sources: list[dict]) -> str:
        src_lines = "\n".join(f"- {s['title']}: {s['url']}" for s in sources) or "- (no sources returned)"
        return (
            "\n\nWEB RESEARCH NOTES (from an external search step; treat as evidence, verify internal consistency):\n"
            + notes.strip()
            + "\n\nSOURCES RETURNED BY SEARCH:\n" + src_lines
            + "\n\nOnly cite URLs that appear above. If the notes found nothing relevant, mark claims unverifiable."
        )

    async def _call(self, model_id, contents, system, temperature, *, tools: bool, schema):
        config = types.GenerateContentConfig(system_instruction=system, temperature=temperature, max_output_tokens=8192)
        if tools:
            config.tools = [types.Tool(google_search=types.GoogleSearch())]
        if schema is not None:
            config.response_mime_type = "application/json"
            config.response_schema = schema

        class _Retry(Exception):
            pass

        async def _guarded():
            try:
                async with self.gate.slot():
                    return await self.client.aio.models.generate_content(model=model_id, contents=contents, config=config)
            except errors.APIError as exc:
                if _is_server_error(exc) or (_is_rate_limited(exc) and not tools):
                    raise _Retry(str(exc)) from exc
                raise

        try:
            return await with_retries(_guarded, attempts=3, base_delay=3.0, retry_on=(_Retry,), log=log)
        except _Retry as exc:
            raise exc.__cause__

    @staticmethod
    def _parse(resp, schema: type[T]) -> T:
        text = resp.text
        if not text:
            reason = None
            try:
                reason = resp.candidates[0].finish_reason
            except Exception:
                pass
            raise ProviderError(f"Empty model response (finish_reason={reason}).")
        try:
            return schema.model_validate_json(_strip_fences(text))
        except ValidationError as exc:
            m = re.search(r"\{.*\}", text, flags=re.S)
            if m:
                try:
                    return schema.model_validate(json.loads(m.group(0)))
                except Exception:
                    pass
            raise ProviderError(f"Model returned JSON that does not match the schema: {exc}") from exc

    @staticmethod
    def _read_grounding(resp, grounding: Grounding) -> None:
        try:
            gm = getattr(resp.candidates[0], "grounding_metadata", None)
        except Exception:
            gm = None
        if gm is not None:
            seen = set()
            for chunk in getattr(gm, "grounding_chunks", None) or []:
                web = getattr(chunk, "web", None)
                if web and web.uri and web.uri not in seen:
                    seen.add(web.uri)
                    grounding.sources.append({"title": web.title or web.uri, "url": web.uri})
            grounding.queries = list(getattr(gm, "web_search_queries", None) or [])
        try:
            um = resp.usage_metadata
            grounding.usage = {"prompt_tokens": um.prompt_token_count, "output_tokens": um.candidates_token_count, "total_tokens": um.total_token_count}
        except Exception:
            pass
