"""
Error analysis for v3 runs: one row per misclassified item with what the engine
saw and why it decided, so failure modes can be counted rather than guessed.

  research/.venv/bin/python research/scripts/error_analysis.py [run-stem ...]
With no arguments, every runs/*__v3__*.jsonl is analysed.
Writes results/error_analysis.csv (all runs) and prints a per-run summary.
"""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "research" / "runs"
OUT = ROOT / "research" / "results" / "error_analysis.csv"
LABEL = {"LIKELY_REAL": "REAL", "LIKELY_FAKE": "FAKE", "UNCERTAIN": "UNCERTAIN"}


def failure_mode(gt: str, pred: str, r: dict) -> str:
    """A descriptive tag for counting, derived from recorded fields only."""
    ev = r.get("evidence_features", {})
    if pred == "UNCERTAIN":
        return "abstained"
    if gt == "FAKE" and pred == "REAL":
        if ev.get("n_anomalies", 0) == 0:
            return "missed_fake:no_anomaly_observed"
        return "missed_fake:anomalies_observed_but_overruled"
    if gt == "REAL" and pred == "FAKE":
        if ev.get("n_contradicted", 0) + ev.get("n_misleading", 0) > 0:
            return "false_alarm:claims_judged_false"
        if ev.get("n_anomalies", 0) > 0:
            return "false_alarm:anomalies_on_real_media"
        return "false_alarm:other"
    return "other"


def main(stems: list[str]):
    files = [RUNS / f"{s}.jsonl" for s in stems] if stems else sorted(RUNS.glob("*__v3__*.jsonl"))
    rows = []
    for f in files:
        modes = Counter()
        n = wrong = 0
        for line in f.read_text(encoding="utf-8").splitlines():
            d = json.loads(line)
            r = d["result"]
            n += 1
            gt, pred = d["ground_truth"], LABEL[r["verdict"]]
            if pred == gt:
                continue
            wrong += 1
            mode = failure_mode(gt, pred, r)
            modes[mode] += 1
            obs = (r.get("analysis") or {}).get("observations", [])
            ret = r.get("forensics", {}).get("retrieval", {})
            rows.append({
                "run": f.stem, "key": d["key"], "ground_truth": gt, "predicted": pred,
                "confidence": r["confidence"], "failure_mode": mode,
                "anomalies": " | ".join(o["what"] for o in obs if o.get("anomaly"))[:600],
                "n_observations": len(obs),
                "claims": " | ".join(f"{c['status']}: {c['claim']}" for c in r.get("claims", []))[:600],
                "queries": " | ".join(ret.get("queries", [])),
                "n_sources": len(ret.get("sources", [])), "dropped": json.dumps(ret.get("dropped", {})),
                "c2pa": (r.get("evidence_features") or {}).get("c2pa_digital_source_types", ""),
                "reasoning": r.get("reasoning", "")[:800],
            })
        print(f"{f.stem}: {wrong}/{n} wrong", dict(modes))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]) if rows else ["run"]); w.writeheader(); w.writerows(rows)
    print(f"-> {OUT} ({len(rows)} rows)")


if __name__ == "__main__":
    main(sys.argv[1:])
