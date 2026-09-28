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

## 2026-09-28 — Engine rebuilt: no hand-written decision rules, backend-neutral, local models

**Why.** The audit showed that v1's and v2's reported accuracy came from rules and signals tuned to the benchmark (F1, F4–F6, F11), and the reviewers asked for wider benchmarks, which will hit hosted-API rate limits. The engine was rebuilt so that (a) every verdict comes from a model reasoning over measured facts and retrieved evidence, with no hand-written rule that decides or nudges the label, and (b) the same pipeline runs on a hosted model (Gemini) or a local one (Ollama), so a benchmark can finish without API quota.

### Inventory of removed rules

Every rule below was in the code at commit `c024d1d` and is gone. "Replaced by" is what now carries that information, if anything.

| # | Where (at `c024d1d`) | What it did | Replaced by |
|---|---|---|---|
| R1 | `analyzers/common.py:86-92` | If the model said genre = satire but not LIKELY_FAKE, forced LIKELY_FAKE with confidence ≥ 0.8 | Nothing. The label definition (satire presented as news is LIKELY_FAKE) is stated once in the task prompt; the model applies it. |
| R2 | `analyzers/image.py:53-62` | Images < 500 px: prompt said blur is expected, detector unreliable, **cap confidence at 0.7** | Nothing. The model receives the image and its measured width and height. |
| R3 | `analyzers/image.py:67-70` | Told the model the pixel detector "is right about 2 in 3 times" and "over-calls real photos" (measured on our own test set) | Nothing. When enabled, the detector's score is passed as a fact with the model name. Stating test-set accuracy to the model was test-set leakage. |
| R4 | `analyzers/video.py:96-101` | Told the model which generators the frame detector catches on "our benchmarks", and that avg < 0.2 is a moderate REAL signal | Nothing (same reason as R3). |
| R5 | `analyzers/prompts.py` rubric | Signal weights: "metadata naming a generator is a STRONG fake signal", "camera make is a WEAK real signal", "absence of artifacts is weak evidence" | Neutral facts about the tools: metadata can be stripped or edited; C2PA manifests are signed; absent metadata is common for authentic media online. Weighing is the model's job, or the learned scorer's (plan P4). |
| R6 | `analyzers/prompts.py` rubric | "A single weak signal should never produce confidence above 0.7"; "Prefer UNCERTAIN over guessing" | `confidence` is defined as the probability the verdict is correct. No cap, no bias toward a label. |
| R7 | `forensics/video_meta.py` | Keyword lists `GENERATOR_KEYWORDS`, `GENERATOR_ENCODERS` (google, veo, sora, …) produced `generator_detected=True`; `PUBLIC_CONTEXT_KEYS` produced a "public context" hint; free-text `notes` pre-judged the file | ffprobe facts only: duration, size, fps, codecs, audio, raw container and stream tags, and C2PA. No field interprets them. |
| R8 | `forensics/exif.py` | `_AI_MARKERS` and `_CAMERA_MAKERS` lists produced `ai_markers` and judgement `notes` | Raw EXIF fields, XMP (`DigitalSourceType`, `CreatorTool`, …), PNG text chunks and C2PA, uninterpreted. |
| R9 | `providers/research.py` (Tavily) | Passed Tavily's own LLM-written "answer" to the model as evidence | Removed: evidence is the retrieved pages only, so no second model's opinion enters as evidence. |
| R10 | `providers/gemini.py` | On 429/503 silently switched to a different Gemini model mid-run | `PIN_MODEL=true` (research runs) disables the switch; every call records the model version that served it. |

### What the prompts still contain, and why that is not a decision rule

- **The task and label definitions** (`prompts.TASK`), including that satire presented as news is LIKELY_FAKE. This is the benchmark's labelling convention and must be stated in the paper as such.
- **Where to look** (stage 1: hands, text, reflections, motion, lip sync, …). This lists what to inspect and assigns no weight or direction.
- **Evidence discipline** (cite only retrieved URLs; the original publisher is not independent).
- **Neutral facts about the tools** (R5).

