"""
Build every table the paper needs from the labelled per-item runs.

Inputs : research/runs/*.csv (one row per benchmark item, never edited by hand)
Outputs: research/results/
  benchmark_summary.csv    one row per run: accuracy + 95% Wilson CI, precision,
                           recall, F1 (FAKE = positive), specificity, balanced
                           accuracy, MCC, ROC-AUC, coverage, errors, validity
  confusion_matrices.csv   long format, including an UNCERTAIN column
  paired_tests.csv         exact McNemar tests + bootstrap CI of the accuracy
                           difference, for every pair evaluated on the same items
  run_registry.csv         what each run is, and what produced it
  benchmark_repeats.csv    mean and sd over repeated runs (run1..runN) of one configuration

v3 runs are discovered from their manifests (runs/*__v3__*.json); v1/v2 runs
are listed in REGISTRY. Pairs for v3 are generated: each control against the
same configuration on unmodified inputs, v3 against v1 on the same set, and
backends, retrieval modes and fact-check exclusion against each other.

Conventions (stated here so the paper can cite them):
  * FAKE is the positive class.
  * UNCERTAIN counts as an incorrect prediction for accuracy, and as a
    non-FAKE prediction for precision/recall; coverage reports how often the
    system committed to a label.
  * Items whose run raised an error are excluded from the metrics and counted
    in n_errors. A run with more than 5% errors is marked valid = False: it
    measures the provider, not the model.
  * ROC-AUC uses p_fake. For v2 runs p_fake is the stated confidence mapped to
    the FAKE direction (conf if FAKE, 1 - conf if REAL, 0.5 if UNCERTAIN).
"""
import csv
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import matthews_corrcoef, roc_auc_score
from statsmodels.stats.contingency_tables import mcnemar
from statsmodels.stats.proportion import proportion_confint

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "research" / "runs"
OUT = ROOT / "research" / "results"
RNG = np.random.default_rng(20260928)

# ---------------------------------------------------------------------------
# Run registry: every run the paper may cite, with a human description.
# ---------------------------------------------------------------------------
REGISTRY = [
    # set, system, config, file stem, description
    ("news", "v1", "as published", "news__v1__bert_satire_list__final",
     "BERT (jy46604790/Fake-News-Bert-Detect) + 2-domain satire list + rule fusion; paper's final result"),
    ("news", "v2", "pre satire rule", "news__v2__gemini35fl__pre_satire_rule__run1",
     "Gemini 3.5 Flash-Lite + web research; run BEFORE the deterministic satire rule was added"),
    ("images", "v1", "as published (LOO-CV)", "images__v1__sdxl_rf_calibrator_loocv__final",
     "sdxl-detector + 15 image statistics + width/height/aspect -> RandomForest, leave-one-out"),
    ("images", "v2", "detector on", "images__v2__gemini35fl__detector_on__run1",
     "Gemini 3.5 Flash-Lite vision + EXIF + sdxl-detector score"),
    ("images", "v2", "detector off", "images__v2__gemini35fl__detector_off__run1",
     "Gemini 3.5 Flash-Lite vision + EXIF, no pixel detector"),
    ("videos", "v1", "as published", "videos__v1__rules_metadata__final",
     "frame detector + audio + face ratio + ffprobe metadata keywords, two-stage rule fusion"),
    ("videos", "v1 (reproduced)", "original files", "videos__v1repro__rules_metadata__none",
     "faithful re-implementation of v1 video (ONNX detector); reproduces the published 30/30"),
    ("videos", "v1 (reproduced)", "metadata stripped", "videos__v1repro__rules_metadata__vid_strip",
     "same, container/stream metadata removed; decoded frames bit-identical"),
    ("videos", "v2", "detector on", "videos__v2__gemini35fl__detector_on__run1",
     "Gemini watches the clip with audio + ffprobe metadata + frame detector"),
    ("videos", "v2", "detector off", "videos__v2__gemini35fl__detector_off__run1",
     "as above without the frame detector"),
]

# Pairs evaluated on identical items (paired design -> McNemar).
# (The v2 control runs planned on 2026-09-28 were superseded by v3 and never run.)
PAIRS = [
    ("news", "news__v1__bert_satire_list__final", "news__v2__gemini35fl__pre_satire_rule__run1"),
    ("images", "images__v1__sdxl_rf_calibrator_loocv__final", "images__v2__gemini35fl__detector_off__run1"),
    ("images", "images__v2__gemini35fl__detector_on__run1", "images__v2__gemini35fl__detector_off__run1"),
    ("videos", "videos__v1repro__rules_metadata__none", "videos__v1repro__rules_metadata__vid_strip"),
    ("videos", "videos__v2__gemini35fl__detector_on__run1", "videos__v2__gemini35fl__detector_off__run1"),
]


