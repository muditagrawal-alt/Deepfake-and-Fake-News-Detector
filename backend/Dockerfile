FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    HF_HUB_DISABLE_TELEMETRY=1 HF_HOME=/tmp/hf-cache

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces run as uid 1000
RUN useradd -m -u 1000 user
WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY --chown=user . .

# Pre-download the ONNX detector so cold starts don't pay for 354 MB.
# Set --build-arg SKIP_MODEL=1 to skip (the app then downloads lazily on first use).
ARG SKIP_MODEL=1
RUN if [ "$SKIP_MODEL" = "0" ]; then python -c "from huggingface_hub import hf_hub_download; hf_hub_download('Organika/sdxl-detector','onnx/model.onnx',local_dir='/app/models')"; fi \
    && mkdir -p /app/tmp && chown -R user:user /app

USER user

# app.py reads $PORT (default 10000), so the same image runs on a Hugging Face
# Space, Google Cloud Run (PORT=8080), Render, Railway or Fly without changes.
ENV PORT=10000 ENABLE_ONNX_DETECTOR=false
EXPOSE 10000
CMD ["python", "app.py"]
