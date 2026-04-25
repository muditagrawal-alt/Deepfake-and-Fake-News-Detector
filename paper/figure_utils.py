from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont


BACKGROUND = "#f7f5ef"
PANEL_BACKGROUND = "#fffdf8"
PANEL_BORDER = "#d6d0c4"
TEXT = "#1f2933"
SUBTLE_TEXT = "#52606d"
GRID = "#d9dfe7"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_font(size: int, bold: bool = False):
    candidates = []
    if bold:
        candidates.extend(
            [
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/Library/Fonts/Arial Bold.ttf",
            ]
        )
    candidates.extend(
        [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        ]
    )

    for candidate in candidates:
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size=size)
            except OSError:
                continue

    return ImageFont.load_default()


def text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]

    for word in words[1:]:
        proposal = f"{current} {word}"
        width, _ = text_size(draw, proposal, font)
        if width <= max_width:
            current = proposal
        else:
            lines.append(current)
            current = word

    lines.append(current)
    return lines


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font,
    fill: str,
    max_width: int,
    line_spacing: int = 4,
    anchor: str = "la",
) -> tuple[int, int]:
    lines = wrap_text(draw, text, font, max_width=max_width)
    _, line_height = text_size(draw, "Ag", font)
    x, y = xy
    total_height = 0

    for line in lines:
        if anchor == "ma":
            width, _ = text_size(draw, line, font)
            draw.text((x - width / 2, y + total_height), line, font=font, fill=fill)
        else:
            draw.text((x, y + total_height), line, font=font, fill=fill)
        total_height += line_height + line_spacing

    return (max((text_size(draw, line, font)[0] for line in lines), default=0), total_height)


def draw_panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, subtitle: str | None = None) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=18, fill=PANEL_BACKGROUND, outline=PANEL_BORDER, width=2)

    title_font = load_font(24, bold=True)
    subtitle_font = load_font(14)
    draw.text((x0 + 20, y0 + 16), title, font=title_font, fill=TEXT)

    if subtitle:
        draw.text((x0 + 20, y0 + 48), subtitle, font=subtitle_font, fill=SUBTLE_TEXT)


def interpolate_color(start_hex: str, end_hex: str, ratio: float) -> tuple[int, int, int]:
    ratio = max(0.0, min(1.0, ratio))
    start = tuple(int(start_hex[index : index + 2], 16) for index in (1, 3, 5))
    end = tuple(int(end_hex[index : index + 2], 16) for index in (1, 3, 5))
    return tuple(int(a + (b - a) * ratio) for a, b in zip(start, end))