def load(stem: str) -> pd.DataFrame | None:
    p = RUNS / f"{stem}.csv"
    if not p.exists():
        return None
    df = pd.read_csv(p, dtype=str).fillna("")
    df["ground_truth"] = df["ground_truth"].str.strip().str.upper()
    df["predicted"] = df["predicted"].str.strip().str.upper().str.replace("LIKELY ", "", regex=False)
    df.loc[~df["predicted"].isin(["FAKE", "REAL"]), "predicted"] = "UNCERTAIN"
    if "error" not in df:
        df["error"] = ""
    # A comparable score in the FAKE direction, where the run provides one.
    if "p_fake" in df and (df["p_fake"] != "").any():
        df["score"] = pd.to_numeric(df["p_fake"], errors="coerce")
    elif "calibrated_fake_probability" in df:
        df["score"] = pd.to_numeric(df["calibrated_fake_probability"], errors="coerce")
    elif "confidence" in df and (df["confidence"] != "").any():
        c = pd.to_numeric(df["confidence"], errors="coerce")
        df["score"] = np.where(df["predicted"] == "FAKE", c, np.where(df["predicted"] == "REAL", 1 - c, 0.5))
    else:
        df["score"] = np.nan
    # Join on the item itself, never on "id": the image benchmark assigns
    # img_026 to both a real and a fake image (generate_image_metadata.py
    # numbered files by directory position, counting .DS_Store).
    src = next(c for c in ("url", "input", "item", "filename", "path") if c in df and (df[c] != "").all())
    base = df[src].astype(str).map(lambda v: v if v.startswith("http") else Path(v).name)
    df["key"] = base.str.lower().str.replace(r"\.(jpe?g|png|webp|mp4)$", "", regex=True).str.replace(r"[^a-z0-9]", "", regex=True)
    if df["key"].duplicated().any():
        raise ValueError(f"non-unique item keys in run: {df.loc[df['key'].duplicated(), 'key'].tolist()}")
    return df


def metrics(df: pd.DataFrame) -> dict:
    ok = df[df["error"] == ""]
    n, n_err = len(ok), len(df) - len(ok)
    y = (ok["ground_truth"] == "FAKE").astype(int).to_numpy()
    pred = ok["predicted"].to_numpy()
    correct = (pred == ok["ground_truth"].to_numpy())
    tp = int(((pred == "FAKE") & (y == 1)).sum()); fp = int(((pred == "FAKE") & (y == 0)).sum())
    fn = int(((pred != "FAKE") & (y == 1)).sum()); tn_strict = int(((pred == "REAL") & (y == 0)).sum())
    unc = int((pred == "UNCERTAIN").sum())
    acc = correct.mean() if n else float("nan")
    lo, hi = proportion_confint(int(correct.sum()), n, alpha=0.05, method="wilson") if n else (float("nan"),) * 2
    prec = tp / (tp + fp) if tp + fp else float("nan")
    rec = tp / (tp + fn) if tp + fn else float("nan")
    f1 = 2 * prec * rec / (prec + rec) if prec and rec and not math.isnan(prec + rec) else float("nan")
    # REAL as the positive class, for macro-F1 (the metric MM-Soc and MMFakeBench report).
    tp_r = int(((pred == "REAL") & (y == 0)).sum()); fp_r = int(((pred == "REAL") & (y == 1)).sum())
    fn_r = int(((pred != "REAL") & (y == 0)).sum())
    prec_r = tp_r / (tp_r + fp_r) if tp_r + fp_r else 0.0
    rec_r = tp_r / (tp_r + fn_r) if tp_r + fn_r else 0.0
    f1_r = 2 * prec_r * rec_r / (prec_r + rec_r) if prec_r + rec_r else 0.0
    macro = (0.0 if math.isnan(f1) else f1) / 2 + f1_r / 2
    spec = tn_strict / int((y == 0).sum()) if (y == 0).any() else float("nan")
    bal = (rec + spec) / 2 if not math.isnan(rec + spec) else float("nan")
    yhat = (pred == "FAKE").astype(int)
    mcc = matthews_corrcoef(y, yhat) if len(set(y)) > 1 else float("nan")
    s = ok["score"].to_numpy(dtype=float)
    auc = roc_auc_score(y, s) if len(set(y)) > 1 and not np.isnan(s).any() and len(set(s)) > 1 else float("nan")
    return {
        "n": n, "n_errors": n_err, "valid": n_err <= 0.05 * len(df),
        "coverage": round(1 - unc / n, 4) if n else float("nan"),
        "accuracy": round(acc, 4), "acc_ci95_low": round(lo, 4), "acc_ci95_high": round(hi, 4),
        "precision_fake": round(prec, 4), "recall_fake": round(rec, 4), "f1_fake": round(f1, 4),
        "f1_real": round(f1_r, 4), "macro_f1": round(macro, 4),
        "specificity": round(spec, 4), "balanced_accuracy": round(bal, 4), "mcc": round(mcc, 4),
        "roc_auc": round(auc, 4) if not math.isnan(auc) else "",
        "tp": tp, "fp": fp, "fn": fn, "tn": tn_strict, "uncertain": unc,
    }


