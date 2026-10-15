# Protocol: Round 2 enhancements (written 2026-10-15, before any Round 1 test result)

Round 1 runs engine v3.1.4 on the fixed test subsets (FakeNewsNet-PolitiFact test 102,
GossipCop test300, LIAR test300, FaceForensics++ c23 test200). Round 2 re-runs the **same test
items** with the enhanced engine. No Round 1 test result is used to design, select or tune
anything below.

## Enhancement A — engine v3.2
1. **Web image search as external verification for media.** For items with an image or video,
   the stage-1 queries also run an image search; candidate images are filtered like text
   evidence (blocklist, fact-check pages), compared with the item by a 64-bit difference hash,
   and shown to the verify stage with their distance and source page.
2. **What is false.** The verdict names whether the text, the media, or the pairing is false
   (`misinformation_type`).
Adoption follows `v3.2_dev_validation.md` (development splits only).

## Enhancement B — learned evidence scorer (fusion)
Replaces the LLM's single stated confidence with a score learned from the structured evidence
the engine already records (`evidence_features`). This is the paper's fusion component: weights
are learned, never hand-set.
- **Model:** logistic regression, L2 penalty, C chosen by 5-fold cross-validation on the training
  items; decision threshold 0.5 on the predicted probability of FAKE.
- **Features (fixed now):** the LLM's p(FAKE); counts of claims judged corroborated,
  contradicted, misleading, unverifiable; number of observations and of anomalies; number of
  retrieved sources and of pages read; numbers dropped as duplicate and as fact-check; genre
  (one-hot, news only); `misinformation_type` (one-hot, if present); the minimum dHash distance
  of retrieved images (with a missing indicator).
- **Training items:** 100 items per benchmark from the training splits, stratified, seed 2026
  (`research/splits/<bench>__train100.txt`): FakeNewsNet-PolitiFact train, FakeNewsNet-GossipCop
  train, LIAR train. One scorer per benchmark. FaceForensics++ has no affordable training run
  in this budget, so its Round 2 result is the engine's verdict alone.
- **Reported as its own row**, labelled "engine + learned scorer (trained on 100 training items)",
  next to the engine's raw verdict. It makes the system partly supervised; the paper says so.

## Round 2 outputs
For each benchmark: Round 2 raw verdict, Round 2 + learned scorer, compared item by item with
Round 1 (exact McNemar) and with the published references (`results/paper/`).
