#!/usr/bin/env bash
# Queued after controlled_runs.sh: the duration-controlled video run.
set -u
cd "$(dirname "$0")/../.."
while pgrep -f "research/scripts/controlled_runs.sh" >/dev/null; do sleep 60; done
source research/scripts/_health.sh 2>/dev/null || true
PY=backend/.venv/bin/python; LOG=research/runs/_controlled_runs.log
for attempt in 1 2 3 4 5 6 7 8; do
  echo "$(date +%H:%M) videos/vid_strip_trim5 attempt $attempt" >> $LOG
  $PY -u research/scripts/run_v2_eval.py --set videos --transform vid_strip_trim5 --sleep 4 --resume >> $LOG 2>&1
  csv=$(ls -t research/runs/videos__v2__*__vid_strip_trim5__run1.csv 2>/dev/null | head -1)
  [ -n "$csv" ] || { sleep 600; continue; }
  errs=$($PY -c "import csv; print(sum(1 for r in csv.DictReader(open('$csv')) if r['error']))")
  echo "$(date +%H:%M) videos/vid_strip_trim5: $errs items still failing" >> $LOG
  [ "$errs" = "0" ] && break
  sleep 600
done
echo "$(date +%H:%M) FOLLOW-UP RUN COMPLETE" >> $LOG
