---
title: Fake Content Detector API
emoji: 🔍
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
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

1. Create a Space → **Docker** SDK.
2. Push this `backend/` folder as the Space repo root (from the monorepo:
   `git subtree push --prefix backend <space-remote> main`).
3. Space **Settings → Secrets**: `GEMINI_API_KEY`, `GROQ_API_KEY` (+ optional ones).
   **Variables**: `ALLOWED_ORIGINS=https://<your-frontend>.vercel.app`.
4. The Dockerfile downloads the 354 MB ONNX detector at build time.

## Free-tier guard rails

Per-IP rate limit (`RATE_LIMIT_PER_IP`), a sliding-window RPM gate and a hard
daily counter (`GEMINI_DAILY_QUOTA`) sit in front of every LLM call; the API
answers 429/503 with a readable message instead of failing mid-analysis.
Upload caps: `MAX_IMAGE_MB`, `MAX_VIDEO_MB`, `MAX_VIDEO_SECONDS`.

The `Organika/sdxl-detector` model is CC-BY-NC-3.0 — non-commercial use only.
