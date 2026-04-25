from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import LeaveOneOut

from models.image_detector import extract_image_features, make_image_calibrator, predict_base_image
from utils.dataset_resolver import resolve_existing_path


def summarize_metrics(y_true, y_pred):
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, pos_label="FAKE", zero_division=0),
        "recall": recall_score(y_true, y_pred, pos_label="FAKE", zero_division=0),
        "f1": f1_score(y_true, y_pred, pos_label="FAKE", zero_division=0),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=["FAKE", "REAL"]),
    }


def evaluate_images(metadata_path):
    df = pd.read_csv(metadata_path)

    rows = []
    features = []
    labels = []

    for _, row in df.iterrows():
        resolved_path = resolve_existing_path(row["path"])
        ground_truth = str(row["label"]).strip().upper()

        print(f"\n🖼️ Processing: {resolved_path}")

        base_prediction = predict_base_image(resolved_path)
        feature_vector = extract_image_features(resolved_path, base_prediction)

        rows.append({
            "id": row.get("id", None),
            "path": resolved_path,
            "ground_truth": ground_truth,
            "base_label": base_prediction["label"],
            "base_confidence": base_prediction["confidence"],
            "base_fake_probability": base_prediction["fake_probability"],
        })
        features.append(feature_vector)
        labels.append(1 if ground_truth == "FAKE" else 0)

    if not rows:
        print("❌ No image rows found in metadata.")
        return []

    x_data = np.vstack(features)
    y_data = np.array(labels)
    loo = LeaveOneOut()
    calibrated_fake_probs = np.zeros(len(rows), dtype=np.float32)

    for train_index, test_index in loo.split(x_data, y_data):
        calibrator = make_image_calibrator()
        calibrator.fit(x_data[train_index], y_data[train_index])
        calibrated_fake_probs[test_index[0]] = calibrator.predict_proba(x_data[test_index])[0][1]

    y_true = []
    y_pred = []
    base_pred = []

    for index, row in enumerate(rows):
        base_label = row["base_label"]
        calibrated_fake_probability = float(calibrated_fake_probs[index])
        predicted = "FAKE" if calibrated_fake_probability >= 0.5 else "REAL"
        confidence = calibrated_fake_probability if predicted == "FAKE" else 1.0 - calibrated_fake_probability

        row["predicted"] = predicted
        row["predicted_confidence"] = confidence
        row["calibrated_fake_probability"] = calibrated_fake_probability

        print(f"GT: {row['ground_truth']} | Base: {base_label} | Pred: {predicted}")

        y_true.append(row["ground_truth"])
        y_pred.append(predicted)
        base_pred.append(base_label)

    calibrated_metrics = summarize_metrics(y_true, y_pred)
    base_metrics = summarize_metrics(y_true, base_pred)

    results_df = pd.DataFrame(rows)
    results_path = Path("data/evaluation/images/results.csv")
    results_df.to_csv(results_path, index=False)
    print(f"\n✅ Results saved to {results_path}")

    print("\n==============================")
    print("📊 IMAGE EVALUATION RESULTS")
    print("==============================")
    print("Base detector:")
    print(f"Accuracy : {base_metrics['accuracy']:.4f}")
    print(f"Precision: {base_metrics['precision']:.4f}")
    print(f"Recall   : {base_metrics['recall']:.4f}")
    print(f"F1 Score : {base_metrics['f1']:.4f}")
    print(base_metrics["confusion_matrix"])

    print("\nCross-validated calibrated detector:")
    print(f"Accuracy : {calibrated_metrics['accuracy']:.4f}")
    print(f"Precision: {calibrated_metrics['precision']:.4f}")
    print(f"Recall   : {calibrated_metrics['recall']:.4f}")
    print(f"F1 Score : {calibrated_metrics['f1']:.4f}")
    print(calibrated_metrics["confusion_matrix"])

    metrics_path = Path("data/evaluation/images/metrics.txt")
    with open(metrics_path, "w", encoding="utf-8") as file_obj:
        file_obj.write("IMAGE EVALUATION RESULTS\n")
        file_obj.write("==============================\n")
        file_obj.write("Base detector\n")
        file_obj.write(f"Accuracy : {base_metrics['accuracy']:.4f}\n")
        file_obj.write(f"Precision: {base_metrics['precision']:.4f}\n")
        file_obj.write(f"Recall   : {base_metrics['recall']:.4f}\n")
        file_obj.write(f"F1 Score : {base_metrics['f1']:.4f}\n")
        file_obj.write(f"Confusion Matrix:\n{base_metrics['confusion_matrix']}\n\n")
        file_obj.write("Cross-validated calibrated detector\n")
        file_obj.write(f"Accuracy : {calibrated_metrics['accuracy']:.4f}\n")
        file_obj.write(f"Precision: {calibrated_metrics['precision']:.4f}\n")
        file_obj.write(f"Recall   : {calibrated_metrics['recall']:.4f}\n")
        file_obj.write(f"F1 Score : {calibrated_metrics['f1']:.4f}\n")
        file_obj.write(f"Confusion Matrix:\n{calibrated_metrics['confusion_matrix']}\n")

    print(f"\n💾 Metrics saved to {metrics_path}")

    return rows


if __name__ == "__main__":
    evaluate_images("data/evaluation/images/metadata.csv")
