# Implementation plan

**Paper:** *A Multimodal Framework for Detecting Deepfake Media and Fake News Using Hybrid AI and External Verification* — ICMACC 2026 (IEEE), paper 2707, accepted with revisions.
**Written:** 2026-09-28, after a full audit of the submitted (v1) system, the deployed (v2) system, and the reviews.
**Revised:** 2026-09-28 (evening). The engine was rebuilt as **v3**: no hand-written decision rules, analyse → retrieve → verify, runnable on Gemini or a local model (doc 3, "Engine rebuilt"). Finding F11 withdrew the in-house news set. Changes to this plan are marked *(rev.)*.
**Scope rule:** every phase below serves the paper's topic as titled — multimodal detection of deepfake media *and* fake news, by a *hybrid* of local forensics and AI, with *external verification*. Work that does not serve that topic is out of scope.

Supporting documents: [1 Legacy analysis](docs/01_legacy_analysis.md) · [2 Review response matrix](docs/02_review_response_matrix.md) · [3 v2 research log](docs/03_v2_research_log.md) · [4 SOTA and benchmarks](docs/04_sota_landscape.md)

---

## Scope decision (2026-09-29) *(rev. 2)*

The author restricted the benchmark programme to what the reviews ask for: **FakeNewsNet**
(PolitiFact and GossipCop, run on the MM-Soc release, which pairs each article with its image),
**LIAR** and **FaceForensics++ (c23)**, plus the paper's own in-house sets, whose published
results the reviewers questioned. MMFakeBench, Celeb-DF v2, NewsCLIPpings, Chameleon, GenVideo
and GenImage are out of scope; runs already made on MMFakeBench and Celeb-DF are kept in
`runs/out_of_scope/` and not reported. Where §4–§5 below list other benchmarks, this decision
overrides them.

Compute: all benchmark runs on Gemini 3.5 Flash-Lite with a paid key (pay-as-you-go), pinned,
with parallel requests; the local model is kept for a reproducibility check on small slices.
Estimated cost of the whole programme about US$36 (≈ ₹3,500 at ₹96/US$), up to about US$58
(≈ ₹5,600) if thinking tokens are billed at the same volume as answers; measured on the first
paid batch before any large run (`docs/05_benchmark_runs.md`).

## 0. Decisions needed before work starts

These change what the camera-ready contains. Each needs your answer, and two need an email to the programme chairs.

| # | Decision | Why it matters | Recommendation |
|---|---|---|---|
| D1 | **Camera-ready deadline and page limit** | Sets whether Track A (§4) fits before the deadline | Check the ICMACC author kit now |
| D2 | **Which system the camera-ready describes** *(rev.)* | v1 was accepted; v3 is the same framework (hybrid forensics + AI + external verification) rebuilt without hand-written rules. The corrected v1 results must be reported either way | Present v3 as the revised framework, with corrected v1 as the baseline it replaces, both under the same controls. State the change and the reason (the audit) in the point-by-point response to reviewers, which is the channel the chairs read |
| D3 | **The headline numbers must change** | The 100% video figure and the 0.86 image figure are explained by metadata and resolution shortcuts (doc 1, F4–F6). They cannot be carried into the camera-ready unchanged | Report corrected figures with the controls that produced them, and present the controls as a contribution (§3) |
| D4 | **API budget and compute** *(rev.)* | The benchmark programme needs roughly 15–25k model calls (§5). The local backend (gemma4:12b via Ollama) removes the quota limit but runs ~3 min per image with Low Power Mode on; on AC power it should be about twice as fast | Run the full programme on the local model (reproducible, no licence conflict), and a hosted Gemini run on fixed slices for comparison. A paid Gemini tier is optional, not required |
| D5 | **Dataset access** *(rev.)* | MMFakeBench is gated on Hugging Face (terms accepted by the account holder; approval is automatic). FaceForensics++, Celeb-DF and VisualNews (for NewsCLIPpings) need signed request forms; unofficial mirrors violate their terms and are not used. Chameleon and GenVideo are distributed by their authors outside Hugging Face | Accept MMFakeBench's terms now; submit the FF++, Celeb-DF and VisualNews forms this week. Available today without any request: LIAR (official), MM-Soc PolitiFact and GossipCop (text + image) |