def paired(a: pd.DataFrame, b: pd.DataFrame) -> dict:
    m = a[a["error"] == ""].merge(b[b["error"] == ""], on="key", suffixes=("_a", "_b"))
    ca = (m["predicted_a"] == m["ground_truth_a"]).to_numpy()
    cb = (m["predicted_b"] == m["ground_truth_b"]).to_numpy()
    b01, b10 = int((ca & ~cb).sum()), int((~ca & cb).sum())
    table = [[int((ca & cb).sum()), b01], [b10, int((~ca & ~cb).sum())]]
    p = mcnemar(table, exact=True).pvalue if b01 + b10 else 1.0
    diffs = []
    idx = np.arange(len(m))
    for _ in range(10000):
        s = RNG.choice(idx, size=len(idx), replace=True)
        diffs.append(cb[s].mean() - ca[s].mean())
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    return {"n_paired": len(m), "acc_a": round(ca.mean(), 4), "acc_b": round(cb.mean(), 4),
            "diff_b_minus_a": round(cb.mean() - ca.mean(), 4),
            "diff_ci95_low": round(lo, 4), "diff_ci95_high": round(hi, 4),
            "a_right_b_wrong": b01, "a_wrong_b_right": b10,
            "mcnemar_exact_p": round(p, 4), "significant_at_0.05": p < 0.05}


V1_BASELINE = {  # v3 transform -> the v1 run on the same inputs
    ("news", "none"): "news__v1__bert_satire_list__final",
    ("images", "none"): "images__v1__sdxl_rf_calibrator_loocv__final",
    ("videos", "none"): "videos__v1repro__rules_metadata__none",
    ("videos", "vid_strip"): "videos__v1repro__rules_metadata__vid_strip",
}


def discover_v3() -> tuple[list, list]:
    """Registry rows and pairs for every v3 run with a manifest."""
    reg, runs = [], []
    for mf in sorted(list(RUNS.glob("*__v3__*.json")) + list(RUNS.glob("*__tool__*.json"))):
        m = json.loads(mf.read_text())
        if m.get("engine") == "tool":
            set_ = m["set"] + (f"/{m['split']}" if m.get("split") else "")
            system = f"tool: {m['tool']} ({m['model']})"
            reg.append((set_, system, m["transform"], mf.stem, f"existing detector used as released, threshold 0.5; commit {m['git_commit']}"))
            runs.append({"stem": mf.stem, "set": set_, "base": m["set"], "system": system, "transform": m["transform"],
                         "mode": "tool", "fc": False, "backend": "tool", "run": "1", "config": m["transform"]})
            continue
        flags = [m.get("research_mode", "open")] + (["fact-checks excluded"] if m.get("exclude_fact_checks") else []) \
            + (["blocklist"] if m.get("search_blocklist") else [])
        system = f"v3 ({m['backend']} {m['model']})"
        config = f"{m['transform']}; " + ", ".join(flags)
        set_ = m["set"] + (f"/{m['split']}" if m.get("split") else "")
        desc = (f"engine tree {m.get('engine_tree', '?')}, commit {m['git_commit']}; {m['n']} items; "
                f"researcher {m.get('researcher')}; power {m.get('power', {})}")
        stem = mf.stem
        reg.append((set_, system, config, stem, desc))
        run_idx = stem.rsplit("__run", 1)[-1]
        runs.append({"stem": stem, "set": set_, "base": m["set"], "system": system, "transform": m["transform"],
                     "mode": m.get("research_mode", "open"), "fc": bool(m.get("exclude_fact_checks")),
                     "backend": m["backend"], "run": run_idx, "config": config})
    pairs = []
    for r in runs:
        for o in runs:
            if o is r or o["set"] != r["set"] or o["run"] != r["run"]:
                continue
            same = lambda *ks: all(o[k] == r[k] for k in ks)
            if "tool" in (r["backend"], o["backend"]):
                # engine vs tool on the same inputs (tool as system a)
                if r["backend"] == "tool" and o["backend"] != "tool" and r["transform"] == o["transform"]:
                    pairs.append((r["set"], r["stem"], o["stem"]))
                continue
            if r["transform"] == "none" and o["transform"] != "none" and same("system", "mode", "fc"):
                pairs.append((r["set"], r["stem"], o["stem"]))           # control effect
            elif same("transform", "mode", "fc") and r["backend"] < o["backend"]:
                pairs.append((r["set"], r["stem"], o["stem"]))           # backend comparison
            elif same("system", "transform", "fc") and r["mode"] == "open" and o["mode"] == "closed":
                pairs.append((r["set"], r["stem"], o["stem"]))           # retrieval on vs off
            elif same("system", "transform", "mode") and not r["fc"] and o["fc"]:
                pairs.append((r["set"], r["stem"], o["stem"]))           # fact-check exclusion
        v1 = V1_BASELINE.get((r["base"], r["transform"]))
        if v1 and r["run"] == "1" and r["backend"] != "tool":
            pairs.append((r["set"], v1, r["stem"]))
    return reg, pairs


