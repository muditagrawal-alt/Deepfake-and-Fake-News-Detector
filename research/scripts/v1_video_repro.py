"""
Faithful re-implementation of the v1 (paper) video pipeline, used to test the
reported 100% video accuracy under a metadata-stripping control.

Ported line-for-line from legacy/models/video_detector.py (frame sampling,
Haar face ratio, ffprobe metadata rules, predict_video scoring) and the video
block of legacy/app.py::run_pipeline (the second score-fusion stage), with
external verification disabled exactly as in legacy/evaluate_videos.py. The
only substitution is the frame classifier, run through onnxruntime instead of
PyTorch; the two agree on all 50 benchmark images with 0.0000 max drift.

Writes research/runs/videos__v1repro__<transform>.csv
"""
import argparse
import csv
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
EVAL = ROOT / "data" / "evaluation"
sys.path.insert(0, str(Path(__file__).parent))
from common import read_rows, resolve_video, vid_strip  # noqa: E402

MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)
SESS = ort.InferenceSession(str(ROOT / "backend/models/onnx/model.onnx"), providers=["CPUExecutionProvider"])
INP = SESS.get_inputs()[0].name
CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def frame_probs(pils):
    x = np.stack([((np.asarray(p.convert("RGB").resize((224, 224), Image.BICUBIC), np.float32) / 255 - MEAN) / STD).transpose(2, 0, 1) for p in pils])
    out = []
    for i in range(0, len(x), 8):
        lg = SESS.run(None, {INP: x[i:i + 8]})[0]
        e = np.exp(lg - lg.max(1, keepdims=True)); out.extend((e / e.sum(1, keepdims=True))[:, 0].tolist())
    return out


def analyze_frames(path, frames_dir, fps=1, max_frames=32):
    cap = cv2.VideoCapture(str(path))
    src_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0) or 30.0
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(int(round(src_fps / fps)), 1)
    idx = list(range(0, n, step))
    if len(idx) > max_frames:
        idx = [idx[int(i)] for i in np.linspace(0, len(idx) - 1, num=max_frames, dtype=np.int32)]
    pils = []
    for i in idx:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, bgr = cap.read()
        if not ok or bgr is None:
            continue
        pils.append(Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)))
        cv2.imwrite(str(frames_dir / f"frame_{i:06d}.jpg"), bgr)
    cap.release()
    probs = frame_probs(pils) if pils else []
    fake = sum(p >= 0.5 for p in probs)
    return {"total_frames": len(probs), "real_frames": len(probs) - fake, "fake_frames": fake,
            "avg_fake_probability": float(np.mean(probs)) if probs else 0.5}


def has_audio(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type",
                        "-of", "default=noprint_wrappers=1:nokey=1", str(path)], capture_output=True, text=True)
    return "audio" in r.stdout.lower()


def analyze_metadata(path):
    meta = json.loads(subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format",
                                      "-show_streams", str(path)], capture_output=True, text=True).stdout or "{}")
    res = {"has_creation_time": False, "has_device_info": False, "duration_seconds": 0.0, "suspicious_encoder": False,
           "generator_detected": False, "generator_keyword": None, "public_context_metadata": False}
    if not meta:
        return res
    try:
        res["duration_seconds"] = float(meta.get("format", {}).get("duration"))
    except (TypeError, ValueError):
        pass
    tags = dict(meta.get("format", {}).get("tags", {}))
    for s in meta.get("streams", []):
        tags.update(s.get("tags", {}))
    t = lambda k: str(tags.get(k) or "").strip().lower()
    for k in tags:
        kl = k.lower()
        res["has_creation_time"] |= "creation" in kl
        res["has_device_info"] |= kl in {"make", "model"}
    enc = t("encoder")
    fields = [enc, t("description"), t("comment"), t("software"), t("tool"), t("creator"), t("encoded_by")]
    for kw in ["google", "gemini", "invideo", "runway", "capcut", "canva", "pika", "luma", "synthesia", "heygen"]:
        if any(kw in f for f in fields if f):
            res["generator_detected"], res["generator_keyword"] = True, kw
            break
    res["suspicious_encoder"] = any(w in enc for w in ["google", "capcut", "canva", "invideo", "runway", "pika", "luma", "synthesia", "heygen"])
    res["public_context_metadata"] = any(t(k) for k in {"title", "artist", "album", "genre", "show", "episode_id"})
    return res


def face_ratio(frames_dir):
    fs = sorted(frames_dir.glob("*.jpg"))
    if not fs:
        return 0.0
    hits = 0
    for f in fs:
        img = cv2.imread(str(f))
        if img is None:
            continue
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hits += len(CASCADE.detectMultiScale(g, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))) > 0
    return hits / len(fs)


