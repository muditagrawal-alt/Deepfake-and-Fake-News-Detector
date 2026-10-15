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
from detector import __version__ as ENGINE_VERSION            # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
from common import EVAL, RUNS, TRANSFORMS, read_rows, resolve_image, resolve_video  # noqa: E402

DATA = ROOT / "research" / "data"
PRICING = json.loads((Path(__file__).parent / "pricing.json").read_text())
LEDGER = ROOT / "research" / "runs" / "_spend_ledger.csv"     # every paid item, across all runs and shards


def item_cost_inr(calls: list[dict]) -> float:
    """Estimated cost of one item from its recorded token counts (thinking billed as output)."""
    total = 0.0
    for c in calls:
        price = PRICING["models"].get(c.get("model") or "")
        if not price:
            continue                      # local model or unpriced: no API cost
        inp = c.get("prompt_tokens") or 0
        out = (c.get("output_tokens") or 0) + (c.get("thinking_tokens") or 0)
        total += (inp * price["input_usd_per_m"] + out * price["output_usd_per_m"]) / 1e6
    return total * PRICING["usd_inr"]


def ledger_total_inr() -> float:
    if not LEDGER.exists():
        return 0.0
    with open(LEDGER, newline="", encoding="utf-8") as fh:
        return sum(float(r["cost_inr"] or 0) for r in csv.DictReader(fh))


def ledger_add(run: str, item: str, cost: float) -> None:
    import fcntl
    new = not LEDGER.exists()
    with open(LEDGER, "a", newline="", encoding="utf-8") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        w = csv.writer(fh)
        if new:
            w.writerow(["utc", "run", "item", "cost_inr"])
        w.writerow([datetime.now(timezone.utc).isoformat(timespec="seconds"), run, item, round(cost, 4)])
        fcntl.flock(fh, fcntl.LOCK_UN)