def draw_grouped_bar_chart(
    image: Image.Image,
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    categories: list[str],
    series_labels: list[str],
    series_values: list[list[float]],
    series_colors: list[str],
    note: str | None = None,
    y_max: float = 1.0,
) -> None:
    draw_panel(draw, box, title=title, subtitle=note)

    x0, y0, x1, y1 = box
    plot_left = x0 + 68
    plot_top = y0 + 86
    plot_right = x1 - 24
    plot_bottom = y1 - 86

    axis_font = load_font(12)
    label_font = load_font(14)
    value_font = load_font(11)
    legend_font = load_font(13)

    for step in range(5):
        value = y_max * step / 4
        y = int(plot_bottom - (value / y_max) * (plot_bottom - plot_top))
        draw.line((plot_left, y, plot_right, y), fill=GRID, width=1)
        label = f"{value:.2f}".rstrip("0").rstrip(".")
        width, height = text_size(draw, label, axis_font)
        draw.text((plot_left - width - 8, y - height / 2), label, font=axis_font, fill=SUBTLE_TEXT)

    draw.line((plot_left, plot_top, plot_left, plot_bottom), fill=TEXT, width=2)
    draw.line((plot_left, plot_bottom, plot_right, plot_bottom), fill=TEXT, width=2)

    group_width = (plot_right - plot_left) / max(len(categories), 1)
    bar_gap = 8
    usable_width = group_width * 0.72
    bar_width = max(int((usable_width - bar_gap * (len(series_labels) - 1)) / max(len(series_labels), 1)), 12)

    for index, category in enumerate(categories):
        group_left = plot_left + index * group_width + (group_width - (bar_width * len(series_labels) + bar_gap * (len(series_labels) - 1))) / 2

        for series_index, values in enumerate(series_values):
            value = float(values[index])
            bar_left = int(group_left + series_index * (bar_width + bar_gap))
            bar_right = bar_left + bar_width
            bar_top = int(plot_bottom - (max(min(value, y_max), 0.0) / y_max) * (plot_bottom - plot_top))

            draw.rounded_rectangle(
                (bar_left, bar_top, bar_right, plot_bottom),
                radius=8,
                fill=series_colors[series_index],
                outline=None,
            )

            value_label = f"{value:.2f}"
            width, height = text_size(draw, value_label, value_font)
            draw.text(
                (bar_left + (bar_width - width) / 2, max(plot_top - 4, bar_top - height - 4)),
                value_label,
                font=value_font,
                fill=TEXT,
            )

        draw_wrapped_text(
            draw,
            (int(plot_left + index * group_width + group_width / 2), plot_bottom + 16),
            category,
            font=label_font,
            fill=TEXT,
            max_width=int(group_width - 8),
            anchor="ma",
        )

    legend_x = plot_right - 190
    legend_y = y0 + 18
    for series_index, series_label in enumerate(series_labels):
        offset_y = legend_y + series_index * 22
        draw.rounded_rectangle(
            (legend_x, offset_y, legend_x + 14, offset_y + 14),
            radius=4,
            fill=series_colors[series_index],
        )
        draw.text((legend_x + 22, offset_y - 1), series_label, font=legend_font, fill=TEXT)


def draw_heatmap(
    image: Image.Image,
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    row_labels: list[str],
    col_labels: list[str],
    values: list[list[float]],
    start_color: str,
    end_color: str,
    note: str | None = None,
    cell_formatter=None,
    value_max: float = 1.0,
) -> None:
    draw_panel(draw, box, title=title, subtitle=note)

    x0, y0, x1, y1 = box
    header_font = load_font(13, bold=True)
    label_font = load_font(14)
    value_font = load_font(14, bold=True)

    row_label_width = 200
    header_height = 90
    table_left = x0 + row_label_width
    table_top = y0 + header_height
    table_right = x1 - 24
    table_bottom = y1 - 28

    cell_width = (table_right - table_left) / max(len(col_labels), 1)
    cell_height = (table_bottom - table_top) / max(len(row_labels), 1)

    for col_index, label in enumerate(col_labels):
        center_x = int(table_left + col_index * cell_width + cell_width / 2)
        draw_wrapped_text(
            draw,
            (center_x, y0 + 26),
            label,
            font=header_font,
            fill=TEXT,
            max_width=int(cell_width - 12),
            anchor="ma",
        )

    for row_index, row_label in enumerate(row_labels):
        row_y = int(table_top + row_index * cell_height)
        draw_wrapped_text(
            draw,
            (x0 + 18, int(row_y + 14)),
            row_label,
            font=label_font,
            fill=TEXT,
            max_width=row_label_width - 28,
        )

        for col_index, raw_value in enumerate(values[row_index]):
            x_left = int(table_left + col_index * cell_width)
            y_top = row_y
            ratio = (float(raw_value) / value_max) if value_max else 0.0
            color = interpolate_color(start_color, end_color, ratio)

            draw.rounded_rectangle(
                (x_left + 4, y_top + 4, int(x_left + cell_width - 4), int(y_top + cell_height - 4)),
                radius=12,
                fill=color,
                outline=PANEL_BORDER,
            )

            label = cell_formatter(raw_value) if cell_formatter else f"{raw_value:.2f}"
            width, height = text_size(draw, label, value_font)
            draw.text(
                (x_left + cell_width / 2 - width / 2, y_top + cell_height / 2 - height / 2),
                label,
                font=value_font,
                fill=TEXT,
            )


def new_canvas(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", size, color=BACKGROUND)
    return image, ImageDraw.Draw(image)
