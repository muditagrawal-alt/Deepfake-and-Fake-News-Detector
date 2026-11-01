#!/usr/bin/env python3
"""
Generates separate, focused animated GIFs to visually explain each core feature
of the Veritas platform in the README.
"""
import subprocess
from pathlib import Path

SOURCE_DIR = Path("/tmp/veritas-ui-720p")
ASSETS_DIR = Path("docs/assets")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

GIF_SPECS = [
    {
        "name": "landing-hero.gif",
        "source": SOURCE_DIR / "cut_landing_hero.mp4",
        "start": 0.5,
        "duration": 5.5,
        "scale": 760,
        "fps": 12,
        "description": "Landing page hero with interactive Ferrofluid liquid dynamics & live status badges",
    },
    {
        "name": "forensic-inspection.gif",
        "source": SOURCE_DIR / "cut_landing_forensics.mp4",
        "start": 1.0,
        "duration": 6.0,
        "scale": 760,
        "fps": 12,
        "description": "Live forensic inspection of SynthID invisible watermarks, C2PA provenance, & EXIF",
    },
    {
        "name": "factcheck-workflow.gif",
        "source": SOURCE_DIR / "cut_workspace_progress.mp4",
        "start": 0.0,
        "duration": 4.5,
        "scale": 760,
        "fps": 12,
        "description": "Workspace 5-stage verification pipeline (Hashing, Extraction, Cross-Examination)",
    },
    {
        "name": "evidence-result-card.gif",
        "source": SOURCE_DIR / "cut_workspace_result.mp4",
        "start": 1.2,
        "duration": 6.5,
        "scale": 760,
        "fps": 12,
        "description": "Calibrated verdict card with corroborated claims & SHA-256 evidence fingerprint",
    },
    {
        "name": "pdf-dossier-export.gif",
        "source": SOURCE_DIR / "cut_workspace_pdf_byok.mp4",
        "start": 0.2,
        "duration": 3.4,
        "scale": 760,
        "fps": 12,
        "description": "One-click export of court-ready, multi-page Forensic PDF Dossiers",
    },
    {
        "name": "byok-quota-vault.gif",
        "source": SOURCE_DIR / "cut_workspace_pdf_byok.mp4",
        "start": 3.8,
        "duration": 3.6,
        "scale": 760,
        "fps": 12,
        "description": "Zero-Knowledge BYOK API Key Vault with AES-256-GCM authenticated encryption",
    },
]


def create_gif(spec):
    src = spec["source"]
    out = ASSETS_DIR / spec["name"]
    start = spec["start"]
    dur = spec["duration"]
    scale = spec["scale"]
    fps = spec["fps"]

    vf = (
        f"fps={fps},scale={scale}:-1:flags=lanczos,"
        f"split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer"
    )

    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-ss", str(start),
        "-t", str(dur),
        "-i", str(src),
        "-vf", vf,
        str(out)
    ]
    subprocess.run(cmd, check=True)
    size_mb = out.stat().st_size / (1024 * 1024)
    print(f"[SUCCESS] Generated {spec['name']} ({size_mb:.2f} MB) - {spec['description']}")


def main():
    print("Generating modular explanatory GIFs for README...")
    for spec in GIF_SPECS:
        create_gif(spec)
    print("All explanatory GIFs generated successfully!")


if __name__ == "__main__":
    main()
