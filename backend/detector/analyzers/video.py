"""
Video pipeline.

Strategy "gemini_video": upload the clip via the Files API and let Gemini see
frames + audio natively (1 upload + 1 call).
Strategy "frames" (also the automatic fallback): ffmpeg frames as inline images
+ Groq Whisper transcript.

Both paths first run ffprobe metadata and the ONNX detector on sampled frames.
"""
import asyncio
import logging
import tempfile
from pathlib import Path

from google.genai import types

from detector.analyzers.common import Timer, build_result, signals_block, verify_with_research
from detector.analyzers.prompts import VIDEO_SYSTEM
from detector.forensics.frames import extract_audio, extract_frames
from detector.forensics.video_meta import analyze_video_metadata
from detector.providers.gemini import ProviderError
from detector.schemas import AnalysisResult, LLMVerdict
from detector.services import Services

log = logging.getLogger(__name__)


async def analyze_video(path: str | Path, services: Services, *, original_name: str | None = None, progress=None) -> AnalysisResult:
    path = Path(path)
    settings = services.settings
    timer = Timer()
    report = progress or (lambda stage: None)

    with tempfile.TemporaryDirectory(prefix="vid_", dir=str(settings.tmp_dir)) as work:
        work = Path(work)

        report("probing metadata")
        with timer.track("metadata"):
            meta = await analyze_video_metadata(str(path))
        duration = float(meta.get("duration_seconds") or 0.0)

        report("sampling frames")
        with timer.track("frames"):
            frames = await extract_frames(
                str(path), work / "frames", duration=duration,
                max_frames=settings.video_max_frames, fps=settings.video_frame_fps,
            )

        report("running frame detector")
        with timer.track("detector"):
            per_frame = await asyncio.to_thread(services.onnx.predict_paths, frames) if (frames and services.onnx.enabled) else []
        detector_summary = _summarize_frames(per_frame, services)

        forensics = {
            "metadata": {k: v for k, v in meta.items() if k != "raw_tags"},
            "raw_tags": meta.get("raw_tags", {}),
            "frame_detector": detector_summary,
            "original_filename": original_name,
        }

        fallback_used = None
        transcript = {}
        uploaded = None
        contents: list = []

        use_gemini_video = settings.video_strategy == "gemini_video" and services.gemini.enabled
        if use_gemini_video:
            report("uploading to Gemini")
            try:
                with timer.track("upload"):
                    uploaded = await services.gemini.upload_file(path, mime_type="video/mp4")
                contents.append(uploaded)
            except ProviderError as exc:
                log.warning("Gemini video upload failed (%s); falling back to frames+transcript", exc)
                fallback_used = "frames+whisper"
                use_gemini_video = False

        if not use_gemini_video:
            report("transcribing audio")
            if meta.get("has_audio") and services.groq.enabled:
                with timer.track("transcribe"):
                    audio = await extract_audio(str(path), work / "audio.m4a")
                    if audio:
                        transcript = await services.groq.transcribe(audio)
            for fp in frames:
                contents.append(types.Part.from_bytes(data=fp.read_bytes(), mime_type="image/jpeg"))
            forensics["transcript"] = transcript or {"status": "unavailable"}

        task = "Analyze the attached video." if use_gemini_video else (
            f"Analyze this video from {len(frames)} sampled frames (in temporal order)."
            + (f"\n\nSPEECH TRANSCRIPT (Whisper, language={transcript.get('language')}):\n{transcript.get('text')}" if transcript.get("text") else "\n\nNo transcript available.")
        )
        task += signals_block("FORENSIC SIGNALS", forensics)
        task += (
            "\n\nNote on frame_detector: an SDXL-era AI-image classifier applied per frame. On our benchmarks it "
            "scores fully generated clips (Veo/Gemini, InVideo) high, but it ALSO frequently scores ordinary phone "
            "videos of real people at 0.9-1.0. Treat a high average as WEAK evidence on its own; it becomes moderate "
            "only when combined with generator metadata, visual artifacts you can point to, or false claims. "
            "A low average (<0.2) is a moderate REAL signal."
        )
        contents.append(task)

        report("analyzing with Gemini")
        try:
            with timer.track("llm"):
                verdict, grounding = await services.gemini.generate_json(
                    contents=contents, schema=LLMVerdict, system=VIDEO_SYSTEM, grounded=True
                )
            report("verifying claims on the web")
            verdict, grounding = await verify_with_research(
                services, contents=contents, system=VIDEO_SYSTEM, first=verdict, grounding=grounding, timer=timer
            )
        finally:
            if uploaded is not None:
                await services.gemini.delete_file(uploaded.name)

    return build_result(
        modality="video", verdict=verdict, grounding=grounding, forensics=forensics,
        timings=timer.t, fallback_used=fallback_used,
    )


def _summarize_frames(per_frame: list[dict], services: Services) -> dict:
    if not per_frame:
        return {"model": services.settings.onnx_model_repo, "status": services.onnx.load_error or "no frames / disabled"}
    probs = [f["fake_probability"] for f in per_frame]
    return {
        "model": services.settings.onnx_model_repo,
        "frames_scored": len(probs),
        "avg_fake_probability": round(sum(probs) / len(probs), 4),
        "max_fake_probability": round(max(probs), 4),
        "min_fake_probability": round(min(probs), 4),
        "fake_frame_ratio": round(sum(p >= 0.5 for p in probs) / len(probs), 3),
        "per_frame": [round(p, 3) for p in probs],
    }
