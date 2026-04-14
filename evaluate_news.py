import pandas as pd
from app import run_pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix


def normalize_label(label):
    if not label:
        return None
    return label.replace("LIKELY ", "")


def evaluate_news(metadata_path):
    df = pd.read_csv(metadata_path)

    y_true = []
    y_pred = []
    results = []

    for _, row in df.iterrows():
        url = row["url"]
        ground_truth = row["label"]

        print(f"\n🔍 Processing: {url}")

        result = run_pipeline(url=url)

        predicted = result.get("final_verdict")
        predicted = normalize_label(predicted)

        print(f"GT: {ground_truth} | Pred: {predicted}")

        if predicted in ["REAL", "FAKE"]:
            y_true.append(ground_truth)
            y_pred.append(predicted)

        results.append({
            "id": row.get("id", None),
            "url": url,
            "ground_truth": ground_truth,
            "predicted": predicted
        })

    # Save predictions
    results_df = pd.DataFrame(results)
    results_df.to_csv("data/evaluation/news/results.csv", index=False)
    print("\n✅ Results saved to data/evaluation/news/results.csv")

    # =========================
    # 📊 Metrics
    # =========================
    print("\n==============================")
    print("📊 NEWS EVALUATION RESULTS")
    print("==============================")

    if len(y_true) == 0:
        print("❌ No valid REAL/FAKE predictions were produced.")
        return results

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
    rec = recall_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
    f1 = f1_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=["REAL", "FAKE"])

    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1 Score : {f1:.4f}")

    print("\nConfusion Matrix:")
    print(cm)

    # Save metrics
    with open("data/evaluation/news/metrics.txt", "w", encoding="utf-8") as f:
        f.write("NEWS EVALUATION RESULTS\n")
        f.write("=======================\n")
        f.write(f"Accuracy : {acc:.4f}\n")
        f.write(f"Precision: {prec:.4f}\n")
        f.write(f"Recall   : {rec:.4f}\n")
        f.write(f"F1 Score : {f1:.4f}\n")
        f.write("Confusion Matrix:\n")
        f.write(str(cm))

    print("\n✅ Metrics saved to data/evaluation/news/metrics.txt")

    return results


if __name__ == "__main__":
    evaluate_news("data/evaluation/news/metadata.csv")