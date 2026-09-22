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
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from detector.config import get_settings
from detector.forensics.video_meta import ffprobe_json
from detector.jobs import JobStore
from detector.pipeline import analyze
from detector.providers.gemini import ProviderError
from detector.quota import Busy, QuotaExhausted
from detector.schemas import AnalysisResult, JobStatus, NewsRequest
from detector.services import get_services

settings = get_settings()
logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("detector.api")


def client_ip(request: Request) -> str:
    # HF Spaces (and Vercel proxies) put the real client in X-Forwarded-For.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip, default_limits=[settings.rate_limit_per_ip])
jobs = JobStore(ttl_seconds=settings.job_ttl_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    services = get_services()
    if services.onnx.enabled:
        # Warm the detector off the request path; failures just disable it.
        asyncio.get_event_loop().run_in_executor(None, services.onnx._load)
    log.info("startup: %s", services.status())
    yield


app = FastAPI(title="Fake Content Detector API", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=settings.allowed_origin_regex or None,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


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
@app.get("/health")
async def health():
    return {"status": "ok", **get_services().status()}


@app.post("/analyze/news", response_model=AnalysisResult)
@limiter.limit(settings.rate_limit_per_ip)
async def analyze_news_endpoint(request: Request, body: NewsRequest):
    if not body.url.lower().startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")
    return await analyze(url=body.url)


@app.post("/analyze/image", response_model=AnalysisResult)
@limiter.limit(settings.rate_limit_per_ip)
async def analyze_image_endpoint(request: Request, file: UploadFile = File(...)):
    path = await _save_upload(file, settings.max_image_mb, {"image/jpeg", "image/png", "image/webp"}, suffix=".img")
    try:
        return await analyze(image_path=str(path), original_name=file.filename)
    finally:
        _rm(path)


@app.post("/analyze/video", status_code=202)
@limiter.limit(settings.rate_limit_per_ip)
async def analyze_video_endpoint(request: Request, file: UploadFile = File(...)):
    path = await _save_upload(file, settings.max_video_mb, {"video/mp4", "video/quicktime", "video/webm", "application/octet-stream"}, suffix=".mp4")
    probe = await ffprobe_json(str(path))
    duration = float((probe.get("format", {}) or {}).get("duration") or 0.0)
    if not probe:
        _rm(path)
        raise HTTPException(400, "Could not read this file as a video.")
    if duration > settings.max_video_seconds:
        _rm(path)
        raise HTTPException(413, f"Video is {duration:.0f}s; the limit is {settings.max_video_seconds:.0f}s.")

    job_id = jobs.create()
    asyncio.create_task(
        jobs.run(
            job_id,
            lambda progress: analyze(video_path=str(path), original_name=file.filename, progress=progress),
            cleanup=lambda: _rm(path),
        )
    )
    return {"job_id": job_id, "status": "queued", "poll": f"/jobs/{job_id}"}


@app.get("/jobs/{job_id}", response_model=JobStatus)
async def job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown or expired job id.")
    return job


# ----------------------------------------------------------------------
async def _save_upload(file: UploadFile, max_mb: float, allowed: set[str], *, suffix: str) -> Path:
    limit = int(max_mb * 1024 * 1024)
    ctype = (file.content_type or "").lower()
    if ctype and ctype not in allowed:
        raise HTTPException(415, f"Unsupported content type {ctype}.")
    fd, tmp = tempfile.mkstemp(prefix="upload_", suffix=suffix, dir=str(settings.tmp_dir))
    size = 0
    try:
        with open(fd, "wb") as out:
            while chunk := await file.read(1024 * 1024):
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


def _rm(path: Path | str) -> None:
    try:
        p = Path(path)
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        elif p.exists():
            p.unlink()
    except Exception:
        pass