## 1. Where things stand

| Modality | v1 reported | v1 corrected | v2 on the same set | v3 *(rev.)* |
|---|---|---|---|---|
| News (n = 50) | 0.86 | not measurable: domain list (F1); 24/25 FAKE URLs dead (F11) | 0.92 [0.81, 0.97] (before satire rule) | set withdrawn; news moves to external benchmarks |
| Images (n = 50) | 0.86 | **0.756 ± 0.013** without size features | 0.96 [0.86, 0.99] (detector off, n = 49) | running (Gemini), original and 512 px-normalised |
| Video (n = 30) | 1.00 | **0.633** with metadata stripped | 1.00 | running (Gemini), original, stripped, stripped + 5 s |

Provenance facts that now enter the engine, per `results/provenance_audit_summary.csv`: 13/15 fake videos carry a valid C2PA manifest declaring `trainedAlgorithmicMedia` (0/15 real); both video controls remove it. No image in either class carries C2PA or an XMP source type; 8/25 real images have an EXIF camera make (0/25 fake), removed by the 512 px control. A C2PA-only baseline therefore reaches 28/30 on the original videos and must be reported next to v3.

Three conclusions drive the plan. **(i)** The original sets cannot support the paper's claims: they are small and each has at least one label shortcut; the news set cannot be used at all (F11). **(ii)** v2 looked stronger but was never shown to be, and it contained hand-written rules tuned on the same sets, so v3 replaces it and v2 is kept only as a record. **(iii)** The reviewers' central concerns are confirmed and now quantified, which makes the revision's direction clear.

## 2. Rules for all remaining experiments

1. **Protocol before results.** For each benchmark, the item list, split, metrics and controls are committed to `research/protocols/` before the first test run.
2. **Development and test are separate.** Prompts and rules are tuned only on development splits. Test splits are run once per system configuration; if a test run fails for infrastructure reasons, only the failed items are resumed.
3. **Every run is traceable.** Model identifier, temperature, git commit, transform and timestamps go into the run's JSON manifest; per-item outputs go into its CSV and are never edited.
4. **Failures are not predictions.** API errors are excluded and counted; a run with more than 5% failures is invalid (already enforced by the harness).
5. **Controls are always on.** Every benchmark is reported with trivial file-property baselines and with the relevant input controls (resolution normalisation, metadata stripping, duration matching).
6. **Every number has an interval; every comparison has a test.** Wilson intervals for proportions, bootstrap intervals for F1 and AUC, exact McNemar for paired comparisons, and mean ± sd over at least 3 runs for anything involving an LLM.
7. **Negative results are reported.** If the framework loses on a benchmark, the paper says so.
8. **No hand-written decision rules** *(rev.)*. No code path sets or adjusts a verdict or confidence; prompts define the task and state neutral facts only; nothing learned from an evaluation set is written into a prompt. Weighting of evidence is learned only on development splits (P4).
9. **One model per run** *(rev.)*. `PIN_MODEL=true`; every call records the model version that served it, so a run that mixed models is detectable.

## 3. Contributions the revised paper can claim

Answering Reviewer 1's point on novelty, the paper should state contributions it can defend:

- **C1 — Evidence-grounded hybrid framework** *(rev.)*. A three-stage pipeline: a multimodal model reports claims and located observations without a verdict; a retrieval tool gathers evidence from sources other than the original publisher; the model then judges each claim against that evidence and the measured file facts (EXIF/XMP, container metadata, signed C2PA provenance). No hand-written rule touches the verdict, citations outside the retrieved set are removed, and the same pipeline runs on a hosted or a local open-weight model.
- **C2 — Shortcut audit for misinformation benchmarks.** A protocol of trivial baselines and input controls that exposes label shortcuts, demonstrated on the paper's own data: resolution alone reaches 0.92 on the image set, duration alone 0.967 on the video set, and metadata removal cuts v1 video accuracy from 1.00 to 0.63. This turns the audit findings into a contribution rather than only a correction.
- **C3 — Controlled multi-benchmark evaluation.** Results on established benchmarks under the controls of C2, with ablations and significance tests.
- **C4 — Fusion study.** Hand-set weights (v1) versus a scorer learned on development splits over v3's `evidence_features` versus the LLM judge alone, compared on accuracy, calibration and interpretability.

