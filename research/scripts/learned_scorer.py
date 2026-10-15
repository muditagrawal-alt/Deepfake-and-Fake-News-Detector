"""
Learned evidence scorer (research/protocols/round2_enhancements.md, Enhancement B).

Fits a logistic regression on the structured evidence the engine records for each item
(evidence_features in the run CSV, columns f_*) using a run on TRAINING items, then applies it
to a run of the same engine on TEST items. Writes a derived run, labelled as such, that
build_results.py and paper_tables.py read like any other:

  runs/<test-run with "__run1" replaced by "__scored__run1">.{csv,json}

The test items are never used for fitting. Features are fixed by the protocol.

  research/.venv/bin/python research/scripts/learned_scorer.py <train-run-stem> <test-run-stem>
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegressionCV
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "research" / "runs"
NUMERIC = ["p_fake", "f_n_corroborated", "f_n_contradicted", "f_n_misleading", "f_n_unverifiable",
           "f_n_observations", "f_n_anomalies", "f_n_sources_retrieved", "f_n_pages_read",
           "f_n_dropped_duplicate", "f_n_dropped_fact_check"]
GENRES = ["hard_news", "satire", "opinion", "press_release", "advertorial", "listicle", "personal_content",
          "entertainment", "other"]
TYPES = ["none", "false_text", "synthetic_or_edited_media", "media_text_mismatch"]


def features(df: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame(index=df.index)
    for c in NUMERIC:
        X[c] = pd.to_numeric(df.get(c, 0), errors="coerce").fillna(0.0)
    g = df.get("f_genre", pd.Series("", index=df.index)).fillna("")
    for v in GENRES:
        X[f"genre={v}"] = (g == v).astype(float)
    t = df.get("f_misinformation_type", pd.Series("", index=df.index)).fillna("")
    for v in TYPES:
        X[f"type={v}"] = (t == v).astype(float)
    d = pd.to_numeric(df.get("f_min_image_dhash_distance", np.nan), errors="coerce")
    X["image_match_missing"] = d.isna().astype(float)
    X["min_image_dhash_distance"] = d.fillna(64.0)
    return X


def main(train_stem: str, test_stem: str):
    tr = pd.read_csv(RUNS / f"{train_stem}.csv", dtype=str, keep_default_na=False)
    te = pd.read_csv(RUNS / f"{test_stem}.csv", dtype=str, keep_default_na=False)
    tm, sm = json.loads((RUNS / f"{train_stem}.json").read_text()), json.loads((RUNS / f"{test_stem}.json").read_text())
    for k in ("engine_tree", "model", "research_mode", "exclude_fact_checks"):
        if tm.get(k) != sm.get(k):
            sys.exit(f"train and test runs differ on {k}: {tm.get(k)} vs {sm.get(k)}")
    if set(tr["id"]) & set(te["id"]):
        sys.exit("training and test items overlap")
    tr = tr[tr.error == ""]
    y = (tr.ground_truth.str.upper() == "FAKE").astype(int).to_numpy()
    Xtr = features(tr)
    keep = [c for c in Xtr.columns if Xtr[c].std() > 0]          # drop constant columns
    scaler = StandardScaler().fit(Xtr[keep])
    clf = LogisticRegressionCV(Cs=10, cv=5, penalty="l2", scoring="neg_log_loss", max_iter=5000,
                               random_state=2026).fit(scaler.transform(Xtr[keep]), y)

    out = te.copy()
    ok = out.error == ""
    p = clf.predict_proba(scaler.transform(features(out[ok])[keep]))[:, 1]
    out.loc[ok, "p_fake"] = np.round(p, 4)
    out.loc[ok, "predicted"] = np.where(p >= 0.5, "FAKE", "REAL")
    out.loc[ok, "confidence"] = np.round(np.maximum(p, 1 - p), 4)
    out.loc[ok, "correct"] = (out.loc[ok, "predicted"] == out.loc[ok, "ground_truth"].str.upper()).astype(int)
    stem = test_stem.replace("__run1", "__scored__run1")
    out.to_csv(RUNS / f"{stem}.csv", index=False)
    coefs = dict(zip(keep, np.round(clf.coef_[0], 4).tolist()))
    sm.update({"run": stem, "scorer": {"type": "logistic regression (L2, C by 5-fold CV)", "C": float(clf.C_[0]),
                                       "trained_on": train_stem, "n_train": int(len(tr)), "features": keep,
                                       "coefficients_standardised": coefs, "intercept": float(clf.intercept_[0])},
               "accuracy_completed": round(float(out.loc[ok, "correct"].astype(int).mean()), 4)})
    (RUNS / f"{stem}.json").write_text(json.dumps(sm, indent=2))
    print(f"{stem}: accuracy {sm['accuracy_completed']} (raw engine {json.loads((RUNS / f'{test_stem}.json').read_text())['accuracy_completed']}); "
          f"top weights {sorted(coefs.items(), key=lambda kv: -abs(kv[1]))[:5]}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
