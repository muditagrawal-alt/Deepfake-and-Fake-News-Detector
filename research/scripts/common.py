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


def img_norm512_crop(src: Path, dst_dir: Path) -> Path:
    """
    As img_norm512, after keeping only the central 80% of the image (10% cut from each side).
    Removes corner watermarks that image generators stamp on their output (finding F12),
    identically for both classes.
    """
    from PIL import Image
    im = Image.open(src).convert("RGB")
    w, h = im.size
    im = im.crop((round(0.1 * w), round(0.1 * h), round(0.9 * w), round(0.9 * h)))
    tmp = dst_dir / (src.stem + "_crop.png")
    im.save(tmp)
    return img_norm512(tmp, dst_dir)


def vid_strip_trim5_crop(src: Path, dst_dir: Path) -> Path:
    """
    As vid_strip_trim5, keeping only the central 80% of every frame (10% cut from each side).
    Removes visible generator watermarks (e.g. Veo's corner mark, finding F12) for both classes.
    """
    out = dst_dir / (src.stem + "_t5c.mp4")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-t", "5",
         "-map", "0:v:0", "-map", "0:a?", "-map_metadata", "-1",
         "-vf", "crop=trunc(iw*0.8/2)*2:trunc(ih*0.8/2)*2:trunc(iw*0.1):trunc(ih*0.1)",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "128k",
         "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact", str(out)],
        check=True,
    )
    return out


TRANSFORMS = {"none": None, "img_norm512": img_norm512, "vid_strip": vid_strip, "vid_strip_trim5": vid_strip_trim5,
              "img_norm512_crop": img_norm512_crop, "vid_strip_trim5_crop": vid_strip_trim5_crop}
