#!/usr/bin/env bash
# Drive a list of v3 runs to completion on one backend.
#   research/scripts/v3_runs.sh gemini "images:none videos:none images:img_norm512 videos:vid_strip videos:vid_strip_trim5" [run]
#   research/scripts/v3_runs.sh ollama "images:none" 1
# External benchmarks are written bench=NAME/SPLIT; conditions come from the
# environment (EXCLUDE_FACT_CHECKS, RESEARCH_MODE), e.g.
#   EXCLUDE_FACT_CHECKS=true research/scripts/v3_runs.sh ollama "bench=mmsoc_politifact/test bench=liar/test"
# For Gemini, waits while the pinned model is unavailable instead of recording
# outages as errors, and resumes each run until every item has completed.
set -u
cd "$(dirname "$0")/../.."
BACKEND=$1; PAIRS=$2; RUN=${3:-1}
PY=backend/.venv/bin/python
LOG=research/runs/_v3_${BACKEND}.log
export LLM_ENGINE=$BACKEND PIN_MODEL=true

healthy() {
  if [ "$BACKEND" = ollama ]; then
    curl -sf http://127.0.0.1:11434/api/tags >/dev/null; return $?
  fi
  $PY - <<'PYC' 2>/dev/null
import os, sys; sys.path.insert(0, "backend"); os.chdir("backend")
from google import genai
from google.genai import types
from detector.config import get_settings
s = get_settings()
try:
    client = genai.Client(api_key=s.gemini_api_key)   # keep a reference: the SDK closes unreferenced clients
    client.models.generate_content(
        model=s.gemini_primary_model, contents="Reply OK",
        config=types.GenerateContentConfig(max_output_tokens=16))
    sys.exit(0)
except Exception:
    sys.exit(1)
PYC
}

for pair in $PAIRS; do
  if [ "${pair#bench=}" != "$pair" ]; then
    spec=${pair#bench=}; bench=${spec%%/*}; split=${spec#*/}
    args=(--bench "$bench" --split "$split"); label="$bench/$split"; glob="${bench}__${split}__v3__${BACKEND}-*__none__*run${RUN}.json"
  else
    set_=${pair%%:*}; tf=${pair#*:}
    args=(--set "$set_" --transform "$tf"); label="$set_/$tf"; glob="${set_}__v3__${BACKEND}-*__${tf}__*run${RUN}.json"
  fi
  for attempt in 1 2 3 4 5 6 7 8; do
    until healthy; do echo "$(date '+%F %H:%M') $BACKEND unavailable; waiting 10 min" >> $LOG; sleep 600; done
    echo "$(date '+%F %H:%M') $label run$RUN attempt $attempt" >> $LOG
    $PY research/scripts/run_eval.py "${args[@]}" --run "$RUN" --resume >> $LOG 2>&1
    last=$(ls -t research/runs/$glob 2>/dev/null | head -1)
    if [ -n "$last" ] && grep -q '"valid": true' "$last" && grep -q '"errors": 0' "$last"; then
      echo "$(date '+%F %H:%M') $label complete: $last" >> $LOG; break
    fi
  done
done
echo "$(date '+%F %H:%M') all done" >> $LOG
