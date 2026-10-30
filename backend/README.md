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
cp .env.example ../.env        # fill in GEMINI_API_KEY and BACKEND_TOKEN_SECRET
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
| POST | `/analyze/news` | bearer token + `{"url": "..."}` | `AnalysisResult` |
| POST | `/analyze/image` | bearer token + multipart `file`, optional `caption` | `AnalysisResult` |
| POST | `/analyze/video` | bearer token + multipart `file` | `202 {"job_id"}` → owner polls `/jobs/{id}` |
| GET | `/account` | bearer token | free uses and saved key-provider names |
| GET/DELETE | `/account/history` | bearer token | recent results / clear saved history |
| PATCH | `/account/preferences/history` | bearer token + `{"enabled": true}` | opt in/out; turning off clears saved results |
| POST | `/account/keys` | bearer token + provider/key JSON | save encrypted key |
| DELETE | `/account/keys/{provider}` | bearer token | delete saved key |

`AnalysisResult` = `verdict` (LIKELY_REAL / LIKELY_FAKE / UNCERTAIN), `confidence`,
`summary`, `reasoning`, `claims[]` (each with status + sources), `signals[]`,
`caveats[]`, `evidence[]`, `forensics{}`, `provenance{}`.

## Deploy to a Hugging Face Space

1. Create a Space → **Gradio** SDK, hardware **CPU basic**.
2. Push this `backend/` folder as the Space repo root:
   `./scripts/deploy_space.sh <user>/<space>` from the repository root.
3. Space **Settings → Secrets**: `GEMINI_API_KEY`, `BACKEND_TOKEN_SECRET`,
   `BYOK_ENCRYPTION_KEY`, and optional `GROQ_API_KEY` / `TAVILY_API_KEY`.
   Set `DATABASE_URL` to a PostgreSQL service for accounts, quota, saved keys and
   opt-in history. For Supabase Free on Render, use the shared Session pooler
   connection string (IPv4, port 5432); the Free database is 500 MB and projects
   may pause after a week of low activity. The local SQLite fallback is not
   persistent on ephemeral hosts.
   **Variables**: `ALLOWED_ORIGINS=https://<your-frontend>.vercel.app`, and optionally
   `FRONTEND_URL` so the service card links back to it.

The Space uses the **Gradio SDK as a runtime only**: it runs `python app.py` and
proxies the port, and `app.py` starts this FastAPI app. No Gradio interface is
served; the user interface is the separate Next.js deployment. ffmpeg is
pre-installed in that image, and `packages.txt` makes the dependency explicit.
The ONNX detector is off by default; it is fetched and warmed only if
`ENABLE_ONNX_DETECTOR=true`. It requires more memory than the free Space provides.

A `Dockerfile` is kept for hosts that support containers (Render, Railway, Fly, or a
Docker Space if you have one). It pre-downloads the detector at build time.

## Free-tier guard rails

Per-IP rate limit (`RATE_LIMIT_PER_IP`), a sliding-window RPM gate and a hard
daily counter (`GEMINI_DAILY_QUOTA`) sit in front of every LLM call; the API
answers 429/503 with a readable message instead of failing mid-analysis.
Upload caps: `MAX_IMAGE_MB`, `MAX_IMAGE_PIXELS`, `MAX_VIDEO_MB`, `MAX_VIDEO_SECONDS`.

The `Organika/sdxl-detector` model is CC-BY-NC-3.0 — non-commercial use only.
The three free detections are shared across all input types. After the limit,
Gemini or OpenRouter must be saved as a user key. All saved provider keys are
encrypted with AES-GCM using `BYOK_ENCRYPTION_KEY`; changing that secret makes
existing saved keys unreadable, so retain a secure backup when rotating secrets.
