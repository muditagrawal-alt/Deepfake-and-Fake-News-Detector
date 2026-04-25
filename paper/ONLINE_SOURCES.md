# Online tools sources (for citations)

These are the **public product/docs pages** used to justify the capability flags in `paper/online_tools_comparison.py`.

## Reality Defender

- Platform overview: `https://www.realitydefender.com/platform`
- RealScan product page: `https://www.realitydefender.com/product/realscan`
- Text detection announcement: `https://www.realitydefender.com/insights/introducing-text-detection`

Claims used:
- supports **image, video, audio**
- supports **text detection**
- supports **on-prem / private cloud / hosted SaaS**
- exposes **detailed, explainable results**

## Hive

- Product overview: `https://thehive.ai/`
- AI-generated content classification: `https://thehive.ai/apis/ai-generated-content-classification`
- Developer docs: `https://docs.thehive.ai/docs/ai-generated-content-detection`

Claims used:
- supports **text, image, video, audio**
- returns **confidence scores** and likely engine attribution
- supports **on-prem deployment**

## Deepware

- FAQ: `https://deepware.ai/faq/`

Claims used:
- supports **video** scanning only
- focuses on **AI-generated face manipulations**
- available via **web, API, SDK, and offline SDK environment**

## Sensity AI

- Deepfake detection product page: `https://sensity.ai/deepfake-detection-for-video-image-audio/`
- Homepage overview: `https://sensity.ai/`

Claims used:
- supports **image, video, audio**
- supports **cloud and on-premise deployment**
- provides **forensic evidence / explainable reports**

## Repo-specific comparison note

The following capability in the heatmap is an explicit repo-side comparison dimension rather than a vendor marketing claim:

- **Source Fusion**: whether the system combines content detection with external source or OSINT-style cross-checking.

## Important

The generated figure is a **capability comparison**, not an accuracy leaderboard.
If your paper needs accuracy comparison vs these tools, you must:

1. Choose a **shared benchmark dataset**
2. Run each tool on the same inputs (respecting ToS/privacy constraints)
3. Report the evaluation protocol and limitations
