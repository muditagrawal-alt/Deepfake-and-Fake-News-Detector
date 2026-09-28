"""
Evaluation harness for the v3 engine (analyse -> retrieve -> verify).

One invocation = one run of one system configuration on one benchmark, after
an optional controlled transformation of every input. Outputs, in
research/runs/:
  <run>.csv     one row per item: label, prediction, confidence, evidence
                features, per-stage model/latency/tokens, error
  <run>.jsonl   the full AnalysisResult per item (claims, observations,
                retrieved sources, reasoning) for error analysis and the
                learned scorer
  <run>.json    manifest: configuration, git commit, power state, accuracy,
                error count, validity

The system configuration comes from the environment (LLM_ENGINE, OLLAMA_MODEL,
PIN_MODEL, RESEARCH_MODE, SEARCH_BLOCKLIST, VIDEO_STRATEGY; see
docs/03_v2_research_log.md). PIN_MODEL is forced on: a research run never
switches models.

Items that fail (provider error, timeout) are recorded with the error and are
never scored as predictions. A run with more than 5% failed items is marked
invalid. --resume re-runs only failed or missing items.

External benchmarks (downloaded by research/scripts/datasets/*) are selected
with --bench and --split; the split file in research/splits/ fixes the items.

Usage (repo root):
  LLM_ENGINE=ollama backend/.venv/bin/python research/scripts/run_eval.py --set images
  LLM_ENGINE=gemini backend/.venv/bin/python research/scripts/run_eval.py --set videos --transform vid_strip --run 2
  backend/.venv/bin/python research/scripts/run_eval.py --set news --transform news_text_masked
  EXCLUDE_FACT_CHECKS=true backend/.venv/bin/python research/scripts/run_eval.py --bench liar --split test
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
os.chdir(ROOT / "backend")
os.environ["PIN_MODEL"] = "true"

from detector.config import get_settings                     # noqa: E402
from detector.forensics.article import extract_article       # noqa: E402
from detector.pipeline import analyze, analyze_news_text     # noqa: E402
from detector.services import get_services                   # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
from common import EVAL, RUNS, TRANSFORMS, read_rows, resolve_image, resolve_video  # noqa: E402

DATA = ROOT / "research" / "data"
SPLITS = ROOT / "research" / "splits"
BENCHES = {"liar", "mmsoc_politifact", "mmsoc_gossipcop"}

# News controls. The v1/v2 news set is URL-based; these feed the engine the
# extracted article text instead, with or without the publisher's identity.
NEWS_TRANSFORMS = {"news_text", "news_text_masked"}
VERDICT_TO_LABEL = {"LIKELY_REAL": "REAL", "LIKELY_FAKE": "FAKE", "UNCERTAIN": "UNCERTAIN"}


def power_state() -> dict:
    try:
        batt = subprocess.run(["pmset", "-g", "batt"], capture_output=True, text=True).stdout
        cfg = subprocess.run(["pmset", "-g"], capture_output=True, text=True).stdout
        m = re.search(r"lowpowermode\s+(\d)", cfg)
        return {"source": "AC" if "AC Power" in batt else "battery", "low_power_mode": bool(m and m.group(1) == "1")}
    except Exception:
        return {}


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def run_name(settings, args) -> str:
    backend = settings.llm_engine
    model = settings.ollama_model if backend == "ollama" else settings.gemini_primary_model
    system = f"{backend}-{slug(model)}"
    if backend == "gemini" and args.set == "videos" and settings.video_strategy != "native":
        system += "-frames"
    if backend == "ollama" and settings.ollama_think:
        system += "-think"
    head = [args.bench, args.split] if args.bench else [args.set]
    parts = [*head, "v3", system, args.transform, settings.research_mode]
    if settings.search_blocklist:
        parts.append("blocklist")
    if settings.exclude_fact_checks:
        parts.append("nofc")
    if settings.enable_onnx_detector:
        parts.append("pixelclf")
    if args.tag:
        parts.append(args.tag)
    return "__".join(parts) + f"__run{args.run}"


def item_key(row: dict, ident: str) -> str:
    # Keyed by id AND file/URL: the image set has a duplicated id (finding F8).
    return f"{row.get('id')}|{ident}"


def row_ident(set_name: str, row: dict) -> str:
    if set_name in BENCHES:
        return row["id"]
    if set_name == "news":
        return row["url"]
    if set_name == "images":
        return resolve_image(row["path"]).name.strip()
    return resolve_video(row["filename"]).name


async def run_item(set_name, transform, row, services, tmp: Path):
    if set_name in BENCHES:
        image = (DATA / set_name / row["image"]).read_bytes() if row.get("image") else None
        return await analyze_news_text(row["text"][:14000], services, image=image,
                                       speaker=row.get("speaker") or None, context=row.get("context") or None)
    if set_name == "news":
        if transform in NEWS_TRANSFORMS:
            extraction, text = await extract_article(row["url"])
            if not text:
                raise RuntimeError(f"no article text (extraction {extraction.status})")
            publisher = None if transform == "news_text_masked" else (extraction.site or row["url"])
            title = extraction.title
            return await analyze_news_text(text, services, title=title, publisher=publisher,
                                           published=extraction.published)
        return await analyze(url=row["url"], services=services)
    src = resolve_image(row["path"]) if set_name == "images" else resolve_video(row["filename"])
    fn = TRANSFORMS[transform]
    path = fn(src, tmp) if fn else src
    kw = {"image_path": str(path)} if set_name == "images" else {"video_path": str(path)}
    return await analyze(services=services, **kw)


def flat_row(row, ident, gt, res, err, seconds) -> dict:
    out = {"id": row.get("id"), "item": ident, "ground_truth": gt}
    if row.get("label_orig") not in (None, ""):
        out["label_orig"] = row["label_orig"]
    if res is None:
        out.update({"predicted": "", "correct": "", "confidence": "", "p_fake": ""})
    else:
        pred = VERDICT_TO_LABEL[res.verdict]
        conf = float(res.confidence)
        p_fake = conf if pred == "FAKE" else (1 - conf if pred == "REAL" else 0.5)
        out.update({"predicted": pred, "correct": int(pred == gt), "confidence": round(conf, 4),
                    "p_fake": round(p_fake, 4)})
        out.update({f"f_{k}": v for k, v in res.evidence_features.items()})
        for c in res.provenance.calls:
            st = c["stage"]
            out.update({f"{st}_model": c["model"], f"{st}_seconds": c["seconds"],
                        f"{st}_prompt_tokens": c["prompt_tokens"], f"{st}_output_tokens": c["output_tokens"]})
        out["retrieve_ms"] = res.timings_ms.get("retrieve", 0)
    out["error"] = err
    out["seconds"] = seconds
    return out


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", choices=["news", "images", "videos"])
    ap.add_argument("--bench", choices=sorted(BENCHES))
    ap.add_argument("--split", help="split file suffix, e.g. test, test1000, dev50")
    ap.add_argument("--transform", choices=list(TRANSFORMS) + sorted(NEWS_TRANSFORMS), default="none")
    ap.add_argument("--tag", default="")
    ap.add_argument("--run", type=int, default=1, help="repeat index, for variance across runs")
    ap.add_argument("--sleep", type=float, default=0.0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()
    if bool(args.set) == bool(args.bench) or (args.bench and not args.split):
        ap.error("give either --set, or --bench with --split")
    allowed = {"news": {"none", *NEWS_TRANSFORMS}, "images": {"none", "img_norm512"},
               "videos": {"none", "vid_strip", "vid_strip_trim5"}}.get(args.set, {"none"})
    if args.transform not in allowed:
        ap.error(f"transform {args.transform} does not apply to set {args.set}; choose from {sorted(allowed)}")

    settings = get_settings()
    services = get_services()
    if args.bench:
        keep = (SPLITS / f"{args.bench}__{args.split}.txt").read_text().split()
        # Plain DictReader: article text contains blank lines, which read_rows (for the
        # comment-annotated in-house metadata files) would drop.
        csv.field_size_limit(sys.maxsize)
        with open(DATA / args.bench / "items.csv", newline="", encoding="utf-8") as fh:
            by_id = {r["id"]: r for r in csv.DictReader(fh)}
        rows = [by_id[i] for i in keep]
    else:
        rows = read_rows(EVAL / args.set / "metadata.csv")
    set_name = args.bench or args.set
    if args.limit:
        rows = rows[: args.limit]

    name = run_name(settings, args)
    out_csv, out_jsonl, out_json = (RUNS / f"{name}.{ext}" for ext in ("csv", "jsonl", "json"))
    RUNS.mkdir(parents=True, exist_ok=True)
    idents = [row_ident(set_name, r) for r in rows]
    keys = [item_key(r, i) for r, i in zip(rows, idents)]
    assert len(set(keys)) == len(keys), "duplicate item keys"

    manifest = {
        "run": name, "engine": "v3", "set": set_name, "split": args.split, "n": len(rows), "transform": args.transform,
        "backend": settings.llm_engine,
        "model": settings.ollama_model if settings.llm_engine == "ollama" else settings.gemini_primary_model,
        "pinned": True, "temperature": settings.gemini_temperature,
        "ollama": {"num_ctx": settings.ollama_num_ctx, "think": settings.ollama_think, "seed": settings.ollama_seed}
                  if settings.llm_engine == "ollama" else None,
        "research_mode": settings.research_mode, "researcher": services.researcher.name if services.researcher else None,
        "search_blocklist": settings.search_blocklist, "exclude_fact_checks": settings.exclude_fact_checks,
        "max_search_queries": settings.max_search_queries,
        "video_strategy": settings.video_strategy, "pixel_classifier": settings.enable_onnx_detector,
        "git_commit": subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=ROOT).stdout.strip(),
        "git_dirty": bool(subprocess.run(["git", "status", "--porcelain", "backend/detector"], capture_output=True, text=True, cwd=ROOT).stdout.strip()),
        # Hash of the engine's source tree: identical across commits that touch only research files.
        "engine_tree": subprocess.run(["git", "rev-parse", "--short", "HEAD:backend/detector"], capture_output=True, text=True, cwd=ROOT).stdout.strip(),
        "power": power_state(),
        "started_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    done: dict[str, dict] = {}
    full: dict[str, dict] = {}
    if args.resume and out_csv.exists():
        with open(out_csv, newline="", encoding="utf-8") as fh:
            done = {f"{r['id']}|{r['item']}": r for r in csv.DictReader(fh) if not r["error"]}
        if out_jsonl.exists():
            for line in out_jsonl.read_text(encoding="utf-8").splitlines():
                d = json.loads(line)
                if d["key"] in done:
                    full[d["key"]] = d
        print(f"resume: {len(done)} complete, {len(rows) - len(done)} to run", flush=True)

    def flush():
        ordered = [done[k] for k in keys if k in done]
        if not ordered:
            return
        fields = []
        for r in ordered:
            fields += [f for f in r if f not in fields]
        with open(out_csv, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=fields, restval=""); w.writeheader(); w.writerows(ordered)
        with open(out_jsonl, "w", encoding="utf-8") as fh:
            for k in keys:
                if k in full:
                    fh.write(json.dumps(full[k], ensure_ascii=False, default=str) + "\n")

    with tempfile.TemporaryDirectory(prefix="eval_") as tmp:
        for i, (row, ident, key) in enumerate(zip(rows, idents, keys), 1):
            if key in done:
                continue
            gt = row["label"].strip().upper()  # REAL | FAKE
            t0 = time.time()
            res, err = None, ""
            try:
                res = await run_item(set_name, args.transform, row, services, Path(tmp))
            except Exception as exc:
                err = f"{type(exc).__name__}: {exc}"[:300]
            done[key] = flat_row(row, ident, gt, res, err, round(time.time() - t0, 1))
            if res is not None:
                full[key] = {"key": key, "ground_truth": gt, "result": res.model_dump(mode="json")}
            flush()
            r = done[key]
            print(f"[{i}/{len(rows)}] {gt:4s} -> {r['predicted'] or 'ERROR':9s} {r['confidence'] or '':>5} "
                  f"{r['seconds']:6.1f}s {('ERR ' + err[:80]) if err else ''}", flush=True)
            if args.sleep:
                await asyncio.sleep(args.sleep)

    out = [done[k] for k in keys if k in done]
    ok = [r for r in out if not r["error"]]
    manifest["finished_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest["power_end"] = power_state()
    manifest["errors"] = len(out) - len(ok)
    manifest["completed"] = len(ok)
    manifest["accuracy_completed"] = round(sum(int(r["correct"]) for r in ok) / max(len(ok), 1), 4)
    manifest["uncertain"] = sum(r["predicted"] == "UNCERTAIN" for r in ok)
    manifest["valid"] = manifest["errors"] <= 0.05 * len(rows) and len(out) == len(rows)
    out_json.write_text(json.dumps(manifest, indent=2))
    print(f"\n{name}: accuracy={manifest['accuracy_completed']} on {len(ok)}/{len(rows)} "
          f"errors={manifest['errors']} valid={manifest['valid']}\n-> {out_csv}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
