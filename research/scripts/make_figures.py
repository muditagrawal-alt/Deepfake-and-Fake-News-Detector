"""
Paper figures, generated only from research/results/*.csv and research/runs/*.csv.
Each figure is written as PNG (300 dpi, for review) and PDF (vector, for LaTeX).
"""
import re
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image
from sklearn.metrics import roc_curve

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / "research" / "results"
RUNS = ROOT / "research" / "runs"
FIG = ROOT / "research" / "figures"
FIG.mkdir(parents=True, exist_ok=True)

# One restrained palette, colour-blind safe (Okabe-Ito subset).
C = {"v1": "#8C8C8C", "v2": "#0072B2", "control": "#D55E00", "real": "#009E73", "fake": "#CC79A7", "ink": "#222222"}
plt.rcParams.update({
    "font.family": "serif", "font.serif": ["Times New Roman", "Times", "DejaVu Serif"],
    "font.size": 9, "axes.titlesize": 10, "axes.labelsize": 9, "legend.fontsize": 8,
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True,
    "grid.color": "#e6e6e6", "grid.linewidth": 0.6, "axes.axisbelow": True,
    "figure.dpi": 150, "savefig.bbox": "tight", "savefig.pad_inches": 0.03,
})


def save(fig, name):
    for ext in ("png", "pdf"):
        fig.savefig(FIG / f"{name}.{ext}", dpi=300 if ext == "png" else None)
    plt.close(fig)
    print("wrote", name)


def fig_image_size_confound():
    rows = pd.read_csv(ROOT / "data/evaluation/images/metadata.csv")
    sizes, labels = [], []
    for _, r in rows.iterrows():
        p = ROOT / r["path"].strip()
        if not p.exists():
            want = re.sub(r"[^a-z0-9]", "", p.name.lower())
            p = next(c for c in p.parent.iterdir() if re.sub(r"[^a-z0-9]", "", c.name.lower()) == want)
        w, h = Image.open(p).size
        sizes.append(max(w, h)); labels.append(r["label"].strip().upper())
    df = pd.DataFrame({"max_side": sizes, "label": labels})
    fig, ax = plt.subplots(figsize=(3.4, 2.3))
    rng = np.random.default_rng(0)
    for i, lab in enumerate(["REAL", "FAKE"]):
        v = df[df.label == lab].max_side
        ax.scatter(i + rng.uniform(-0.12, 0.12, len(v)), v, s=14, alpha=0.8,
                   color=C["real"] if lab == "REAL" else C["fake"], edgecolor="white", linewidth=0.4)
        ax.hlines(v.median(), i - 0.25, i + 0.25, color=C["ink"], linewidth=1.2)
    ax.axhline(1024, color=C["control"], linestyle="--", linewidth=0.9)
    ax.text(1.42, 1024, "threshold\n1024 px", color=C["control"], va="center", fontsize=7)
    ax.set_yscale("log"); ax.set_xticks([0, 1], ["Real (n=25)", "Fake (n=25)"])
    ax.set_ylabel("Longest side (px, log)")
    ax.set_title("Image benchmark: resolution separates the classes")
    df.to_csv(RES / "image_benchmark_resolution.csv", index=False)
    save(fig, "fig01_image_resolution_confound")


