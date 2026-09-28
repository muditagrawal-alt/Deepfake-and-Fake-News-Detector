"""
Provenance coverage of the in-house image and video sets, and whether each
control transform removes it.

For every item: C2PA presence / validation state / signer / IPTC digital
source type, XMP DigitalSourceType, EXIF camera make, container encoder tag.
Each transform (img_norm512; vid_strip, vid_strip_trim5) is applied and the
same facts are re-read, so the paper can state exactly which provenance
signals a control removes.

  backend/.venv/bin/python research/scripts/audit_provenance.py
Writes results/provenance_audit.csv and results/provenance_audit_summary.csv.
"""
import asyncio
import csv
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EVAL, ROOT, TRANSFORMS, read_rows, resolve_image, resolve_video  # noqa: E402
from detector.forensics.exif import analyze_image_metadata  # noqa: E402
from detector.forensics.video_meta import analyze_video_metadata  # noqa: E402

OUT = ROOT / "research" / "results" / "provenance_audit.csv"
SUMMARY = ROOT / "research" / "results" / "provenance_audit_summary.csv"
IMAGE_T = ["none", "img_norm512"]
VIDEO_T = ["none", "vid_strip", "vid_strip_trim5"]


def facts_image(path: Path) -> dict:
    m = analyze_image_metadata(path)
    c = m.get("c2pa") or {}
    return {"c2pa_present": bool(c.get("present")), "c2pa_state": c.get("validation_state") or "",
            "c2pa_signer": c.get("signer") or "", "c2pa_source_type": ";".join(c.get("digital_source_types") or []),
            "xmp_source_type": (m.get("xmp") or {}).get("DigitalSourceType") or "",
            "exif_make": (m.get("exif") or {}).get("Make") or "", "encoder": ""}


async def facts_video(path: Path) -> dict:
    m = await analyze_video_metadata(str(path))
    c = m.get("c2pa") or {}
    return {"c2pa_present": bool(c.get("present")), "c2pa_state": c.get("validation_state") or "",
            "c2pa_signer": c.get("signer") or "", "c2pa_source_type": ";".join(c.get("digital_source_types") or []),
            "xmp_source_type": "", "exif_make": "",
            "encoder": (m.get("container_tags") or {}).get("encoder") or ""}


async def main():
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for r in read_rows(EVAL / "images" / "metadata.csv"):
            src = resolve_image(r["path"])
            for t in IMAGE_T:
                p = src if t == "none" else TRANSFORMS[t](src, tmp)
                out.append({"set": "images", "id": r["id"], "item": src.name.strip(), "label": r["label"],
                            "transform": t, **facts_image(p)})
        for r in read_rows(EVAL / "videos" / "metadata.csv"):
            src = resolve_video(r.get("path") or r.get("filename") or r.get("file") or "")
            for t in VIDEO_T:
                p = src if t == "none" else TRANSFORMS[t](src, tmp)
                out.append({"set": "videos", "id": r["id"], "item": src.name, "label": r["label"],
                            "transform": t, **(await facts_video(p))})
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)

    groups = defaultdict(list)
    for o in out:
        groups[(o["set"], o["transform"], o["label"])].append(o)
    summary = []
    for (s, t, label), items in sorted(groups.items()):
        summary.append({
            "set": s, "transform": t, "label": label, "n": len(items),
            "c2pa_present": sum(i["c2pa_present"] for i in items),
            "c2pa_valid": sum(i["c2pa_state"] in ("Valid", "Trusted") for i in items),
            "c2pa_ai_source_type": sum("trainedAlgorithmicMedia" in i["c2pa_source_type"]
                                       or "compositeWithTrainedAlgorithmicMedia" in i["c2pa_source_type"] for i in items),
            "xmp_source_type": sum(bool(i["xmp_source_type"]) for i in items),
            "exif_camera_make": sum(bool(i["exif_make"]) for i in items),
            "encoder_tag": sum(bool(i["encoder"]) for i in items),
        })
    with open(SUMMARY, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(summary[0])); w.writeheader(); w.writerows(summary)
    for s in summary:
        print(s)


if __name__ == "__main__":
    asyncio.run(main())
