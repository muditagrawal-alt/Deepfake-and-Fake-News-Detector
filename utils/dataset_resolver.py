import csv
import re
from pathlib import Path


def normalize_filename(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", Path(name).name.lower())


def normalize_token_signature(name: str):
    tokens = re.split(r"[^a-z0-9]+", Path(name).stem.lower())
    return tuple(sorted(token for token in tokens if token))


def resolve_existing_path(path_str: str) -> str:
    """
    Resolve a dataset path even when the CSV contains extra whitespace or
    slightly inconsistent spacing in the filename.
    """
    candidate = Path(path_str.strip())
    if candidate.exists():
        return str(candidate)

    parent = candidate.parent
    target_name = normalize_filename(candidate.name)

    if parent.exists():
        for child in parent.iterdir():
            if child.is_file() and normalize_filename(child.name) == target_name:
                return str(child)

    return str(candidate)


def resolve_video_benchmark_path(filename: str, base_dir: str = "data/evaluation/videos") -> str | None:
    target_signature = normalize_token_signature(filename)

    for path in Path(base_dir).rglob("*.mp4"):
        if normalize_token_signature(path.name) == target_signature:
            return str(path)

    return None


def read_commented_csv(path: str):
    with open(path, newline="", encoding="utf-8") as file_obj:
        reader = csv.DictReader(
            line for line in file_obj if line.strip() and not line.lstrip().startswith("#")
        )
        return list(reader)
