# 1. Analysis of the legacy (v1) system described in the paper

**Paper:** *A Multimodal Framework for Detecting Deepfake Media and Fake News Using Hybrid AI and External Verification* (ICMACC 2026, paper 2707).
**Code analysed:** `legacy/` (git-ignored; archived locally), benchmark definitions in `data/evaluation/`.
**Date of audit:** 2026-09-28. Every number below is reproducible with the scripts in `research/scripts/`.

---

## 1.1 What v1 actually does

| Module | Components | Decision |
|---|---|---|
| News | `newspaper3k` / BeautifulSoup extraction → `jy46604790/Fake-News-Bert-Detect` on the **first 512 characters**; a 2-entry satire-domain list; DuckDuckGo result count; Twitter search page size; YouTube and LinkedIn result counts | Additive score fusion (§1.2) |
| Image | `Organika/sdxl-detector` (Swin) probability + 15 hand-crafted statistics + **width, height, aspect ratio** → RandomForest (300 trees, balanced) calibrator; "has any metadata" heuristic | Additive score fusion |
| Video | ≤32 frames at 1 fps scored by the image detector; Haar-cascade face ratio; audio presence; ffprobe metadata keyword rules; duration | Two-stage additive score fusion |

External verification (web, Twitter, YouTube, LinkedIn) is applied to news only; the image path skips it, and the video benchmark ran with it disabled (`allow_external_verification=False` in `legacy/evaluate_videos.py`).

## 1.2 The fusion mechanism, stated formally

Reviewer 4 noted the weighted fusion was described only briefly. Reconstructed exactly from `legacy/app.py` and `legacy/models/video_detector.py`:

For an input *x*, each module emits signals φₖ(x) ∈ {0, 1} (or a model confidence *c* ∈ [0, 1]). Two scores accumulate independently,

  S_real(x) = Σₖ wₖᴿ φₖ(x),  S_fake(x) = Σₖ wₖᶠ φₖ(x),

and the verdict is

  ŷ(x) = FAKE if S_fake > S_real; REAL if S_real > S_fake; UNCERTAIN otherwise.

The weights were set by hand; none were learned or validated on held-out data.

**News**

| Signal φₖ | Condition | w_real | w_fake |
|---|---|---|---|
| Satire domain | URL contains `theonion.com` or `babylonbee.com` | 0 | **4**, and all other signals are skipped |
| BERT, low confidence | c < 0.60 | 1 | 1 |
| BERT says REAL | c ≥ 0.60 | 2c | 0 |
| BERT says FAKE | c ≥ 0.60 | 0 | 2c |
| Web corroboration | ≥ 3 DuckDuckGo results for the headline | 1 | 0 |
| Twitter activity | page > 200 kB ("HIGH") / < 100 kB ("LOW") | 1 / 0 | 0 / 1 |
| YouTube, LinkedIn | ≥ 3 / ≥ 2 results | **0** | 0 |

**Image**

| Signal | Condition | w_real | w_fake |
|---|---|---|---|
| Calibrated detector, low confidence | c < 0.60 | 1 | 1 |
| Calibrated detector | c ≥ 0.60, label REAL / FAKE | 2c / 0 | 0 / 2c |
| No metadata | `PIL.Image.info` empty | 0 | 1 |

**Video, stage 1** (`predict_video`) combines frame-label ratios (±1–2), mean frame fake-probability (±1–2), audio (+1 real / **+2 fake if absent**), a generator keyword in metadata (**+4 fake**), creation time and device tags (+1 real each), duration ≥ 30 s (**+2 real**), public-context tags (+2 real), and face ratio (+1–2). **Stage 2** (`run_pipeline`) re-adds most of the same metadata signals (+1 each) on top of the stage-1 label (±2). Several signals are therefore counted twice.

## 1.3 Findings

Each finding lists the evidence and what it means for the paper. Severity: **critical** changes a headline number; **major** affects validity or reporting; **minor** is a defect without numerical effect.

### F1 (critical). News FAKE recall is guaranteed by construction
All 25 FAKE items in `data/evaluation/news/metadata.csv` are satire from exactly two domains, `theonion.com` (14) and `babylonbee.com` (11), and both domains are hard-coded in `is_satire_domain()`. For every FAKE item the pipeline returns FAKE with confidence 1.0 **before BERT or external verification run**. The reported FAKE recall of 1.00 measures the domain list, not the model; the classifier was never tested on a single fake article. On the 25 real articles, where BERT does run, it labels 7 as fake (specificity 0.72).

