"""
Celeb-DF v2 (Li et al., CVPR 2020): celebrity interview videos from YouTube
and face-swapped versions of them. Obtained from the authors after their
request form (research use only; never redistributed: research/data is
git-ignored).

Layout of the official archive:
  Celeb-real/        real celebrity videos
  YouTube-real/      additional real videos
  Celeb-synthesis/   face-swapped (fake) videos
  List_of_testing_videos.txt   "<label> <folder>/<file>.mp4", the official test set

The label code in the test list is cross-checked against the folder name
(Celeb-synthesis = FAKE, *-real = REAL); a mismatch aborts.

Evaluation items (research/splits/):
  celebdf_v2__test.txt     the 518 official test videos
  celebdf_v2__test100.txt  100 of them, stratified by class, seed 2026 (quick runs; a subset of test)
  celebdf_v2__dev20.txt    20 videos outside the test list, stratified: development only

  research/.venv/bin/python -m datasets.celebdf [path/to/Celeb-DF-v2.zip]
"""
import sys
import zipfile
from pathlib import Path

from datasets import DATA, stratified_sample, write_items, write_split

NAME = "celebdf_v2"
FOLDER_LABEL = {"Celeb-real": "REAL", "YouTube-real": "REAL", "Celeb-synthesis": "FAKE"}


def extract(zip_path: Path) -> Path:
    dest = DATA / NAME
    if (dest / "raw").exists() and any((dest / "raw").rglob("List_of_testing_videos.txt")):
        return dest / "raw"
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(dest / "raw")
    return dest / "raw"


def main():
    zip_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA / NAME / "Celeb-DF-v2.zip"
    raw = extract(zip_path)
    test_list = next(raw.rglob("List_of_testing_videos.txt"))
    base = test_list.parent
    rows, test_ids = [], set()
    code_for = {}
    for line in test_list.read_text().split("\n"):
        if not line.strip():
            continue
        code, rel = line.split(maxsplit=1)
        folder = rel.split("/")[0]
        label = FOLDER_LABEL[folder]
        if code_for.setdefault(label, code) != code:
            raise SystemExit(f"label code {code} for {rel} contradicts folder {folder}")
        test_ids.add(rel)
    for folder, label in FOLDER_LABEL.items():
        for p in sorted((base / folder).glob("*.mp4")):
            rel = f"{folder}/{p.name}"
            rows.append({"id": rel.replace("/", "__").removesuffix(".mp4"), "split": "test" if rel in test_ids else "train",
                         "label": label, "label_orig": code_for.get(label, ""),
                         "video": str(p.relative_to(DATA / NAME))})
    present = {"/".join(Path(r["video"]).parts[-2:]) for r in rows}   # "<folder>/<file>.mp4"
    missing = test_ids - present
    if missing:
        raise SystemExit(f"{len(missing)} test videos missing from the archive, e.g. {sorted(missing)[:3]}")
    write_items(NAME, rows)
    test = [r for r in rows if r["split"] == "test"]
    write_split(NAME, "test", sorted(r["id"] for r in test))
    write_split(NAME, "test100", stratified_sample(test, 100))
    write_split(NAME, "dev20", stratified_sample([r for r in rows if r["split"] == "train"], 20))
    print(f"{NAME}: {len(rows)} videos; test {len(test)} (FAKE {sum(r['label'] == 'FAKE' for r in test)}); "
          f"label codes {code_for}", file=sys.stderr)
    if zip_path.exists() and zip_path.parent == DATA / NAME:
        zip_path.unlink()   # extracted copy is authoritative; the archive can be re-downloaded


if __name__ == "__main__":
    main()
