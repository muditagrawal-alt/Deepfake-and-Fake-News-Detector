"""
Run the pipeline from the CLI.

  python -m scripts.smoke --url https://example.com/article
  python -m scripts.smoke --image path/to/img.jpg
  python -m scripts.smoke --video path/to/clip.mp4
"""
import argparse
import asyncio
import json

from detector.pipeline import analyze


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--image")
    ap.add_argument("--video")
    args = ap.parse_args()
    result = asyncio.run(analyze(url=args.url, image_path=args.image, video_path=args.video, progress=lambda s: print(f"… {s}")))
    print(json.dumps(result.model_dump(mode="json"), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
