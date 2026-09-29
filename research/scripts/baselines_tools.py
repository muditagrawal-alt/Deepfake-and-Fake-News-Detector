"""
Existing, publicly available detectors run on exactly the items the engine is
evaluated on, so the comparison is item-for-item rather than across papers.

Tools (all used as released; nothing is trained or tuned here):
  bert_news     jy46604790/Fake-News-Bert-Detect  (RoBERTa; LABEL_0 = fake). v1's news model.
  face_dima806  dima806/deepfake_vs_real_image_detection  (ViT; 0 = Real, 1 = Fake), face crops
  face_prithiv  prithivMLmods/Deep-Fake-Detector-v2-Model  (ViT; 0 = Realism, 1 = Deepfake), face crops
  sdxl_onnx     Organika/sdxl-detector, the ONNX export bundled with the backend (AI-generated images)

Face tools: 8 frames spread over each video (or the image itself); the largest
face found by OpenCV's frontal-face Haar cascade is cropped with a 20% margin
(the whole frame is used when no face is found, and that is counted); the
video score is the mean fake probability over frames. Threshold 0.5.

Output: runs/<set>[__<split>]__tool__<tool>__<transform>__run1.{csv,json},
with the same columns as engine runs, so build_results.py treats both alike.

  research/.venv/bin/python research/scripts/baselines_tools.py --tool face_dima806 --bench celebdf_v2 --split test100
  research/.venv/bin/python research/scripts/baselines_tools.py --tool bert_news --bench mmsoc_politifact --split test
  research/.venv/bin/python research/scripts/baselines_tools.py --tool sdxl_onnx --set images --transform img_norm512
"""
import argparse
import csv
import json
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from common import EVAL, ROOT, RUNS, TRANSFORMS, read_rows, resolve_image, resolve_video  # noqa: E402

DATA = ROOT / "research" / "data"
SPLITS = ROOT / "research" / "splits"
TOOLS = {
    "bert_news": ("jy46604790/Fake-News-Bert-Detect", "text"),
    "face_dima806": ("dima806/deepfake_vs_real_image_detection", "face"),
    "face_prithiv": ("prithivMLmods/Deep-Fake-Detector-v2-Model", "face"),
    "sdxl_onnx": ("Organika/sdxl-detector", "image"),
}


def device():
    import torch
    return "mps" if torch.backends.mps.is_available() else "cpu"


class TextTool:
    def __init__(self, repo):
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        self.tok = AutoTokenizer.from_pretrained(repo)
        self.model = AutoModelForSequenceClassification.from_pretrained(repo).to(device()).eval()

    def p_fake(self, text: str) -> float:
        import torch
        enc = self.tok(text, truncation=True, max_length=512, return_tensors="pt").to(self.model.device)
        with torch.no_grad():
            probs = self.model(**enc).logits.softmax(-1)[0].cpu().numpy()
        return float(probs[0])          # LABEL_0 = fake (model card; v1's mapping)


class FaceTool:
    def __init__(self, repo):
        import cv2
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        self.proc = AutoImageProcessor.from_pretrained(repo)
        self.model = AutoModelForImageClassification.from_pretrained(repo).to(device()).eval()
        labels = {int(k): v.lower() for k, v in self.model.config.id2label.items()}
        self.fake_idx = next(i for i, v in labels.items() if v in ("fake", "deepfake"))
        self.cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        self.no_face = 0

    def crop(self, img: Image.Image) -> Image.Image:
        import cv2
        gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        faces = self.cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
        if len(faces) == 0:
            self.no_face += 1
            return img
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        m = int(0.2 * max(w, h))
        return img.crop((max(0, x - m), max(0, y - m), min(img.width, x + w + m), min(img.height, y + h + m)))

    def p_fake_images(self, imgs: list[Image.Image]) -> float:
        import torch
        batch = self.proc(images=[self.crop(i) for i in imgs], return_tensors="pt").to(self.model.device)
        with torch.no_grad():
            probs = self.model(**batch).logits.softmax(-1)[:, self.fake_idx].cpu().numpy()
        return float(probs.mean())


class SdxlTool:
    def __init__(self, repo):
        sys.path.insert(0, str(ROOT / "backend"))
        from detector.config import Settings
        from detector.forensics.onnx_detector import OnnxImageDetector
        self.det = OnnxImageDetector(Settings(enable_onnx_detector=True))

    def p_fake_path(self, path: Path) -> float:
        return float(self.det.predict_path(path)["fake_probability"])


