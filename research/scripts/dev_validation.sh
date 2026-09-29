#!/usr/bin/env bash
# v3.2 adoption protocol (research/protocols/v3.2_dev_validation.md): run one engine version on the
# three development sets with the local model. Called from the checkout that holds that version:
#   research/scripts/dev_validation.sh v3.1.1     (main)
#   research/scripts/dev_validation.sh v3.2       (engine-dev worktree)
set -u
cd "$(dirname "$0")/../.."
TAG=$1
PY=/Users/muditagrawal/Projects/Deepfake-and-Fake-News-Detector/backend/.venv/bin/python
LOG=research/runs/_dev_${TAG}.log
export LLM_ENGINE=ollama PIN_MODEL=true
for job in "mmfakebench val100 true" "mmsoc_politifact dev30 true" "celebdf_v2 dev20 false"; do
  set -- $job
  for attempt in 1 2 3 4; do
    echo "$(date '+%F %H:%M') $1/$2 attempt $attempt" >> $LOG
    EXCLUDE_FACT_CHECKS=$3 $PY research/scripts/run_eval.py --bench "$1" --split "$2" --tag "$TAG" --resume >> $LOG 2>&1
    m=$(ls -t research/runs/${1}__${2}__v3__ollama-*__${TAG}__run1.json 2>/dev/null | head -1)
    if [ -n "$m" ] && grep -q '"errors": 0' "$m"; then echo "$(date '+%F %H:%M') $1/$2 complete: $m" >> $LOG; break; fi
  done
done
echo "$(date '+%F %H:%M') all done" >> $LOG
