"""
MM-Soc misinformation tasks (Jin et al., ACL Findings 2024): PolitiFact and
GossipCop articles from FakeNewsNet (Shu et al., 2020), each with its image.

Source: the MM-Soc authors' Hugging Face datasets Ahren09/MMSoc_PolitiFact and
Ahren09/MMSoc_GossipCop (train/test parquet, columns image, text, label).
Label encoding: 1 = fake, 0 = real. MM-Soc's code maps 1 -> "fake", 0 -> "true"
(mmsoc/const.py LABELS_DICT) and the class balance matches FakeNewsNet's
(real is the majority: PolitiFact test 73/102, GossipCop test 2169/2672).

Evaluation items (research/splits/):
  mmsoc_politifact__test.txt   all 102 test items (MM-Soc's test split)
  mmsoc_gossipcop__test1000.txt 1,000 of 2,672 test items, stratified, seed 2026
  *__dev50.txt                  50 train items, stratified: development only
"""
import io
import sys

import pandas as pd
from huggingface_hub import hf_hub_download, list_repo_files
from PIL import Image

from datasets import DATA, stratified_sample, write_items, write_split

REPOS = {"mmsoc_politifact": "Ahren09/MMSoc_PolitiFact", "mmsoc_gossipcop": "Ahren09/MMSoc_GossipCop"}


def load(name: str) -> list[dict]:
    repo = REPOS[name]
    folder = DATA / name
    (folder / "images").mkdir(parents=True, exist_ok=True)
    rows = []
    for f in sorted(x for x in list_repo_files(repo, repo_type="dataset") if x.endswith(".parquet")):
        split = f.split("/")[-1].split("-")[0]
        df = pd.read_parquet(hf_hub_download(repo, f, repo_type="dataset", cache_dir=str(DATA / ".hf")))
        for i, rec in df.iterrows():
            idx = sum(1 for r in rows if r["split"] == split)
            iid = f"{split}_{idx:05d}"
            img_rel = ""
            img = rec.get("image")
            data = img.get("bytes") if isinstance(img, dict) else None
            if data:
                img_rel = f"images/{iid}.jpg"
                try:
                    Image.open(io.BytesIO(data)).convert("RGB").save(folder / img_rel, format="JPEG", quality=95)
                except Exception:
                    img_rel = ""
            text = str(rec["text"] or "")
            rows.append({"id": iid, "split": split, "label": "FAKE" if int(rec["label"]) == 1 else "REAL",
                         "label_orig": int(rec["label"]), "text": text,
                         "title": text.split("\n", 1)[0][:300], "image": img_rel})
    write_items(name, rows)
    return rows


def main():
    for name in REPOS:
        rows = load(name)
        test = [r for r in rows if r["split"] == "test"]
        train = [r for r in rows if r["split"] == "train"]
        if name == "mmsoc_politifact":
            write_split(name, "test", sorted(r["id"] for r in test))
        else:
            write_split(name, "test1000", stratified_sample(test, 1000))
        write_split(name, "dev50", stratified_sample(train, 50))
        n_img = sum(bool(r["image"]) for r in rows)
        print(f"{name}: {len(rows)} items ({len(train)} train, {len(test)} test), {n_img} with image; "
              f"test FAKE {sum(r['label'] == 'FAKE' for r in test)}/{len(test)}", file=sys.stderr)


if __name__ == "__main__":
    main()