### F2 (major). One external-verification signal is constant, two are weighted zero
`utils/twitter_checker.py` fetches `twitter.com/search` without authentication and thresholds the page size. The page is a JavaScript shell of **299,325 bytes for any query**, including nonsense strings (tested 2026-09-22), so the signal is always "HIGH ACTIVITY" and adds +1 REAL to every news item. YouTube and LinkedIn signals carry weight 0 for news. The only informative external signal is the DuckDuckGo result count, which measures whether a headline exists online rather than whether it is true (satire headlines also return ≥ 3 results).

### F3 (major). The "previous vs final" comparisons use different denominators
`legacy/evaluate_news.py` keeps only REAL/FAKE predictions and silently drops UNCERTAIN ones. The "previous" news result (0.7857) was computed on **42** decided items and the earlier baseline (0.3243) on **37**; the "final" (0.86) on all **50**. `paper/generate_paper_figures.py` then substitutes coverage = 1.0 whenever a metrics file lacks a coverage line, so the published figure shows full coverage for runs that did not have it. The image "previous" (0.6735) was computed on 49 items.

### F4 (critical). The image calibrator learned image resolution
In the 50-image benchmark, real images have a median longest side of **300 px** (13 of 25 under 400 px) and fakes **1408 px** (1 of 25 under 400 px). The calibrator's features include width, height and aspect ratio. Re-running the published protocol exactly (same features, RandomForest, leave-one-out; `research/scripts/v1_image_ablation.py`, 10 seeds):

| Configuration | LOO-CV accuracy (mean ± sd) |
|---|---|
| Published, 18 features | **0.866 ± 0.019** (paper: 0.86) |
| **Width, height, aspect only (never looks at pixels)** | **0.920 ± 0.000** |
| Published minus size features | 0.756 ± 0.013 |
| Image statistics only | 0.722 ± 0.020 |
| Detector only | 0.700 ± 0.000 |
| Raw detector, no calibrator | 0.660 |

Height and width are the calibrator's two most important features (31.8% of total importance). A model that never examines image content outperforms the published one. The corrected v1 image accuracy, with the shortcut removed, is **0.756**. See `results/v1_image_ablation.csv`, `figures/fig01`, `fig02`.

### F5 (critical). The 100% video accuracy comes from metadata
All 15 fake videos carry a generator tag in their container metadata (`encoder: Google` from Gemini/Veo, 14; `description: Created using invideo AI.`, 1), which v1 matches by keyword for +4 (stage 1) and +1 (stage 2). A faithful re-implementation of the v1 video pipeline (`research/scripts/v1_video_repro.py`; identical sampling, face detection, metadata rules and two-stage fusion, detector via ONNX) **reproduces the published 30/30**. Removing only the metadata, with decoded frames verified bit-identical:

| | Accuracy | Fake recall | Real recall |
|---|---|---|---|
| Original files (paper) | 1.000 | 1.00 | 1.00 |
| Metadata stripped | **0.633** [0.455, 0.781] | **0.33** | 0.93 |

McNemar exact test: p = 0.001. The paper's own "previous" video result (0.667) is statistically indistinguishable from the stripped result, so the entire reported improvement came from the metadata keyword rules. Real-world videos lose this metadata on almost any re-upload or re-encode.

### F6 (critical). The video benchmark has a second shortcut: duration
Every fake clip is Veo's fixed-length output (**7.8–8.0 s**); real clips run **3.7–420 s**. A single duration threshold ("fake if ≤ 8.0 s") classifies **96.7%** of the set. v1 also rewards duration ≥ 30 s with +2 (stage 1) and +1 (stage 2) toward REAL. Real clips come from YouTube (10) and self-recordings (5); fakes from two generators. Source, duration and metadata are all confounded with the label, so this set cannot validate a video detector by itself.

### F7 (major). No statistical analysis at the reported sample sizes
With n = 50 (news, images) and n = 30 (video), 95% Wilson intervals are roughly ±10–13 points at the reported accuracies (`figures/fig04`). The paper reports no intervals or tests. See `results/benchmark_summary.csv`.

### F8 (minor). Duplicate item ID in the image benchmark
`generate_image_metadata.py` numbers files by directory position, counting `.DS_Store`, so `img_026` is assigned to both `real/img_real_nonhuman_self_024.jpeg` and `fake/img_fake_human_picsart_024.jpeg`. v1's own evaluation iterates rows and is unaffected; any analysis joining by ID is not.

