"""
Paper tables: every result the revised paper reports, gathered into clearly
labelled CSVs under research/results/paper/, with a README describing each file.

Reads only per-item run files (research/runs/*.csv) and their manifests; every
number traces to a run. Round 1 = baseline engine (v3.1.x), Round 2 = enhanced
engine; both are evaluated on the same fixed test subsets.

  research/.venv/bin/python research/scripts/paper_tables.py
"""
import csv
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, roc_auc_score
from statsmodels.stats.contingency_tables import mcnemar
from statsmodels.stats.proportion import proportion_confint

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "research" / "runs"
SPLITS = ROOT / "research" / "splits"
OUT = ROOT / "research" / "results" / "paper"
RNG = np.random.default_rng(20261015)

# The paper's benchmarks: (set, split) -> display name. Reviewer-named benchmarks only.
BENCH = {
    ("mmsoc_politifact", "test"): "FakeNewsNet-PolitiFact (MM-Soc test, 102)",
    ("mmsoc_gossipcop", "test300"): "FakeNewsNet-GossipCop (300 of MM-Soc test)",
    ("liar", "test300"): "LIAR (300 of test)",
    ("ffpp_c23", "test200"): "FaceForensics++ c23 (200 of test)",
}
# Published references comparable in task and split (results/sota_reference.csv rows, by benchmark name).
SOTA_NAME = {"mmsoc_politifact": "MM-Soc PolitiFact", "mmsoc_gossipcop": "MM-Soc GossipCop",
             "ffpp_c23": "FaceForensics++ (c23)"}


def load_run(stem: str) -> pd.DataFrame:
    df = pd.read_csv(RUNS / f"{stem}.csv", dtype=str, keep_default_na=False)
    df["ground_truth"] = df["ground_truth"].str.upper()
    df["predicted"] = df["predicted"].str.upper()
    return df


def metrics(df: pd.DataFrame) -> dict:
    ok = df[df["error"] == ""]
    y = (ok["ground_truth"] == "FAKE").astype(int).to_numpy()
    pred = ok["predicted"].to_numpy()
    n = len(ok)
    k = int((pred == ok["ground_truth"].to_numpy()).sum())
    lo, hi = proportion_confint(k, n, method="wilson") if n else (math.nan, math.nan)
    yhat = np.where(pred == "FAKE", 1, np.where(pred == "REAL", 0, 1 - y))   # UNCERTAIN counts as wrong
    macro = f1_score(y, yhat, average="macro") if n else math.nan
    boots = []
    for _ in range(2000):
        i = RNG.integers(0, n, n)
        boots.append(f1_score(y[i], yhat[i], average="macro"))
    mlo, mhi = np.percentile(boots, [2.5, 97.5]) if n else (math.nan, math.nan)
    s = pd.to_numeric(ok["p_fake"], errors="coerce").to_numpy()
    auc = roc_auc_score(y, s) if n and len(set(y)) > 1 and not np.isnan(s).any() else math.nan
    rec = lambda lab: float(((pred == lab) & (ok["ground_truth"].to_numpy() == lab)).sum() / max((ok["ground_truth"] == lab).sum(), 1))
    return {"n_scored": n, "n_errors": len(df) - n, "accuracy": round(k / n, 4) if n else math.nan,
            "acc_ci95": f"[{lo:.3f}, {hi:.3f}]", "macro_f1": round(macro, 4), "macro_f1_ci95": f"[{mlo:.3f}, {mhi:.3f}]",
            "auc": round(auc, 4) if not math.isnan(auc) else "", "fake_recall": round(rec("FAKE"), 4),
            "real_recall": round(rec("REAL"), 4), "uncertain": int((pred == "UNCERTAIN").sum())}


def engine_runs() -> list[dict]:
    """Manifests of engine runs on the paper's benchmarks, merged shards included, shards themselves excluded."""
    out = []
    for mf in sorted(RUNS.glob("*__v3__*.json")):
        if "__shard" in mf.stem:
            continue
        m = json.loads(mf.read_text())
        if (m.get("set"), m.get("split")) not in BENCH or not m.get("round"):
            continue
        out.append({"stem": mf.stem, **m})
    return out


