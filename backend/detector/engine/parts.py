"""Backend-neutral content parts. Each backend converts these to its own format."""
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class TextPart:
    text: str


@dataclass(frozen=True)
class ImagePart:
    data: bytes
    mime: str = "image/jpeg"
    label: str = ""          # e.g. "frame at 4.0 s", shown to the model next to the image


@dataclass(frozen=True)
class VideoPart:
    """A whole video file, for backends that understand video natively."""
    path: Path
    mime: str = "video/mp4"


Part = TextPart | ImagePart | VideoPart
