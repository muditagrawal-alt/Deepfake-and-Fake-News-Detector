from pathlib import Path


def resolve_local_model_source(repo_id: str, required_files=None) -> str:
    """
    Prefer a locally cached Hugging Face snapshot when available so the
    project can run in offline or network-restricted environments.
    """
    cache_root = Path.home() / ".cache" / "huggingface" / "hub"
    cache_dir = cache_root / f"models--{repo_id.replace('/', '--')}"
    snapshots_dir = cache_dir / "snapshots"

    if snapshots_dir.exists():
        snapshots = [path for path in snapshots_dir.iterdir() if path.is_dir()]
        if snapshots:
            required_files = required_files or []
            valid_snapshots = []

            for snapshot in snapshots:
                if all((snapshot / filename).exists() for filename in required_files):
                    valid_snapshots.append(snapshot)

            candidates = valid_snapshots or snapshots
            return str(max(candidates, key=lambda path: path.stat().st_mtime))

    return repo_id


def local_model_only(repo_id: str, required_files=None) -> bool:
    return resolve_local_model_source(repo_id, required_files=required_files) != repo_id
