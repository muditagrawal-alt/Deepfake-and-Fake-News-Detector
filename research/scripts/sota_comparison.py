"""
Our results against published state of the art, benchmark by benchmark.

For every completed, valid run on an external benchmark, compute the metric the
reference reports (macro-F1, accuracy or AUC) with a bootstrap 95% interval over
items, and compare it with each reference row in results/sota_reference.csv for
that benchmark. A result "exceeds" a reference only when the whole interval is
above it, and "is below" only when the whole interval is below; otherwise the
comparison is inconclusive. The regime of each reference (zero-shot or
supervised) is carried through, because a zero-shot system beating a
zero-shot reference is a different claim from matching a trained one.

Metric caveats are listed per benchmark in NOTES and written to the CSV.

  research/.venv/bin/python research/scripts/sota_comparison.py
Writes results/sota_comparison.csv.
"""
import csv
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, roc_auc_score

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "research" / "runs"
RES = ROOT / "research" / "results"
RNG = np.random.default_rng(20260929)

# run set name -> reference benchmark name in sota_reference.csv
BENCH = {"mmsoc_politifact": "MM-Soc PolitiFact", "mmsoc_gossipcop": "MM-Soc GossipCop",
         "celebdf_v2": "Celeb-DF v2", "mmfakebench": "MMFakeBench"}
NOTES = {
    "MM-Soc GossipCop": "we score a fixed stratified 1,000 of the 2,672 test items",
    "Celeb-DF v2": "reference is frame-level AUC of a detector trained on FF++; ours is video-level, zero-shot, "
                   "on the official test list (or a stratified subset of it)",
    "MMFakeBench": "reference macro-F1 is 4-class; a binary system is compared only on the binary reference",
}


def metric(df: pd.DataFrame, name: str) -> float:
    y = (df.ground_truth == "FAKE").astype(int).to_numpy()
    pred = df.predicted.to_numpy()
    if name == "accuracy":
        return float((pred == df.ground_truth.to_numpy()).mean())
    if name == "macro-F1":
        # UNCERTAIN counts as wrong for both classes: map it to the label opposite the truth.
        yhat = np.where(pred == "FAKE", 1, np.where(pred == "REAL", 0, 1 - y))
        return float(f1_score(y, yhat, average="macro"))
    if name in ("AUC", "frame AUC"):
        s = pd.to_numeric(df.p_fake, errors="coerce").to_numpy()
        return float(roc_auc_score(y, s)) if len(set(y)) > 1 else float("nan")
    raise ValueError(name)


def boot(df: pd.DataFrame, name: str, n: int = 5000) -> tuple[float, float]:
    idx = np.arange(len(df))
    vals = [metric(df.iloc[RNG.choice(idx, len(idx))], name) for _ in range(n)]
    lo, hi = np.nanpercentile(vals, [2.5, 97.5])
    return float(lo), float(hi)


def main():
    ref = pd.read_csv(RES / "sota_reference.csv")
    rows = []
    for mf in sorted(RUNS.glob("*.json")):
        m = json.loads(mf.read_text())
        bench = BENCH.get(m.get("set", ""))
        if not bench or not (RUNS / f"{mf.stem}.csv").exists():
            continue
        df = pd.read_csv(RUNS / f"{mf.stem}.csv", dtype=str, keep_default_na=False)
        df = df[df.error == ""]
        valid = bool(m.get("valid")) and len(df) == m.get("n")
        system = f"tool: {m['tool']}" if m.get("engine") == "tool" else f"v3 {m['backend']} {m['model']}"
        for _, r in ref[ref.benchmark == bench].iterrows():
            name = r.metric
            if name not in ("accuracy", "macro-F1", "AUC", "frame AUC"):
                continue
            ours = metric(df, name)
            lo, hi = boot(df, name)
            verdict = "exceeds" if lo > r.score else "below" if hi < r.score else "inconclusive"
            rows.append({"benchmark": bench, "split": m.get("split"), "our_system": system, "run": mf.stem,
                         "run_valid_and_complete": valid, "n": len(df), "metric": name,
                         "ours": round(ours, 4), "ours_ci95_low": round(lo, 4), "ours_ci95_high": round(hi, 4),
                         "reference_method": r.method, "reference_score": r.score, "reference_regime": r.training,
                         "comparison": verdict, "note": NOTES.get(bench, "")})
    out = RES / "sota_comparison.csv"
    if rows:
        with open(out, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
        t = pd.DataFrame(rows)
        pd.set_option("display.width", 250)
        print(t[["benchmark", "our_system", "n", "metric", "ours", "ours_ci95_low", "ours_ci95_high",
                 "reference_method", "reference_score", "reference_regime", "comparison"]].to_string(index=False))
    print(f"-> {out} ({len(rows)} comparisons)")


if __name__ == "__main__":
    main()
