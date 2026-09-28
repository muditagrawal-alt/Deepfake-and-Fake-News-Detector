# 2. Review response matrix

**Reviews:** ICMACC 2026, paper 2707, three reviewers (#1, #2, #4).
**Recommendations:** #1 weak accept, major revisions; #2 accept, minor revisions; #4 accept, minor revisions.
Literature review rated *Poor* by #1 and *Good* by #2 and #4.

Every reviewer point is grouped into a theme below. For each theme: who raised it, what the evidence now shows, the planned response, and where that work lives in `IMPLEMENTATION_PLAN.md`. Status as of 2026-09-28.

| # | Theme | Raised by | Status |
|---|---|---|---|
| T1 | Dataset too small | #1, #2, #4 | **in progress**: LIAR (1,283), MM-Soc PolitiFact (102) and GossipCop (1,000) downloaded with fixed splits; MMFakeBench, FF++/Celeb-DF, NewsCLIPpings pending access (2026-09-29) |
| T2 | No comparison with SOTA (SpotFake, SAFE, FakeNewsNet approaches) | #1, #2, #4 | SOTA table verified, MM-Soc zero-shot/fine-tuned references added; harness runs external benchmarks (P2) |
| T3 | 100% video accuracy vs "video module under development" | #1, #2, #4 | **root cause found** (metadata, duration, C2PA: trivial baselines 0.93–0.97); v3 controlled runs in progress |
| T4 | No statistical significance or cross-validation | #2, #4 | **done for existing results**; built into harness |
| T5 | No ablation studies | #4 | **partly done** (v1 image, v1 video, v2 detector); full set planned (P3) |
| T6 | Weighted fusion described too briefly | #4 | **formalised** (doc 1, §1.2); v3 replaces hand-set weights with a model judge over measured facts and evidence, and logs `evidence_features` for the learned-scorer comparison (P4) |
| T7 | Hyperparameters, training settings, computational complexity | #4 | partly documented; cost and latency study planned (P5) |
| T8 | Literature review weak; add 2023–2025 multimodal and explainable work | #1, #4 | sources collected (doc 4); writing planned (P6) |
| T9 | Novelty and methodological contribution unclear | #1 | reframing proposed (plan §3): evidence-grounded three-stage engine without hand-written rules (C1) and the shortcut audit (C2) |
| T10 | Confusion matrices, ROC curves | #4 | **done for existing results** (fig05, fig07) |
| T11 | Grammar, duplicated statements, formatting, figure quality | #2, #4 | planned (P6); figures regenerated at 300 dpi + vector |
| T12 | Real-world evaluation, scalability, deployment | #2, #4 | system deployed; measurements planned (P5) |
| T13 | Discuss limitations in more detail | #2 | material now exists (doc 1, F1–F11; doc 3 engine limits: publisher unknown on text benchmarks, local-model throughput) |

---

## T1. Dataset size
**Raised by:** #1 ("extremely small dataset, 50 news and 50 images"), #2, #4 ("expand using FakeNewsNet, LIAR, FaceForensics++").
**Evidence now:** at n = 50 the 95% intervals span roughly ±10–13 points, and no v1 → v2 difference on these sets is statistically significant (news p = 0.51, images p = 0.18; `results/paired_tests.csv`). The sets are also shortcut-prone (doc 1, F1, F4, F5, F6), so size is not the only problem.
**Response:** evaluate on established public benchmarks sized for the claims being made (≥ 400 items per class where the claim is a difference between systems; `figures/fig06`), and keep the original sets only as a documented case study of shortcut failure.
**Plan:** P2.

## T2. Comparison with state of the art
**Raised by:** #1 (names SpotFake, SAFE, FakeNewsNet approaches), #2, #4.
**Evidence now:** verified SOTA numbers for 14 benchmarks in `results/sota_reference.csv` (27 of 30 rows read from the original papers' tables). Two protocols matter: supervised in-domain results (e.g., SAFE on PolitiFact, acc 0.874) and zero-shot or cross-domain results (e.g., GPT-4V + MMD-Agent on MMFakeBench, macro-F1 0.615; detectors on Chameleon, ~0.58).
**Response:** compare on each benchmark's official protocol and report which regime each number belongs to. The framework is zero-shot, so the fair headline comparisons are zero-shot and cross-domain; in-domain supervised numbers are reported for context, not claimed as beaten unless they are.
**Plan:** P2, P3.

## T3. The 100% video result
**Raised by:** all three reviewers.
**Evidence now:** reproduced exactly (30/30) and explained. Removing only container metadata, with frames bit-identical, drops v1 to 0.633 and fake recall to 0.33 (p = 0.001). Clip duration alone classifies 96.7% of this set. (doc 1, F5, F6; `figures/fig03`.)
**Response:** withdraw the 100% figure. Report v1 video as 0.633 under metadata stripping, state the duration confound, and re-evaluate video on standard benchmarks with metadata stripped and durations matched. Remove the "under development" wording once the module is evaluated properly, or keep it and drop the numeric claim; the two cannot coexist.
**Plan:** P0 (correction), P2 (new evaluation).

## T4. Statistical significance and cross-validation
**Raised by:** #2, #4.
**Evidence now:** `results/benchmark_summary.csv` reports every run with 95% Wilson intervals, MCC and ROC-AUC; `results/paired_tests.csv` gives exact McNemar tests and bootstrap intervals for every paired comparison. The v1 image result already used leave-one-out; it is now repeated over 10 seeds.
**Response:** every reported number carries an interval; every comparison between systems on the same items uses McNemar; LLM runs are repeated (≥ 3 runs) and reported as mean ± sd, because the same input can receive different verdicts across runs (observed in production on 2026-09-24).
**Plan:** built into the harness (P1), applied throughout.

## T5. Ablation studies
**Raised by:** #4 ("demonstrate the contribution of each module: text, image, external verification").
**Evidence now:** three ablations exist: v1 image feature groups (size vs statistics vs detector), v1 video metadata, and v2 pixel detector on/off (images 0.88 → 0.96, not significant at n = 49, p = 0.13).
**Response:** a full module ablation per benchmark: each forensic signal, external verification on/off, the fusion method, and the input controls.
**Plan:** P3.

## T6. Fusion mechanism
**Raised by:** #4 ("explain weight assignment and decision strategy, with mathematical justification").
**Evidence now:** the exact v1 fusion is written out as equations and weight tables in doc 1, §1.2.
**Response:** present v1 fusion formally, then compare three fusion strategies on the same signals: v1 hand-set weights, a learned calibrated model (logistic regression with cross-validation), and the v2 LLM judge. This turns the fusion question into a measured result instead of a description.
**Plan:** P4.

## T7. Implementation details and complexity
**Raised by:** #4.
**Response:** a reproducibility appendix (model identifiers and versions, temperature, prompts, frame counts, thresholds, hardware), plus measured latency, peak memory and API calls per item for each modality. Some measurements already exist: v2 backend idles at 108 MB without the pixel detector versus 616 MB with it; median news check 9–15 s on the deployed service.
**Plan:** P5.

## T8. Literature review
**Raised by:** #1 (rated Poor), #4 (add 2023–2025 multimodal misinformation and explainable AI).
**Response:** add the works collected in doc 4: MMFakeBench (ICLR 2025), SNIFFER (CVPR 2024), DeepfakeBench (NeurIPS 2023), AIDE / Chameleon (ICLR 2025), DeMamba / GenVideo (2024), MLLM-based forensics (Jia et al., CVPRW 2024), and the shortcut-learning literature that motivates the controls.
**Plan:** P6.

## T9. Novelty
**Raised by:** #1.
**Response:** state two contributions precisely (plan §3): (1) an evidence-grounded hybrid framework in which a multimodal LLM fuses local forensic signals with publisher-excluded external verification, and returns claim-level verdicts with sources; (2) a shortcut-audit evaluation protocol for multimodal misinformation benchmarks, demonstrated on the paper's own data.
**Plan:** plan §3, P6.

## T10. Confusion matrices and ROC curves
**Raised by:** #4.
**Evidence now:** `figures/fig05_confusion_matrices` (all runs, with an explicit UNCERTAIN column) and `figures/fig07_roc_curves`.
**Plan:** regenerated automatically for every new benchmark.

## T11. Language, formatting, figures
**Raised by:** #2, #4.
**Response:** full proofreading pass; all figures regenerated from CSV by script, as 300 dpi PNG and vector PDF, in a consistent colour-blind-safe style.
**Plan:** P6.

## T12. Real-world evaluation, scalability, deployment
**Raised by:** #2, #4.
**Evidence now:** the framework is deployed as a public service (Next.js frontend on Vercel, FastAPI backend on Render's free tier) and verified end to end.
**Response:** report deployment architecture, per-item cost and latency, and a small in-the-wild evaluation on recently published items that post-date the model's training cutoff.
**Plan:** P2 (fresh set), P5.

## T13. Limitations
**Raised by:** #2.
**Response:** doc 1 supplies concrete, quantified limitations; the revised paper includes them, together with contamination risk for LLM-based evaluation and dataset-licence constraints.
**Plan:** P6.
