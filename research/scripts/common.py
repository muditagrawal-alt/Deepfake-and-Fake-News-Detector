"""
Dataset helpers and control transforms shared by the research scripts.
No backend imports, so it runs in either the backend or the research venv.
"""
import csv
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVAL = ROOT / "data" / "evaluation"
RUNS = ROOT / "research" / "runs"


def read_rows(path: Path):
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(l for l in fh if l.strip() and not l.lstrip().startswith("#")))


def resolve_image(p: str) -> Path:
    c = ROOT / p.strip()
    if c.exists():
        return c
    want = re.sub(r"[^a-z0-9]", "", c.name.lower())
    for ch in c.parent.iterdir():
        if re.sub(r"[^a-z0-9]", "", ch.name.lower()) == want:
            return ch
    raise FileNotFoundError(p)


def resolve_video(name: str) -> Path:
    want = tuple(sorted(t for t in re.split(r"[^a-z0-9]+", Path(name).stem.lower()) if t))
    for p in (EVAL / "videos").rglob("*.mp4"):
        if tuple(sorted(t for t in re.split(r"[^a-z0-9]+", p.stem.lower()) if t)) == want:
            return p
    raise FileNotFoundError(name)


def img_norm512(src: Path, dst_dir: Path) -> Path:
    from PIL import Image
    im = Image.open(src).convert("RGB")
    w, h = im.size
    s = 512 / max(w, h)
    im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    out = dst_dir / (src.stem + ".jpg")
    im.save(out, format="JPEG", quality=90)          # no exif= argument -> no EXIF
    return out


def vid_strip(src: Path, dst_dir: Path) -> Path:
    out = dst_dir / src.name
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src),
         "-map", "0", "-map_metadata", "-1", "-map_metadata:s:v", "-1", "-map_metadata:s:a", "-1",
         "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
         "-c", "copy", str(out)],
        check=True,
    )
    return out



def vid_strip_trim5(src: Path, dst_dir: Path) -> Path:
    """
    Metadata removed AND every clip cut to its first 5 s, re-encoded with
    identical settings for both classes. In the 30-video set all fakes are
    Veo's fixed 8 s output while real clips run 3.7-420 s, so duration alone
    classifies 96.7% of items; stripping metadata does not remove it.
    """
    out = dst_dir / (src.stem + "_t5.mp4")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-t", "5",
         "-map", "0:v:0", "-map", "0:a?", "-map_metadata", "-1",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "128k",
         "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact", str(out)],
        check=True,
    )
    return out


TRANSFORMS = {"none": None, "img_norm512": img_norm512, "vid_strip": vid_strip, "vid_strip_trim5": vid_strip_trim5}