def subset_ids(set_, split) -> list[str]:
    return (SPLITS / f"{set_}__{split}.txt").read_text().split()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    runs = engine_runs()
    main_rows, pairs, ablation, sota_rows, tool_rows, cost_rows = [], [], [], [], [], []
    frames = {}
    for m in runs:
        df = load_run(m["stem"])
        frames[m["stem"]] = df
        cond = "with web search" if m["research_mode"] == "open" else "without web search (closed-book)"
        if m.get("scorer"):
            cond += f" + learned evidence scorer (trained on {m['scorer']['n_train']} training items)"
        row = {"benchmark": BENCH[(m["set"], m["split"])], "round": m["round"], "engine_version": m.get("engine_version"),
               "condition": cond, "model": m["model"], **metrics(df), "valid_run": m.get("valid"),
               "run_file": f"runs/{m['stem']}.csv", "engine_tree": m.get("engine_tree"), "git_commit": m.get("git_commit"),
               "finished_utc": m.get("finished_utc")}
        main_rows.append(row)
        costs = pd.to_numeric(df.get("cost_inr", pd.Series(dtype=float)), errors="coerce")
        secs = pd.to_numeric(df["seconds"], errors="coerce")
        cost_rows.append({"benchmark": row["benchmark"], "round": m["round"], "condition": cond, "items": len(df),
                          "cost_inr_total": round(costs.sum(), 2), "cost_inr_per_item": round(costs.mean(), 3),
                          "seconds_per_item_median": round(secs.median(), 1)})

    # Round 1 vs Round 2 on the same items and condition.
    by_key = {}
    for m in runs:
        if m.get("scorer"):
            continue          # scored runs are compared through table1/table3; table2 pairs raw engine rounds
        by_key.setdefault((m["set"], m["split"], m["research_mode"]), {})[m["round"]] = m["stem"]
    for (set_, split, mode), rounds in by_key.items():
        if 1 in rounds and 2 in rounds:
            a, b = frames[rounds[1]], frames[rounds[2]]
            j = a[a.error == ""].merge(b[b.error == ""], on="id", suffixes=("_1", "_2"))
            c1 = (j.predicted_1 == j.ground_truth_1).to_numpy(); c2 = (j.predicted_2 == j.ground_truth_2).to_numpy()
            b12, b21 = int((c1 & ~c2).sum()), int((~c1 & c2).sum())
            p = mcnemar([[int((c1 & c2).sum()), b12], [b21, int((~c1 & ~c2).sum())]], exact=True).pvalue if b12 + b21 else 1.0
            pairs.append({"benchmark": BENCH[(set_, split)], "condition": "with web search" if mode == "open" else "closed-book",
                          "n_paired": len(j), "round1_accuracy": round(c1.mean(), 4), "round2_accuracy": round(c2.mean(), 4),
                          "difference": round(c2.mean() - c1.mean(), 4), "round1_right_round2_wrong": b12,
                          "round1_wrong_round2_right": b21, "mcnemar_exact_p": round(p, 4), "significant_0.05": p < 0.05})
        # External verification ablation: open vs closed within a round.
    for set_, split in BENCH:
        for rnd in (1, 2):
            o = by_key.get((set_, split, "open"), {}).get(rnd)
            c = by_key.get((set_, split, "closed"), {}).get(rnd)
            if o and c:
                a, b = frames[c], frames[o]
                j = a[a.error == ""].merge(b[b.error == ""], on="id", suffixes=("_closed", "_open"))
                cc = (j.predicted_closed == j.ground_truth_closed).to_numpy(); co = (j.predicted_open == j.ground_truth_open).to_numpy()
                b1, b2 = int((cc & ~co).sum()), int((~cc & co).sum())
                p = mcnemar([[int((cc & co).sum()), b1], [b2, int((~cc & ~co).sum())]], exact=True).pvalue if b1 + b2 else 1.0
                ablation.append({"benchmark": BENCH[(set_, split)], "round": rnd, "n_paired": len(j),
                                 "accuracy_closed_book": round(cc.mean(), 4), "accuracy_with_web_search": round(co.mean(), 4),
                                 "gain_from_external_verification": round(co.mean() - cc.mean(), 4),
                                 "mcnemar_exact_p": round(p, 4)})

    # Published references (like-for-like only; see results/sota_comparison.csv for the CI-based verdicts).
    ref = pd.read_csv(ROOT / "research" / "results" / "sota_reference.csv")
    for r in main_rows:
        set_ = next(k[0] for k, v in BENCH.items() if v == r["benchmark"])
        for _, s in ref[ref.benchmark == SOTA_NAME.get(set_, "")].iterrows():
            ours = r["macro_f1"] if s.metric == "macro-F1" else r["accuracy"] if s.metric == "accuracy" else r["auc"] if "AUC" in s.metric else None
            if ours in (None, ""):
                continue
            sota_rows.append({"benchmark": r["benchmark"], "round": r["round"], "condition": r["condition"],
                              "metric": s.metric, "ours": ours,
                              "ours_ci95": r["macro_f1_ci95"] if s.metric == "macro-F1" else r["acc_ci95"] if s.metric == "accuracy" else "",
                              "reference": s.score, "reference_method": s.method, "reference_regime": s.training,
                              "reference_source": s.source, "note": "reference on the full test split; ours on the fixed subset"
                              if "300" in r["benchmark"] or "200" in r["benchmark"] else ""})

    # Existing tools (and v1's news model) on exactly the same items.
    for (set_, split), name in BENCH.items():
        ids = set(subset_ids(set_, split))
        for tf in sorted(RUNS.glob(f"{set_}__*__tool__*.json")):
            tm = json.loads(tf.read_text())
            df = load_run(tf.stem)
            df = df[df["id"].isin(ids)]
            if len(df) < len(ids) * 0.95:
                continue
            tool_rows.append({"benchmark": name, "system": f"existing tool: {tm['model']}", **metrics(df),
                              "run_file": f"runs/{tf.stem}.csv", "note": "filtered to the paper's subset" if tm.get("split") != split else ""})

    def write(fname, rows):
        if rows:
            with open(OUT / fname, "w", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    write("table1_main_results.csv", main_rows)
    write("table2_round1_vs_round2.csv", pairs)
    write("table3_sota_comparison.csv", sota_rows)
    write("table4_external_verification_ablation.csv", ablation)
    write("table5_existing_tools_same_items.csv", tool_rows)
    write("table6_cost_and_latency.csv", cost_rows)
    print(f"{len(main_rows)} engine runs, {len(pairs)} round comparisons, {len(ablation)} ablations, "
          f"{len(sota_rows)} SOTA rows, {len(tool_rows)} tool rows -> {OUT}")


if __name__ == "__main__":
    main()
