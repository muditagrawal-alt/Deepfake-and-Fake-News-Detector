"""
FastAPI application (served on :7860 on the Hugging Face Space).

Endpoints
  GET  /health
  POST /analyze/news    {"url": "..."}          -> AnalysisResult
  POST /analyze/image   multipart "file"        -> AnalysisResult
  POST /analyze/video   multipart "file"        -> 202 {"job_id"}
  GET  /jobs/{job_id}                           -> JobStatus
"""
import asyncio
import logging
import math
import os
import re
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from detector import accounts
from detector.auth import require_user
from detector.cache import response_cache
from detector.config import get_settings
from detector.forensics.safe_fetch import UnsafeURL, validate_public_url
from detector.forensics.video_meta import ffprobe_json
from detector.jobs import JobStore
from detector.pipeline import analyze
from detector.providers.gemini import ProviderError
from detector.quota import Busy, QuotaExhausted
from detector.schemas import AnalysisResult, JobStatus, NewsRequest
from detector.services import Services, get_services

settings = get_settings()
logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("detector.api")


def client_ip(request: Request) -> str:
    # The hosting proxy appends the address it observed to X-Forwarded-For;
    # taking the first value would let a caller choose their own quota bucket.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        forwarded = [value.strip() for value in xff.split(",") if value.strip()]
        if forwarded:
            return forwarded[-1]
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip, default_limits=[settings.rate_limit_per_ip])
jobs = JobStore(ttl_seconds=settings.job_ttl_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    accounts.init_store(settings)
    services = get_services()
    if services.onnx.enabled:
        # Warm the detector off the request path; failures just disable it.
        asyncio.get_event_loop().run_in_executor(None, services.onnx._load)
    log.info("startup: %s", services.status())
    yield


app = FastAPI(title="Fake Content Detector API", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if settings.enable_gzip:
    app.add_middleware(GZipMiddleware, minimum_size=settings.gzip_min_bytes)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=settings.allowed_origin_regex or None,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Inject OWASP SOTA security headers and enforce no-store on sensitive endpoints."""
    response = await call_next(request)
    headers = response.headers
    headers["X-Content-Type-Options"] = "nosniff"
    headers["X-Frame-Options"] = "DENY"
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    headers["X-XSS-Protection"] = "0"
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Sensitive endpoints should never be cached in shared intermediate proxies
    path = request.url.path
    if path.startswith(("/account", "/analyze", "/jobs")):
        headers["Cache-Control"] = "no-store, private, max-age=0"
        headers["Pragma"] = "no-cache"

    if "server" in headers:
        del headers["server"]
    return response


def safe_filename(name: str | None, default: str = "file") -> str:
    """Sanitize uploaded filenames to eliminate traversal, null-byte, and script injection risks."""
    if not name:
        return default
    # Handle both Windows and POSIX path separators
    clean = name.replace("\\", "/").rstrip("/").split("/")[-1]
    clean = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", clean)
    clean = re.sub(r'[<>:"/\\|?*`$]', "", clean)
    clean = clean.strip(". ")
    return clean[:128] or default


def validate_magic_bytes(header: bytes, kind: str) -> None:
    """Validate binary magic signatures to block polyglot, spoofed MIME, or web shell uploads."""
    if len(header) < 4:
        raise HTTPException(400, "File header is too short or empty.")

    if kind == "image":
        is_jpeg = header[:3] == b"\xff\xd8\xff"
        is_png = header[:8] == b"\x89PNG\r\n\x1a\n"
        is_webp = header[:4] == b"RIFF" and (len(header) < 12 or header[8:12] == b"WEBP")
        if not (is_jpeg or is_png or is_webp):
            raise HTTPException(415, "Invalid image binary signature. Supported formats: JPEG, PNG, WebP.")

    elif kind == "video":
        is_webm = header[:4] == b"\x1a\x45\xdf\xa3"
        is_mp4 = (
            b"ftyp" in header[:32]
            or (len(header) >= 8 and header[4:8] in {b"ftyp", b"moov", b"mdat", b"wide"})
            or header[:4] in {b"ftyp", b"moov"}
        )
        if not (is_webm or is_mp4):
            raise HTTPException(415, "Invalid video binary signature. Supported formats: MP4, QuickTime, WebM.")


@app.exception_handler(QuotaExhausted)
async def _quota(_, exc):
    return JSONResponse(status_code=429, content={"error": "quota_exhausted", "message": str(exc)})


@app.exception_handler(Busy)
async def _busy(_, exc):
    return JSONResponse(status_code=503, content={"error": "busy", "message": str(exc)})


@app.exception_handler(ProviderError)
async def _provider(_, exc):
    return JSONResponse(status_code=502, content={"error": "provider_error", "message": str(exc)})


# ----------------------------------------------------------------------
@app.get("/")
async def root():
    """Service card. The user interface is the separate frontend deployment."""
    frontend = os.environ.get("FRONTEND_URL") or None
    return {
        "service": "Veritas API",
        "description": "Fake news and deepfake detection. Local forensics plus an LLM fact-check.",
        "frontend": frontend,
        "docs": "/docs",
        "health": "/health",
        "endpoints": ["POST /analyze/news", "POST /analyze/image", "POST /analyze/video",
                      "GET /jobs/{job_id}", "GET /account", "GET /account/history",
                      "PATCH /account/preferences/history", "POST /account/keys"],
        "source": "https://github.com/muditagrawal-alt/Deepfake-and-Fake-News-Detector",
    }


@app.get("/health")
async def health():
    return {"status": "ok", **get_services().status()}


@app.get("/metrics")
async def metrics():
    """System health, cache efficiency, and concurrency telemetry."""
    import resource
    # ru_maxrss is in bytes on macOS, kilobytes on Linux
    raw_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    rss_mb = raw_rss / (1024 * 1024) if raw_rss > 100_000_000 else raw_rss / 1024
    return {
        "status": "healthy",
        "cache": await response_cache.stats(),
        "active_jobs": len(jobs._jobs),
        "memory_rss_mb": round(rss_mb, 2),
        "traffic_concurrency": {
            "gemini_rpm": settings.gemini_rpm,
            "rate_limit_per_ip": settings.rate_limit_per_ip,
            "response_cache_enabled": settings.enable_response_cache,
            "gzip_enabled": settings.enable_gzip,
        },
    }


@app.post("/analyze/news", response_model=AnalysisResult)
@limiter.limit(settings.rate_limit_per_ip)
async def analyze_news_endpoint(
    request: Request,
    response: Response,
    body: NewsRequest,
    user: dict = Depends(require_user),
):
    if not body.url.lower().startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")
    try:
        await validate_public_url(body.url)
    except UnsafeURL as exc:
        raise HTTPException(400, f"Untrusted or private URL: {exc}")

    if not settings.enable_response_cache:
        return await _run_detection(user, body.url, url=body.url)

    cache_key = f"news:{body.url.strip().lower()}"

    async def compute():
        return await _run_detection(user, body.url, url=body.url)

    result, was_hit = await response_cache.get_or_compute(
        cache_key, compute, ttl=settings.cache_ttl_seconds
    )
    if was_hit:
        try:
            accounts.save_detection(user, result.model_dump(mode="json"), body.url, settings)
        except Exception:
            log.exception("could not save cached news result %s to account history", result.id)
    response.headers["X-Cache"] = "HIT" if was_hit else "MISS"
    response.headers["Server-Timing"] = f"cache;desc={'hit' if was_hit else 'miss'}"
    return result


@app.post("/analyze/image", response_model=AnalysisResult)
@limiter.limit(settings.rate_limit_per_ip)
async def analyze_image_endpoint(request: Request, file: UploadFile = File(...), caption: str = Form(default=""),
                                 user: dict = Depends(require_user)):
    path = await _save_upload(file, settings.max_image_mb, {"image/jpeg", "image/png", "image/webp"},
                              suffix=".img", kind="image")
    try:
        if len(caption) > 2000:
            raise HTTPException(413, "Image caption or context must be 2,000 characters or fewer.")
        await asyncio.to_thread(_validate_image, path, settings.max_image_pixels)
        label = safe_filename(file.filename, default="image")
        return await _run_detection(user, label, image_path=str(path), original_name=label,
                                     caption=caption[:2000] or None)
    finally:
        _rm(path)


@app.post("/analyze/video", status_code=202)
@limiter.limit(settings.rate_limit_per_ip)
async def analyze_video_endpoint(request: Request, file: UploadFile = File(...), user: dict = Depends(require_user)):
    path = await _save_upload(file, settings.max_video_mb,
                              {"video/mp4", "video/quicktime", "video/webm", "application/octet-stream"},
                              suffix=".mp4", kind="video")
    transferred_to_job = False
    try:
        probe = await ffprobe_json(str(path))
        streams = probe.get("streams") or []
        if not probe or not any(stream.get("codec_type") == "video" for stream in streams):
            raise HTTPException(400, "Could not read this file as a video.")
        try:
            duration = float((probe.get("format", {}) or {}).get("duration") or 0.0)
        except (TypeError, ValueError):
            duration = 0.0
        if not math.isfinite(duration):
            raise HTTPException(400, "Could not read this file's duration.")
        if duration > settings.max_video_seconds:
            raise HTTPException(413, f"Video is {duration:.0f}s; the limit is {settings.max_video_seconds:.0f}s.")

        decision, services = _detection_services(user)
        if not decision["allowed"]:
            raise _byok_required()
        video_label = safe_filename(file.filename, default="video")
        async def run_video(progress):
            try:
                result = await analyze(video_path=str(path), original_name=video_label,
                                       services=services, progress=progress)
            except BaseException:
                if not decision["use_byok"]:
                    accounts.refund_free_detection(user["sub"], settings)
                raise
            try:
                accounts.save_detection(user, result.model_dump(mode="json"), video_label, settings)
            except Exception:
                log.exception("could not save video result %s to account history", result.id)
            return result

        try:
            job_id = jobs.create(user["sub"])
            task = asyncio.create_task(
                jobs.run(
                    job_id,
                    run_video,
                    cleanup=lambda: _rm(path),
                )
            )
            jobs.attach_task(job_id, task)
            task.add_done_callback(lambda _task: _rm(path))
        except BaseException:
            if not decision["use_byok"]:
                accounts.refund_free_detection(user["sub"], settings)
            raise
        transferred_to_job = True
        return {"job_id": job_id, "status": "queued", "poll": f"/jobs/{job_id}"}
    finally:
        if not transferred_to_job:
            _rm(path)


@app.get("/jobs/{job_id}", response_model=JobStatus)
async def job_status(job_id: str, user: dict = Depends(require_user)):
    job = jobs.get(job_id, user["sub"])
    if not job:
        raise HTTPException(404, "Unknown or expired job id.")
    return job


class ApiKeyInput(BaseModel):
    provider: str = Field(pattern=r"^(gemini|openrouter|tavily|groq)$")
    key: str = Field(min_length=20, max_length=1024)


class HistoryPreferenceInput(BaseModel):
    enabled: bool


def _byok_required() -> HTTPException:
    return HTTPException(status_code=402, detail={
        "error": "byok_required",
        "message": "Your free checks are used. Add a Gemini or OpenRouter API key to continue.",
    })


def _detection_services(user: dict) -> tuple[dict, Services]:
    decision = accounts.reserve_detection(user, settings)
    if not decision["allowed"]:
        return decision, get_services()
    if not decision["use_byok"]:
        return decision, get_services()

    try:
        keys = accounts.get_api_keys(user["sub"], settings)
    except accounts.EncryptionUnavailable as exc:
        raise HTTPException(503, "Saved API keys cannot be decrypted. Check BYOK_ENCRYPTION_KEY.") from exc
    provider = decision.get("provider")
    api_key = keys.get(provider or "")
    if not api_key:
        raise _byok_required()

    overrides = {
        "llm_engine": provider,
        "gemini_api_key": api_key if provider == "gemini" else "",
        "openrouter_api_key": api_key if provider == "openrouter" else "",
        "cerebras_api_key": "",
        "mistral_api_key": "",
        "groq_api_key": keys.get("groq", ""),
        "tavily_api_key": keys.get("tavily", ""),
    }
    if provider == "openrouter":
        # This backend sees video as sampled frames rather than a native video file.
        overrides["video_strategy"] = "frames"
    personalized = Services(settings.model_copy(update=overrides))
    # Reuse the process-wide local detector instead of creating a second model instance.
    personalized.onnx = get_services().onnx
    return decision, personalized


async def _run_detection(user: dict, input_label: str, **analysis_args) -> AnalysisResult:
    decision, services = _detection_services(user)
    if not decision["allowed"]:
        raise _byok_required()
    try:
        result = await analyze(services=services, **analysis_args)
    except BaseException:
        if not decision["use_byok"]:
            accounts.refund_free_detection(user["sub"], settings)
        raise
    try:
        accounts.save_detection(user, result.model_dump(mode="json"), input_label, settings)
    except Exception:
        log.exception("could not save %s result %s to account history", result.modality, result.id)
    return result


@app.get("/account")
async def get_account(user: dict = Depends(require_user)):
    return accounts.account_status(user, settings)


@app.delete("/account")
async def delete_user_account(user: dict = Depends(require_user)):
    deleted = accounts.delete_account(user["sub"], settings)
    await jobs.cancel_owner(user["sub"])
    return {"deleted": deleted}


@app.get("/account/history")
async def get_account_history(user: dict = Depends(require_user)):
    return accounts.get_history(user["sub"], settings)


@app.patch("/account/preferences/history")
async def update_history_preference(body: HistoryPreferenceInput, user: dict = Depends(require_user)):
    deleted = accounts.set_history_enabled(user, body.enabled, settings)
    return {"history_enabled": body.enabled, "deleted": deleted}


@app.delete("/account/history")
async def delete_account_history(user: dict = Depends(require_user)):
    return {"deleted": accounts.clear_history(user["sub"], settings)}


@app.post("/account/keys")
async def put_account_key(body: ApiKeyInput, user: dict = Depends(require_user)):
    try:
        accounts.save_api_key(user, body.provider, body.key, settings)
    except accounts.EncryptionUnavailable as exc:
        raise HTTPException(503, "API key storage is not configured. Set BYOK_ENCRYPTION_KEY.") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {"saved": True}


@app.delete("/account/keys/{provider}")
async def remove_account_key(provider: str, user: dict = Depends(require_user)):
    try:
        deleted = accounts.delete_api_key(user["sub"], provider, settings)
    except ValueError as exc:
        raise HTTPException(404, "Unknown API-key provider.") from exc
    return {"deleted": deleted}


# ----------------------------------------------------------------------
async def _save_upload(
    file: UploadFile,
    max_mb: float,
    allowed: set[str],
    *,
    suffix: str,
    kind: str | None = None,
) -> Path:
    limit = int(max_mb * 1024 * 1024)
    ctype = (file.content_type or "").lower()
    if ctype and ctype not in allowed:
        raise HTTPException(415, f"Unsupported content type {ctype}.")
    fd, tmp = tempfile.mkstemp(prefix="upload_", suffix=suffix, dir=str(settings.tmp_dir))
    size = 0
    header_checked = False
    try:
        with os.fdopen(fd, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                if not header_checked:
                    if kind:
                        validate_magic_bytes(chunk[:32], kind)
                    header_checked = True
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"File exceeds {max_mb:.0f} MB limit.")
                out.write(chunk)
    except Exception:
        _rm(Path(tmp))
        raise
    if size == 0:
        _rm(Path(tmp))
        raise HTTPException(400, "Empty upload.")
    return Path(tmp)


def _validate_image(path: Path, max_pixels: int) -> None:
    """Reject corrupt, unsupported, or excessively large decoded images with decompression bomb protection."""
    try:
        Image.MAX_IMAGE_PIXELS = max_pixels
        with Image.open(path) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(415, "The uploaded file is not a supported JPEG, PNG, or WebP image.")
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > max_pixels:
                raise HTTPException(413, f"Image dimensions exceed the {max_pixels / 1_000_000:g} megapixel limit.")
            image.verify()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError) as exc:
        raise HTTPException(400, "Could not read this file as an image.") from exc


def _rm(path: Path | str) -> None:
    try:
        p = Path(path)
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        elif p.exists():
            p.unlink()
    except Exception:
        pass