Two tracks deliver these:

- **Track A — camera-ready** (deadline-bound): C1 as the framework description, C2 with its existing evidence, corrected results, formal fusion, statistics, ablations on the original sets, a first external benchmark if time allows, the literature update, and proofreading.
- **Track B — full programme** (≈ 8 weeks): all of C1–C4, with the benchmark suite in §5. This is the extended journal paper, or the camera-ready if D1 and D2 allow.

## 4. Phases

Effort assumes one person. Model-call counts assume ~2 calls per item (first pass plus verification) and 3 repeated runs where marked.

### P0 — Corrections and re-baselining (week 1) · Track A critical path

**Goal:** honest numbers for every result the paper currently reports.

| Task | Deliverable | Status |
|---|---|---|
| v1 image calibrator ablation | `results/v1_image_ablation.csv`, `fig01`, `fig02` | **done** |
| v1 video reproduction and metadata ablation | `runs/videos__v1repro__*.csv`, `fig03` | **done** |
| Statistics for all existing runs | `results/benchmark_summary.csv`, `paired_tests.csv`, `fig04`–`fig07` | **done** |
| News URL audit (F11) | `results/news_url_audit*.csv` | **done** |
| Provenance coverage audit | `results/provenance_audit*.csv` | **done** |
| v3 (Gemini) on images and videos, with img_norm512, vid_strip, vid_strip_trim5 | `runs/{images,videos}__v3__gemini-…__run1.*` | **running** |
| v3 (gemma4:12b, local) on the same five configurations | `runs/*__v3__ollama-gemma412b__*` | to do (needs AC power) |
| Trivial baselines on all sets (size, duration, format, domain, extraction success, C2PA-only, EXIF-make-only) | `results/trivial_baselines.csv` | to do |
| 3 repeated runs of each v3 configuration | `run2`, `run3` per configuration | to do |
| Corrected-results table for the camera-ready | `results/corrected_results.csv` | to do |

**Acceptance:** every number in the revised paper's results section traces to a run file and a script; no number depends on a known shortcut without saying so.
**Model calls:** ~800.

### P1 — Evaluation harness (weeks 1–2)

**Goal:** add a benchmark with one loader and one protocol file.

| Task | Detail |
|---|---|
| Dataset loaders | One module per benchmark returning `(id, inputs, label, subcategory)`; fixed item lists in `research/splits/`. Engine entry points exist for text news (`analyze_news_text`, with publisher masking) and image + caption (`analyze_image(caption=…)`) *(rev.)* |
| Research mode in the backend | **done** *(rev.)*: `SEARCH_BLOCKLIST`, `RESEARCH_MODE=closed`, every retrieved URL stored in `forensics.retrieval` and the run's JSONL |
| Response cache | Keyed by model, prompt hash and input hash, so metrics can be recomputed and runs resumed without spending quota |
| Cost and latency capture | **done** *(rev.)*: tokens and seconds per stage in every run CSV; power state in the manifest |
| Repeat runs | `--run N` per invocation; aggregate mean ± sd in `build_results.py` |
| Metric tests | Unit tests comparing the metric code with scikit-learn on fixed toy data |

**Acceptance:** the existing runs are reproduced exactly from cache; a new benchmark needs only a loader and a protocol file.

### P2 — Benchmark programme (weeks 2–5)

Priority order and sizes from doc 4, §4.3. Sizes are chosen so a 95% interval is about ±3 points at 85% accuracy (`fig06`), except where the official set is smaller.

