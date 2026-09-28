#!/usr/bin/env bash
# Run the confound-control experiments once the primary model is healthy.
# Waits out provider overload instead of recording outages as model errors,
# and resumes each run until every item has completed (or attempts run out).
set -u
cd "$(dirname "$0")/../.."
PY=backend/.venv/bin/python
LOG=research/runs/_controlled_runs.log

healthy() {
  $PY - <<'PYC' 2>/dev/null
import os, sys; sys.path.insert(0, "backend"); os.chdir("backend")
from google import genai
from google.genai import types
from detector.config import get_settings
s = get_settings()
try:
    genai.Client(api_key=s.gemini_api_key).models.generate_content(
        model=s.gemini_primary_model, contents="Reply OK",
        config=types.GenerateContentConfig(max_output_tokens=5))
    sys.exit(0)
except Exception:
    sys.exit(1)
PYC
}

run_until_complete() {  # $1 set  $2 transform  $3 sleep
  for attempt in 1 2 3 4 5 6 7 8; do
    until healthy; do echo "$(date +%H:%M) primary model unavailable; waiting 10 min" >> $LOG; sleep 600; done
    echo "$(date +%H:%M) $1/$2 attempt $attempt" >> $LOG
    $PY -u research/scripts/run_v2_eval.py --set "$1" --transform "$2" --sleep "$3" --resume >> $LOG 2>&1
    csv=$(ls -t research/runs/${1}__v2__*__${2}__run1.csv 2>/dev/null | head -1)
    [ -n "$csv" ] || continue
    errs=$($PY -c "import csv,sys; print(sum(1 for r in csv.DictReader(open('$csv')) if r['error']))")
    echo "$(date +%H:%M) $1/$2: $errs items still failing" >> $LOG
    [ "$errs" = "0" ] && return 0
    sleep 300
  done
  return 1
}

run_until_complete images img_norm512 2
run_until_complete videos vid_strip 4
echo "$(date +%H:%M) CONTROLLED RUNS COMPLETE" >> $LOG
