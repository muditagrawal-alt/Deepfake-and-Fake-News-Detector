# 3. Research log: what was added in v2 (the deployed system), and why

v2 keeps the paper's framework, a multimodal pipeline combining local forensics, AI analysis and external verification with an explicit fusion step, and replaces how each part is implemented. This log records each change with the evidence that motivated it and what it means for the paper. Entries are in the order they happened.

**System under test in all v2 runs so far:** Gemini 3.5 Flash-Lite (primary) with Gemini 3.1 Flash-Lite as fallback, temperature 0.2, structured JSON output; external research via DuckDuckGo with the original publisher excluded; ffmpeg/ffprobe, Pillow and trafilatura for local forensics.

---

## 2026-09-22 — Architecture: no local deep-learning model

**Change.** Removed PyTorch, transformers, the BERT news model (952 MB) and the RandomForest calibrator. News, image and video analysis now send local forensic signals plus the content to a hosted multimodal LLM that must return a schema-validated verdict (`backend/detector/schemas.py::LLMVerdict`): verdict, calibrated confidence, genre, 2–4 atomic claims each marked corroborated / contradicted / misleading / unverifiable with sources, weighted signals, and caveats.

**Why.** The deployment goal required a small footprint, and the BERT model was the weakest v1 component (7 of 25 real articles called fake). The structured output also makes each verdict auditable, which the explainability literature and Reviewer 4 ask for.

**For the paper.** The fusion step changes from hand-set additive weights (doc 1, §1.2) to an LLM judge reasoning over the same kinds of signals. That is a design choice to be *measured* against the alternatives (plan, P4), not assumed better.

## 2026-09-22 — Pixel detector ported to ONNX, verified identical

**Change.** `Organika/sdxl-detector` runs through onnxruntime instead of PyTorch.

**Evidence.** On all 50 benchmark images the ONNX and PyTorch versions agree on every label, with 0.0000 maximum difference in probability.

**For the paper.** This equivalence is what allows v1 to be re-run faithfully without PyTorch (doc 1, F4, F5).

## 2026-09-22 — Generator-tag false positive fixed

**Change.** Generator fingerprints are matched on descriptive tags and exact encoder names, not substrings of any tag.

**Evidence.** v1's keyword list included "google", which also matches YouTube downloads (`handler_name: ISO Media file produced by Google Inc.`). The revised rule detects all 15 fakes and flags none of the 15 reals.

**For the paper.** This is a correctness fix, but it does not address the underlying problem that metadata is easily stripped (doc 1, F5).

## 2026-09-22 — External verification redesigned

**Change.** The constant Twitter signal and the zero-weighted YouTube/LinkedIn signals were removed. For news, headlines are searched with the original publisher's domain excluded, the top pages are read, and the model judges each extracted claim against them. For images and videos, a second pass searches the depicted event or spoken claim when the first pass identifies one.

**Evidence.** Gemini's built-in Google Search grounding returns HTTP 429 on free-tier keys, so research runs through DuckDuckGo (Tavily when a key is present). From the deployed backend on 2026-09-24 a real article returned 8 independent sources.

**For the paper.** Excluding the publisher is what makes the signal *corroboration* rather than *existence*. It is also the mechanism that creates leakage on benchmarks whose labels come from fact-check sites (doc 4, §4.4), so fact-check domains must be excluded during benchmarking.

## 2026-09-22 — Low-resolution guard

**Change.** For images under 500 px on the longest side, the prompt states that blur and soft detail are expected and caps confidence at 0.7 unless other strong evidence exists.

**Evidence.** A 194×260 px real photograph of a public figure was called fake at 0.85 because blurred jersey text was read as generation artefacts; with the guard it returned UNCERTAIN at 0.5.

**For the paper — confound risk.** In this benchmark, small images are overwhelmingly real (doc 1, F4). A rule that pushes small images toward REAL or UNCERTAIN can raise accuracy on this set for the wrong reason. The resolution-normalised run (below) tests exactly this.

## 2026-09-22 — Deterministic satire rule