def fig_v1_image_ablation():
    d = pd.read_csv(RES / "v1_image_ablation.csv")
    order = ["v1_full (as published)", "size only", "without size", "statistics only", "detector only"]
    d = d.set_index("configuration").loc[order].reset_index()
    labels = ["Published\n(18 features)", "Image size\nonly (3)", "Without size\n(15)", "Image stats\nonly (12)", "Detector\nonly (3)"]
    colors = [C["v1"], C["control"], C["v2"], C["v2"], C["v2"]]
    fig, ax = plt.subplots(figsize=(3.5, 2.4))
    ax.bar(range(len(d)), d.accuracy_mean_10seeds, yerr=d.accuracy_std_10seeds, color=colors,
           capsize=2.5, width=0.62, error_kw={"linewidth": 0.8})
    for i, v in enumerate(d.accuracy_mean_10seeds):
        ax.text(i, v + 0.025, f"{v:.2f}", ha="center", fontsize=7.5)
    ax.axhline(0.5, color="#999", linewidth=0.7, linestyle=":")
    ax.set_xticks(range(len(d)), labels, fontsize=7)
    ax.set_ylim(0.4, 1.02); ax.set_ylabel("LOO-CV accuracy (mean ± sd, 10 seeds)")
    ax.set_title("v1 image calibrator: a size-only model beats it")
    save(fig, "fig02_v1_image_calibrator_ablation")


def fig_v1_video_metadata():
    rows = []
    for tag, label in [("none", "Original files"), ("vid_strip", "Metadata stripped")]:
        d = pd.read_csv(RUNS / f"videos__v1repro__rules_metadata__{tag}.csv")
        rows.append({"condition": label, "Accuracy": d.correct.mean(),
                     "Fake recall": d[d.ground_truth == "FAKE"].correct.mean(),
                     "Real recall": d[d.ground_truth == "REAL"].correct.mean()})
    d = pd.DataFrame(rows)
    d.to_csv(RES / "v1_video_metadata_ablation.csv", index=False)
    metrics = ["Accuracy", "Fake recall", "Real recall"]
    x = np.arange(len(metrics)); w = 0.36
    fig, ax = plt.subplots(figsize=(3.4, 2.3))
    for i, (col, cond) in enumerate([(C["v1"], "Original files"), (C["control"], "Metadata stripped")]):
        vals = d[d.condition == cond][metrics].values[0]
        ax.bar(x + (i - 0.5) * w, vals, w, color=col, label=cond)
        for xi, v in zip(x, vals):
            ax.text(xi + (i - 0.5) * w, v + 0.02, f"{v:.2f}", ha="center", fontsize=7)
    ax.set_xticks(x, metrics); ax.set_ylim(0, 1.12); ax.set_ylabel("Score (n = 30)")
    ax.legend(frameon=False, loc="upper right", ncol=1)
    ax.set_title("v1 video: identical pixels, metadata removed")
    save(fig, "fig03_v1_video_metadata_ablation")


def fig_forest():
    s = pd.read_csv(RES / "benchmark_summary.csv")
    s["label"] = s["set"].str.capitalize() + " · " + s["system"] + " · " + s["configuration"]
    s = s.iloc[::-1].reset_index(drop=True)
    fig, ax = plt.subplots(figsize=(4.6, 0.26 * len(s) + 0.6))
    for i, r in s.iterrows():
        col = C["v1"] if r.system.startswith("v1") else C["v2"]
        if "stripped" in r.configuration or "normalised" in r.configuration:
            col = C["control"]
        ax.plot([r.acc_ci95_low, r.acc_ci95_high], [i, i], color=col, linewidth=1.6)
        ax.plot(r.accuracy, i, "o", color=col, markersize=4)
    ax.set_yticks(range(len(s)), s.label, fontsize=7)
    ax.set_xlim(0.3, 1.02); ax.set_xlabel("Accuracy with 95% Wilson interval")
    ax.set_title("All current results: intervals are wide at n ≤ 50")
    save(fig, "fig04_accuracy_forest_plot")


