"""
Reproduce the v1 (paper) image calibrator and ablate its feature groups.

v1 = Organika/sdxl-detector probability + 15 hand-crafted image statistics,
fed to a RandomForest (300 trees, balanced classes), evaluated with
leave-one-out cross-validation on the 50-image benchmark. This mirrors
legacy/models/image_detector.py and legacy/evaluate_images.py exactly, except
that the detector runs through onnxruntime instead of PyTorch; the two were
verified to agree on all 50 labels with 0.0000 maximum probability drift.

Question: how much of the reported 0.86 comes from image SIZE, which differs
systematically between the real (median 300 px) and fake (median 1408 px)
images in this benchmark?

Writes research/results/v1_image_ablation.csv and ..._per_item.csv.
"""
import csv
import re
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import LeaveOneOut

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "backend" / "models" / "onnx" / "model.onnx"
OUT = ROOT / "research" / "results"

FEATURES = [
    "det_fake_prob", "det_confidence", "det_label_fake",
    "width", "height", "aspect",
    "gray_mean", "gray_std", "sat_mean", "sat_std", "val_mean", "val_std",
    "laplacian_var", "edge_density", "entropy", "hf_ratio", "mf_ratio", "colorfulness",
]
GROUPS = {
    "detector": FEATURES[0:3],
    "size": FEATURES[3:6],
    "statistics": FEATURES[6:18],
}
CONFIGS = {
    "v1_full (as published)": FEATURES,
    "without size": [f for f in FEATURES if f not in GROUPS["size"]],
    "size only": GROUPS["size"],
    "detector only": GROUPS["detector"],
    "statistics only": GROUPS["statistics"],
    "detector + statistics (no size)": GROUPS["detector"] + GROUPS["statistics"],
}
SEEDS = [42, 0, 1, 2, 3, 4, 5, 6, 7, 8]   # 42 is the seed used in v1

MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)


def resolve(p: str) -> Path:
    c = ROOT / p.strip()
    if c.exists():
        return c
    want = re.sub(r"[^a-z0-9]", "", c.name.lower())
    for ch in c.parent.iterdir():
        if re.sub(r"[^a-z0-9]", "", ch.name.lower()) == want:
            return ch
    raise FileNotFoundError(p)


def colorfulness(rgb):
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    rg, yb = np.abs(r - g), np.abs(0.5 * (r + g) - b)
    return float(np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2))


def features(path: Path, sess, inp) -> list[float]:
    img = Image.open(path).convert("RGB")
    x = ((np.asarray(img.resize((224, 224), Image.BICUBIC), np.float32) / 255 - MEAN) / STD).transpose(2, 0, 1)[None]
    logits = sess.run(None, {inp: x})[0][0]
    p = np.exp(logits - logits.max()); p /= p.sum()
    fake = float(p[0])                       # id2label: 0 = artificial
    conf, label_fake = max(fake, 1 - fake), float(fake >= 0.5)

    rgb = np.array(img)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, w = gray.shape
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).ravel()
    hist = hist / hist.sum()
    entropy = float(-(hist[hist > 0] * np.log2(hist[hist > 0])).sum())
    g = cv2.resize(gray, (256, 256))
    power = np.abs(np.fft.fftshift(np.fft.fft2(g))) ** 2
    yy, xx = np.ogrid[:256, :256]
    rad = np.sqrt((yy - 128) ** 2 + (xx - 128) ** 2)
    tot = float(power.sum()) or 1.0
    return [
        fake, conf, label_fake,
        float(w), float(h), float(w / max(h, 1)),
        float(gray.mean()), float(gray.std()),
        float(hsv[..., 1].mean()), float(hsv[..., 1].std()),
        float(hsv[..., 2].mean()), float(hsv[..., 2].std()),
        float(cv2.Laplacian(gray, cv2.CV_64F).var()),
        float(cv2.Canny(gray, 100, 200).mean() / 255.0),
        entropy,
        float(power[rad > 64].sum() / tot),
        float(power[(rad > 32) & (rad <= 64)].sum() / tot),
        colorfulness(rgb),
    ]


def loocv(X, y, seed):
    pred = np.zeros(len(y), dtype=np.float32)
    for tr, te in LeaveOneOut().split(X):
        rf = RandomForestClassifier(n_estimators=300, random_state=seed, class_weight="balanced")
        rf.fit(X[tr], y[tr])
        pred[te[0]] = rf.predict_proba(X[te])[0][1]
    return pred


def main():
    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    inp = sess.get_inputs()[0].name
    rows = list(csv.DictReader(open(ROOT / "data/evaluation/images/metadata.csv")))
    paths = [resolve(r["path"]) for r in rows]
    y = np.array([1 if r["label"].strip().upper() == "FAKE" else 0 for r in rows])
    X = np.array([features(p, sess, inp) for p in paths], dtype=np.float64)

    det_acc = float(((X[:, 0] >= 0.5).astype(int) == y).mean())
    print(f"raw detector (no calibrator): accuracy {det_acc:.3f}")

    summary, per_item = [], {"id": [r["id"] for r in rows], "ground_truth": ["FAKE" if v else "REAL" for v in y]}
    for name, feats in CONFIGS.items():
        idx = [FEATURES.index(f) for f in feats]
        accs = []
        for seed in SEEDS:
            p = loocv(X[:, idx], y, seed)
            accs.append(float(((p >= 0.5).astype(int) == y).mean()))
            if seed == 42:
                per_item[name] = ["FAKE" if v >= 0.5 else "REAL" for v in p]
        a = np.array(accs)
        summary.append({
            "configuration": name, "n_features": len(feats),
            "accuracy_seed42": round(accs[0], 4),
            "accuracy_mean_10seeds": round(float(a.mean()), 4),
            "accuracy_std_10seeds": round(float(a.std(ddof=1)), 4),
            "accuracy_min": round(float(a.min()), 4), "accuracy_max": round(float(a.max()), 4),
        })
        print(f"{name:34s} n_feat={len(feats):2d}  seed42={accs[0]:.3f}  mean={a.mean():.3f} ± {a.std(ddof=1):.3f}")

    # Feature importance of the published configuration (seed 42, fit on all data).
    rf = RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced").fit(X, y)
    imp = sorted(zip(FEATURES, rf.feature_importances_), key=lambda t: -t[1])
    print("\nfeature importance, published configuration:")
    for f, v in imp[:8]:
        grp = next(g for g, fs in GROUPS.items() if f in fs)
        print(f"  {f:16s} {v:.3f}  [{grp}]")
    size_share = sum(v for f, v in imp if f in GROUPS["size"])
    print(f"  -> size features carry {size_share:.1%} of total importance")

    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "v1_image_ablation.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(summary[0].keys())); w.writeheader(); w.writerows(summary)
    with open(OUT / "v1_image_feature_importance.csv", "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["feature", "group", "importance"])
        for f, v in imp:
            w.writerow([f, next(g for g, fs in GROUPS.items() if f in fs), round(float(v), 5)])
    with open(OUT / "v1_image_ablation_per_item.csv", "w", newline="") as fh:
        w = csv.writer(fh); keys = list(per_item.keys()); w.writerow(keys)
        for i in range(len(y)):
            w.writerow([per_item[k][i] for k in keys])
    np.save(OUT / ".v1_image_features.npy", X)
    print(f"\nwrote {OUT/'v1_image_ablation.csv'}")


if __name__ == "__main__":
    sys.exit(main())
