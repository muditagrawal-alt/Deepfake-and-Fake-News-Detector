import pandas as pd
from app import run_pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix


def normalize_label(label):
    if not label:
        return None
    return label.replace("LIKELY ", "")


def evaluate_images(metadata_path):
    df = pd.read_csv(metadata_path)

    y_true = []
    y_pred = []
    results = []

    for _, row in df.iterrows():
        path = row["path"]
        ground_truth = row["label"]

        print(f"\n🖼️ Processing: {path}")

        result = run_pipeline(image_path=path)

        predicted = normalize_label(result.get("final_verdict"))
        image_data = result.get("image", {})
        scores = result.get("scores", {})

        print(f"GT: {ground_truth} | Pred: {predicted}")

        if predicted in ["REAL", "FAKE"]:
            y_true.append(ground_truth)
            y_pred.append(predicted)

        results.append({
            "id": row.get("id", None),
            "path": path,
            "ground_truth": ground_truth,
            "predicted": predicted,
            "image_label": image_data.get("label"),
            "image_conf": image_data.get("confidence"),
            "query": image_data.get("query"),
            "twitter_signal": image_data.get("twitter_signal"),
            "num_sources": len(image_data.get("sources", [])),
            "youtube_signal": image_data.get("youtube", {}).get("signal"),
            "linkedin_signal": image_data.get("linkedin", {}).get("signal"),
            "real_score": scores.get("real_score"),
            "fake_score": scores.get("fake_score"),
        })

    # =========================
    # 💾 Save detailed results
    # =========================
    results_df = pd.DataFrame(results)
    results_path = "data/evaluation/images/results.csv"
    results_df.to_csv(results_path, index=False)
    print(f"\n✅ Results saved to {results_path}")

    print("\n==============================")
    print("📊 IMAGE EVALUATION RESULTS")
    print("==============================")

    if len(y_true) == 0:
        print("❌ No valid REAL/FAKE predictions were produced.")
        return results

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
    rec = recall_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
    f1 = f1_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=["FAKE", "REAL"])

    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1 Score : {f1:.4f}")

    print("\nConfusion Matrix:")
    print(cm)

    # =========================
    # 💾 Save metrics to file
    # =========================
    metrics_path = "data/evaluation/images/metrics.txt"
    with open(metrics_path, "w", encoding="utf-8") as f:
        f.write("IMAGE EVALUATION RESULTS\n")
        f.write("==============================\n")
        f.write(f"Accuracy : {acc:.4f}\n")
        f.write(f"Precision: {prec:.4f}\n")
        f.write(f"Recall   : {rec:.4f}\n")
        f.write(f"F1 Score : {f1:.4f}\n\n")
        f.write("Confusion Matrix:\n")
        f.write(str(cm))

    print(f"\n💾 Metrics saved to {metrics_path}")

    return results


if __name__ == "__main__":
    evaluate_images("data/evaluation/images/metadata.csv")