def predict_video(path, frames_dir):
    fa = analyze_frames(path, frames_dir)
    audio, md, fr = has_audio(path), analyze_metadata(path), face_ratio(frames_dir)
    tot, rf, ff, avg = fa["total_frames"], fa["real_frames"], fa["fake_frames"], fa["avg_fake_probability"]
    if tot == 0:
        return "ERROR", 0.0, {}
    ffr, frr = ff / tot, rf / tot
    dur, gen, pub = md["duration_seconds"], md["generator_detected"], md["public_context_metadata"]
    long_v, short_v = dur >= 30.0, 0.0 < dur <= 12.0
    R = F = 0
    if frr >= 0.75: R += 2
    elif ffr >= 0.75: F += 2
    elif rf > ff: R += 1
    elif ff > rf: F += 1
    else: R += 1; F += 1
    if avg >= 0.75: F += 2
    elif avg >= 0.60: F += 1
    elif avg <= 0.25: R += 2
    elif avg <= 0.40: R += 1
    else: R += 1; F += 1
    if audio:
        if not gen: R += 1
    else: F += 2
    if gen: F += 4
    elif md["suspicious_encoder"]: F += 1
    if md["has_creation_time"]: R += 1
    if md["has_device_info"]: R += 1
    if long_v and not gen: R += 2
    if pub and not gen: R += 2
    if not gen and audio and long_v and fr >= 0.15: R += 1
    if not gen and audio and fr >= 0.95: R += 1
    if short_v and gen: F += 1
    if gen:
        if fr < 0.2: F += 1
    else:
        if fr >= 0.8: R += 2
        elif fr >= 0.3: R += 1
        elif not long_v: F += 1
    label = "FAKE" if F > R else ("REAL" if R > F else "UNCERTAIN")
    details = {"face_ratio": round(fr, 2), "has_audio": audio, "metadata": md, **fa}
    return label, max(R, F) / max(R + F, 1), details


def run_pipeline_video(label, details):
    """Second fusion stage from legacy/app.py (external verification disabled)."""
    R = F = 0
    if label == "FAKE": F += 2
    elif label == "REAL": R += 2
    else: F += 1; R += 1
    md = details.get("metadata", {})
    fr, audio = details.get("face_ratio", 0.0), details.get("has_audio", False)
    dur, gen, pub = float(md.get("duration_seconds") or 0), bool(md.get("generator_detected")), bool(md.get("public_context_metadata"))
    if md.get("suspicious_encoder"): F += 1
    if md.get("has_creation_time"): R += 1
    if md.get("has_device_info"): R += 1
    if gen: F += 1
    elif audio: R += 1
    if dur >= 30 and not gen: R += 1
    if pub and not gen: R += 1
    if not gen and fr >= 0.8: R += 1
    elif gen and dur <= 12: F += 1
    return ("REAL" if R > F else "FAKE" if F > R else "UNCERTAIN"), R, F


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transform", choices=["none", "vid_strip"], default="none")
    args = ap.parse_args()
    rows = read_rows(EVAL / "videos" / "metadata.csv")
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for r in rows:
            src = resolve_video(r["filename"])
            path = vid_strip(src, tmp) if args.transform == "vid_strip" else src
            fd = tmp / f"frames_{src.stem}"; fd.mkdir()
            label, conf, det = predict_video(path, fd)
            final, R, F = run_pipeline_video(label, det)
            gt = r["label"].strip().upper()
            md = det.get("metadata", {})
            out.append({"id": r["id"], "input": src.name, "ground_truth": gt, "predicted": final,
                        "correct": int(gt == final), "stage1_label": label, "real_score": R, "fake_score": F,
                        "p_fake": round(F / max(R + F, 1), 4),
                        "generator_detected": md.get("generator_detected"), "generator_keyword": md.get("generator_keyword"),
                        "avg_fake_probability": round(det.get("avg_fake_probability", 0.5), 4),
                        "face_ratio": det.get("face_ratio"), "has_audio": det.get("has_audio"),
                        "duration_seconds": round(md.get("duration_seconds", 0.0), 1)})
            print(f"{gt:5s} -> {final:9s} (stage1 {label:9s}) gen={md.get('generator_detected')!s:5s} "
                  f"avgfake={det.get('avg_fake_probability', 0):.2f} face={det.get('face_ratio')}", flush=True)
    name = f"videos__v1repro__rules_metadata__{args.transform}"
    with open(ROOT / "research/runs" / f"{name}.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
    acc = sum(o["correct"] for o in out) / len(out)
    print(f"\n{name}: accuracy={acc:.4f} ({sum(o['correct'] for o in out)}/{len(out)})")


if __name__ == "__main__":
    main()
