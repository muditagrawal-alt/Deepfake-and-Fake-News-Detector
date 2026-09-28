# 4. State of the art, benchmark selection, and evaluation hazards

All numbers here come from `results/sota_reference.csv`; 27 of its 30 rows were read directly from the result tables of the cited papers, and 3 are marked *secondary source* where only follow-up literature was available. A literature refresh for work published after mid-2025 is part of the plan (P6), because newer results may exist.

## 4.1 Two regimes, never mixed in one claim

Most published results are **supervised and in-domain**: the model is trained on a split of the same benchmark it is tested on. Our framework is **zero-shot**: nothing is trained on any benchmark. Comparisons are reported in the regime they belong to:

- Against **zero-shot and cross-domain** results, a win is a genuine claim.
- Against **supervised in-domain** results, our number is context. A win there is a strong claim and needs the leakage controls in §4.4.

## 4.2 Verified reference points

| Benchmark | Task | Regime | Best verified result | Source |
|---|---|---|---|---|
| **MMFakeBench** (10k test) | 4-class: real, textual, visual, cross-modal distortion | zero-shot + retrieval | **macro-F1 0.615**, acc 0.610 (GPT-4V + MMD-Agent) | Liu et al., ICLR 2025 |
| MMFakeBench (1k val) | binary real vs misinformation | zero-shot | F1 0.740 (GPT-4V MMD-Agent); best trained single-source detector 0.430 | same |
| **NewsCLIPpings** (7,264 test) | out-of-context image–caption | fine-tuned MLLM + evidence | **acc 0.884** (SNIFFER) | Qi et al., CVPR 2024 |
| NewsCLIPpings | same | supervised + evidence | acc 0.847 (CCN) | via Qi et al. 2024 |
| NewsCLIPpings (400 sample) | same | zero-shot | acc 0.755 (GPT-4V) | Qi et al. 2024 |
| FakeNewsNet PolitiFact | binary, text + image | supervised, temporal split | acc 0.874, F1 0.896 (SAFE) | Zhou et al., PAKDD 2020 |
| FakeNewsNet GossipCop | binary, text + image | supervised, temporal split | acc 0.838, F1 0.895 (SAFE) | same |
| Twitter MediaEval / Weibo | binary, text + image | supervised | F1 0.82 / acc 0.892 (SpotFake) | Singhal et al., BigMM 2019 (secondary) |
| LIAR | 6-class statement veracity | supervised | acc 0.274 (hybrid CNN) | Wang, ACL 2017 (secondary) |
| **Chameleon** | real vs AI images built to fool humans | cross-domain (train ProGAN) | **acc 0.584** (AIDE); CNNSpot 0.569 | Yan et al., ICLR 2025 |
| GenImage | real vs AI image, 8 generators | cross-generator (train SD1.4) | mean acc 0.869 (AIDE) | same |
| DF³ faces | real vs StyleGAN2 / LDM faces | zero-shot MLLM | AUC 0.795 (GPT-4V), 0.766 (Gemini 1.0 Pro) | Jia et al., CVPRW 2024 |
| FaceForensics++ c23 | face manipulation | supervised in-domain | frame AUC 0.971 (UCF) | DeepfakeBench, NeurIPS 2023 |
| **Celeb-DF v2** | face manipulation | cross-dataset (train FF++) | frame AUC 0.753 (UCF) | same |
| **GenVideo** | real vs AI video incl. Sora | supervised, unseen generators | F1 0.902, AP 0.971 (DeMamba, many-to-many); F1 0.726 (one-to-many) | Chen et al. 2024 |

Two observations shape the plan:

1. **The gap between in-domain and cross-domain performance is the field's central problem.** DeepfakeBench's best detector reaches 0.971 AUC in-domain and 0.753 on Celeb-DF v2; image detectors reach 0.869 across GenImage generators but ~0.58 on Chameleon. An approach that does not train on any benchmark should be judged where training does not help.
2. **Retrieval-augmented, reasoning-based methods already lead the multimodal-misinformation benchmarks** (MMD-Agent, SNIFFER, CCN all use external evidence). This is the same design family as the paper's "external verification", which positions the framework in an active research direction rather than against it.

