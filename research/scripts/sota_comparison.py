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
         "celebdf_v2": "Celeb-DF v2", "mmfakebench": "MMFakeBench", "ffpp_c23": "FaceForensics++ (c23)"}
NOTES = {
    "MM-Soc GossipCop": "we score a fixed stratified 1,000 of the 2,672 test items",
    "Celeb-DF v2": "reference is frame-level AUC of a detector trained on FF++; ours is video-level, zero-shot, "
                   "on the official test list (or a stratified subset of it)",
    "FaceForensics++ (c23)": "reference is in-domain (trained and tested on FF++), frame-level AUC; ours is "
                             "zero-shot and video-level on the official test split (or a subset)",
    "MMFakeBench": "4-class references are compared only with a system that outputs the misinformation type; "
                   "the binary reference (F1, fake positive) is on the validation split, so only validation runs "
                   "are compared with it, and those are development data for any engine version developed on them",
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
    if name == "F1":           # binary, FAKE positive (MMFakeBench Table 3a)
        yhat = (pred == "FAKE").astype(int)
        return float(f1_score(y, yhat))
    if name == "macro-F1 (4-class)":
        return float(f1_score(df.label_orig, df.type_pred, average="macro"))
    if name in ("AUC", "frame AUC"):
        s = pd.to_numeric(df.p_fake, errors="coerce").to_numpy()
        return float(roc_auc_score(y, s)) if len(set(y)) > 1 else float("nan")
    raise ValueError(name)


def boot(df: pd.DataFrame, name: str, n: int = 5000) -> tuple[float, float]:
    idx = np.arange(len(df))
    vals = [metric(df.iloc[RNG.choice(idx, len(idx))], name) for _ in range(n)]
    lo, hi = np.nanpercentile(vals, [2.5, 97.5])
    return float(lo), float(hi)


TYPE_MAP = {"none": "original", "false_text": "textual_veracity_distortion",
            "synthetic_or_edited_media": "visual_veracity_distortion", "media_text_mismatch": "mismatch"}


def applicable(bench: str, ref_row, split: str | None) -> str | None:
    """The metric name to compute for this reference, or None if the comparison does not apply."""
    if bench != "MMFakeBench":
        return ref_row.metric if ref_row.metric in ("accuracy", "macro-F1", "AUC", "frame AUC") else None
    on_val = "validation" in ref_row.split_or_protocol
    if on_val != bool(split and split.startswith("val")):
        return None
    if "4-class" in ref_row.task:
        return "macro-F1 (4-class)" if ref_row.metric == "macro-F1" else None
    return "F1" if ref_row.metric == "F1" else None


def with_types(stem: str, df: pd.DataFrame) -> pd.DataFrame | None:
    """Attach the engine's misinformation_type as an MMFakeBench class, if the run recorded it."""
    jl = RUNS / f"{stem}.jsonl"
    if not jl.exists():
        return None
    types = {}
    for line in jl.read_text().splitlines():
        d = json.loads(line)
        t = d["result"].get("misinformation_type")
        if t is None:
            return None
        v = d["result"]["verdict"]
        types[d["key"].split("|")[0]] = "original" if v != "LIKELY_FAKE" else TYPE_MAP.get(t, "mismatch")
    out = df.copy()
    out["type_pred"] = out["id"].map(types)
    return out.dropna(subset=["type_pred"])


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
            name = applicable(bench, r, m.get("split"))
            if name is None:
                continue
            data = df
            if name == "macro-F1 (4-class)":
                data = with_types(mf.stem, df)
                if data is None:
                    continue
                if "label_orig" not in data:
                    continue
            ours = metric(data, name)
            lo, hi = boot(data, name)
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