Nothing in the prompts or code was derived from results on any evaluation set.

### New architecture (`backend/detector/engine/`)

1. **Analyse** (model): returns an `Analysis`: description, genre, 0–4 atomic claims, located observations (each with a neutral `anomaly` flag: inconsistent with the physical world or with how cameras and microphones record it), and 0–3 search queries. It has no verdict field, so the model cannot commit to a label before seeing evidence.
2. **Retrieve** (tool, no model): runs the queries (falling back to the claims if none), excludes the original publisher and any `SEARCH_BLOCKLIST` domain, reads the top pages. Retrieval sits outside the model, so different backends see identical evidence for the same queries.
3. **Verify** (model): receives the content, the measured facts, the stage-1 analysis and the retrieved evidence (or an explicit "no evidence found" / "closed-book" statement). It returns an `LLMVerdict` whose fields are ordered claims → signals → caveats → reasoning → summary → verdict → confidence, so the label is generated after the justification.
4. **Result** (`analyzers/common.build_result`): no verdict or confidence is changed. Citations not among the retrieved URLs are removed and counted (`n_citations_outside_retrieved`, a hallucination metric). `evidence_features` records claim-status counts, anomaly counts by kind, retrieval counts, and C2PA/XMP/EXIF provenance facts for the learned scorer. Raw width/height and duration are deliberately not features, because on our sets they are label proxies (F4, F6).

Backends (`engine/backends.py`): `GeminiBackend` (hosted; native video through the Files API, uploaded once per item and reused across both stages) and `OllamaBackend` (local; images inline; video as 8 frames across the clip, each labelled with its approximate time, plus a Whisper transcript). The backend is chosen once per process (`LLM_ENGINE`), and a run never mixes models.

Research-run settings (all environment variables):

| Setting | Values | Purpose |
|---|---|---|
| `LLM_ENGINE` | `gemini` \| `ollama` | system under test |
| `OLLAMA_MODEL` | `gemma4:12b` (default), `qwen3.5:9b` | local model |
| `PIN_MODEL` | `true` for research | no silent model switching (R10) |
| `RESEARCH_MODE` | `open` \| `closed` | closed = no retrieval; contamination / knowledge-only control |
| `SEARCH_BLOCKLIST` | comma-separated domains | exclude benchmark label sources (e.g. fact-check sites for LIAR/PolitiFact) |
| `VIDEO_STRATEGY` | `native` \| `frames` | `frames` on Gemini gives the same video input as the local backend |

### Local model selection (measured 2026-09-28, Ollama 0.30.10, Apple M4, 24 GB)

| Model | Structured JSON with thinking off | With thinking on | Vision | Note |
|---|---|---|---|---|
| `qwen3.5:9b` (Q4_K_M, 6.6 GB) | **ignored**: returned prose, schema not applied | honoured; 1–2 k thinking characters per trivial call | yes | usable only with `OLLAMA_THINK=true` |
| `gemma4:12b` (Q4_K_M, 7.6 GB) | honoured | not needed | yes (also audio) | **default local model** |

Throughput was 5.3 tokens/s for gemma4:12b with macOS Low Power Mode on and the machine on battery. That puts an image at ~3 min for two stages and makes a 50-item image run ~3 h. Benchmark runs must be made on AC power with Low Power Mode off, and the timing columns report the power state.

### Smoke tests (single items, not results)

These checked that the engine runs end to end. They are not evidence of accuracy.

| Item | Backend | Verdict | What drove it |
|---|---|---|---|
| `img_fake_human_picsart_024` (fake) | gemma4:12b | LIKELY_REAL 0.95 | no anomalies observed |
| same | gemini-3.5-flash-lite | LIKELY_REAL 0.80 | no anomalies observed; hard item for both models |
| `news_028` (Onion, dead URL) | gemini-3.5-flash-lite | LIKELY_FAKE 0.99 | publisher recognised from the URL; 7 retrieved pages identify the headline as Onion satire. Exposed F11. |
| `vid_fake_human_gemini_001` (Veo) | gemini-3.5-flash-lite | LIKELY_FAKE 0.99 | C2PA manifest with `digitalSourceType = trainedAlgorithmicMedia` (signed provenance) and a garbled on-screen template string |

