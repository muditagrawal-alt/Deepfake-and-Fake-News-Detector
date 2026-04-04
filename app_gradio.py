import json
from datetime import datetime

import gradio as gr

from app import run_pipeline
from utils.news_logger import log_news
from utils.image_logger import log_image
from utils.video_logger import log_video


def compute_correct(predicted, ground_truth):
    if not ground_truth or ground_truth == "UNKNOWN":
        return None
    return int(predicted == ground_truth)


def gradio_pipeline(url, image, video, ground_truth):
    url = url.strip() if url else None
    image_path = image if image else None
    video_path = video if video else None

    provided = [bool(url), bool(image_path), bool(video_path)]

    if sum(provided) == 0:
        return "Please provide exactly one input: URL, image, or video.", "{}"

    if sum(provided) > 1:
        return "Please provide only one input at a time.", "{}"

    result = run_pipeline(
        url=url,
        image_path=image_path,
        video_path=video_path
    )

    modality = result.get("modality")
    verdict = result.get("final_verdict")

    news_data = result.get("news", {})
    image_data = result.get("image", {})
    video_data = result.get("video", {})
    scores = result.get("scores", {})

    summary_lines = [
        f"Modality: {modality}",
        f"Final Verdict: {verdict}",
        f"Ground Truth: {ground_truth}",
    ]

    details_json = "{}"
    timestamp = datetime.now().isoformat(timespec="seconds")

    if modality == "news":
        title = news_data.get("title")
        label = news_data.get("label")
        conf = news_data.get("confidence")
        twitter_signal = news_data.get("twitter_signal")
        sources = news_data.get("sources", [])

        if title:
            summary_lines.append(f"Title: {title}")
        if label:
            summary_lines.append(f"News Model: {label} ({conf:.2%})")
        if twitter_signal:
            summary_lines.append(f"Twitter Signal: {twitter_signal}")
        if sources:
            summary_lines.append("Top Related Headlines:")
            summary_lines.extend([f"- {s}" for s in sources[:5]])

        correct = compute_correct(verdict.replace("LIKELY ", ""), ground_truth)
        if correct is not None:
            summary_lines.append(f"Correct: {bool(correct)}")

        log_news({
            "timestamp": timestamp,
            "url": url,
            "title": title,
            "ground_truth": ground_truth,
            "predicted_label": label,
            "confidence": conf,
            "twitter_signal": twitter_signal,
            "num_sources": len(sources),
            "real_score": scores.get("real_score"),
            "fake_score": scores.get("fake_score"),
            "final_verdict": verdict,
            "correct": correct
        })

    elif modality == "image":
        label = image_data.get("label")
        conf = image_data.get("confidence")

        if label:
            summary_lines.append(f"Image Model: {label} ({conf:.2%})")

        correct = compute_correct(verdict.replace("LIKELY ", ""), ground_truth)
        if correct is not None:
            summary_lines.append(f"Correct: {bool(correct)}")

        log_image({
            "timestamp": timestamp,
            "image_path": image_path,
            "ground_truth": ground_truth,
            "predicted_label": label,
            "confidence": conf,
            "real_score": scores.get("real_score"),
            "fake_score": scores.get("fake_score"),
            "final_verdict": verdict,
            "correct": correct
        })

    elif modality == "video":
        label = video_data.get("label")
        conf = video_data.get("confidence")
        claim = video_data.get("claim")
        twitter_signal = video_data.get("twitter_signal")
        sources = video_data.get("sources", [])
        details = video_data.get("details") or {}
        metadata = details.get("metadata", {})

        if label:
            summary_lines.append(f"Video Model: {label} ({conf:.2%})")
        if claim:
            summary_lines.append(f"Claim: {claim}")
        if twitter_signal:
            summary_lines.append(f"Twitter Signal: {twitter_signal}")
        if sources:
            summary_lines.append("Top Related Headlines:")
            summary_lines.extend([f"- {s}" for s in sources[:5]])

        correct = compute_correct(verdict.replace("LIKELY ", ""), ground_truth)
        if correct is not None:
            summary_lines.append(f"Correct: {bool(correct)}")

        details_json = json.dumps(details, indent=2)

        log_video({
            "timestamp": timestamp,
            "video_path": video_path,
            "claim": claim,
            "ground_truth": ground_truth,
            "predicted_label": label,
            "confidence": conf,
            "twitter_signal": twitter_signal,
            "num_sources": len(sources),
            "total_frames": details.get("total_frames"),
            "real_frames": details.get("real_frames"),
            "fake_frames": details.get("fake_frames"),
            "has_audio": details.get("has_audio"),
            "face_ratio": details.get("face_ratio"),
            "has_metadata": metadata.get("has_metadata"),
            "has_creation_time": metadata.get("has_creation_time"),
            "has_device_info": metadata.get("has_device_info"),
            "encoder": metadata.get("encoder"),
            "suspicious_encoder": metadata.get("suspicious_encoder"),
            "real_score": scores.get("real_score"),
            "fake_score": scores.get("fake_score"),
            "final_verdict": verdict,
            "correct": correct
        })

    return "\n".join(summary_lines), details_json


with gr.Blocks(title="Multimodal Fake Content Detector") as demo:
    gr.Markdown("# Multimodal Fake Content Detector")
    gr.Markdown("Provide only one input at a time: news URL, image, or video.")

    ground_truth_input = gr.Dropdown(
        choices=["UNKNOWN", "REAL", "FAKE"],
        value="UNKNOWN",
        label="Ground Truth (for evaluation logging)"
    )

    url_input = gr.Textbox(
        label="News URL",
        placeholder="Paste a news article URL"
    )

    with gr.Row():
        image_input = gr.Image(type="filepath", label="Upload Image")
        video_input = gr.Video(label="Upload Video")

    run_btn = gr.Button("Run Detection")

    with gr.Row():
        summary_output = gr.Textbox(label="Summary", lines=20)
        details_output = gr.Code(label="Detailed Signals", language="json")

    run_btn.click(
        fn=gradio_pipeline,
        inputs=[url_input, image_input, video_input, ground_truth_input],
        outputs=[summary_output, details_output]
    )

demo.launch()