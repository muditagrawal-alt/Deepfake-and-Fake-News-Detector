#!/usr/bin/env python3
"""
Assemble the Veritas end-to-end demo video:
- Trims segments to planned timings
- Crossfades smoothly between transitions
- Renders movie-style subtitles in the bottom-middle
- Mixes stock ambient background music with audio ducking and fades
- Exports both docs/assets/demo.mp4 and docs/assets/demo.gif
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

# (segment name, seconds to keep, [(caption, seconds held), ...])
PLAN = [
    ("title", 3.5, [
        ("", 3.5)
    ]),
    ("landing", 11.0, [
        ("Veritas — Open-Source Forensic Intelligence Platform", 5.5),
        ("Real-time deepfake video, synthetic image, and fake news detection", 5.5),
    ]),
    ("workspace_news", 5.5, [
        ("The Veritas Workspace — 3 free shared checks with zero friction", 5.5),
    ]),
    ("workspace_result", 10.5, [
        ("Multimodal cross-examination comparing claims with Reuters & AP wires", 5.25),
        ("Cryptographic SHA-256 evidence fingerprinting for tamper verification", 5.25),
    ]),
    ("workspace_export_byok", 6.5, [
        ("Instant export of court-ready, multi-page Forensic PDF Dossiers", 3.25),
        ("Zero-knowledge Bring-Your-Own-Key security with AES-256-GCM encryption", 3.25),
    ]),
    ("architecture", 9.5, [
        ("3D System Topology: Next.js 16 edge routing to FastAPI microservices", 4.75),
        ("Parallel extraction, visual artifact inspection, & dual-LLM adjudication", 4.75),
    ]),
    ("tech_stack", 9.0, [
        ("Production Tech Stack: Turbopack, Tailwind v4, C2PA, ONNX, and Gemini", 9.0),
    ]),
]

XFADE = 0.5
CAP_MAX_WIDTH = 1050
CAP_BOTTOM_MARGIN = 52
CAP_FONT_SIZE = 26
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
    """Transparent full frame with film-style subtitles:
    Centered at the bottom, crisp white font, dark outline, and soft shadow."""
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", size, (0, 0, 0, 0))
    if not text.strip():
        img.save(path)
        return

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

    line_h = int(CAP_FONT_SIZE * 1.35)
    y = size[1] - CAP_BOTTOM_MARGIN - line_h * len(lines)

    for i, ln in enumerate(lines):
        text_width = draw.textlength(ln, font=font)
        x = (size[0] - text_width) / 2
        ly = y + i * line_h

        # Semi-transparent dark pill background for maximum movie-subtitle legibility
        pad_x = 16
        pad_y = 4
        pill_box = [x - pad_x, ly - pad_y, x + text_width + pad_x, ly + line_h - pad_y]
        draw.rounded_rectangle(pill_box, radius=8, fill=(0, 0, 0, 140))

        # Drop shadow
        draw.text((x + 1, ly + 2), ln, font=font, fill=(0, 0, 0, 180))
        # Crisp white text with dark outline
        draw.text((x, ly), ln, font=font, fill=(255, 255, 255, 255),
                  stroke_width=1, stroke_fill=(0, 0, 0, 220))

    img.save(path)


def duration(path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True).stdout.strip()
    return float(out or 0.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("segments_dir", default="/tmp/veritas-full-demo")
    ap.add_argument("--music", default="/tmp/stock_music.ogg", help="background music track")
    ap.add_argument("--music-db", type=float, default=-20.0)
    ap.add_argument("--out", default="docs/assets/demo.mp4")
    ap.add_argument("--gif", default="docs/assets/demo.gif")
    args = ap.parse_args()

    seg_dir = Path(args.segments_dir)
    files = {s["name"]: s["file"] for s in json.loads((seg_dir / "segments.json").read_text())}
    missing = [n for n, _, _ in PLAN if n not in files]
    if missing:
        sys.exit("missing recorded segments: " + ", ".join(missing))

    # 1. Trim each segment
    parts = []
    vf = ("fps=30,scale=1280:720:force_original_aspect_ratio=decrease,"
          "pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1")
    for name, keep, _ in PLAN:
        part = seg_dir / f"cut_{name}.mp4"
        cmd = ["ffmpeg", "-v", "error", "-y"]
        file_dur = duration(files[name])
        if name.endswith("_result") or name.endswith("_byok"):
            # Result segments keep their settled tail
            start_time = max(file_dur - keep, 0)
            cmd += ["-ss", f"{start_time:.2f}", "-i", files[name], "-t", str(keep)]
        else:
            cmd += ["-i", files[name], "-t", str(keep)]
        cmd += ["-vf", vf, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "19", str(part)]
        subprocess.run(cmd, check=True)
        parts.append(part)
        print(f"  Trimmed segment {name} -> {keep:.1f}s")

    # 2. Crossfade parts and build cue timestamps
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
                cues.append((t + 0.25, t + hold - 0.15, text))
            t += hold
        clock += keep - (XFADE if i else 0)

    total = offset
    print(f"  Total video duration: {total:.1f}s with {len(cues)} subtitle cues")

    # 3. Composite movie subtitles
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

    # 4. Mix stock background music
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, *cap_inputs]
    if args.music and Path(args.music).exists():
        cmd += ["-i", args.music]
        filt.append(f"[{idx}:a]volume={args.music_db}dB,afade=t=in:st=0:d=2.0,"
                    f"afade=t=out:st={max(total - 3.0, 0):.2f}:d=3.0,"
                    f"atrim=0:{total:.2f}[aout]")
        cmd += ["-filter_complex", ";".join(filt), "-map", "[vout]", "-map", "[aout]",
                "-c:a", "aac", "-b:a", "192k", "-shortest"]
    else:
        cmd += ["-filter_complex", ";".join(filt), "-map", "[vout]"]

    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(out)]
    print("  Rendering MP4 video with FFmpeg...")
    subprocess.run(cmd, check=True)
    print(f"[SUCCESS] Demo MP4 generated: {out} ({total:.1f}s)")

    # 5. Export lightweight preview GIF for GitHub README
    if args.gif:
        gif_out = Path(args.gif)
        print("  Generating animated GIF preview for README...")
        gif_cmd = [
            "ffmpeg", "-v", "error", "-y",
            "-ss", "4", "-t", "16", "-i", str(out),
            "-vf", "fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
            str(gif_out)
        ]
        subprocess.run(gif_cmd, check=True)
        print(f"[SUCCESS] Demo GIF generated: {gif_out}")


if __name__ == "__main__":
    main()

