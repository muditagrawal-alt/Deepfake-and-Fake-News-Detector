"""
Trivial baselines: how well does one file or URL property, with no content
analysis, separate the classes of each in-house set?

Continuous properties (resolution, file size, duration, text length) use a
single threshold learned leave-one-out: for each item, the threshold and its
direction are chosen on the other n-1 items and then applied to the held-out
item. Binary properties (C2PA, EXIF make, encoder tag, domain list, extraction
success) are fixed rules with no fitting. Any property that scores far above
chance is a label shortcut: a detector can exploit it without detecting
anything, and every result on that set must be read against it.

  research/.venv/bin/python research/scripts/trivial_baselines.py
Writes results/trivial_baselines.csv (and _per_item.csv).
Inputs: data/evaluation/*, results/provenance_audit.csv, results/news_url_audit.csv
"""
import csv
import json
import math
import subprocess
from pathlib import Path

from PIL import Image

from common import EVAL, ROOT, read_rows, resolve_image, resolve_video

RES = ROOT / "research" / "results"
V1_SATIRE_DOMAINS = {"theonion.com", "babylonbee.com"}   # the v1 is_satire_domain() list (doc 1, F1)


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (math.nan, math.nan)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (round(c - h, 4), round(c + h, 4))


def loo_threshold(values: list[float], labels: list[str]) -> list[str]:
    """Leave-one-out predictions from a one-threshold stump (either direction)."""
    preds = []
    for i in range(len(values)):
        xs = [(v, l) for j, (v, l) in enumerate(zip(values, labels)) if j != i]
        cands = sorted({v for v, _ in xs})
        cuts = [(a + b) / 2 for a, b in zip(cands, cands[1:])] or cands
        best = (-1, 0.0, "FAKE")
        for t in cuts:
            for above in ("FAKE", "REAL"):
                below = "REAL" if above == "FAKE" else "FAKE"
                acc = sum((above if v > t else below) == l for v, l in xs)
                if acc > best[0]:
                    best = (acc, t, above)
        _, t, above = best
        below = "REAL" if above == "FAKE" else "FAKE"
        preds.append(above if values[i] > t else below)
    return preds


def ffprobe_duration(p: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(p)],
                         capture_output=True, text=True).stdout
    return float(json.loads(out or "{}").get("format", {}).get("duration") or 0.0)


def main():
    per_item, summary = [], []

    def add(set_name, name, kind, items, preds, note):
        k = sum(p == it["label"] for it, p in zip(items, preds))
        n = len(items)
        lo, hi = wilson(k, n)
        fake = [p for it, p in zip(items, preds) if it["label"] == "FAKE"]
        real = [p for it, p in zip(items, preds) if it["label"] == "REAL"]
        summary.append({"set": set_name, "baseline": name, "kind": kind, "n": n, "correct": k,
                        "accuracy": round(k / n, 4), "ci95_low": lo, "ci95_high": hi,
                        "fake_recall": round(sum(p == "FAKE" for p in fake) / max(len(fake), 1), 4),
                        "real_recall": round(sum(p == "REAL" for p in real) / max(len(real), 1), 4),
                        "note": note})
        for it, p in zip(items, preds):
            per_item.append({"set": set_name, "baseline": name, "id": it["id"], "item": it["item"],
                             "label": it["label"], "value": it.get(name, ""), "predicted": p})

    # ---------------- images
    prov = [r for r in csv.DictReader(open(RES / "provenance_audit.csv")) if r["transform"] == "none"]
    prov_img = {(r["id"], r["item"]): r for r in prov if r["set"] == "images"}
    imgs = []
    for r in read_rows(EVAL / "images" / "metadata.csv"):
        p = resolve_image(r["path"])
        with Image.open(p) as im:
            w, h = im.size
        pr = prov_img[(r["id"], p.name.strip())]
        imgs.append({"id": r["id"], "item": p.name.strip(), "label": r["label"], "max_side_px": max(w, h),
                     "pixels": w * h, "file_bytes": p.stat().st_size, "exif_make": pr["exif_make"]})
    for feat in ("max_side_px", "pixels", "file_bytes"):
        add("images", feat, "threshold, leave-one-out", imgs, loo_threshold([i[feat] for i in imgs], [i["label"] for i in imgs]),
            "one threshold on the property")
    add("images", "exif_make", "fixed rule", imgs, ["REAL" if i["exif_make"] else "FAKE" for i in imgs],
        "REAL if EXIF names a camera maker, else FAKE")

    # ---------------- videos
    prov_vid = {(r["id"], r["item"]): r for r in prov if r["set"] == "videos"}
    vids = []
    for r in read_rows(EVAL / "videos" / "metadata.csv"):
        p = resolve_video(r["filename"])
        pr = prov_vid[(r["id"], p.name)]
        vids.append({"id": r["id"], "item": p.name, "label": r["label"], "duration_s": ffprobe_duration(p),
                     "file_bytes": p.stat().st_size, "c2pa_ai": "trainedAlgorithmicMedia" in pr["c2pa_source_type"],
                     "encoder": pr["encoder"]})
    for feat in ("duration_s", "file_bytes"):
        add("videos", feat, "threshold, leave-one-out", vids, loo_threshold([v[feat] for v in vids], [v["label"] for v in vids]),
            "one threshold on the property")
    add("videos", "c2pa_ai", "fixed rule", vids, ["FAKE" if v["c2pa_ai"] else "REAL" for v in vids],
        "FAKE if a C2PA manifest declares trainedAlgorithmicMedia, else REAL")
    add("videos", "encoder", "fixed rule", vids, ["FAKE" if v["encoder"] == "Google" else "REAL" for v in vids],
        "FAKE if the container encoder tag is 'Google', else REAL")

    # ---------------- news
    news = [{"id": r["id"], "item": r["url"], "label": r["label"], "domain": r["domain"],
             "extraction": r["extraction_status"], "text_chars": int(r["text_chars"] or 0)}
            for r in csv.DictReader(open(RES / "news_url_audit.csv"))]
    add("news", "domain", "fixed rule", news, ["FAKE" if n["domain"] in V1_SATIRE_DOMAINS else "REAL" for n in news],
        "v1's two-domain satire list")
    add("news", "extraction", "fixed rule", news, ["REAL" if n["extraction"] == "SUCCESS" else "FAKE" for n in news],
        "REAL if the article text could be extracted, else FAKE (F11)")
    add("news", "text_chars", "threshold, leave-one-out", news,
        loo_threshold([n["text_chars"] for n in news], [n["label"] for n in news]), "one threshold on extracted text length")

    for name, rows in (("trivial_baselines.csv", summary), ("trivial_baselines_per_item.csv", per_item)):
        with open(RES / name, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    for s in summary:
        print(f"{s['set']:7s} {s['baseline']:12s} acc {s['accuracy']:.3f} [{s['ci95_low']:.3f}, {s['ci95_high']:.3f}]  "
              f"fake rec {s['fake_recall']:.2f} real rec {s['real_recall']:.2f}  ({s['kind']})")


if __name__ == "__main__":
    main()
