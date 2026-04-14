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

        print(f"GT: {ground_truth} | Pred: {predicted}")

        if predicted in ["REAL", "FAKE"]:
            y_true.append(ground_truth)
            y_pred.append(predicted)

        results.append({
            "path": path,
            "ground_truth": ground_truth,
            "predicted": predicted
        })

    # Save results
    results_df = pd.DataFrame(results)
    results_df.to_csv("data/evaluation/images/results.csv", index=False)

    print("\n==============================")
    print("📊 IMAGE EVALUATION RESULTS")
    print("==============================")

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, pos_label="FAKE")
    rec = recall_score(y_true, y_pred, pos_label="FAKE")
    f1 = f1_score(y_true, y_pred, pos_label="FAKE")

    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1 Score : {f1:.4f}")

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_true, y_pred))


if __name__ == "__main__":
    evaluate_images("data/evaluation/images/metadata.csv")