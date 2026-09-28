"""
Benchmark loaders. Each module downloads one benchmark from its official
source into research/data/<name>/ (git-ignored) and writes items.csv with a
common schema:

  id, split, label (REAL|FAKE), label_orig, text, title, image, speaker, context

`image` is a path relative to the benchmark folder, or empty. Fixed item lists
for evaluation are committed to research/splits/<name>__<split>.txt, so every
run of a benchmark scores exactly the same items.

  research/.venv/bin/python -m datasets.mmsoc      (from research/scripts)
  research/.venv/bin/python -m datasets.liar
"""
import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "research" / "data"
SPLITS = ROOT / "research" / "splits"
FIELDS = ["id", "split", "label", "label_orig", "text", "title", "image", "speaker", "context"]


def write_items(name: str, rows: list[dict]) -> Path:
    out = DATA / name / "items.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS, restval="")
        w.writeheader()
        w.writerows(rows)
    return out


def write_split(name: str, split: str, ids: list[str]) -> Path:
    SPLITS.mkdir(parents=True, exist_ok=True)
    out = SPLITS / f"{name}__{split}.txt"
    out.write_text("\n".join(ids) + "\n", encoding="utf-8")
    return out


def stratified_sample(rows: list[dict], n: int, seed: int = 2026) -> list[str]:
    """n items with the class ratio of `rows`, reproducible (fixed seed, sorted input)."""
    rng = random.Random(seed)
    by = {}
    for r in sorted(rows, key=lambda r: r["id"]):
        by.setdefault(r["label"], []).append(r["id"])
    total = len(rows)
    picked = []
    for label, ids in sorted(by.items()):
        k = round(n * len(ids) / total)
        picked += rng.sample(ids, min(k, len(ids)))
    return sorted(picked)
