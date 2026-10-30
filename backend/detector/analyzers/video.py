"""
Video: measured file facts (ffprobe, C2PA, optional per-frame detector score),
then analyse -> retrieve -> verify.

The model sees the clip natively when the backend supports it (Gemini Files API)
and video_strategy is "native"; otherwise it sees frames sampled across the clip
plus a speech transcript.
"""
import asyncio
import tempfile
from pathlib import Path

from detector.analyzers.common import Timer, build_result
from detector.analyzers.prompts import ANALYSE, VERIFY
from detector.engine.parts import ImagePart, TextPart, VideoPart
from detector.engine.pipeline import run_stages
from detector.forensics.frames import extract_audio, extract_frames
from detector.forensics.video_meta import analyze_video_metadata
from detector.schemas import AnalysisResult
from detector.services import Services


async def analyze_video(path: str | Path, services: Services, *, original_name: str | None = None,
                        progress=None) -> AnalysisResult:
    path = Path(path)
    settings = services.settings
    timer = Timer()
    report = progress or (lambda _s: None)
    native = settings.video_strategy == "native" and services.llm.supports_native_video

    with tempfile.TemporaryDirectory(prefix="vid_", dir=str(settings.tmp_dir)) as work:
        work = Path(work)
        report("probing metadata")
        with timer.track("metadata"):
            meta = await analyze_video_metadata(str(path))
        facts: dict = {"metadata": meta}
        duration = float(meta.get("duration_seconds") or 0.0)

        frames: list[Path] = []
        if not native or services.onnx.enabled:
            report("sampling frames")
            with timer.track("frames"):
                frames = await extract_frames(str(path), work / "frames", duration=duration,
                                              max_frames=settings.video_max_frames, fps=settings.video_frame_fps)
        if frames and services.onnx.enabled:
            with timer.track("detector"):
                scores = await asyncio.to_thread(services.onnx.predict_paths, frames)
            facts["pixel_classifier"] = {"model": settings.onnx_model_repo,
                                         "per_frame_fake_probability": [round(s["fake_probability"], 3) for s in scores]}

        transcript_text = ""
        if native:
            parts = [VideoPart(path)]
            fallback = None
        else:
            report("transcribing audio")
            transcript: dict = {}
            if meta.get("has_audio") and services.groq.enabled:
                with timer.track("transcribe"):
                    audio = await extract_audio(str(path), work / "audio.m4a")
                    if audio:
                        transcript = await services.groq.transcribe(audio)
            transcript_text = transcript.get("text") or ""
            step = duration / len(frames) if frames and duration else None
            parts = [ImagePart(fp.read_bytes(), label=f"frame {i + 1}/{len(frames)}"
                               + (f" at ~{(i + 0.5) * step:.1f}s" if step else ""))
                     for i, fp in enumerate(frames)]
            parts.append(TextPart(
                f"SPEECH TRANSCRIPT (Whisper, language={transcript.get('language')}):\n{transcript['text']}"
                if transcript.get("text") else
                ("SPEECH TRANSCRIPT: none (the file has no audio track)." if not meta.get("has_audio")
                 else "SPEECH TRANSCRIPT: unavailable.")))
            facts["transcript"] = {"model": settings.groq_whisper_model, "language": transcript.get("language"),
                                   "chars": len(transcript.get("text") or "")} if transcript else {"status": "unavailable"}
            fallback = "frames+transcript"

        stage = await run_stages(
            services, modality="video", parts=parts, facts=facts,
            system_analyse=ANALYSE["video"], system_verify=VERIFY["video"], timer=timer,
            item_text=transcript_text, progress=report,
        )
    return build_result(modality="video", stage=stage, facts=facts, timings=timer.t, fallback_used=fallback)