| Benchmark | Items (dev / test) | Protocol | Compared against | Calls (×3 runs) |
|---|---|---|---|---|
| MMFakeBench | 1,000 official val / 2,000 stratified from test | 4-class macro-F1 and binary F1 | 0.615 macro-F1 zero-shot | ~18k |
| NewsCLIPpings | 200 / 1,000 stratified from test | accuracy, per-class | 0.755 zero-shot; 0.847–0.884 trained | ~7k |
| Chameleon | 100 / 1,000 (500 / 500) | accuracy, AUC | 0.584 | ~6.6k |
| GenVideo | 50 / 400 (200 / 200, stratified by generator incl. Sora) | F1, AP, per-generator recall | F1 0.726 one-to-many | ~2.7k |
| FakeNewsNet PolitiFact | SAFE's temporal 80/20 split | accuracy, F1, open- and closed-book | 0.874 / 0.896 | ~1.3k |
| MM-Soc PolitiFact / GossipCop *(rev.)* | official train as dev / test 102 and a stratified 1,000 of 2,672 | accuracy, F1; text + image; open-book with fact-check sites blocklisted, and closed-book | MM-Soc paper's zero-shot MLLM results (to be verified) | ~0.6k / ~6k |
| FF++ c23 → Celeb-DF v2 | 400 per dataset | video AUC | 0.753 cross-dataset | ~4.8k |
| LIAR | official test (1,267) | 6-class and binary, closed-book | 0.274 (6-class) | ~3.8k (1 call/item) |
| GenImage | 1,000 stratified over 8 generators | mean accuracy | 0.869 | ~6k |
| Fresh post-cutoff set | 300 (collected Oct 2026) | accuracy, per-modality | none | ~1.8k |

These counts total well over the free tier's capacity, which is why D4 matters. If budget is tight, run every benchmark once on its full test subset, and use 3 repeats only on a fixed 400-item slice to estimate variance.

**Acceptance per benchmark:** protocol committed before the test run; trivial baselines and controls reported; results with intervals; per-item CSV and manifest committed.

### P3 — Ablations (weeks 4–6)

On a fixed 400-item slice of each priority-A benchmark:

| Ablation | Question it answers |
|---|---|
| External verification off (closed-book) | What external verification contributes — the paper's third pillar |
| Publisher exclusion off | Whether corroboration or mere existence drives the gain |
| Each forensic signal removed (metadata, EXIF/C2PA, pixel detector, transcript) | Each module's contribution (Reviewer 4) |
| Input controls on and off | How much each result depends on shortcuts |
| Model swap: Gemini Flash-Lite, gemma4:12b, qwen3.5:9b (thinking) *(rev.)* | Whether the framework or one particular model is responsible; the open-weight runs are reproducible by anyone |
| Native video vs frames + transcript (`VIDEO_STRATEGY`) *(rev.)* | What seeing motion and audio adds over sampled frames |

**Deliverable:** `results/ablations.csv`, and an ablation figure per benchmark.

### P4 — Fusion study (weeks 5–6)

Signals are extracted once per item and cached. Four fusion methods are then compared on identical inputs: v1's hand-set weights (doc 1, §1.2), logistic regression and gradient boosting with nested cross-validation, and the v2 LLM judge. Metrics: accuracy, macro-F1, Brier score, expected calibration error, and a reliability diagram per method. This answers Reviewer 4 with a measurement, and gives the paper its formal fusion section.

### P5 — Efficiency, calibration and deployment (week 6)

Latency (p50 / p95 per modality and stage), tokens and cost per item, memory footprint, throughput under the deployed free-tier limits, a calibration analysis of the stated confidence, and a failure-mode taxonomy built from misclassified items. Covers Reviewers 2 and 4 on complexity, scalability and deployment.

### P6 — Writing (weeks 6–8; Track A items as soon as P0 is done)

| Item | Source material |
|---|---|
| Point-by-point response to reviewers | doc 2 |
| Formal fusion section | doc 1, §1.2 and P4 |
| Results with intervals and tests | `results/*.csv`; tables generated from CSV |
| Figures | `figures/`, regenerated by `scripts/make_figures.py`; vector PDF for LaTeX |
| Shortcut-audit section (C2) | doc 1, F4–F6; `fig01`–`fig03` |
| Literature review, 2023–2026 | doc 4 plus a refresh for work since mid-2025 |
| Limitations | doc 1 findings, contamination, licences, non-determinism |
| Reproducibility appendix | manifests, prompts, model identifiers, thresholds |
| Proofreading and formatting | full pass against the IEEE template |

