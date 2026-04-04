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

    print("\n==============================")
    print("🚀 MULTIMODAL DETECTION PIPELINE")
    print("==============================")

    # ==============================
    # 📰 NEWS PIPELINE
    # ==============================
    if url:
        print("\n🔍 Running NEWS analysis...")

        title, text = extract_article(url)

        if text:
            print("\n📰 TITLE:", title)

            news_label, news_conf = predict_news(text[:512])
            print("\nNews Prediction:", news_label)
            print(f"Confidence: {news_conf*100:.2f}%")

            if news_label == "REAL":
                real_score += 2
            else:
                fake_score += 2

            twitter_signal = check_twitter(title)
            print("\nTwitter Signal:", twitter_signal)

            if twitter_signal == "HIGH ACTIVITY":
                real_score += 1
            elif twitter_signal == "LOW ACTIVITY":
                fake_score += 1

            sources = verify_news(title)

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
        if os.path.exists(image_path):
            print("\n🔍 Running IMAGE analysis...")

            try:
                image_label, image_conf = predict_image(image_path)

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
        if os.path.exists(video_path):
            print("\n🔍 Running VIDEO analysis...")

            try:
                video_label, video_conf, _ = predict_video(video_path)

                print("\n🎥 Video Prediction:", video_label)
                print(f"Confidence: {video_conf*100:.2f}%")

                # 🔎 derive claim from filename
                claim = os.path.basename(video_path).replace(".mp4", "").replace("_", " ")
                print("\n🔎 Derived Claim:", claim)

                sources = verify_news(claim)

                print("\nTop Related Headlines:")
                for s in sources:
                    print("-", s)

                twitter_signal = check_twitter(claim)
                print("\nTwitter Signal:", twitter_signal)

                # 🧠 scoring
                if video_label == "REAL":
                    real_score += 1
                else:
                    fake_score += 2

                if len(sources) >= 3:
                    real_score += 2
                else:
                    fake_score += 2

                if twitter_signal == "HIGH ACTIVITY":
                    real_score += 1
                else:
                    fake_score += 1

            except Exception as e:
                print("❌ Video Error:", e)
        else:
            print("❌ Video path invalid:", video_path)

    # ==============================
    # 🧠 FINAL DECISION
    # ==============================
    if real_score == 0 and fake_score == 0:
        print("\n❌ No valid input provided.")
        return "NO INPUT"

    if real_score > fake_score:
        final = "LIKELY REAL"
    elif fake_score > real_score:
        final = "LIKELY FAKE"
    else:
        final = "UNCERTAIN"

    print("\n==============================")
    print("FINAL VERDICT:", final)
    print("==============================")

    return final


# ==============================
# 🔥 ENTRY POINT
# ==============================
if __name__ == "__main__":

    url = None
    image_path = None
    video_path = "data/test_videos/video_resume.mp4"

    run_pipeline(
        url=url,
        image_path=image_path,
        video_path=video_path
    )