# Research workspace

Revision of **"A Multimodal Framework for Detecting Deepfake Media and Fake News Using Hybrid AI and External Verification"** (ICMACC 2026, IEEE; paper 2707) and the research programme that follows it.

## Start here

| Document | Contents |
|---|---|
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Decisions needed, contributions, phases P0–P6, benchmark targets, risks, timeline |
| [docs/01_legacy_analysis.md](docs/01_legacy_analysis.md) | The submitted (v1) system: formal fusion, ten findings with evidence, corrected results |
| [docs/02_review_response_matrix.md](docs/02_review_response_matrix.md) | Every reviewer point mapped to evidence, response and plan phase |
| [docs/03_v2_research_log.md](docs/03_v2_research_log.md) | Dated log of what the deployed (v2) system changed, and why |
| [docs/04_sota_landscape.md](docs/04_sota_landscape.md) | Verified SOTA numbers, recommended benchmark suite, evaluation hazards |

## Key findings so far

| Finding | Evidence | Where |
|---|---|---|
| The v1 image result (0.86) is largely a resolution shortcut | Width/height/aspect alone: 0.920; v1 without them: 0.756 | `results/v1_image_ablation.csv`, `figures/fig02` |
| The v1 video result (1.00) comes from generator metadata | Metadata stripped, frames bit-identical: 0.633, fake recall 0.33, p = 0.001 | `runs/videos__v1repro__*.csv`, `figures/fig03` |
| The video set has a second shortcut | Duration alone: 0.967 (all fakes are 8 s Veo clips) | doc 1, F6 |
| v1 FAKE news recall is guaranteed by construction | All 25 fakes are from 2 domains hard-coded in v1 | doc 1, F1 |
| No v1 → v2 improvement is yet significant | News p = 0.51, images p = 0.18 (exact McNemar) | `results/paired_tests.csv` |
| Zero-shot SOTA is beatable where it matters | MMFakeBench 0.615 macro-F1; Chameleon 0.584 | `results/sota_reference.csv`, doc 4 |

## Layout

```
research/
  IMPLEMENTATION_PLAN.md
  docs/        analysis, review matrix, research log, SOTA landscape
  scripts/     every number and figure is produced by a script here
  runs/        one CSV per benchmark run (per-item, never hand-edited) + JSON manifest
  results/     derived tables (CSV) used by the paper
  figures/     paper figures, PNG (300 dpi) and PDF (vector)
  requirements.txt
```

## Reproduce

Analysis environment (separate from the deployed backend):

```bash
python3 -m venv research/.venv
research/.venv/bin/pip install -r research/requirements.txt
```

Offline analyses (no API calls):

```bash
research/.venv/bin/python research/scripts/v1_image_ablation.py          # v1 image calibrator ablation, 10 seeds
research/.venv/bin/python research/scripts/v1_video_repro.py --transform none
research/.venv/bin/python research/scripts/v1_video_repro.py --transform vid_strip
research/.venv/bin/python research/scripts/build_results.py              # metrics, intervals, tests
research/.venv/bin/python research/scripts/make_figures.py               # all figures
```

v2 runs (use the backend environment and a `GEMINI_API_KEY`):

```bash
backend/.venv/bin/python research/scripts/run_v2_eval.py --set images --transform img_norm512 --resume
```

`--resume` re-runs only items that failed. Available transforms: `none`, `img_norm512`, `vid_strip`, `vid_strip_trim5` (defined in `scripts/common.py`). `scripts/controlled_runs.sh` waits for the model to be available and resumes until every item completes.

## Conventions

FAKE is the positive class. UNCERTAIN counts as incorrect for accuracy and as a non-FAKE prediction for precision and recall; coverage reports how often a system committed. Items that failed with an API error are excluded and counted, and a run with more than 5% failures is marked invalid. Proportions carry 95% Wilson intervals; paired comparisons use the exact McNemar test with a bootstrap interval for the difference. Full definitions are in `scripts/build_results.py`.

The legacy (v1) code lives in `legacy/`, which is git-ignored. `v1_video_repro.py` is a line-for-line port of its video pipeline, and `v1_image_ablation.py` of its image calibrator; both substitute an ONNX build of the detector that matches the PyTorch model on all 50 benchmark images.
