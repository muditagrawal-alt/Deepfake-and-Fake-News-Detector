"""
Groq provider: free Whisper transcription and a GPT-OSS + browser_search
research fallback (used when Gemini grounding is unavailable).
"""
import logging
from pathlib import Path

from detector.config import Settings

log = logging.getLogger(__name__)


class GroqProvider:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.enabled = bool(settings.groq_api_key)
        self.client = None
        if self.enabled:
            from groq import AsyncGroq

            self.client = AsyncGroq(api_key=settings.groq_api_key)

    async def transcribe(self, audio_path: str | Path) -> dict:
        """Return {"text", "language", "duration"} or {} when unavailable."""
        if not self.enabled:
            return {}
        audio_path = Path(audio_path)
        with open(audio_path, "rb") as fh:
            data = fh.read()
        try:
            resp = await self.client.audio.transcriptions.create(
                file=(audio_path.name, data),
                model=self.settings.groq_whisper_model,
                response_format="verbose_json",
                temperature=0.0,
            )
        except Exception as exc:
            log.warning("Groq transcription failed: %s", exc)
            return {}
        return {
            "text": (getattr(resp, "text", "") or "").strip(),
            "language": getattr(resp, "language", None),
            "duration": getattr(resp, "duration", None),
        }

    async def research(self, question: str, *, max_tokens: int = 2048) -> str:
        """Free-text research with Groq's built-in browser search. Empty string on failure."""
        if not self.enabled:
            return ""
        try:
            resp = await self.client.chat.completions.create(
                model=self.settings.groq_text_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a fact-checking researcher. Search the web, then write concise notes "
                        "listing what independent reputable sources say, with URLs. Do not invent sources.",
                    },
                    {"role": "user", "content": question},
                ],
                tools=[{"type": "browser_search"}],
                tool_choice="required",
                temperature=0.2,
                max_completion_tokens=max_tokens,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as exc:
            log.warning("Groq research failed: %s", exc)
            return ""
