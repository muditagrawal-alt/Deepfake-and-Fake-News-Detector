#!/usr/bin/env bash
# Keep the Mac awake (idle and system sleep) while benchmark jobs run.
# Stops by itself after 3 h with no benchmark process, or after 48 h, whichever comes first.
caffeinate -is &
CPID=$!
trap 'kill $CPID 2>/dev/null' EXIT
echo "caffeinate started (pid $CPID) at $(date '+%F %H:%M')"
idle=0; start=$(date +%s)
while kill -0 $CPID 2>/dev/null; do
  sleep 300
  if pgrep -f "run_eval.py|v3_runs.sh|devcheck.sh|baselines_tools.py|learned_scorer.py" >/dev/null; then idle=0; else idle=$((idle + 300)); fi
  if [ $idle -ge 10800 ]; then echo "no benchmark job for 3 h: stopping caffeinate at $(date '+%F %H:%M')"; break; fi
  if [ $(( $(date +%s) - start )) -ge 172800 ]; then echo "48 h limit reached: stopping caffeinate"; break; fi
done
