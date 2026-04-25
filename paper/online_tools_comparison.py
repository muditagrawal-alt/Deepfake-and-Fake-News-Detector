from __future__ import annotations

import csv
from dataclasses import dataclass
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


@dataclass(frozen=True)
class Tool:
    name: str
    source_url: str
    supports_news_text: bool
    supports_image: bool
    supports_video: bool
    supports_audio: bool
    supports_local_or_on_prem: bool
    supports_source_fusion: bool
    notes: str


def tools() -> list[Tool]:
    """
    Capability comparison based on public product/docs pages plus this repo's feature set.

    This is intentionally not an accuracy leaderboard.
    """
    return [
        Tool(
            name="This project",
            source_url="local-repository",
            supports_news_text=True,
            supports_image=True,
            supports_video=True,
            supports_audio=False,
            supports_local_or_on_prem=True,
            supports_source_fusion=True,
            notes="Repo-local benchmarked pipeline with optional OSINT verification.",
        ),
        Tool(
            name="Reality Defender",
            source_url="https://www.realitydefender.com/platform",
            supports_news_text=True,
            supports_image=True,
            supports_video=True,
            supports_audio=True,
            supports_local_or_on_prem=True,
            supports_source_fusion=False,
            notes="Multimodal enterprise detector with API, hosted SaaS, private cloud, and on-prem deployment.",
        ),
        Tool(
            name="Hive",
            source_url="https://thehive.ai/apis/ai-generated-content-classification",
            supports_news_text=True,
            supports_image=True,
            supports_video=True,
            supports_audio=True,
            supports_local_or_on_prem=True,
            supports_source_fusion=False,
            notes="API-based AI-generated content detection across text, image, video, and audio.",
        ),
        Tool(
            name="Deepware",
            source_url="https://deepware.ai/faq/",
            supports_news_text=False,
            supports_image=False,
            supports_video=True,
            supports_audio=False,
            supports_local_or_on_prem=True,
            supports_source_fusion=False,
            notes="Video-only scanner focused on AI face manipulation, with web/API/SDK deployment.",
        ),
        Tool(
            name="Sensity AI",
            source_url="https://sensity.ai/deepfake-detection-for-video-image-audio/",
            supports_news_text=False,
            supports_image=True,
            supports_video=True,
            supports_audio=True,
            supports_local_or_on_prem=True,
            supports_source_fusion=False,
            notes="Forensic-style image/video/audio detection with cloud and on-prem options.",
        ),
    ]


CAPABILITIES = [
    ("supports_news_text", "News / Text"),
    ("supports_image", "Image"),
    ("supports_video", "Video"),
    ("supports_audio", "Audio"),
    ("supports_local_or_on_prem", "Local / On-prem"),
    ("supports_source_fusion", "Source Fusion"),
]


HEATMAP_START = "#f1ede5"
HEATMAP_END = "#2f855a"
BAR_COLOR = "#1d4ed8"


def export_sources(rows: list[Tool]) -> None:
    ensure_dir(FIG_DIR)

    with open(FIG_DIR / "online_tools_sources.csv", "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=["tool", "source_url", "notes"])
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "tool": row.name,
                    "source_url": row.source_url,
                    "notes": row.notes,
                }
            )


def render_capability_heatmap(rows: list[Tool]) -> None:
    values = [
        [int(getattr(tool, attribute)) for attribute, _ in CAPABILITIES]
        for tool in rows
    ]

    image, draw = new_canvas((1480, 860))
    title_font = load_font(32, bold=True)
    subtitle_font = load_font(16)
    draw.text((48, 28), "Project vs Existing Detection Tools", font=title_font, fill=TEXT)
    draw.text(
        (48, 72),
        "Capabilities are taken from official docs/pages plus this repo's implemented feature set.",
        font=subtitle_font,
        fill=SUBTLE_TEXT,
    )

    draw_heatmap(
        image,
        draw,
        box=(40, 120, 1440, 820),
        title="Capability Heatmap",
        row_labels=[tool.name for tool in rows],
        col_labels=[label for _, label in CAPABILITIES],
        values=values,
        start_color=HEATMAP_START,
        end_color=HEATMAP_END,
        note="1 = clearly supported in the public product description or repo implementation; 0 = not shown.",
        cell_formatter=lambda value: "Yes" if int(value) else "No",
        value_max=1.0,
    )

    image.save(FIG_DIR / "project_vs_existing_tools_heatmap.png")


def render_capability_scores(rows: list[Tool]) -> None:
    image, draw = new_canvas((1320, 760))
    title_font = load_font(32, bold=True)
    subtitle_font = load_font(16)
    draw.text((48, 28), "Supported Capability Count", font=title_font, fill=TEXT)
    draw.text(
        (48, 72),
        "Simple count across the six comparison dimensions used in the heatmap.",
        font=subtitle_font,
        fill=SUBTLE_TEXT,
    )

    categories = [tool.name for tool in rows]
    values = [[sum(int(getattr(tool, attribute)) for attribute, _ in CAPABILITIES) for tool in rows]]

    draw_grouped_bar_chart(
        image,
        draw,
        box=(40, 120, 1280, 700),
        title="Capability Score",
        categories=categories,
        series_labels=["Supported capabilities"],
        series_values=values,
        series_colors=[BAR_COLOR],
        note="Higher means the tool covers more of the comparison dimensions, not that it is more accurate.",
        y_max=float(len(CAPABILITIES)),
    )

    image.save(FIG_DIR / "project_vs_existing_tools_scores.png")


def main() -> None:
    rows = tools()
    ensure_dir(FIG_DIR)
    export_sources(rows)
    render_capability_heatmap(rows)
    render_capability_scores(rows)
    print(f"Saved figures to: {FIG_DIR}")


if __name__ == "__main__":
    main()
