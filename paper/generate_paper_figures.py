from __future__ import annotations

import csv
import re
from pathlib import Path

from paper.figure_utils import (
    SUBTLE_TEXT,
    TEXT,
    draw_grouped_bar_chart,
    draw_heatmap,
    ensure_dir,
    load_font,
    new_canvas,
)


ROOT = Path(__file__).resolve().parents[1]
FIG_DIR = ROOT / "outputs" / "paper_figures"


PIPELINE_FILES = {
    "image": {
        "previous": ROOT / "data" / "evaluation" / "images" / "baseline_results_2.txt",
        "final": ROOT / "data" / "evaluation" / "images" / "metrics.txt",
    },
    "news": {
        "previous": ROOT / "data" / "evaluation" / "news" / "baseline_results_2.txt",
        "final": ROOT / "data" / "evaluation" / "news" / "metrics.txt",
    },
    "video": {
        "previous": ROOT / "data" / "evaluation" / "videos" / "baseline_results_2.txt",
        "final": ROOT / "data" / "evaluation" / "videos" / "metrics.txt",
    },
}


METRIC_LABELS = {
    "accuracy": "Accuracy",
    "precision": "Precision",
    "recall": "Recall",
    "f1": "F1",
    "coverage": "Coverage",
}


PREVIOUS_COLOR = "#b8b2a7"
FINAL_COLOR = "#0f766e"
DELTA_START = "#f4efe5"
DELTA_END = "#39b37c"


def parse_metric_block(text: str) -> dict[str, float]:
    patterns = {
        "accuracy": r"Accuracy\s*:\s*([0-9.]+)",
        "coverage": r"Coverage\s*:\s*([0-9.]+)",
        "precision": r"Precision\s*:\s*([0-9.]+)",
        "recall": r"Recall\s*:\s*([0-9.]+)",
        "f1": r"F1 Score\s*:\s*([0-9.]+)",
    }

    metrics: dict[str, float] = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        metrics[key] = float(match.group(1)) if match else (1.0 if key == "coverage" else 0.0)
    return metrics


def load_metrics(modality: str, version: str) -> dict[str, float]:
    path = PIPELINE_FILES[modality][version]
    text = path.read_text(encoding="utf-8")

    if modality == "image" and version == "final":
        section_label = "Cross-validated calibrated detector"
        if section_label in text:
            text = text.split(section_label, 1)[1]

    return parse_metric_block(text)


def build_summary_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []

    for modality in ("image", "news", "video"):
        for version in ("previous", "final"):
            metrics = load_metrics(modality, version)
            row = {"modality": modality, "version": version}
            row.update(metrics)
            rows.append(row)

    return rows


def export_summary(rows: list[dict[str, object]]) -> None:
    ensure_dir(FIG_DIR)
    output_path = FIG_DIR / "pipeline_benchmark_summary.csv"

    with open(output_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["modality", "version", "accuracy", "precision", "recall", "f1", "coverage"],
        )
        writer.writeheader()
        writer.writerows(rows)


def metric_values(rows: list[dict[str, object]], metric_key: str) -> tuple[list[float], list[float]]:
    previous = []
    final = []
    for modality in ("image", "news", "video"):
        prev_row = next(row for row in rows if row["modality"] == modality and row["version"] == "previous")
        final_row = next(row for row in rows if row["modality"] == modality and row["version"] == "final")
        previous.append(float(prev_row[metric_key]))
        final.append(float(final_row[metric_key]))
    return previous, final


def render_pipeline_dashboard(rows: list[dict[str, object]]) -> None:
    image, draw = new_canvas((1700, 1120))

    title_font = load_font(34, bold=True)
    subtitle_font = load_font(16)
    draw.text((48, 28), "Previous vs Final Pipeline Benchmark", font=title_font, fill=TEXT)
    draw.text(
        (48, 74),
        "Image/news use the saved benchmark reports. Image final uses the calibrated detector section.",
        font=subtitle_font,
        fill=SUBTLE_TEXT,
    )

    boxes = [
        (40, 120, 550, 560),
        (595, 120, 1105, 560),
        (1150, 120, 1660, 560),
        (190, 605, 815, 1050),
        (885, 605, 1510, 1050),
    ]

    categories = ["Image", "News", "Video"]
    chart_order = ["accuracy", "precision", "recall", "f1", "coverage"]

    for box, metric_key in zip(boxes, chart_order):
        previous, final = metric_values(rows, metric_key)
        draw_grouped_bar_chart(
            image,
            draw,
            box=box,
            title=METRIC_LABELS[metric_key],
            categories=categories,
            series_labels=["Previous", "Final"],
            series_values=[previous, final],
            series_colors=[PREVIOUS_COLOR, FINAL_COLOR],
            note="Scores normalized to 0-1.",
            y_max=1.0,
        )

    image.save(FIG_DIR / "pipeline_previous_vs_final.png")


def render_delta_heatmap(rows: list[dict[str, object]]) -> None:
    metrics = ["accuracy", "precision", "recall", "f1", "coverage"]
    row_labels = ["Image", "News", "Video"]
    col_labels = [METRIC_LABELS[key] for key in metrics]

    values: list[list[float]] = []
    max_delta = 0.0

    for modality in ("image", "news", "video"):
        previous = next(row for row in rows if row["modality"] == modality and row["version"] == "previous")
        final = next(row for row in rows if row["modality"] == modality and row["version"] == "final")
        deltas = [max(float(final[key]) - float(previous[key]), 0.0) for key in metrics]
        max_delta = max(max_delta, max(deltas, default=0.0))
        values.append(deltas)

    image, draw = new_canvas((1320, 720))
    title_font = load_font(32, bold=True)
    subtitle_font = load_font(16)
    draw.text((48, 28), "Pipeline Improvement Heatmap", font=title_font, fill=TEXT)
    draw.text(
        (48, 72),
        "Each cell shows final minus previous benchmark score. Higher is better.",
        font=subtitle_font,
        fill=SUBTLE_TEXT,
    )

    draw_heatmap(
        image,
        draw,
        box=(40, 120, 1280, 680),
        title="Metric Delta by Modality",
        row_labels=row_labels,
        col_labels=col_labels,
        values=values,
        start_color=DELTA_START,
        end_color=DELTA_END,
        note="Delta values are absolute score gains on the saved benchmark runs.",
        cell_formatter=lambda value: f"+{value:.2f}",
        value_max=max_delta or 1.0,
    )

    image.save(FIG_DIR / "pipeline_metric_deltas.png")


def main() -> None:
    ensure_dir(FIG_DIR)
    rows = build_summary_rows()
    export_summary(rows)
    render_pipeline_dashboard(rows)
    render_delta_heatmap(rows)
    print(f"Saved figures to: {FIG_DIR}")


if __name__ == "__main__":
    main()