### F9 (minor). Earlier baselines had evaluation bugs
`images/baseline_results_1.txt` reports accuracy 0.50 with every item predicted as one class (a label-mapping error in the first detector integration), and `news/baseline_results_1.txt` 0.3243 on 37 items with no FAKE predictions. These are pipeline bugs, not model baselines, and should not appear as "previous" results.

### F10 (minor). The deployed calibrator trains on the benchmark
`load_image_calibrator()` fits the RandomForest on `data/evaluation/images/metadata.csv`, the benchmark itself. The paper's number used leave-one-out and is not affected, but any evaluation of the deployed v1 on that set would be training on its test data.

### F11 (critical). 24 of the 25 FAKE news URLs do not resolve to an article
Found 2026-09-28 while testing the rebuilt engine; reproduced by `research/scripts/audit_news_urls.py` (`results/news_url_audit.csv`, `results/news_url_audit_summary.csv`).

| Label | n | HTTP 200 | HTTP 404 | HTTP 401/403 | Article text extracted | Any Wayback snapshot | Domains |
|---|---|---|---|---|---|---|---|
| REAL | 25 | 21 | 0 | 4 | 23 | 18 | 14 |
| FAKE | 25 | 1 | 14 | 10 | 1 | 1 | 2 |

14 of the 15 `theonion.com` URLs return 404. Several of their headlines are real Onion pieces (for example "Congress Takes Group Of Schoolchildren Hostage"), but the numeric article IDs in the URLs do not exist, so the URLs were not copied from the site. The 10 `babylonbee.com` URLs are bot-blocked (403) and none has ever been captured by the Internet Archive. Only `news_026` is a live, archived article.

Consequences:
1. **The FAKE class contains almost no article text.** Any system that reads the page sees nothing for 24 of 25 fake items. A detector is then judged on the URL string alone, where the publisher's name decides the answer.
2. **Extraction success is a near-perfect label proxy** (23/25 REAL vs 1/25 FAKE). v2 told the model when extraction failed, so v2's news accuracy on this set is confounded with it, in addition to publisher identity.
3. **Neither v1's 0.86 nor any v2 number on this set measures fake-news detection.** The set can support one narrow claim only: whether a system recognises satire *publishers* from a URL.

For the paper: report the in-house news set as audited and withdrawn, and evaluate news on established benchmarks with retrievable text (FakeNewsNet PolitiFact/GossipCop, LIAR, MMFakeBench; doc 4), plus a rebuilt in-house set whose every URL is verified live and archived at collection time.

### F12 (major). The fake videos carry a visible generator watermark
Found 2026-09-29 while analysing the v3.1 `vid_strip` run. Fourteen of the 15 fake videos are Veo outputs with Google's visible "Veo" mark in the bottom-right corner of every frame; the InVideo clip has none. Real videos carry no generator mark. Because the mark is in the pixels, stripping metadata (`vid_strip`) and trimming duration (`vid_strip_trim5`) both leave it in place: with metadata stripped, v3.1 detected 14/15 fakes and cited the watermark for each, while the one unmarked fake was called real. Reading a visible watermark is legitimate evidence, but it measures generator attribution, not the ability to detect synthetic content. Control: `vid_strip_trim5_crop` keeps the central 80% of every frame (10% removed from each side, identically for both classes), which removes the mark (checked on extracted frames); `img_norm512_crop` does the same for images, where generator marks were cited for only 2–3 of 25 fakes.

## 1.4 What v1 contributes, stated accurately

The framework's structure is sound and matches the paper's topic: independent modality modules, local forensic signals, external verification, and an explicit fusion step with an UNCERTAIN outcome. What the current evaluation does not support is the reported performance. Corrected v1 numbers, with the shortcuts identified above removed:

| Modality | Reported | Corrected | Basis |
|---|---|---|---|
| News | 0.86 (FAKE recall 1.00) | not measurable on this set | FAKE class is solved by the domain list (F1), and 24/25 FAKE URLs are dead or unverifiable (F11) |
| Images | 0.86 | **0.756 ± 0.013** | size features removed (F4) |
| Video | 1.00 | **0.633** | metadata removed; duration shortcut still present (F5, F6) |

These corrections are also an opportunity: the controls that exposed them (resolution normalisation, metadata stripping, duration trimming, source-balanced sampling) are a reusable shortcut-audit protocol, and the paper can present it as a contribution (see `IMPLEMENTATION_PLAN.md`, §3).
