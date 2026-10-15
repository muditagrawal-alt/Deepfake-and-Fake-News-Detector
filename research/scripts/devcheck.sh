#!/usr/bin/env bash
# Enhancement check (research/protocols/v3.2_dev_validation.md) on the news development sets, Gemini.
# Run from the checkout holding the engine version under test:  research/scripts/devcheck.sh <tag>
set -u
cd "$(dirname "$0")/../.."
TAG=$1
PY=/Users/muditagrawal/Projects/Deepfake-and-Fake-News-Detector/backend/.venv/bin/python
LOG=research/runs/_devcheck_${TAG}.log
export LLM_ENGINE=gemini PIN_MODEL=true EXCLUDE_FACT_CHECKS=true
for spec in mmsoc_politifact/dev30 mmsoc_gossipcop/dev30 liar/dev30; do
  b=${spec%/*}; sp=${spec#*/}
  for attempt in 1 2 3 4 5 6; do
    echo "$(date '+%F %H:%M') $spec attempt $attempt" >> $LOG
    $PY research/scripts/run_eval.py --bench $b --split $sp --tag $TAG --workers 3 --resume >> $LOG 2>&1
    m=$(ls -t research/runs/${b}__${sp}__v3__gemini-*__${TAG}__run1.json 2>/dev/null | head -1)
    if [ -n "$m" ] && grep -q '"errors": 0' "$m" && grep -q '"valid": true' "$m"; then echo "$(date '+%F %H:%M') $spec complete" >> $LOG; break; fi
    sleep 600
  done
done
echo "$(date '+%F %H:%M') all done" >> $LOG
