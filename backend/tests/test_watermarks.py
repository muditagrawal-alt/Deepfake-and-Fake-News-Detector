from pathlib import Path
from PIL import Image
import numpy as np

from detector.forensics.watermarks import (
    detect_gemini_watermark,
    detect_metadata_ai_signatures,
    scan_image_watermarks_and_signatures,
)


def test_detect_gemini_watermark_positive(tmp_path: Path):
    # Construct a synthetic test image with a 4-pointed sparkle watermark
    w, h = 400, 300
    img_arr = np.full((h, w), 50, dtype=np.uint8)

    # Stamp a 4-pointed astroid star at (w - 40, h - 40)
    cx, cy = w - 40, h - 40
    r = 18
    for y in range(-r, r + 1):
        for x in range(-r, r + 1):
            dist = (abs(x) / r) ** (2 / 3) + (abs(y) / r) ** (2 / 3)
            if dist <= 1.0:
                val = 50 + int(150 * (1.0 - dist))
                img_arr[cy + y, cx + x] = min(255, val)

    test_file = tmp_path / "watermark_gemini.png"
    Image.fromarray(img_arr).save(test_file)

    res = scan_image_watermarks_and_signatures(test_file)
    assert res["has_ai_indicators"] is True
    assert len(res["watermarks_detected"]) == 1
    wm = res["watermarks_detected"][0]
    assert wm["name"] == "google_gemini_synthid_sparkle"
    assert wm["location"] == "bottom_right_corner"
    assert wm["confidence"] > 0.8


def test_detect_gemini_watermark_negative(tmp_path: Path):
    # Plain natural gradient image with no watermark
    w, h = 300, 300
    y, x = np.mgrid[0:h, 0:w]
    img_arr = ((x + y) / (w + h) * 200).astype(np.uint8)

    test_file = tmp_path / "clean_gradient.png"
    Image.fromarray(img_arr).save(test_file)

    res = scan_image_watermarks_and_signatures(test_file)
    assert res["has_ai_indicators"] is False
    assert len(res["watermarks_detected"]) == 0


def test_metadata_ai_signatures():
    meta = {
        "exif": {"Software": "Midjourney v6.0"},
        "xmp": {"DigitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"},
        "png_text": {"parameters": "cinematic photorealistic lighting, prompt: naval warship"},
    }
    sigs = detect_metadata_ai_signatures(meta)
    assert len(sigs) == 3
    tools = [s["tool"] for s in sigs]
    assert "Midjourney" in tools or "midjourney" in [t.lower() for t in tools]
    assert "c2pa_iptc_trained_algorithmic" in tools
    assert "generative_generation_metadata" in tools


def test_analyze_image_caption_dispatch(monkeypatch, tmp_path: Path):
    from unittest.mock import AsyncMock, patch
    from detector.pipeline import analyze
    import asyncio

    test_file = tmp_path / "sample.jpg"
    Image.new("RGB", (64, 64), color="white").save(test_file)

    with patch("detector.pipeline.analyze_image", new_callable=AsyncMock) as mock_analyze_image:
        mock_analyze_image.return_value = "mock_result"
        res = asyncio.run(analyze(image_path=str(test_file), caption="test caption"))
        assert res == "mock_result"
        mock_analyze_image.assert_awaited_once()
        _, kwargs = mock_analyze_image.call_args
        assert kwargs.get("caption") == "test caption"