The Veo clips carry C2PA content credentials. That is a legitimate, verifiable signal, but a platform re-upload strips it, so the `vid_strip` control now measures exactly how much the video result depends on provenance being present.

### Consequences for earlier runs

All v2 runs in `runs/` before this entry used the old engine (rules R1–R10). They stay as the record of the deployed v2 at that time, labelled `v2` in `results/run_registry.csv`. Runs of the new engine are labelled `v3` with the backend and model in the tag, and the paper's primary results come from `v3`.

## 2026-09-29 — v3.1: retrieval as a shared, filtered stage; external benchmarks; engine freeze

**Retrieval (`engine/retrieval.py`).** Search back-ends now only return raw hits (title, URL, snippet, date). Filtering, page reading and formatting are one shared function, so the evidence does not depend on the search API. Every dropped hit is counted by reason and stored with the run (`forensics.retrieval.dropped`, `f_n_dropped_*` in run CSVs):

| Filter | Removes | When |
|---|---|---|
| `publisher` | the item's own publisher, including subdomains | always, when the publisher is known |
| `blocklist` | `SEARCH_BLOCKLIST` entries, as a domain or a domain/path prefix | per run |
| `fact_check` | fact-check publishers (a fixed list of IFCN signatories and similar) and fact-check sections of general outlets (URL path matching `fact-check`, `factcheck`, `/verify/`, `hoax`) | `EXCLUDE_FACT_CHECKS=true`; on for benchmarks labelled by fact-checkers (LIAR, MM-Soc/FakeNewsNet), off in production |
| `duplicate` | a snippet or page whose 8-word shingles are ≥ 50% contained in the item's own text (syndicated or scraped copies of the item) | always, when the item has text |

The duplicate filter matters most on text benchmarks, where the publisher is unknown and a copy of the article would otherwise "corroborate" itself. The Groq browser-search researcher was removed: a model that searches and summarises cannot be held to these filters. Tests: `backend/tests/test_retrieval.py` (5 cases, all passing).

**Inputs for external benchmarks.** `analyze_news_text` takes article or statement text with an optional image, speaker and context, and with no publisher (publisher-masked by construction). The news prompts now say "a news article or a public statement".

**Benchmarks available without a request, downloaded 2026-09-29** (`research/scripts/datasets/`, items in `research/splits/`):