SPLITS = ROOT / "research" / "splits"
BENCHES = {"liar", "mmsoc_politifact", "mmsoc_gossipcop", "celebdf_v2", "mmfakebench", "ffpp_c23"}
CAPTIONED_IMAGE = {"mmfakebench"}   # image-caption pairs: image analyzer with the text as its caption

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
    if args.round:
        parts.append(f"round{args.round}")
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
    if set_name in CAPTIONED_IMAGE:
        from detector.analyzers.image import analyze_image
        return await analyze_image(DATA / set_name / row["image"], services, caption=row["text"])
    if set_name in BENCHES and row.get("video"):
        return await analyze(video_path=str(DATA / set_name / row["video"]), services=services)
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
                        f"{st}_prompt_tokens": c["prompt_tokens"], f"{st}_output_tokens": c["output_tokens"],
                        f"{st}_thinking_tokens": c.get("thinking_tokens")})
        out["cost_inr"] = round(item_cost_inr(res.provenance.calls), 4)
        out["engine_version"] = res.provenance.engine_version
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
    ap.add_argument("--round", type=int, choices=[1, 2], default=None,
                    help="paper round: 1 = baseline engine, 2 = enhanced engine (labels runs and manifests)")
    ap.add_argument("--cap-inr", type=float, default=float(os.environ.get("SPEND_CAP_INR", "1000")),
                    help="stop starting new paid items once the shared ledger reaches this many rupees")
    ap.add_argument("--run", type=int, default=1, help="repeat index, for variance across runs")
    ap.add_argument("--sleep", type=float, default=0.0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--shard", default="", help="k/N: run only every N-th item starting at k (1-based), for splitting "
                                                "a benchmark across machines; merge with merge_shards.py")
    ap.add_argument("--workers", type=int, default=1, help="items processed concurrently")
    ap.add_argument("--seed-from", default="", help="comma-separated finished run stems whose completed items are "
                    "copied into this run (e.g. a subset run of the same split family); settings must match exactly")
    args = ap.parse_args()
    if bool(args.set) == bool(args.bench) or (args.bench and not args.split):
        ap.error("give either --set, or --bench with --split")
    allowed = {"news": {"none", *NEWS_TRANSFORMS}, "images": {"none", "img_norm512", "img_norm512_crop"},
               "videos": {"none", "vid_strip", "vid_strip_trim5", "vid_strip_trim5_crop"}}.get(args.set, {"none"})
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
    if args.shard:
        k, n = (int(x) for x in args.shard.split("/"))
        if not 1 <= k <= n:
            ap.error("--shard must be k/N with 1 <= k <= N")
        rows = rows[k - 1::n]          # deterministic: the split file's order, every N-th item

    name = run_name(settings, args) + (f"__shard{args.shard.replace('/', 'of')}" if args.shard else "")
    out_csv, out_jsonl, out_json = (RUNS / f"{name}.{ext}" for ext in ("csv", "jsonl", "json"))
    out_err = RUNS / f"{name}.errors.csv"     # every error ever hit, kept even after a successful retry
    RUNS.mkdir(parents=True, exist_ok=True)
    idents = [row_ident(set_name, r) for r in rows]
    keys = [item_key(r, i) for r, i in zip(rows, idents)]
    assert len(set(keys)) == len(keys), "duplicate item keys"

    manifest = {
        "run": name, "engine": "v3", "engine_version": ENGINE_VERSION, "round": args.round,
        "set": set_name, "split": args.split, "n": len(rows), "transform": args.transform,
        "shard": args.shard or None, "workers": args.workers,
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
    if out_json.exists():   # a resumed run keeps its first start time and counts attempts
        prev = json.loads(out_json.read_text())
        manifest["first_started_utc"] = prev.get("first_started_utc", prev.get("started_utc"))
        manifest["attempt"] = prev.get("attempt", 1) + 1
    else:
        manifest["first_started_utc"] = manifest["started_utc"]
        manifest["attempt"] = 1

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

    if args.seed_from:
        # Reuse items already scored by an identical configuration (e.g. extending a fixed subset to the
        # full test split). One item is still run once; every setting that defines the system must match.
        must = ["engine_tree", "model", "backend", "research_mode", "exclude_fact_checks", "search_blocklist",
                "max_search_queries", "video_strategy", "pixel_classifier", "transform", "set", "round", "pinned"]
        manifest["seeded_from"] = {}
        for stem in [x for x in args.seed_from.split(",") if x]:
            sm = json.loads((RUNS / f"{stem}.json").read_text())
            bad = [k for k in must if sm.get(k) != manifest.get(k)]
            if bad:
                ap.error(f"--seed-from {stem}: settings differ on {bad}")
            n0 = len(done)
            with open(RUNS / f"{stem}.csv", newline="", encoding="utf-8") as fh:
                for r in csv.DictReader(fh):
                    k = f"{r['id']}|{r['item']}"
                    if k in keys and k not in done and not r["error"]:
                        done[k] = r
            jl = RUNS / f"{stem}.jsonl"
            if jl.exists():
                for line in jl.read_text(encoding="utf-8").splitlines():
                    d = json.loads(line)
                    if d["key"] in done and d["key"] not in full:
                        full[d["key"]] = d
            manifest["seeded_from"][stem] = len(done) - n0
        print(f"seeded {sum(manifest['seeded_from'].values())} items from {list(manifest['seeded_from'])}", flush=True)

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

    sem = asyncio.Semaphore(max(1, args.workers))
    counter = {"n": len(done)}

    stopped = {"cap": False}

    async def one(row, ident, key, tmp):
        async with sem:
            if settings.llm_engine == "gemini" and ledger_total_inr() >= args.cap_inr:
                stopped["cap"] = True         # leave the item unrun; --resume after a top-up continues
                return
            gt = row["label"].strip().upper()  # REAL | FAKE
            t0 = time.time()
            res, err = None, ""
            try:
                res = await run_item(set_name, args.transform, row, services, Path(tmp))
            except Exception as exc:
                err = f"{type(exc).__name__}: {exc}"[:300]
            done[key] = flat_row(row, ident, gt, res, err, round(time.time() - t0, 1))
            if res is not None and done[key].get("cost_inr"):
                ledger_add(name, key, done[key]["cost_inr"])
            if err:
                new = not out_err.exists()
                with open(out_err, "a", newline="", encoding="utf-8") as fh:
                    w = csv.writer(fh)
                    if new:
                        w.writerow(["utc", "attempt", "id", "item", "error", "seconds"])
                    w.writerow([datetime.now(timezone.utc).isoformat(timespec="seconds"), manifest["attempt"],
                                row.get("id"), ident, err, round(time.time() - t0, 1)])
            if res is not None:
                full[key] = {"key": key, "ground_truth": gt, "result": res.model_dump(mode="json")}
            flush()
            counter["n"] += 1
            r = done[key]
            print(f"[{counter['n']}/{len(rows)}] {gt:4s} -> {r['predicted'] or 'ERROR':9s} {r['confidence'] or '':>5} "
                  f"{r['seconds']:6.1f}s {('ERR ' + err[:80]) if err else ''}", flush=True)
            if args.sleep:
                await asyncio.sleep(args.sleep)

    with tempfile.TemporaryDirectory(prefix="eval_") as tmp:
        await asyncio.gather(*[one(row, ident, key, tmp) for row, ident, key in zip(rows, idents, keys)
                               if key not in done])

    out = [done[k] for k in keys if k in done]
    ok = [r for r in out if not r["error"]]
    manifest["finished_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest["cost_inr_this_run"] = round(sum(float(r.get("cost_inr") or 0) for r in out), 2)
    manifest["ledger_total_inr"] = round(ledger_total_inr(), 2)
    manifest["stopped_at_cap"] = stopped["cap"]
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
