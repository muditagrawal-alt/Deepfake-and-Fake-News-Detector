"""
Central configuration.

Everything is read from environment variables (or a .env file). Secrets live in
.env; non-secret knobs have defaults here so the app runs with only
GEMINI_API_KEY set.

Lookup order for .env: repo-root/.env, then backend/.env (later wins).
"""
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Providers (secrets)
    # ------------------------------------------------------------------
    gemini_api_key: str = ""
    groq_api_key: str = ""
    cerebras_api_key: str = ""
    mistral_api_key: str = ""
    openrouter_api_key: str = ""
    tavily_api_key: str = ""
    hf_token: str = ""

    # ------------------------------------------------------------------
    # Engine
    # ------------------------------------------------------------------
    # Which model judges the content: "gemini" (hosted) or "ollama" (local).
    # Chosen once per process; a benchmark run never switches models part-way.
    llm_engine: str = "gemini"
    # True: never fall over to gemini_secondary_model on 429/503 (research runs).
    pin_model: bool = False
    # "open": retrieve web evidence; "closed": no retrieval (contamination control).
    research_mode: str = "open"
    # Comma-separated domains never used as evidence (e.g. fact-check sites that
    # are also the label source of a benchmark). Empty in production.
    search_blocklist: str = ""
    max_search_queries: int = 3

    # ------------------------------------------------------------------
    # Ollama (local models)
    # ------------------------------------------------------------------
    ollama_url: str = "http://127.0.0.1:11434"
    # gemma4:12b honours the JSON schema with thinking off. qwen3.5:9b ignores
    # `format` unless OLLAMA_THINK=true (Ollama 0.30.10), which is ~4x slower.
    ollama_model: str = "gemma4:12b"
    ollama_num_ctx: int = 16384
    ollama_think: bool = False
    ollama_seed: int = 7
    ollama_timeout_seconds: float = 600.0
    ollama_keep_alive: str = "30m"

    # ------------------------------------------------------------------
    # Gemini
    # ------------------------------------------------------------------
    # Highest free RPD is on the Flash-Lite tier; Flash is the second pool.
    # Run `python -m scripts.list_models` to see the exact ids your key can use.
    gemini_primary_model: str = "gemini-3.5-flash-lite"
    gemini_secondary_model: str = "gemini-3.1-flash-lite"
    gemini_rpm: int = 10                 # sliding-window requests/minute we allow ourselves
    gemini_daily_quota: int = 400        # hard stop per UTC day (keep below the tier's RPD)
    gemini_concurrency: int = 2
    gemini_temperature: float = 0.2
    gemini_timeout_seconds: float = 120.0
    video_strategy: str = "native"       # "native" (backend sees the file) or "frames" (frames + Whisper)
    researcher: str = "auto"             # "auto" (Tavily if key, else DuckDuckGo) or "groq" (browser_search; heavy on quota)

    # ------------------------------------------------------------------
    # Groq (Whisper + GPT-OSS browser search fallback)
    # ------------------------------------------------------------------
    groq_whisper_model: str = "whisper-large-v3-turbo"
    groq_text_model: str = "openai/gpt-oss-120b"

    # ------------------------------------------------------------------
    # OpenAI-compatible fallbacks (used only when a key is present)
    # ------------------------------------------------------------------
    cerebras_model: str = "qwen-3.8-27b"
    mistral_model: str = "mistral-small-latest"
    openrouter_model: str = "openai/gpt-oss-120b:free"

    # ------------------------------------------------------------------
    # Local forensics
    # ------------------------------------------------------------------
    # Optional pixel-level classifier; its score is passed to the model as a
    # measured fact. Off by default (~500 MB resident, no significant gain measured:
    # research/results/paired_tests.csv).
    enable_onnx_detector: bool = False
    onnx_model_repo: str = "Organika/sdxl-detector"
    onnx_model_dir: Path = BACKEND_DIR / "models"
    video_frame_fps: float = 2.0            # upper cap; frames are spread across the clip
    video_max_frames: int = 8
    image_max_side: int = 1024           # downscale before sending to the LLM

    # ------------------------------------------------------------------
    # HTTP / limits
    # ------------------------------------------------------------------
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    allowed_origin_regex: str = r"https://.*\.vercel\.app"   # preview + production deployments
    rate_limit_per_ip: str = "10/hour"
    max_image_mb: float = 10.0
    max_video_mb: float = 50.0
    max_video_seconds: float = 90.0
    tmp_dir: Path = BACKEND_DIR / "tmp"
    job_ttl_seconds: int = 3600
    log_level: str = "INFO"

    # Derived helpers -----------------------------------------------------
    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    def configured_providers(self) -> dict[str, bool]:
        return {
            "gemini": bool(self.gemini_api_key),
            "groq": bool(self.groq_api_key),
            "cerebras": bool(self.cerebras_api_key),
            "mistral": bool(self.mistral_api_key),
            "openrouter": bool(self.openrouter_api_key),
            "tavily": bool(self.tavily_api_key),
            "ollama": self.llm_engine == "ollama",
            "hf": bool(self.hf_token),
        }


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.tmp_dir.mkdir(parents=True, exist_ok=True)
    settings.onnx_model_dir.mkdir(parents=True, exist_ok=True)
    return settings