**Change.** If the model classifies an article's genre as satire but still returns LIKELY_REAL, the verdict is set to LIKELY_FAKE with confidence ≥ 0.8.

**Evidence.** In the first v2 news run, one Babylon Bee article was labelled satire yet judged LIKELY_REAL; the rubric treats satire presented as news as fake.

**For the paper.** Unlike v1's domain list, this acts on the model's reading of the content, not the URL. It was added *after* the news benchmark ran, so that run (`news__v2__gemini35fl__pre_satire_rule__run1`) does not include it and must be re-run before it is reported.

## 2026-09-22 to 09-24 — v2 benchmark runs on the original sets

| Set | Configuration | Accuracy [95% CI] | Note |
|---|---|---|---|
| News (50) | pre satire rule | 0.920 [0.812, 0.969] | ROC-AUC 0.989 |
| Images (50) | detector on | 0.880 [0.762, 0.944] | |
| Images (49) | detector off | 0.959 [0.863, 0.989] | 1 item failed with an API error and is excluded |
| Videos (30) | detector on | 1.000 [0.887, 1.000] | |
| Videos (30) | detector off | 1.000 [0.887, 1.000] | |

**None of these differ significantly from v1** on the same items (news p = 0.51, images p = 0.18), and all were run on sets now known to carry shortcuts. They are development measurements, not paper results.

## 2026-09-24 — Pixel detector disabled by default

**Change.** `ENABLE_ONNX_DETECTOR` now defaults to false.

**Evidence.** Images 0.88 → 0.96 without it, video unchanged; on its own the detector scores 0.66 and over-calls real photographs of people. It also needs about 500 MB resident; without it the backend idles at 108 MB, which is what makes a free 512 MB instance viable.

**Correction (2026-09-28).** The image difference is **not statistically significant** (4 discordant pairs, exact McNemar p = 0.125). The decision stands on the memory grounds and the absence of any measured benefit, but the claim that the detector *lowers* accuracy is not established.

## 2026-09-24 — An invalid run discarded

A video run without the detector recorded 0.4667. Half its rows had failed with `ReadError`/`ReadTimeout` when network access dropped, and were scored as UNCERTAIN. The results were discarded and the run repeated cleanly (30/30). The research harness now records errors separately, excludes failed items from metrics, marks any run with more than 5% failures as invalid, and resumes only failed items (`research/scripts/run_v2_eval.py`).

## 2026-09-24 — Deployment

Frontend (Next.js) on Vercel at `veritas-check.vercel.app`; backend (FastAPI) on Render's free plan. Verified in production: CORS restricted to the frontend origin, end-to-end news check in 9.4 s, video check in 32 s with no memory failure on the 512 MB instance.

## 2026-09-28 — Research audit and shortcut controls

Findings F1–F10 (doc 1) and the statistical re-analysis (`results/`). Two controlled v2 experiments were set up to test whether v2 inherits the benchmark shortcuts:

| Run | Control | Question | Status |
|---|---|---|---|
| `images__v2__…__img_norm512__run1` | every image resized to 512 px, JPEG q90, EXIF removed | does v2's image accuracy depend on resolution? | queued (Gemini Flash-Lite overloaded on 2026-09-28) |
| `videos__v2__…__vid_strip__run1` | metadata removed, frames bit-identical | does v2 depend on generator tags? | queued |
| `videos__v2__…__vid_strip_trim5__run1` | metadata removed and every clip cut to 5 s | does v2 depend on duration? | queued |

When these complete, `research/scripts/build_results.py` and `make_figures.py` regenerate every table and figure with them included.

## Observed measurement issues to control for

- **Run-to-run variability.** The same fake video received LIKELY_FAKE (95%) in one production call and LIKELY_REAL in another on 2026-09-24. LLM results must be reported over repeated runs.
- **Provider availability.** Free-tier Flash-Lite returned HTTP 503 for extended periods on 2026-09-28. Runs must pin the model and wait out outages rather than fall back to a different model, which would change the system under test mid-run.
- **Model drift.** Hosted model versions change. Every run records the model identifier and git commit in its manifest.
