#!/usr/bin/env python3
"""
Assemble the demo video from the segments recorded by record.mjs.

  python3 scripts/demo/build.py <segments-dir> [--music track.mp3] [--out docs/assets/demo.mp4]

Each segment is trimmed to its planned length (so the wait during an analysis is
never shown), the segments are crossfaded together, film-style captions are
composited at the bottom centre, and an optional music bed is mixed under it.

Captions are rendered as PNGs with Pillow rather than burned with libass: it
needs no special ffmpeg build and gives exact control over the type.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

# (segment name, seconds to keep, [(caption, seconds held), ...])
PLAN = [
    ("title", 4.2, [("", 4.2)]),
    ("landing", 6.2, [
        ("Veritas checks whether a news link, image or video is what it claims to be", 3.1),
        ("Local forensics plus an LLM fact-check, with every source shown", 3.1)]),
    ("news_start", 3.4, [
        ("The article is extracted locally, then its claims are pulled out", 3.4)]),
    ("news_result", 8.2, [
        ("Each claim is searched against sources that exclude the original publisher", 4.1),
        ("The verdict shows the signals behind it and every source it used", 4.1)]),
    ("video_start", 3.6, [
        ("For video, ffprobe reads container metadata and frames are scored by an ONNX detector", 3.6)]),
    ("video_result", 7.8, [
        ("Gemini then watches the clip with its audio: motion, lip sync and what is said", 3.9),
        ("Generator fingerprints and visual artifacts are weighed into one calibrated verdict", 3.9)]),
]

XFADE = 0.6
CAP_MAX_WIDTH = 980
CAP_BOTTOM_MARGIN = 58
CAP_FONT_SIZE = 25
FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _font(size: int):
    from PIL import ImageFont

    for path in FONT_CANDIDATES:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def render_caption(text: str, path: Path, size=(1280, 720)):
    """Transparent full frame with the caption set like a film subtitle:
    centred at the bottom, white, thin dark outline and a soft shadow, no bar."""
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = _font(CAP_FONT_SIZE)

    words, lines, line = text.split(), [], ""
    for w in words:
        trial = f"{line} {w}".strip()
        if draw.textlength(trial, font=font) <= CAP_MAX_WIDTH or not line:
            line = trial
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)

    line_h = int(CAP_FONT_SIZE * 1.34)
    y = size[1] - CAP_BOTTOM_MARGIN - line_h * len(lines)

    for i, ln in enumerate(lines):
        x = (size[0] - draw.textlength(ln, font=font)) / 2
        ly = y + i * line_h
        draw.text((x, ly + 2), ln, font=font, fill=(0, 0, 0, 90),
                  stroke_width=2, stroke_fill=(0, 0, 0, 70))
        draw.text((x, ly), ln, font=font, fill=(245, 245, 244, 255),
                  stroke_width=1, stroke_fill=(0, 0, 0, 150))

    img.save(path)


def duration(path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True).stdout.strip()
    return float(out or 0.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("segments_dir")
    ap.add_argument("--music", default=None, help="background track (mp3/m4a/wav)")
    ap.add_argument("--music-db", type=float, default=-26.0)
    ap.add_argument("--out", default="docs/assets/demo.mp4")
    args = ap.parse_args()

    seg_dir = Path(args.segments_dir)
    files = {s["name"]: s["file"] for s in json.loads((seg_dir / "segments.json").read_text())}
    missing = [n for n, _, _ in PLAN if n not in files]
    if missing:
        sys.exit("missing recorded segments: " + ", ".join(missing))

    # 1. Trim each segment. Result segments keep their tail (the settled state),
    #    the rest keep their head.
    parts = []
    vf = ("fps=30,scale=1280:720:force_original_aspect_ratio=decrease,"
          "pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1")
    for name, keep, _ in PLAN:
        part = seg_dir / f"cut_{name}.mp4"
        cmd = ["ffmpeg", "-v", "error", "-y"]
        if name.endswith("_result"):
            cmd += ["-ss", f"{max(duration(files[name]) - keep, 0):.2f}", "-i", files[name]]
        else:
            cmd += ["-i", files[name], "-t", str(keep)]
        cmd += ["-vf", vf, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", str(part)]
        subprocess.run(cmd, check=True)
        parts.append(part)

    # 2. Crossfade the parts and collect caption timings on the same clock.
    inputs, filt, cues = [], [], []
    prev, offset, clock = None, 0.0, 0.0
    for i, ((name, keep, caps), part) in enumerate(zip(PLAN, parts)):
        inputs += ["-i", str(part)]
        filt.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}]")
        if prev is None:
            prev, offset = f"v{i}", keep
        else:
            filt.append(f"[{prev}][v{i}]xfade=transition=fade:duration={XFADE}"
                        f":offset={offset - XFADE:.2f}[x{i}]")
            prev, offset = f"x{i}", offset + keep - XFADE
        t = clock
        for text, hold in caps:
            if text:
                cues.append((t + 0.35, t + hold - 0.2, text))
            t += hold
        clock += keep - (XFADE if i else 0)

    total = offset

    # 3. Composite the captions.
    cap_dir = seg_dir / "captions"
    cap_dir.mkdir(exist_ok=True)
    cap_inputs, idx = [], len(parts)
    for n, (start, end, text) in enumerate(cues):
        png = cap_dir / f"cap_{n:02d}.png"
        render_caption(text, png)
        cap_inputs += ["-i", str(png)]
        filt.append(f"[{prev}][{idx}:v]overlay=0:0:enable='between(t,{start:.2f},{end:.2f})'[c{n}]")
        prev, idx = f"c{n}", idx + 1
    filt.append(f"[{prev}]format=yuv420p[vout]")

    # 4. Encode, with the music bed if one was given.
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, *cap_inputs]
    if args.music:
        cmd += ["-i", args.music]
        filt.append(f"[{idx}:a]volume={args.music_db}dB,afade=t=in:st=0:d=1.5,"
                    f"afade=t=out:st={max(total - 2.5, 0):.2f}:d=2.5,"
                    f"atrim=0:{total:.2f}[aout]")
        cmd += ["-filter_complex", ";".join(filt), "-map", "[vout]", "-map", "[aout]",
                "-c:a", "aac", "-b:a", "160k", "-shortest"]
    else:
        cmd += ["-filter_complex", ";".join(filt), "-map", "[vout]"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)

    print(f"{out}  {total:.1f}s" + ("" if args.music else "  (silent: pass --music to add a track)"))


if __name__ == "__main__":
    main()