def repeats(summary: list[dict]) -> list[dict]:
    groups = {}
    for s in summary:
        if s["system"].startswith("v3"):
            groups.setdefault((s["set"], s["system"], s["configuration"]), []).append(s)
    out = []
    for (set_, system, config), rows in sorted(groups.items()):
        acc = np.array([r["accuracy"] for r in rows], dtype=float)
        mf1 = np.array([r["macro_f1"] for r in rows], dtype=float)
        out.append({"set": set_, "system": system, "configuration": config, "runs": len(rows),
                    "accuracy_mean": round(acc.mean(), 4), "accuracy_sd": round(acc.std(ddof=1), 4) if len(rows) > 1 else "",
                    "macro_f1_mean": round(mf1.mean(), 4), "macro_f1_sd": round(mf1.std(ddof=1), 4) if len(rows) > 1 else "",
                    "all_valid": all(r["valid"] for r in rows)})
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    summary, cms, reg = [], [], []
    frames = {}
    v3_reg, v3_pairs = discover_v3()
    REGISTRY.extend(v3_reg)
    PAIRS.extend(v3_pairs)
    for set_, system, config, stem, desc in REGISTRY:
        df = load(stem)
        manifest = RUNS / f"{stem}.json"
        reg.append({"set": set_, "system": system, "configuration": config, "run_file": f"{stem}.csv",
                    "present": df is not None, "description": desc,
                    "manifest": manifest.name if manifest.exists() else ""})
        if df is None:
            continue
        frames[stem] = df
        m = metrics(df)
        summary.append({"set": set_, "system": system, "configuration": config, **m, "run_file": f"{stem}.csv",
                        "run": stem.rsplit("__run", 1)[-1] if "__run" in stem else ""})
        ok = df[df["error"] == ""]
        for gt in ("FAKE", "REAL"):
            for pr in ("FAKE", "REAL", "UNCERTAIN"):
                cms.append({"set": set_, "system": system, "configuration": config, "true": gt, "predicted": pr,
                            "count": int(((ok["ground_truth"] == gt) & (ok["predicted"] == pr)).sum())})

    tests = []
    for set_, a, b in PAIRS:
        if a in frames and b in frames:
            label = lambda s: next(f"{sy} [{c}]" for st, sy, c, stem, _ in REGISTRY if stem == s)
            tests.append({"set": set_, "system_a": label(a), "system_b": label(b), **paired(frames[a], frames[b])})

    def write(name, rows):
        if not rows:
            return
        with open(OUT / name, "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    write("benchmark_summary.csv", summary)
    write("confusion_matrices.csv", cms)
    write("paired_tests.csv", tests)
    write("run_registry.csv", reg)
    write("benchmark_repeats.csv", repeats(summary))

    pd.set_option("display.width", 220)
    s = pd.DataFrame(summary)
    print(s[["set", "system", "configuration", "n", "n_errors", "accuracy", "acc_ci95_low", "acc_ci95_high",
             "recall_fake", "specificity", "macro_f1", "mcc", "roc_auc", "valid"]].to_string(index=False))
    print()
    if tests:
        t = pd.DataFrame(tests)
        print(t[["set", "system_a", "system_b", "n_paired", "acc_a", "acc_b", "diff_b_minus_a",
                 "diff_ci95_low", "diff_ci95_high", "mcnemar_exact_p", "significant_at_0.05"]].to_string(index=False))
    missing = [r["run_file"] for r in reg if not r["present"]]
    if missing:
        print("\nnot yet available (pending runs):", ", ".join(missing))


if __name__ == "__main__":
    main()
