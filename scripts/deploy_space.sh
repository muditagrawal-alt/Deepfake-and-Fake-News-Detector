#!/usr/bin/env bash
# Push the backend/ folder to a Hugging Face Space (Gradio SDK, used as a
# plain Python runtime: it runs backend/app.py, which serves FastAPI).
#
#   1. Create the Space: https://huggingface.co/new-space  -> SDK: Gradio, hardware: CPU basic
#   2. Add secrets in Space Settings: GEMINI_API_KEY, GROQ_API_KEY (and optional ones)
#      Add variable: ALLOWED_ORIGINS=https://<your-app>.vercel.app,http://localhost:3000
#   3. ./scripts/deploy_space.sh <hf-username>/<space-name>
#
# Re-run after every backend change. Uses git subtree so the Space repo root == backend/.
set -euo pipefail
SPACE="${1:?usage: $0 <hf-username>/<space-name>}"
REMOTE="space"
URL="https://huggingface.co/spaces/${SPACE}"

cd "$(dirname "$0")/.."
git remote get-url "$REMOTE" >/dev/null 2>&1 || git remote add "$REMOTE" "$URL"
git remote set-url "$REMOTE" "$URL"

echo "Pushing backend/ -> $URL (branch main)"
git subtree split --prefix backend -b space-deploy >/dev/null
git push --force "$REMOTE" space-deploy:main
git branch -D space-deploy >/dev/null
echo "Done. Build logs: ${URL}/logs   API: https://$(echo "$SPACE" | tr '/' '-' | tr '[:upper:]' '[:lower:]').hf.space/health"
