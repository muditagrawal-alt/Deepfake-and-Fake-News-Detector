"""
Merge the shards of one benchmark run (made with run_eval.py --shard k/N, possibly on
different machines) into a single run that build_results.py and sota_comparison.py read
like any other.

The merge refuses unless every shard 1..N is present, the shards cover the split exactly
once, and all were made with the same engine (source tree hash), model, backend and
settings. Each shard's power state, commit and error history are kept in the merged
manifest.

  research/.venv/bin/python research/scripts/merge_shards.py \\
      mmsoc_gossipcop__test1000__v3__gemini-gemini35flashlite__none__open__nofc__run1
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "research" / "runs"
SPLITS = ROOT / "research" / "splits"
MUST_MATCH = ["engine", "set", "split", "transform", "backend", "model", "pinned", "temperature", "research_mode",
              "researcher", "search_blocklist", "exclude_fact_checks", "max_search_queries", "video_strategy",
              "pixel_classifier", "engine_tree"]


def main(base: str):
    manifests = sorted(RUNS.glob(f"{base}__shard*of*.json"))
    if not manifests:
        sys.exit(f"no shards found for {base}")
    ms = [json.loads(p.read_text()) for p in manifests]
    ks = sorted(int(re.search(r"__shard(\d+)of(\d+)", p.stem).group(1)) for p in manifests)
    n = int(re.search(r"__shard\d+of(\d+)", manifests[0].stem).group(1))
    if ks != list(range(1, n + 1)):
        sys.exit(f"shards present {ks}, expected 1..{n}")
    for key in MUST_MATCH:
        vals = {json.dumps(m.get(key)) for m in ms}
        if len(vals) > 1:
            sys.exit(f"shards disagree on {key}: {vals}")
    if any(m.get("git_dirty") for m in ms):
        print("warning: a shard was run with uncommitted engine changes", file=sys.stderr)

    keys_in_split = (SPLITS / f"{ms[0]['set']}__{ms[0]['split']}.txt").read_text().split()
    rows, full, errs = {}, {}, []
    for p in manifests:
        with open(p.with_suffix(".csv"), newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                if r["id"] in rows:
                    sys.exit(f"item {r['id']} appears in more than one shard")
                rows[r["id"]] = r
        jl = p.with_suffix(".jsonl")
        if jl.exists():
            for line in jl.read_text(encoding="utf-8").splitlines():
                d = json.loads(line)
                full[d["key"].split("|")[0]] = line
        er = RUNS / f"{p.stem}.errors.csv"
        if er.exists():
            with open(er, newline="", encoding="utf-8") as fh:
                errs += [{**r, "shard": p.stem.rsplit("__", 1)[-1]} for r in csv.DictReader(fh)]
    missing = [k for k in keys_in_split if k not in rows]
    if missing:
        sys.exit(f"{len(missing)} split items missing from the shards, e.g. {missing[:3]}")

    out = RUNS / base
    ordered = [rows[k] for k in keys_in_split]
    fields = []
    for r in ordered:
        fields += [f for f in r if f not in fields]
    with open(out.with_suffix(".csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, restval=""); w.writeheader(); w.writerows(ordered)
    with open(out.with_suffix(".jsonl"), "w", encoding="utf-8") as fh:
        for k in keys_in_split:
            if k in full:
                fh.write(full[k] + "\n")
    if errs:
        with open(RUNS / f"{base}.errors.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(errs[0])); w.writeheader(); w.writerows(errs)
    ok = [r for r in ordered if not r["error"]]
    merged = {k: ms[0].get(k) for k in MUST_MATCH}
    merged.update({
        "run": base, "n": len(ordered), "merged_from": [p.stem for p in manifests],
        "shards": [{k: m.get(k) for k in ("git_commit", "git_dirty", "power", "workers", "first_started_utc",
                                          "finished_utc", "attempt", "errors")} for m in ms],
        "errors": len(ordered) - len(ok), "completed": len(ok),
        "accuracy_completed": round(sum(int(r["correct"]) for r in ok) / max(len(ok), 1), 4),
        "uncertain": sum(r["predicted"] == "UNCERTAIN" for r in ok),
        "valid": len(ordered) - len(ok) <= 0.05 * len(ordered),
        "first_started_utc": min(m.get("first_started_utc") or m.get("started_utc") for m in ms),
        "finished_utc": max(m.get("finished_utc") for m in ms),
    })
    out.with_suffix(".json").write_text(json.dumps(merged, indent=2))
    print(f"{base}: merged {n} shards, {len(ordered)} items, accuracy {merged['accuracy_completed']}, "
          f"errors {merged['errors']}, valid {merged['valid']}")


if __name__ == "__main__":
    main(sys.argv[1])
