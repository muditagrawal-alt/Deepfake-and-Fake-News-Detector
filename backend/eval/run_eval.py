"""
Re-run the benchmark sets from data/evaluation/<modality>/metadata.csv through
the new pipeline and write results + metrics next to the old ones.

  python -m eval.run_eval --modality news
  python -m eval.run_eval --modality image
  python -m eval.run_eval --modality video
  python -m eval.run_eval --modality image --limit 5      # quick check

Runs sequentially (free-tier RPM). Results go to
data/evaluation/<modality>/results_v2.csv and metrics_v2.txt.
"""
import argparse
import asyncio
import csv
import json
import re
import time
from pathlib import Path

from detector.config import REPO_ROOT
from detector.pipeline import analyze, legacy_verdict
from detector.services import get_services

EVAL_ROOT = REPO_ROOT / "data" / "evaluation"


def read_rows(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(line for line in fh if line.strip() and not line.lstrip().startswith("#")))


def resolve_image(p: str) -> Path | None:
    cand = REPO_ROOT / p.strip()
    if cand.exists():
        return cand
    parent = cand.parent
    if parent.exists():
        want = re.sub(r"[^a-z0-9]", "", cand.name.lower())
        for child in parent.iterdir():
            if re.sub(r"[^a-z0-9]", "", child.name.lower()) == want:
                return child
    return None


def resolve_video(filename: str) -> Path | None:
    want = tuple(sorted(t for t in re.split(r"[^a-z0-9]+", Path(filename).stem.lower()) if t))
    for path in (EVAL_ROOT / "videos").rglob("*.mp4"):
        got = tuple(sorted(t for t in re.split(r"[^a-z0-9]+", path.stem.lower()) if t))
        if got == want:
            return path
    return None


def metrics(y_true, y_pred) -> dict:
    labels = ["FAKE", "REAL", "UNCERTAIN"]
    cm = {t: {p: 0 for p in labels} for t in labels}
    for t, p in zip(y_true, y_pred):
        cm[t][p] += 1
    n = len(y_true)
    correct = sum(t == p for t, p in zip(y_true, y_pred))
    tp = cm["FAKE"]["FAKE"]; fp = cm["REAL"]["FAKE"]; fn = cm["FAKE"]["REAL"] + cm["FAKE"]["UNCERTAIN"]
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    decided = sum(p != "UNCERTAIN" for p in y_pred)
    return {
        "n": n, "accuracy": correct / n if n else 0.0, "precision_fake": prec, "recall_fake": rec, "f1_fake": f1,
        "coverage": decided / n if n else 0.0, "confusion": cm,
    }


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modality", choices=["news", "image", "video"], required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=1.0, help="seconds between items")
    args = ap.parse_args()

    services = get_services()
    folder = {"news": "news", "image": "images", "video": "videos"}[args.modality]
    rows = read_rows(EVAL_ROOT / folder / "metadata.csv")
    if args.limit:
        rows = rows[: args.limit]

    out_rows, y_true, y_pred = [], [], []
    for i, row in enumerate(rows, 1):
        gt = str(row["label"]).strip().upper()
        t0 = time.time()
        try:
            if args.modality == "news":
                res = await analyze(url=row["url"], services=services)
                ident = row["url"]
            elif args.modality == "image":
                p = resolve_image(row["path"])
                ident = str(p)
                res = await analyze(image_path=str(p), services=services, original_name=p.name) if p else None
            else:
                p = resolve_video(row["filename"])
                ident = str(p)
                res = await analyze(video_path=str(p), services=services, original_name=p.name) if p else None
            if res is None:
                pred, conf, summary, err = "UNCERTAIN", 0.0, "", "file not found"
            else:
                pred = legacy_verdict(res.verdict).replace("LIKELY ", "")
                conf, summary, err = res.confidence, res.summary, ""
        except Exception as exc:  # keep going; record the failure
            pred, conf, summary, err, ident = "UNCERTAIN", 0.0, "", f"{type(exc).__name__}: {exc}", row.get("url") or row.get("path") or row.get("filename")
            res = None

        y_true.append(gt); y_pred.append(pred)
        out_rows.append({
            "id": row.get("id"), "input": ident, "ground_truth": gt, "predicted": pred, "correct": int(gt == pred),
            "confidence": conf, "genre": getattr(res, "genre", None), "model": getattr(getattr(res, "provenance", None), "model", None),
            "grounded": getattr(getattr(res, "provenance", None), "grounded", None), "summary": summary, "error": err,
            "seconds": round(time.time() - t0, 1),
        })
        print(f"[{i}/{len(rows)}] GT={gt:9s} PRED={pred:9s} conf={conf:.2f} {('ERR ' + err) if err else ''} ({out_rows[-1]['seconds']}s)")
        await asyncio.sleep(args.sleep)

    m = metrics(y_true, y_pred)
    results_path = EVAL_ROOT / folder / "results_v2.csv"
    with open(results_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out_rows[0].keys()))
        w.writeheader(); w.writerows(out_rows)
    metrics_path = EVAL_ROOT / folder / "metrics_v2.txt"
    with open(metrics_path, "w", encoding="utf-8") as fh:
        fh.write(f"{args.modality.upper()} EVALUATION RESULTS (v2 pipeline)\n")
        fh.write("=" * 40 + "\n")
        for k in ("n", "accuracy", "precision_fake", "recall_fake", "f1_fake", "coverage"):
            v = m[k]; fh.write(f"{k:15s}: {v:.4f}\n" if isinstance(v, float) else f"{k:15s}: {v}\n")
        fh.write("Confusion (rows=truth, cols=pred) [FAKE, REAL, UNCERTAIN]:\n")
        for t in ("FAKE", "REAL", "UNCERTAIN"):
            fh.write(f"  {t:9s} " + " ".join(f"{m['confusion'][t][p]:3d}" for p in ("FAKE", "REAL", "UNCERTAIN")) + "\n")
    print("\n" + json.dumps({k: v for k, v in m.items() if k != "confusion"}, indent=2))
    print(f"results -> {results_path}\nmetrics -> {metrics_path}")


if __name__ == "__main__":
    asyncio.run(main())
