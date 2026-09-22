---
title: Veritas API
emoji: 🔍
colorFrom: indigo
colorTo: purple
sdk: gradio
app_file: app.py
pinned: false
short_description: Fake news and deepfake detection API
---

# Fake Content Detector — backend

FastAPI service that checks a **news URL**, an **image** or a **short video** for
AI generation, manipulation and false claims. No PyTorch: local forensics
(ffprobe, EXIF, an ONNX image detector) plus **Gemini** (vision, video, Google
Search grounding, structured JSON) and **Groq Whisper** for transcripts.

## Run locally

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example ../.env        # then fill in GEMINI_API_KEY and GROQ_API_KEY
uvicorn detector.main:app --reload --port 7860
```

Smoke tests:

```bash
python -m scripts.list_models                       # which Gemini ids your key can use
python -m scripts.smoke --url https://…             # news
python -m scripts.smoke --image ../data/evaluation/images/fake/some.jpg
python -m scripts.smoke --video ../data/evaluation/videos/fake/some.mp4
```

Benchmarks (writes `results_v2.csv` / `metrics_v2.txt` next to the old ones):

```bash
python -m eval.run_eval --modality news
python -m eval.run_eval --modality image
python -m eval.run_eval --modality video
```

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | – | provider status, quota left |
| POST | `/analyze/news` | `{"url": "..."}` | `AnalysisResult` |
| POST | `/analyze/image` | multipart `file` | `AnalysisResult` |
| POST | `/analyze/video` | multipart `file` | `202 {"job_id"}` → poll `/jobs/{id}` |

`AnalysisResult` = `verdict` (LIKELY_REAL / LIKELY_FAKE / UNCERTAIN), `confidence`,
`summary`, `reasoning`, `claims[]` (each with status + sources), `signals[]`,
`caveats[]`, `evidence[]`, `forensics{}`, `provenance{}`.

## Deploy to a Hugging Face Space

1. Create a Space → **Gradio** SDK, hardware **CPU basic**.
2. Push this `backend/` folder as the Space repo root:
   `./scripts/deploy_space.sh <user>/<space>` from the repository root.
3. Space **Settings → Secrets**: `GEMINI_API_KEY`, `GROQ_API_KEY` (+ optional ones).
   **Variables**: `ALLOWED_ORIGINS=https://<your-frontend>.vercel.app`,
   and optionally `FRONTEND_URL` so the demo page links back to it.

The Space uses the **Gradio SDK as a runtime only**: it runs `python app.py` and
proxies the port, and `app.py` starts this FastAPI app. No Gradio interface is
served; the user interface is the separate Next.js deployment. ffmpeg is
pre-installed in that image, and `packages.txt` makes the dependency explicit.
The ONNX detector is fetched on first use and warmed in the background at startup,
so the first boot after a rebuild takes an extra minute.

A `Dockerfile` is kept for hosts that support containers (Render, Railway, Fly, or a
Docker Space if you have one). It pre-downloads the detector at build time.

## Free-tier guard rails

Per-IP rate limit (`RATE_LIMIT_PER_IP`), a sliding-window RPM gate and a hard
daily counter (`GEMINI_DAILY_QUOTA`) sit in front of every LLM call; the API
answers 429/503 with a readable message instead of failing mid-analysis.
Upload caps: `MAX_IMAGE_MB`, `MAX_VIDEO_MB`, `MAX_VIDEO_SECONDS`.

The `Organika/sdxl-detector` model is CC-BY-NC-3.0 — non-commercial use only.
