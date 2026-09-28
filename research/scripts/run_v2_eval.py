"""
Research evaluation harness for the v2 pipeline.

Runs the deployed analysis code on a benchmark, optionally after a
*controlled transformation* of every input, and writes one labelled per-item
CSV to research/runs/. Every run records its configuration in a sidecar JSON,
so results can always be traced to exactly what produced them.

Transforms (applied identically to both classes):
  none        inputs as-is
  img_norm512 images: RGB, longest side resized to 512 px (Lanczos), saved as
              JPEG q=90 with no EXIF/text chunks. Removes resolution, format
              and metadata as cues. Deliberately conservative: small real
              images are upsampled (smoother) and large fakes downsampled
              (fewer high-frequency artefacts), both of which make detection
              harder, not easier.
  vid_strip   videos: remux with all container and stream metadata removed
              and no encoder tag written (-fflags +bitexact). Pixels and audio
              are bit-identical; only metadata is gone, as after a re-upload.

Usage (from repo root, backend venv):
  backend/.venv/bin/python research/scripts/run_v2_eval.py --set images --transform img_norm512 --tag detector_off
"""
import argparse
import asyncio
import csv
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
os.chdir(ROOT / "backend")                      # settings resolve .env relative to backend

from detector.config import get_settings        # noqa: E402
from detector.pipeline import analyze, legacy_verdict  # noqa: E402
from detector.services import get_services       # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
from common import EVAL, TRANSFORMS, read_rows, resolve_image, resolve_video  # noqa: E402

RUNS = ROOT / "research" / "runs"

async def main():
    sys.exit("run_v2_eval.py measured the engine before the 2026-09-28 rebuild (rules R1-R10). "
             "Its runs are kept as the v2 record; evaluate the current engine with run_eval.py.")
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", choices=["news", "images", "videos"], required=True)
    ap.add_argument("--transform", choices=list(TRANSFORMS), default="none")
    ap.add_argument("--tag", default="")
    ap.add_argument("--run", type=int, default=1, help="repeat index, for variance across runs")
    ap.add_argument("--sleep", type=float, default=1.0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--resume", action="store_true",
                    help="keep items already completed without error; re-run only failed or missing ones")
    args = ap.parse_args()

    settings = get_settings()
    services = get_services()
    folder = {"news": "news", "images": "images", "videos": "videos"}[args.set]
    rows = read_rows(EVAL / folder / "metadata.csv")
    if args.limit:
        rows = rows[: args.limit]

    detector = "detector_on" if settings.enable_onnx_detector else "detector_off"
    model_tag = settings.gemini_primary_model.replace("gemini-", "g").replace(".", "").replace("-", "")
    name = f"{args.set}__v2__{model_tag}__{detector}__{args.transform}{('__' + args.tag) if args.tag else ''}__run{args.run}"
    out_csv = RUNS / f"{name}.csv"
    RUNS.mkdir(parents=True, exist_ok=True)

    manifest = {
        "run": name, "set": args.set, "n": len(rows), "transform": args.transform,
        "transform_doc": (TRANSFORMS[args.transform].__name__ if TRANSFORMS[args.transform] else "none"),
        "primary_model": settings.gemini_primary_model, "secondary_model": settings.gemini_secondary_model,
        "onnx_detector": settings.enable_onnx_detector, "temperature": settings.gemini_temperature,
        "researcher": services.researcher.name if services.researcher else None,
        "git_commit": subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=ROOT).stdout.strip(),
        "started_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    # Results are keyed by item id and written after every item, so a provider
    # outage never loses completed work, and --resume re-runs only failures.
    done: dict[str, dict] = {}
    if args.resume and out_csv.exists():
        with open(out_csv, newline="", encoding="utf-8") as fh:
            done = {r["id"]: r for r in csv.DictReader(fh) if not r["error"]}
        print(f"resume: {len(done)} items already complete, {len(rows) - len(done)} to run", flush=True)

    def flush():
        ordered = [done[r.get("id")] for r in rows if r.get("id") in done]
        if ordered:
            with open(out_csv, "w", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=list(ordered[0].keys())); w.writeheader(); w.writerows(ordered)

    with tempfile.TemporaryDirectory(prefix="eval_") as tmp:
        tmp = Path(tmp)
        for i, row in enumerate(rows, 1):
            if row.get("id") in done:
                continue
            gt = row["label"].strip().upper()
            t0 = time.time()
            res, err, ident = None, "", ""
            try:
                if args.set == "news":
                    ident = row["url"]
                    res = await analyze(url=row["url"], services=services)
                else:
                    src = resolve_image(row["path"]) if args.set == "images" else resolve_video(row["filename"])
                    ident = src.name
                    fn = TRANSFORMS[args.transform]
                    path = fn(src, tmp) if fn else src
                    kw = {"image_path": str(path)} if args.set == "images" else {"video_path": str(path)}
                    res = await analyze(services=services, original_name=None, **kw)
            except Exception as exc:
                err = f"{type(exc).__name__}: {exc}"[:300]
            pred = legacy_verdict(res.verdict).replace("LIKELY ", "") if res else "UNCERTAIN"
            conf = float(res.confidence) if res else 0.0
            p_fake = conf if pred == "FAKE" else (1 - conf if pred == "REAL" else 0.5)
            done[row.get("id")] = {
                "id": row.get("id"), "input": ident, "ground_truth": gt, "predicted": pred,
                "correct": int(gt == pred), "confidence": round(conf, 4), "p_fake": round(p_fake, 4),
                "genre": getattr(res, "genre", None) if res else None,
                "model": res.provenance.model if res else None,
                "research": res.provenance.research_provider if res else None,
                "n_sources": len(res.evidence) if res else 0,
                "error": err, "seconds": round(time.time() - t0, 1),
            }
            flush()
            print(f"[{i}/{len(rows)}] {gt:5s} -> {pred:9s} {conf:.2f} {('ERR ' + err[:60]) if err else ''}", flush=True)
            await asyncio.sleep(args.sleep)

    out = [done[r.get("id")] for r in rows if r.get("id") in done]
    flush()
    manifest["finished_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest["errors"] = sum(1 for r in out if r["error"])
    n_err = manifest["errors"]
    ok = [r for r in out if not r["error"]]
    manifest["accuracy_all_items"] = round(sum(int(r["correct"]) for r in out) / len(out), 4)
    manifest["accuracy_completed_items"] = round(sum(int(r["correct"]) for r in ok) / max(len(ok), 1), 4)
    # A run where more than 5% of items failed is not a measurement of the model.
    manifest["valid"] = n_err <= 0.05 * len(out)
    manifest["accuracy"] = manifest["accuracy_all_items"]
    (RUNS / f"{name}.json").write_text(json.dumps(manifest, indent=2))
    print(f"\n{name}: accuracy={manifest['accuracy']} errors={manifest['errors']} valid={manifest['valid']} -> {out_csv}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
