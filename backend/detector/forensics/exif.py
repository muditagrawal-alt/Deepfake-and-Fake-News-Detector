"""
Image file facts: format, dimensions, raw EXIF/XMP/PNG text fields, C2PA.

Reports what the file contains, verbatim. It does not interpret any field and
has no keyword lists: deciding what a Software tag or a digital-source-type
value means is the model's job, using the facts.
"""
import hashlib
import re
from pathlib import Path

from PIL import ExifTags, Image

from detector.forensics.provenance import read_c2pa

# Raw EXIF fields worth showing. Selecting fields to display decides nothing.
_EXIF_FIELDS = ("Make", "Model", "Software", "DateTimeOriginal", "DateTime", "Artist",
                "ImageDescription", "Copyright", "LensModel", "HostComputer")
_XMP_KEYS = re.compile(r"(DigitalSourceType|CreatorTool|softwareAgent|Credit|Source)\W*[=>]\W*\"?([^\"<]{1,200})")


def _s(value):
    if value is None:
        return None
    if isinstance(value, bytes):
        value = value.decode("utf-8", "ignore")
    value = re.sub(r"\s+", " ", str(value)).strip("\x00 ")
    return value or None


def analyze_image_metadata(path: str | Path) -> dict:
    path = Path(path)
    out = {"format": None, "width": None, "height": None, "exif": {}, "has_gps": False,
           "xmp": {}, "png_text": {}, "c2pa": read_c2pa(path), "sha256": None}
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        out["sha256"] = h.hexdigest()
    except Exception:
        pass
    try:
        img = Image.open(path)
    except Exception as exc:
        out["error"] = f"could not open image: {exc}"
        return out
    out["format"] = img.format
    out["width"], out["height"] = img.size

    try:
        exif = img.getexif()
        tags = {ExifTags.TAGS.get(k, str(k)): v for k, v in exif.items()}
        try:
            tags.update({ExifTags.TAGS.get(k, str(k)): v for k, v in exif.get_ifd(ExifTags.IFD.Exif).items()})
            out["has_gps"] = bool(exif.get_ifd(ExifTags.IFD.GPSInfo))
        except Exception:
            pass
        out["exif"] = {k: _s(tags[k]) for k in _EXIF_FIELDS if _s(tags.get(k))}
    except Exception:
        pass

    info = getattr(img, "info", {}) or {}
    xmp = info.get("xmp") or info.get("XML:com.adobe.xmp")
    if xmp:
        text = xmp.decode("utf-8", "ignore") if isinstance(xmp, bytes) else str(xmp)
        out["xmp"] = {k: v.strip() for k, v in _XMP_KEYS.findall(text)}
    for key, val in info.items():
        if key in ("exif", "icc_profile", "xmp", "XML:com.adobe.xmp"):
            continue
        if isinstance(val, (str, bytes)):
            out["png_text"][key] = _s(val)[:300] if _s(val) else None
    return out
