# Team runbook: running the reviewer benchmarks in parallel

Scope: the benchmarks the reviewers name — **FakeNewsNet** (PolitiFact, GossipCop; MM-Soc release
with images), **LIAR**, **FaceForensics++ (c23)**. Every teammate runs the **same code at the same
commit**, with the **same model and settings**, on a **fixed, non-overlapping shard** of the items.
`merge_shards.py` refuses to combine shards that differ in engine version, model or settings.

## 0. Before the 2-hour window (≈ 20 min per person)

1. **Code.** Mudit shares `veritas-bench.bundle` (a git bundle of the exact commit) privately.
   ```bash
   git clone veritas-bench.bundle Deepfake-and-Fake-News-Detector
   cd Deepfake-and-Fake-News-Detector && git log -1 --format=%h     # must print the commit in the bundle note
   ```
2. **Python 3.11+ and ffmpeg** (`brew install ffmpeg` / `apt install ffmpeg`).
3. **Environment** (backend venv; the loaders' three extra packages go into the same venv):
   ```bash
   python3 -m venv backend/.venv
   backend/.venv/bin/pip install -r backend/requirements.txt pandas pyarrow huggingface_hub pytest
   (cd backend && .venv/bin/python -m pytest -q tests)                  # must pass
   ```
4. **Secrets.** Create `.env` at the repo root (never commit it):
   ```
   GEMINI_API_KEY=<the paid key Mudit shares, or your own paid key>
   GROQ_API_KEY=<optional>
   GEMINI_RPM=600
   GEMINI_CONCURRENCY=12
   GEMINI_DAILY_QUOTA=100000
   ```
   Everyone must use model `gemini-3.5-flash-lite` (the default; do not set `GEMINI_PRIMARY_MODEL`).
5. **Data.**
   ```bash
   cd research/scripts
   ../../backend/.venv/bin/python -m datasets.liar
   ../../backend/.venv/bin/python -m datasets.mmsoc
   cd ../..
   ```
   FaceForensics++ is only run by Mudit (access is per person under its terms).
6. **Network.** Web search (DuckDuckGo) limits requests **per internet connection**. Teammates
   on the same Wi-Fi share one limit — use different connections (e.g. phone hotspots).
7. **Power.** Plug in, turn Low Power Mode off, and keep the machine awake (`caffeinate -i` on macOS).

## 1. Assignments

Times assume 6 concurrent items per machine for open-book runs and 10 for closed-book runs,
measured Gemini latency, and no DuckDuckGo throttling (if throttled, the harness retries; runs
take longer but results stay correct).

| Person | Runs | Items | Est. time |
|---|---|---|---|
| **P1 (Mudit)** | FaceForensics++ test200 (open-book; the full 700 if downloaded in time) · FakeNewsNet-PolitiFact test, open-book and closed-book | 200 (700) + 102 + 102 | ≈ 35 min (≈ 80 min) |
| **P2** | GossipCop shard 1/3 (open + closed) · LIAR shard 1/3 (open + closed) | 334 + 334 + 428 + 428 | ≈ 90 min |
| **P3** | GossipCop shard 2/3 · LIAR shard 2/3 (open + closed) | 333 + 333 + 428 + 428 | ≈ 90 min |
| **P4** | GossipCop shard 3/3 · LIAR shard 3/3 (open + closed) | 333 + 333 + 427 + 427 | ≈ 90 min |

With five people, use shards k/4 for GossipCop and LIAR across P2–P5 (≈ 70 min each).

## 2. Commands

Set once per terminal: `PY=backend/.venv/bin/python; RE=research/scripts/run_eval.py`

**P1**
```bash
caffeinate -i $PY $RE --bench ffpp_c23 --split test200 --workers 6 --resume     # or --split test if all 700 are downloaded
EXCLUDE_FACT_CHECKS=true caffeinate -i $PY $RE --bench mmsoc_politifact --split test --workers 6 --resume
EXCLUDE_FACT_CHECKS=true RESEARCH_MODE=closed caffeinate -i $PY $RE --bench mmsoc_politifact --split test --workers 10 --resume
```

**P2 / P3 / P4** (k = 1, 2 or 3)
```bash
K=1   # your shard
EXCLUDE_FACT_CHECKS=true caffeinate -i $PY $RE --bench mmsoc_gossipcop --split test1000 --shard $K/3 --workers 6 --resume
EXCLUDE_FACT_CHECKS=true caffeinate -i $PY $RE --bench liar --split test --shard $K/3 --workers 6 --resume
EXCLUDE_FACT_CHECKS=true RESEARCH_MODE=closed caffeinate -i $PY $RE --bench mmsoc_gossipcop --split test1000 --shard $K/3 --workers 10 --resume
EXCLUDE_FACT_CHECKS=true RESEARCH_MODE=closed caffeinate -i $PY $RE --bench liar --split test --shard $K/3 --workers 10 --resume
```

If a command ends with `valid=False` or errors > 0, **run the same command again**: `--resume`
re-runs only the failed items. Never edit code, prompts or settings during the window.

## 3. Handing back results

Zip everything your runs wrote and send it to Mudit:
```bash
zip -r results_P$K.zip research/runs/*__shard* research/runs/*mmsoc_politifact* research/runs/*ffpp*
```
Mudit unzips into `research/runs/`, then:
```bash
R=research/.venv/bin/python; S=research/scripts
for b in mmsoc_gossipcop__test1000 liar__test; do for m in open closed; do
  $R $S/merge_shards.py ${b}__v3__gemini-gemini35flashlite__none__${m}__nofc__run1; done; done
$R $S/build_results.py && $R $S/sota_comparison.py && $R $S/make_figures.py
```