## 5. Targets

What "beating state of the art" can honestly mean for a zero-shot system. A **claim** is made only if the result exceeds the reference *and* the interval excludes it.

| Benchmark | Reference | Target | Regime of the claim |
|---|---|---|---|
| MMFakeBench | 0.615 macro-F1 | **> 0.615** | zero-shot vs zero-shot: direct claim |
| NewsCLIPpings | 0.755 zero-shot | **> 0.755**; stretch 0.847 | zero-shot; trained systems as context |
| Chameleon | 0.584 | **> 0.65** | zero-shot vs cross-domain trained: direct claim |
| GenVideo | F1 0.726 one-to-many | > 0.726 | zero-shot vs trained on one generator |
| FakeNewsNet PolitiFact | 0.874 | report; claim only if the closed-book result also exceeds it | leakage-prone |
| Celeb-DF v2 | AUC 0.753 | report honestly | expected below SOTA |
| LIAR | 0.274 (6-class) | report closed-book | expected low; leakage-prone open-book |
| GenImage | 0.869 | report | uncertain |

## 6. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| v2 also relies on the shortcuts | Its current results do not hold | Being tested now (P0); the plan does not rely on the current v2 numbers |
| Provider outages and quota | Runs stall or silently mix models | Pinned model, health-check driver, resume-on-failure, local backend (D4) |
| Local throughput *(rev.)* | A 1,000-item benchmark takes days | AC power with Low Power Mode off; one generation at a time; fixed slices for repeats |
| Publisher identity as a shortcut *(rev.)* | The model recognises satire outlets by name, as in F11 | Publisher-masked text condition (`news_text_masked`) on every news benchmark |
| Contamination and search leakage | Inflated results on older benchmarks | Blocklist, URL logging, closed-book condition, fresh post-cutoff set |
| Model versions change | Results cannot be reproduced later | Manifests record identifiers; open-weight baseline in P3 |
| Dataset licence terms | Cannot use a benchmark as planned | Check before use; paid no-training tier or local open-weight model |
| Camera-ready scope limits (D2) | v2 cannot be the paper's system | Track A stands on corrected v1 plus C2; Track B becomes the journal paper |
| Negative results on some benchmarks | Weaker headline | Reported as such; the regime distinction (doc 4, §4.1) keeps the claims defensible |

## 7. Timeline

| Week | Work |
|---|---|
| 1 | P0 complete; P1 started; dataset access requested; decisions D1–D5 |
| 2 | P1 complete; MMFakeBench and Chameleon development runs |
| 3 | MMFakeBench, Chameleon, NewsCLIPpings test runs |
| 4 | GenVideo, FakeNewsNet, LIAR; P3 ablations start |
| 5 | FF++/Celeb-DF, GenImage; P4 fusion study |
| 6 | Fresh set; P5; paper figures frozen |
| 7–8 | P6 writing, response letter, proofreading |

If the camera-ready deadline is sooner, Track A runs P0, P6 on the existing evidence, and at most one priority-A benchmark (MMFakeBench, the best topic fit).

## 8. This week *(rev.)*

1. Accept MMFakeBench's terms on Hugging Face; submit the FaceForensics++, Celeb-DF and VisualNews forms.
2. Let the v3 Gemini runs finish, then run the same five configurations on gemma4:12b (on AC power), then regenerate results: `research/.venv/bin/python research/scripts/build_results.py && research/.venv/bin/python research/scripts/make_figures.py`.
3. Add the trivial baselines, including C2PA-only and extraction-success.
4. Write loaders for LIAR and MM-Soc PolitiFact/GossipCop; commit their protocols; run them open-book (fact-check sites blocklisted), closed-book and publisher-masked.
5. Start repeated runs (run2, run3) of the v3 configurations.
