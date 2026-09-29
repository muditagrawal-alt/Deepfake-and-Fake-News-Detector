"""
FaceForensics++ (Rössler et al., ICCV 2019), c23 compression: original YouTube
videos and four face manipulations (Deepfakes, Face2Face, FaceSwap,
NeuralTextures). Access granted by the authors after their request form
(research use only; never redistributed: research/data is git-ignored).

Files are fetched from the authors' EU2 server with the same URL layout and
file names as their official download script (faceforensics_download_v4.py,
`--server EU2 -c c23`); only the videos of the official splits used here are
fetched. Official splits: github.com/ondyari/FaceForensics/dataset/splits
(pairs of target/source ids; manipulated videos are named target_source).

Evaluation items (research/splits/):
  ffpp_c23__test.txt     the official test split: 140 originals + 4 x 140 manipulated (700)
  ffpp_c23__test200.txt  100 originals + 25 per manipulation, seed 2026 (a subset of test)
  ffpp_c23__dev20.txt    10 originals + 10 manipulated from the official validation split

  research/.venv/bin/python -m datasets.ffpp
"""
import json
import random
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from datasets import DATA, write_items, write_split

NAME = "ffpp_c23"
BASE = "https://kaldir.vc.in.tum.de/faceforensics/v3/"
SPLITS_URL = "https://raw.githubusercontent.com/ondyari/FaceForensics/master/dataset/splits/{}.json"
METHODS = ["Deepfakes", "Face2Face", "FaceSwap", "NeuralTextures"]
FOLDER = DATA / NAME


def fetch(url: str, dest: Path) -> bool:
    """curl, not urllib: Python's TLS handshake with the authors' server times out (checked 2026-09-29)."""
    if dest.exists() and dest.stat().st_size > 0:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    r = subprocess.run(["curl", "-s", "-f", "-L", "--retry", "4", "--retry-delay", "5", "--max-time", "600",
                        "-o", str(tmp), url])
    if r.returncode == 0 and tmp.exists() and tmp.stat().st_size > 0:
        tmp.rename(dest)
        return True
    tmp.unlink(missing_ok=True)
    return False


def videos_for(pairs: list[list[str]]) -> list[dict]:
    out = []
    for a, b in pairs:
        for vid in (a, b):
            out.append({"id": f"original__{vid}", "label": "REAL", "label_orig": "original",
                        "rel": f"original_sequences/youtube/c23/videos/{vid}.mp4"})
        for m in METHODS:
            for name in (f"{a}_{b}", f"{b}_{a}"):
                out.append({"id": f"{m}__{name}", "label": "FAKE", "label_orig": m,
                            "rel": f"manipulated_sequences/{m}/c23/videos/{name}.mp4"})
    return out


def main():
    rng = random.Random(2026)
    splits = {s: json.loads(subprocess.run(["curl", "-s", "-f", "-L", SPLITS_URL.format(s)], capture_output=True,
                                           check=True).stdout) for s in ("val", "test")}
    test = videos_for(splits["test"])
    val = videos_for(splits["val"])
    originals = sorted(r["id"] for r in test if r["label"] == "REAL")
    test200 = set(rng.sample(originals, 100))
    for m in METHODS:
        test200 |= set(rng.sample(sorted(r["id"] for r in test if r["label_orig"] == m), 25))
    dev20 = set(rng.sample(sorted(r["id"] for r in val if r["label"] == "REAL"), 10))
    dev20 |= set(rng.sample(sorted(r["id"] for r in val if r["label"] == "FAKE"), 10))
    wanted = [r for r in test] + [r for r in val if r["id"] in dev20]
    with ThreadPoolExecutor(max_workers=3) as pool:
        ok = list(pool.map(lambda r: fetch(BASE + r["rel"], FOLDER / r["rel"]), wanted))
    failed = [r["id"] for r, good in zip(wanted, ok) if not good]
    rows = [{"id": r["id"], "split": "test" if r in test else "val", "label": r["label"],
             "label_orig": r["label_orig"], "video": r["rel"]} for r, good in zip(wanted, ok) if good]
    write_items(NAME, rows)
    write_split(NAME, "test", sorted(r["id"] for r in test))
    write_split(NAME, "test200", sorted(test200))
    write_split(NAME, "dev20", sorted(dev20))
    print(f"{NAME}: {len(rows)} videos fetched, {len(failed)} failed {failed[:5]}; test {len(test)}, "
          f"test200 {len(test200)}, dev20 {len(dev20)}", file=sys.stderr)


if __name__ == "__main__":
    main()
