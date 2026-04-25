from pathlib import Path

import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score

from app import run_pipeline
from utils.dataset_resolver import read_commented_csv, resolve_video_benchmark_path


def normalize_label(label):
    if not label:
        return None
    return str(label).replace("LIKELY ", "").strip().upper()


def evaluate_videos(metadata_path):
    rows = read_commented_csv(metadata_path)

    y_true = []
    y_pred = []
    confident_true = []
    confident_pred = []
    results = []

    for row in rows:
        video_path = resolve_video_benchmark_path(row["filename"])
        ground_truth = str(row["label"]).strip().upper()

        print(f"\n🎥 Processing: {video_path or row['filename']}")

        if not video_path:
            predicted = "MISSING"
            result = {
                "video": {},
                "scores": {},
            }
        else:
            result = run_pipeline(
                video_path=video_path,
                allow_external_verification=False,
                video_frames_dir="frames_eval_video",
                video_fps=1,
            )
            predicted = normalize_label(result.get("final_verdict")) or "UNCERTAIN"

        if predicted not in {"REAL", "FAKE"}:
            predicted = "UNCERTAIN"

        print(f"GT: {ground_truth} | Pred: {predicted}")

        video_data = result.get("video", {})
        details = video_data.get("details") or {}
        metadata = details.get("metadata") or {}
        scores = details.get("scores") or result.get("scores", {})

        y_true.append(ground_truth)
        y_pred.append(predicted)

        if predicted in {"REAL", "FAKE"}:
            confident_true.append(ground_truth)
            confident_pred.append(predicted)

        results.append({
            "id": row.get("id"),
            "filename": row.get("filename"),
            "resolved_path": video_path,
            "ground_truth": ground_truth,
            "predicted": predicted,
            "video_label": video_data.get("label"),
            "video_confidence": video_data.get("confidence"),
            "context": video_data.get("context"),
            "claim": video_data.get("claim"),
            "total_frames": details.get("total_frames"),
            "real_frames": details.get("real_frames"),
            "fake_frames": details.get("fake_frames"),
            "avg_fake_probability": details.get("avg_fake_probability"),
            "frame_fake_ratio": details.get("frame_fake_ratio"),
            "has_audio": details.get("has_audio"),
            "face_ratio": details.get("face_ratio"),
            "duration_seconds": metadata.get("duration_seconds"),
            "encoder": metadata.get("encoder"),
            "suspicious_encoder": metadata.get("suspicious_encoder"),
            "generator_detected": metadata.get("generator_detected"),
            "generator_keyword": metadata.get("generator_keyword"),
            "public_context_metadata": metadata.get("public_context_metadata"),
            "has_creation_time": metadata.get("has_creation_time"),
            "has_device_info": metadata.get("has_device_info"),
            "real_score": scores.get("real_score"),
            "fake_score": scores.get("fake_score"),
        })

    accuracy = accuracy_score(y_true, y_pred)
    coverage = len(confident_pred) / len(y_pred) if y_pred else 0.0
    cm = confusion_matrix(y_true, y_pred, labels=["FAKE", "REAL", "UNCERTAIN"])

    if confident_pred:
        precision = precision_score(confident_true, confident_pred, pos_label="FAKE", zero_division=0)
        recall = recall_score(confident_true, confident_pred, pos_label="FAKE", zero_division=0)
        f1 = f1_score(confident_true, confident_pred, pos_label="FAKE", zero_division=0)
    else:
        precision = 0.0
        recall = 0.0
        f1 = 0.0

    results_df = pd.DataFrame(results)
    results_path = Path("data/evaluation/videos/results.csv")
    results_df.to_csv(results_path, index=False)
    print(f"\n✅ Results saved to {results_path}")

    print("\n==============================")
    print("📊 VIDEO EVALUATION RESULTS")
    print("==============================")
    print(f"Accuracy : {accuracy:.4f}")
    print(f"Coverage : {coverage:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")
    print("\nConfusion Matrix [FAKE, REAL, UNCERTAIN]:")
    print(cm)

    metrics_path = Path("data/evaluation/videos/metrics.txt")
    with open(metrics_path, "w", encoding="utf-8") as file_obj:
        file_obj.write("VIDEO EVALUATION RESULTS\n")
        file_obj.write("==============================\n")
        file_obj.write(f"Accuracy : {accuracy:.4f}\n")
        file_obj.write(f"Coverage : {coverage:.4f}\n")
        file_obj.write(f"Precision: {precision:.4f}\n")
        file_obj.write(f"Recall   : {recall:.4f}\n")
        file_obj.write(f"F1 Score : {f1:.4f}\n")
        file_obj.write(f"Confusion Matrix [FAKE, REAL, UNCERTAIN]:\n{cm}\n")

    print(f"\n💾 Metrics saved to {metrics_path}")

    return results


if __name__ == "__main__":
    evaluate_videos("data/evaluation/videos/metadata.csv")
