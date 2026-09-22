"""
Pixel-level AI-image detector: Organika/sdxl-detector (Swin) via onnxruntime.

No torch/transformers. The 354 MB ONNX file is downloaded once from the Hub
into `settings.onnx_model_dir` (at Docker build time on the Space).

id2label: 0 -> artificial, 1 -> human. Preprocessing follows the model's
preprocessor_config.json: resize 224x224 (bicubic), /255, ImageNet mean/std.
"""
import logging
import threading
from pathlib import Path

import numpy as np
from PIL import Image

from detector.config import Settings

log = logging.getLogger(__name__)

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
_FAKE_INDEX = 0


class OnnxImageDetector:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.enabled = settings.enable_onnx_detector
        self._session = None
        self._input_name = None
        self._lock = threading.Lock()
        self.model_path: Path | None = None
        self.load_error: str | None = None

    # -- loading -----------------------------------------------------------
    def ensure_model_file(self) -> Path:
        from huggingface_hub import hf_hub_download

        path = hf_hub_download(
            repo_id=self.settings.onnx_model_repo,
            filename="onnx/model.onnx",
            local_dir=str(self.settings.onnx_model_dir),
            token=self.settings.hf_token or None,
        )
        return Path(path)

    def _load(self) -> bool:
        if self._session is not None:
            return True
        if not self.enabled or self.load_error:
            return False
        with self._lock:
            if self._session is not None:
                return True
            try:
                import onnxruntime as ort

                self.model_path = self.ensure_model_file()
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                self._session = ort.InferenceSession(str(self.model_path), sess_options=opts, providers=["CPUExecutionProvider"])
                self._input_name = self._session.get_inputs()[0].name
                log.info("ONNX detector loaded from %s", self.model_path)
                return True
            except Exception as exc:
                self.load_error = f"{type(exc).__name__}: {exc}"
                log.warning("ONNX detector unavailable: %s", self.load_error)
                return False

    @property
    def ready(self) -> bool:
        return self._session is not None

    # -- inference ---------------------------------------------------------
    @staticmethod
    def _preprocess(img: Image.Image) -> np.ndarray:
        img = img.convert("RGB").resize((224, 224), Image.BICUBIC)
        arr = np.asarray(img, dtype=np.float32) / 255.0
        arr = (arr - _MEAN) / _STD
        return arr.transpose(2, 0, 1)

    def predict_paths(self, paths: list[str | Path]) -> list[dict]:
        """Batch predict. Each item: {path, fake_probability, label, confidence}."""
        if not paths or not self._load():
            return []
        batch = []
        kept = []
        for p in paths:
            try:
                with Image.open(p) as img:
                    batch.append(self._preprocess(img))
                    kept.append(str(p))
            except Exception as exc:
                log.info("skip unreadable frame %s: %s", p, exc)
        if not batch:
            return []
        x = np.stack(batch).astype(np.float32)
        logits = self._session.run(None, {self._input_name: x})[0]
        logits = logits - logits.max(axis=1, keepdims=True)
        probs = np.exp(logits) / np.exp(logits).sum(axis=1, keepdims=True)
        out = []
        for path, p in zip(kept, probs):
            fake = float(p[_FAKE_INDEX])
            out.append({
                "path": path,
                "fake_probability": round(fake, 4),
                "label": "FAKE" if fake >= 0.5 else "REAL",
                "confidence": round(max(fake, 1 - fake), 4),
            })
        return out

    def predict_path(self, path: str | Path) -> dict | None:
        res = self.predict_paths([path])
        return res[0] if res else None