| Benchmark | Items for evaluation | Development items | Label source | Notes |
|---|---|---|---|---|
| LIAR | all 1,283 test statements | 50 validation (stratified) | PolitiFact ratings; binary FAKE = pants-fire/false/barely-true | release has 1,283 test statements, the paper's table 1,267 |
| MM-Soc PolitiFact | all 102 test articles, each with image | 50 train | PolitiFact via FakeNewsNet | label 1 = fake (authors' `const.py`) |
| MM-Soc GossipCop | 1,000 of 2,672 test articles, stratified, seed 2026 | 50 train | GossipCop via FakeNewsNet | 18.8% fake in test |

**Engine freeze.** From the commit that merges this entry, the prompts, schemas, pipeline and retrieval are frozen for the benchmark programme. A change after the freeze is a bug fix only, and every run it could affect is re-run in full. The v3.0 Gemini run that was in progress (22 of 50 in-house images) was stopped so that every reported number comes from the frozen engine; its rows are kept as a pilot in `runs/pilot/` and are not reported as results.

## 2026-09-29 — Trivial baselines on the in-house sets

`scripts/trivial_baselines.py` → `results/trivial_baselines.csv` (per item: `_per_item.csv`). Each baseline uses one property of the file or URL and no content analysis. Continuous properties use one threshold learned leave-one-out; binary properties are fixed rules.

| Set | Property | Rule | Accuracy [95% CI] | FAKE / REAL recall |
|---|---|---|---|---|
| Images (50) | longest side, px | threshold, LOO | 0.740 [0.605, 0.841] | 0.96 / 0.52 |
| Images | file size | threshold, LOO | 0.660 [0.521, 0.776] | 0.80 / 0.52 |
| Images | EXIF camera make | REAL if present | 0.660 [0.521, 0.776] | 1.00 / 0.32 |
| Videos (30) | duration | threshold, LOO | **0.967** [0.833, 0.994] | 1.00 / 0.93 |
| Videos | container encoder = "Google" | fixed | **0.967** [0.833, 0.994] | 0.93 / 1.00 |
| Videos | C2PA `trainedAlgorithmicMedia` | fixed | **0.933** [0.787, 0.982] | 0.87 / 1.00 |
| Videos | file size | threshold, LOO | 0.700 [0.521, 0.833] | 0.87 / 0.53 |
| News (50) | v1 satire-domain list | fixed | **1.000** [0.929, 1.000] | 1.00 / 1.00 |
| News | article text extractable | REAL if yes | **0.940** [0.838, 0.979] | 0.96 / 0.92 |

The v1 image calibrator's size features reached 0.92 (RandomForest over several size features, leave-one-out; doc 1, F4); a single threshold on the longest side reaches 0.74. Both are reported: the first is what v1 exploited, the second the simplest shortcut. A detector's result on these sets is only informative where it exceeds these baselines **under the controls that remove them** (img_norm512 removes size and EXIF; vid_strip removes C2PA and encoder tags; vid_strip_trim5 also removes duration).

## 2026-09-29 — First v3.1 results (Gemini 3.5 Flash-Lite, original inputs)

Engine tree `76848a6`. Provider errors were resumed until every item completed; no error was scored.

| Set | Accuracy [95% CI] | FAKE recall | REAL recall | AUC | vs v1 (McNemar) |
|---|---|---|---|---|---|
| Images (50) | 0.880 [0.762, 0.944] | 0.84 | 0.92 | 0.90 | 0.86 → 0.88, p = 1.00 |
| Videos (30) | 0.933 [0.787, 0.982] | 0.87 | 1.00 | 0.96 | 1.00 → 0.93, p = 0.50 |

**Video fakes were detected exactly when C2PA provenance was present.** The 13 fake clips carrying a valid C2PA manifest with `trainedAlgorithmicMedia` were all called LIKELY_FAKE (confidence 0.99–1.0). The two fakes without one (`vid_fake_human_gemini_013`, `vid_fake_nonhuman_invideo_012`) were called LIKELY_REAL at 0.95. For 6 of the 13 detected fakes the first-pass analysis recorded no anomaly at all. On original files the engine's video result therefore equals the C2PA-only baseline (0.933, `trivial_baselines.csv`). Reading signed provenance is legitimate fact-based evidence, but it is not content analysis; the `vid_strip` and `vid_strip_trim5` controls measure what remains without it. These are not comparisons with the state of the art: the in-house sets are small and carry the shortcuts listed above.

## Observed measurement issues to control for

- **Run-to-run variability.** The same fake video received LIKELY_FAKE (95%) in one production call and LIKELY_REAL in another on 2026-09-24. LLM results must be reported over repeated runs.
- **Provider availability.** Free-tier Flash-Lite returned HTTP 503 for extended periods on 2026-09-28. Runs must pin the model and wait out outages rather than fall back to a different model, which would change the system under test mid-run.
- **Health-check defect (found 2026-09-28).** The drivers' availability check created a `genai.Client` without keeping a reference, and the installed google-genai SDK closes such clients before the request is sent, so the check always failed. The 503 errors recorded inside benchmark runs were real, but the drivers' "unavailable; waiting" log lines are not evidence of outages. Fixed in `v3_runs.sh` (commit `d27d038`).
- **Model drift.** Hosted model versions change. Every run records the model identifier and git commit in its manifest.