def fig_confusions():
    cm = pd.read_csv(RES / "confusion_matrices.csv")
    keys = cm[["set", "system", "configuration"]].drop_duplicates().values.tolist()
    n = len(keys); cols = 4; rws = int(np.ceil(n / cols))
    fig, axes = plt.subplots(rws, cols, figsize=(7.2, 1.75 * rws))
    for ax in axes.flat:
        ax.axis("off")
    for ax, (st, sy, cf) in zip(axes.flat, keys):
        sub = cm[(cm.set == st) & (cm.system == sy) & (cm.configuration == cf)]
        m = sub.pivot(index="true", columns="predicted", values="count").reindex(index=["FAKE", "REAL"], columns=["FAKE", "REAL", "UNCERTAIN"])
        ax.axis("on"); ax.grid(False)
        ax.imshow(m.values, cmap="Blues", vmin=0, vmax=m.values.sum() / 2)
        for (i, j), v in np.ndenumerate(m.values):
            ax.text(j, i, int(v), ha="center", va="center", fontsize=8, color="white" if v > m.values.sum() / 4 else C["ink"])
        ax.set_xticks([0, 1, 2], ["F", "R", "U"], fontsize=7); ax.set_yticks([0, 1], ["F", "R"], fontsize=7)
        ax.set_title(f"{st} · {sy}\n{cf}", fontsize=6.5)
    fig.suptitle("Confusion matrices (rows: truth, cols: prediction; U = uncertain)", fontsize=9)
    fig.tight_layout()
    save(fig, "fig05_confusion_matrices")


def fig_sample_size():
    n = np.arange(30, 3001)
    fig, ax = plt.subplots(figsize=(3.4, 2.3))
    for p, ls in [(0.95, "-"), (0.85, "--"), (0.70, ":")]:
        ax.plot(n, 1.96 * np.sqrt(p * (1 - p) / n) * 100, ls, color=C["v2"], linewidth=1.1, label=f"accuracy {p:.2f}")
    for mark in (50, 400, 1000):
        ax.axvline(mark, color="#bbb", linewidth=0.6)
        ax.text(mark * 1.05, 11.5, f"n={mark}", fontsize=6.5, color="#666")
    ax.set_xscale("log"); ax.set_ylim(0, 13)
    ax.set_xlabel("Test items per benchmark (log)"); ax.set_ylabel("95% CI half-width (pts)")
    ax.legend(frameon=False); ax.set_title("How many items a claim needs")
    save(fig, "fig06_sample_size_ci_width")


def fig_roc():
    runs = [
        ("images__v1__sdxl_rf_calibrator_loocv__final", "Images v1 (published)", C["v1"], "calibrated_fake_probability"),
        ("images__v2__gemini35fl__detector_on__run1", "Images v2 detector on", C["control"], None),
        ("images__v2__gemini35fl__detector_off__run1", "Images v2 detector off", C["v2"], None),
        ("news__v2__gemini35fl__pre_satire_rule__run1", "News v2", C["fake"], None),
    ]
    fig, ax = plt.subplots(figsize=(3.2, 3.0))
    for stem, label, col, col_score in runs:
        d = pd.read_csv(RUNS / f"{stem}.csv", dtype=str).fillna("")
        d = d[d.get("error", "") == ""] if "error" in d else d
        y = (d.ground_truth.str.upper() == "FAKE").astype(int)
        if col_score:
            s = d[col_score].astype(float)
        else:
            c = d.confidence.astype(float); pr = d.predicted.str.upper()
            s = np.where(pr == "FAKE", c, np.where(pr == "REAL", 1 - c, 0.5))
        fpr, tpr, _ = roc_curve(y, s)
        from sklearn.metrics import auc
        ax.plot(fpr, tpr, color=col, linewidth=1.2, label=f"{label} (AUC {auc(fpr, tpr):.2f})")
    ax.plot([0, 1], [0, 1], ":", color="#999", linewidth=0.8)
    ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate")
    ax.legend(frameon=False, fontsize=6.5, loc="lower right"); ax.set_title("ROC on the existing benchmark sets")
    save(fig, "fig07_roc_curves")


