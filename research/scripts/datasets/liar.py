"""
LIAR (Wang, ACL 2017): 12.8k short political statements with six PolitiFact
truth ratings. Downloaded from the author's official release.

Binary mapping used here, as in prior binary LIAR work:
  FAKE = pants-fire, false, barely-true     REAL = half-true, mostly-true, true
The six-way label is kept in label_orig.

Labels come from PolitiFact, so open-book runs must exclude fact-check sites
(EXCLUDE_FACT_CHECKS=true); the closed-book condition is reported alongside.

Evaluation items: liar__test.txt (all 1,267 official test statements) and
liar__dev50.txt (50 validation statements, stratified).
"""
import csv
import io
import sys
import urllib.request
import zipfile

from datasets import DATA, stratified_sample, write_items, write_split

URL = "https://www.cs.ucsb.edu/~william/data/liar_dataset.zip"
FAKE = {"pants-fire", "false", "barely-true"}
COLS = ["json_id", "label", "statement", "subject", "speaker", "job", "state", "party",
        "barely_true_ct", "false_ct", "half_true_ct", "mostly_true_ct", "pants_fire_ct", "context"]


def main():
    folder = DATA / "liar"
    folder.mkdir(parents=True, exist_ok=True)
    zpath = folder / "liar_dataset.zip"
    if not zpath.exists():
        urllib.request.urlretrieve(URL, zpath)
    rows = []
    with zipfile.ZipFile(zpath) as z:
        for split, fname in (("train", "train.tsv"), ("valid", "valid.tsv"), ("test", "test.tsv")):
            raw = z.read(fname).decode("utf-8")
            for rec in csv.reader(io.StringIO(raw), delimiter="\t", quoting=csv.QUOTE_NONE):
                if len(rec) < 14:
                    continue
                d = dict(zip(COLS, rec))
                rows.append({"id": f"{split}_{d['json_id'].removesuffix('.json')}", "split": split,
                             "label": "FAKE" if d["label"] in FAKE else "REAL", "label_orig": d["label"],
                             "text": d["statement"], "speaker": d["speaker"],
                             "context": d["context"]})
    write_items("liar", rows)
    test = [r for r in rows if r["split"] == "test"]
    write_split("liar", "test", sorted(r["id"] for r in test))
    write_split("liar", "dev50", stratified_sample([r for r in rows if r["split"] == "valid"], 50))
    print(f"liar: {len(rows)} statements; test {len(test)} (FAKE {sum(r['label'] == 'FAKE' for r in test)})",
          file=sys.stderr)


if __name__ == "__main__":
    main()
