# Paper assets

This folder contains scripts to generate **paper-ready figures** comparing:

- **Your three pipelines**: previous vs final benchmark results for news, image, and video
- **This project vs online tools**: capability-based comparison (not accuracy)

## 1) Generate pipeline result graphs

```bash
python3 -m paper.generate_paper_figures
```

Outputs (PNG + CSV summary) are saved to:

- `outputs/paper_figures/`

## 2) Generate online tools comparison graph

```bash
python3 -m paper.online_tools_comparison
```

Outputs are saved to:

- `outputs/paper_figures/project_vs_existing_tools_heatmap.png`
- `outputs/paper_figures/project_vs_existing_tools_scores.png`
- `outputs/paper_figures/online_tools_sources.csv`

## Notes for a paper

- Image final metrics are taken from the **cross-validated calibrated detector** section.
- News and video metrics are taken from the saved benchmark reports in `data/evaluation/*`.
- The online tools figure is **capability-only**. Do not present it as an accuracy benchmark unless you run a shared dataset through each tool.