def video_frames(path: Path, n: int = 8) -> list[Image.Image]:
    dur = float(json.loads(subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(path)],
                                          capture_output=True, text=True).stdout)["format"]["duration"])
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        for k in range(n):
            t = dur * (k + 0.5) / n
            f = Path(tmp) / f"{k}.jpg"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", str(f)])
            if f.exists():
                out.append(Image.open(f).convert("RGB"))
    return out


def items(args):
    if args.bench:
        keep = (SPLITS / f"{args.bench}__{args.split}.txt").read_text().split()
        csv.field_size_limit(sys.maxsize)
        with open(DATA / args.bench / "items.csv", newline="", encoding="utf-8") as fh:
            by = {r["id"]: r for r in csv.DictReader(fh)}
        for i in keep:
            r = by[i]
            media = (DATA / args.bench / r["video"]) if r.get("video") else (DATA / args.bench / r["image"]) if r.get("image") else None
            yield r["id"], r["id"], r["label"], r.get("text", ""), media
    else:
        for r in read_rows(EVAL / args.set / "metadata.csv"):
            if args.set == "images":
                p = resolve_image(r["path"]); yield r["id"], p.name.strip(), r["label"].strip().upper(), "", p
            elif args.set == "videos":
                p = resolve_video(r["filename"]); yield r["id"], p.name, r["label"].strip().upper(), "", p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tool", choices=sorted(TOOLS), required=True)
    ap.add_argument("--set", choices=["images", "videos"])
    ap.add_argument("--bench")
    ap.add_argument("--split")
    ap.add_argument("--transform", default="none", choices=list(TRANSFORMS))
    args = ap.parse_args()
    repo, kind = TOOLS[args.tool]
    tool = {"text": TextTool, "face": FaceTool, "image": SdxlTool}[kind](repo)
    set_name = args.bench or args.set
    head = [args.bench, args.split] if args.bench else [args.set]
    name = "__".join([*head, "tool", args.tool, args.transform]) + "__run1"
    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        for iid, ident, gt, text, media in items(args):
            t0 = time.time()
            err, p = "", None
            try:
                src = media
                if args.transform != "none" and media is not None:
                    src = TRANSFORMS[args.transform](media, Path(tmp))
                if kind == "text":
                    p = tool.p_fake(text)
                elif kind == "image":
                    p = tool.p_fake_path(src)
                else:
                    frames = video_frames(src) if src.suffix.lower() in (".mp4", ".mov", ".webm") else [Image.open(src).convert("RGB")]
                    p = tool.p_fake_images(frames)
            except Exception as exc:
                err = f"{type(exc).__name__}: {exc}"[:300]
            pred = "" if p is None else ("FAKE" if p >= 0.5 else "REAL")
            rows.append({"id": iid, "item": ident, "ground_truth": gt, "predicted": pred,
                         "correct": "" if p is None else int(pred == gt),
                         "confidence": "" if p is None else round(max(p, 1 - p), 4),
                         "p_fake": "" if p is None else round(p, 4), "error": err, "seconds": round(time.time() - t0, 2)})
            print(f"[{len(rows)}] {gt} -> {pred or 'ERROR'} {'' if p is None else round(p, 3)} {err[:60]}", flush=True)
    with open(RUNS / f"{name}.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    ok = [r for r in rows if not r["error"]]
    manifest = {"run": name, "engine": "tool", "set": set_name, "split": args.split, "n": len(rows),
                "transform": args.transform, "backend": "tool", "model": repo, "tool": args.tool,
                "no_face_frames": getattr(tool, "no_face", None), "threshold": 0.5,
                "errors": len(rows) - len(ok), "accuracy_completed": round(sum(r["correct"] for r in ok) / max(len(ok), 1), 4),
                "valid": len(rows) - len(ok) <= 0.05 * len(rows),
                "git_commit": subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=ROOT).stdout.strip(),
                "finished_utc": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    (RUNS / f"{name}.json").write_text(json.dumps(manifest, indent=2))
    print(f"{name}: accuracy={manifest['accuracy_completed']} errors={manifest['errors']} no-face frames={manifest['no_face_frames']}")


if __name__ == "__main__":
    main()