def fig_trivial_baselines():
    """How far one file/URL property gets on each in-house set (results/trivial_baselines.csv)."""
    t = pd.read_csv(RES / "trivial_baselines.csv")
    names = {"max_side_px": "longest side (px)", "pixels": "pixel count", "file_bytes": "file size",
             "exif_make": "EXIF camera make", "duration_s": "duration", "c2pa_ai": "C2PA AI credential",
             "encoder": "encoder tag = Google", "domain": "v1 satire-domain list", "extraction": "text extractable",
             "text_chars": "extracted text length"}
    t = t[t.baseline != "pixels"]
    fig, axes = plt.subplots(1, 3, figsize=(7.0, 2.3), sharex=True)
    for ax, set_ in zip(axes, ["images", "videos", "news"]):
        d = t[t.set == set_].sort_values("accuracy")
        y = np.arange(len(d))
        ax.errorbar(d.accuracy, y, xerr=[d.accuracy - d.ci95_low, d.ci95_high - d.accuracy], fmt="o",
                    color=C["control"], ecolor="#bbbbbb", elinewidth=1.2, capsize=0, markersize=4)
        ax.set_yticks(y); ax.set_yticklabels([names.get(b, b) for b in d.baseline])
        ax.axvline(0.5, color="#999", linestyle=":", linewidth=0.8)
        ax.set_xlim(0.4, 1.02); ax.set_title(f"{set_.capitalize()} (n = {int(d.n.iloc[0])})")
        ax.set_xlabel("Accuracy (95% CI)")
    fig.suptitle("One property, no content analysis: label shortcuts in the in-house sets", y=0.99, fontsize=10)
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    save(fig, "fig08_trivial_baselines")


def fig_v3_controls():
    """v3 accuracy on original vs controlled inputs, next to the best trivial baseline on each input."""
    summ = pd.read_csv(RES / "benchmark_summary.csv")
    v3 = summ[summ.system.str.startswith("v3") & summ.set.isin(["images", "videos"])]
    if v3.empty:
        print("skip fig09_v3_controls: no v3 runs yet")
        return
    order = [("images", "none"), ("images", "img_norm512"), ("videos", "none"), ("videos", "vid_strip"),
             ("videos", "vid_strip_trim5")]
    label = {"none": "original", "img_norm512": "512 px, no EXIF", "vid_strip": "metadata stripped",
             "vid_strip_trim5": "stripped + 5 s"}
    systems = sorted(v3.system.unique())
    fig, ax = plt.subplots(figsize=(6.4, 2.6))
    x = np.arange(len(order))
    width = 0.8 / max(len(systems), 1)
    palette = [C["v2"], C["real"], C["fake"]]
    for k, sysname in enumerate(systems):
        acc, lo, hi = [], [], []
        for set_, tf in order:
            r = v3[(v3.system == sysname) & (v3.set == set_) & v3.configuration.str.startswith(tf + ";") & (v3.run.astype(str) == "1")]
            if r.empty:
                acc.append(np.nan); lo.append(0); hi.append(0); continue
            r = r.iloc[0]
            acc.append(r.accuracy); lo.append(r.accuracy - r.acc_ci95_low); hi.append(r.acc_ci95_high - r.accuracy)
        ax.bar(x + (k - (len(systems) - 1) / 2) * width, acc, width * 0.9, yerr=[lo, hi], color=palette[k % 3],
               error_kw={"elinewidth": 0.8, "ecolor": "#555"}, label=sysname)
    ax.axhline(0.5, color="#999", linestyle=":", linewidth=0.8)
    ax.set_xticks(x); ax.set_xticklabels([f"{s}\n{label[t]}" for s, t in order])
    ax.set_ylim(0, 1.05); ax.set_ylabel("Accuracy (95% CI)")
    ax.legend(frameon=False, fontsize=7, loc="lower left")
    ax.set_title("v3 under shortcut controls (in-house sets)")
    save(fig, "fig09_v3_controls")


if __name__ == "__main__":
    fig_image_size_confound()
    fig_v1_image_ablation()
    fig_v1_video_metadata()
    fig_forest()
    fig_confusions()
    fig_sample_size()
    fig_roc()
    fig_trivial_baselines()
    fig_v3_controls()
