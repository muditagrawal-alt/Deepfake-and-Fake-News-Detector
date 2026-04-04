from utils.article_extractor import extract_article
from models.news_detector import predict_news
from utils.web_verifier import verify_news
from utils.twitter_checker import check_twitter
from models.image_detector import predict_image
from models.video_detector import predict_video
import os


def run_pipeline(url=None, image_path=None, video_path=None):
    real_score = 0
    fake_score = 0

    result = {
        "modality": None,
        "final_verdict": None,
        "news": {
            "title": None,
            "label": None,
            "confidence": None,
            "twitter_signal": None,
            "sources": []
        },
        "image": {
            "label": None,
            "confidence": None
        },
        "video": {
            "label": None,
            "confidence": None,
            "details": None,
            "claim": None,
            "twitter_signal": None,
            "sources": []
        },
        "scores": {
            "real_score": 0,
            "fake_score": 0
        }
    }

    print("\n==============================")
    print("🚀 MULTIMODAL DETECTION PIPELINE")
    print("==============================")

    # ==============================
    # 📰 NEWS PIPELINE
    # ==============================
    if url:
        result["modality"] = "news"
        print("\n🔍 Running NEWS analysis...")

        title, text = extract_article(url)

        if text:
            result["news"]["title"] = title
            print("\n📰 TITLE:", title)

            news_label, news_conf = predict_news(text[:512])
            result["news"]["label"] = news_label
            result["news"]["confidence"] = news_conf

            print("\nNews Prediction:", news_label)
            print(f"Confidence: {news_conf*100:.2f}%")

            if news_label == "REAL":
                real_score += 2
            else:
                fake_score += 2

            twitter_signal = check_twitter(title)
            result["news"]["twitter_signal"] = twitter_signal
            print("\nTwitter Signal:", twitter_signal)

            if twitter_signal == "HIGH ACTIVITY":
                real_score += 1
            elif twitter_signal == "LOW ACTIVITY":
                fake_score += 1

            sources = verify_news(title)
            result["news"]["sources"] = sources

            print("\nTop Related Headlines:")
            for s in sources:
                print("-", s)

            if len(sources) >= 3:
                real_score += 1

        else:
            print("❌ Failed to extract article.")

    # ==============================
    # 🖼️ IMAGE PIPELINE
    # ==============================
    if image_path:
        result["modality"] = "image" if not result["modality"] else result["modality"]
        if os.path.exists(image_path):
            print("\n🔍 Running IMAGE analysis...")

            try:
                image_label, image_conf = predict_image(image_path)
                result["image"]["label"] = image_label
                result["image"]["confidence"] = image_conf

                print("\n🖼️ Image Prediction:", image_label)
                print(f"Confidence: {image_conf*100:.2f}%")

                if image_label.lower() == "real":
                    real_score += 2
                else:
                    fake_score += 2

            except Exception as e:
                print("❌ Image Error:", e)
        else:
            print("❌ Image path invalid:", image_path)

    # ==============================
    # 🎥 VIDEO PIPELINE
    # ==============================
    if video_path:
        result["modality"] = "video" if not result["modality"] else result["modality"]
        if os.path.exists(video_path):
            print("\n🔍 Running VIDEO analysis...")

            try:
                video_label, video_conf, details = predict_video(video_path)

                result["video"]["label"] = video_label
                result["video"]["confidence"] = video_conf
                result["video"]["details"] = details

                print("\n🎥 Video Prediction:", video_label)
                print(f"Confidence: {video_conf*100:.2f}%")
                print("Details:", details)

                # Base video score from detector
                if video_label == "FAKE":
                    fake_score += 2
                elif video_label == "REAL":
                    real_score += 2
                else:
                    fake_score += 1
                    real_score += 1

                # Additional local forensic signals
                metadata = details.get("metadata", {}) if details else {}
                face_ratio = details.get("face_ratio", 0.0) if details else 0.0
                has_audio = details.get("has_audio", False) if details else False

                if metadata.get("suspicious_encoder", False):
                    fake_score += 2

                if metadata.get("has_creation_time", False):
                    real_score += 1

                if metadata.get("has_device_info", False):
                    real_score += 1

                if has_audio:
                    real_score += 1
                else:
                    fake_score += 1

                if face_ratio >= 0.8:
                    real_score += 1
                elif face_ratio < 0.3:
                    fake_score += 1

                # Optional verification layer using filename-derived claim
                claim = os.path.basename(video_path).replace(".mp4", "").replace("_", " ")
                result["video"]["claim"] = claim
                print("\n🔎 Derived Claim:", claim)

                sources = verify_news(claim)
                result["video"]["sources"] = sources

                print("\nTop Related Headlines:")
                for s in sources:
                    print("-", s)

                twitter_signal = check_twitter(claim)
                result["video"]["twitter_signal"] = twitter_signal
                print("\nTwitter Signal:", twitter_signal)

                # Apply web/twitter carefully:
                # only boost if there is strong external support
                if len(sources) >= 3:
                    real_score += 1

                if twitter_signal == "HIGH ACTIVITY":
                    real_score += 1
                elif twitter_signal == "LOW ACTIVITY":
                    fake_score += 1

            except Exception as e:
                print("❌ Video Error:", e)
        else:
            print("❌ Video path invalid:", video_path)

    # ==============================
    # 🧠 FINAL DECISION
    # ==============================
    result["scores"]["real_score"] = real_score
    result["scores"]["fake_score"] = fake_score

    if real_score == 0 and fake_score == 0:
        print("\n❌ No valid input provided.")
        result["final_verdict"] = "NO INPUT"
        return result

    if real_score > fake_score:
        final = "LIKELY REAL"
    elif fake_score > real_score:
        final = "LIKELY FAKE"
    else:
        final = "UNCERTAIN"

    result["final_verdict"] = final

    print("\n==============================")
    print("FINAL VERDICT:", final)
    print("==============================")

    return result


# ==============================
# 🔥 ENTRY POINT
# ==============================
if __name__ == "__main__":
    url = None
    image_path = None
    video_path = "data/test_videos/buffet.mp4"

    run_pipeline(
        url=url,
        image_path=image_path,
        video_path=video_path
    )