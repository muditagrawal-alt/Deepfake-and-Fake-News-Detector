"""
Generic OpenAI-compatible chat client used as a text-only structuring
fallback (Cerebras, Mistral, OpenRouter, Groq all speak this dialect).

Only the first configured provider is used. It is asked for JSON matching the
schema and validated locally; there is no grounding on this path.
"""
import json
import logging
import re
from typing import TypeVar

from pydantic import BaseModel

from detector.config import Settings

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

_ENDPOINTS = {
    "cerebras": "https://api.cerebras.ai/v1",
    "mistral": "https://api.mistral.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
}


class OpenAICompatProvider:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.name = None
        self.model = None
        api_key = None
        for name, key, model in (
            ("cerebras", settings.cerebras_api_key, settings.cerebras_model),
            ("mistral", settings.mistral_api_key, settings.mistral_model),
            ("openrouter", settings.openrouter_api_key, settings.openrouter_model),
            ("groq", settings.groq_api_key, settings.groq_text_model),
        ):
            if key:
                self.name, api_key, self.model = name, key, model
                break
        self.enabled = self.name is not None
        self.client = None
        if self.enabled:
            from openai import AsyncOpenAI

            self.client = AsyncOpenAI(api_key=api_key, base_url=_ENDPOINTS[self.name])

    async def structure(self, *, system: str, user: str, schema: type[T]) -> T:
        if not self.enabled:
            raise RuntimeError("No OpenAI-compatible provider configured.")
        schema_json = json.dumps(schema.model_json_schema(), indent=None)
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system + "\n\nRespond ONLY with a JSON object matching this JSON Schema:\n" + schema_json},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        text = resp.choices[0].message.content or ""
        m = re.search(r"\{.*\}", text, flags=re.S)
        return schema.model_validate_json(m.group(0) if m else text)