## 4.3 Recommended benchmark suite

Chosen for fit with the paper's topic (deepfake media + fake news + hybrid AI + external verification), for a comparison regime in which a zero-shot system can fairly compete, and for reviewer requests.

| Priority | Benchmark | Why it fits | Comparison target | Honest expectation |
|---|---|---|---|---|
| **A** | MMFakeBench | covers all three of the paper's axes in one benchmark: fake text, AI-generated images, image–text mismatch; its SOTA uses retrieval, as we do | 0.615 macro-F1 | **plausible to exceed**: newer multimodal models plus publisher-excluded search |
| **A** | NewsCLIPpings | *the* external-evidence benchmark for image–caption misinformation | 0.755 zero-shot (GPT-4V); 0.847 / 0.884 trained | exceeding zero-shot plausible; matching trained systems is a stretch |
| **A** | Chameleon | AI images that humans misjudge; trained detectors are near chance | 0.584 | plausible to exceed; uncertain by how much |
| **A** | GenVideo (Sora and other unseen-generator subset) | fully synthetic video is what our own fakes are, and what current generators produce | F1 0.726 (one-to-many) | uncertain; zero-shot vs supervised |
| **B** | FakeNewsNet PolitiFact (+ GossipCop) | named by Reviewer 1 via SAFE; standard | acc 0.874 / F1 0.896 | high leakage risk (§4.4); report open- and closed-book |
| **B** | FaceForensics++ c23 → Celeb-DF v2 | named by Reviewer 4; standard face-swap test | cross-dataset AUC 0.753 | **likely below SOTA**: MLLMs are weak at subtle face swaps; report honestly |
| **B** | LIAR (6-class and binary) | named by Reviewer 4 | 6-class acc 0.274 | valid only closed-book (§4.4) |
| **B** | GenImage (subset) | most-cited AI-image benchmark | mean acc 0.869 | uncertain |
| **C** | Fresh post-cutoff set (self-collected) | the only contamination-free test; in-the-wild items | none (new) | our own contribution; also answers Reviewer 2's request for real-world evaluation |

Twitter MediaEval and Weibo (SpotFake's benchmarks) are cited for context but not prioritised: the tweet data is hard to obtain now that the Twitter API is closed, and Weibo is Chinese-language.

## 4.4 Hazards that can invalidate a result

**Search leakage.** LIAR statements and FakeNewsNet PolitiFact items come from politifact.com, which publishes the verdict. A web-search step will often retrieve the verdict page itself, turning detection into lookup. During benchmarking, block fact-check domains (politifact.com, snopes.com, factcheck.org, fullfact.org, AFP/Reuters/AP fact-check sections, and regional equivalents) and log every retrieved URL so leakage can be audited per item.

**Training-data contamination.** Benchmarks published before a model's training cutoff may be in its training data. Controls: a closed-book condition (no search) alongside the open-book one; a fresh set of items published after the model's cutoff; and a recognition probe that asks the model whether it knows the item and its label, reported per benchmark.

**Shortcuts in the data.** The paper's own sets show how easily resolution, duration, file format, metadata and source separate classes (doc 1, F4–F6). For every benchmark, report the accuracy of trivial baselines on file properties alone (size, duration, format, compression), and apply the input controls: resolution normalisation, metadata stripping, duration matching.

**Subset evaluation.** Several test sets are large (MMFakeBench 10,000; GenVideo 18,588). Evaluating a random subset is acceptable if the subset is fixed in advance, stratified by label and sub-category, published with its item list, and reported with confidence intervals — and the comparison to full-test-set SOTA is stated as such.

**Dataset licences and third-party APIs.** FaceForensics++, Celeb-DF and DFDC are released under access agreements, and NewsCLIPpings depends on VisualNews images, which have their own terms. Free API tiers may allow the provider to use submitted content. Before sending any licensed benchmark item to a hosted model, check the licence terms; the safest route is a paid tier whose terms exclude training on inputs, or an open-weight model run locally.

**Non-determinism.** The same input can receive different verdicts across calls (doc 3). Report LLM results as mean ± sd over repeated runs, and pin model versions in each run's manifest.
