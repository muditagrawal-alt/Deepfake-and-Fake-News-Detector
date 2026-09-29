"""
MMFakeBench (Liu et al., ICLR 2025): image-text pairs, each real or one of
three kinds of misinformation: textual veracity distortion (false text),
visual veracity distortion (AI-generated or edited image) and cross-modal
mismatch (the image does not match the text). Gated on Hugging Face
(liuxuannan/MMFakeBench, data usage protocol accepted by the account holder);
never redistributed (research/data is git-ignored).

label       REAL if gt_answers == "True", else FAKE
label_orig  fake_cls: original | textual_veracity_distortion | visual_veracity_distortion | mismatch
meta        text_source and image_source as JSON. These name the generator or source dataset
            (e.g. "GPT-generated Rumor") and would reveal the label, so they are stored for
            analysis only and never shown to the model.

Evaluation items (research/splits/):
  mmfakebench__test1000.txt  1,000 of the 10,000 test pairs, stratified by fake_cls, seed 2026
  mmfakebench__val200.txt    200 of the 1,000 validation pairs, stratified: development only

Only the images of the selected items are extracted from the archives.

  research/.venv/bin/python -m datasets.mmfakebench
"""
import json
import random
import sys
import zipfile

from datasets import DATA, write_items, write_split

NAME = "mmfakebench"
FOLDER = DATA / NAME


def stratified(rows, n, key, seed=2026):
    rng = random.Random(seed)
    groups = {}
    for r in sorted(rows, key=lambda r: r["id"]):
        groups.setdefault(r[key], []).append(r)
    out = []
    for k, g in sorted(groups.items()):
        out += rng.sample(g, round(n * len(g) / len(rows)))
    return sorted(r["id"] for r in out)


def extract(zip_name: str, wanted: set[str]) -> dict[str, str]:
    """Extract the images listed in `wanted` (paths as in the JSON); return json path -> local path."""
    out = {}
    with zipfile.ZipFile(FOLDER / zip_name) as z:
        names = z.namelist()
        for want in wanted:
            tail = want.lstrip("/")
            match = next((n for n in names if n.endswith(tail)), None)
            if match is None:
                continue
            z.extract(match, FOLDER / "images")
            out[want] = f"images/{match}"
    return out


def main():
    rows = []
    for split in ("val", "test"):
        for i, rec in enumerate(json.load(open(FOLDER / f"MMFakeBench_{split}.json"))):
            rows.append({"id": f"{split}_{i:05d}", "split": split,
                         "label": "REAL" if rec["gt_answers"] == "True" else "FAKE", "label_orig": rec["fake_cls"],
                         "text": rec["text"], "image_json": rec["image_path"],
                         "meta": json.dumps({"text_source": rec["text_source"], "image_source": rec["image_source"]})})
    val = [r for r in rows if r["split"] == "val"]
    test = [r for r in rows if r["split"] == "test"]
    val200 = set(stratified(val, 200, "label_orig"))
    test1000 = set(stratified(test, 1000, "label_orig"))
    paths = {}
    for split, zip_name, keep in (("val", "MMFakeBench_val.zip", val200), ("test", "MMFakeBench_test.zip", test1000)):
        if (FOLDER / zip_name).exists():
            paths[split] = extract(zip_name, {r["image_json"] for r in rows if r["id"] in keep})
    kept = []
    for r in rows:
        if r["id"] in val200 | test1000:
            local = paths.get(r["split"], {}).get(r["image_json"], "")
            kept.append({**{k: v for k, v in r.items() if k != "image_json"}, "image": local})
    missing = [r["id"] for r in kept if not r["image"]]
    write_items(NAME, kept)
    write_split(NAME, "val200", sorted(val200))
    write_split(NAME, "test1000", sorted(test1000))
    print(f"{NAME}: val200 {len(val200)}, test1000 {len(test1000)}; images missing for {len(missing)} "
          f"(e.g. {missing[:3]})", file=sys.stderr)


if __name__ == "__main__":
    main()
