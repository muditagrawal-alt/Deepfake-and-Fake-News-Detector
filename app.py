from utils.article_extractor import extract_article
from models.news_detector import predict_news
from utils.web_verifier import verify_news
from utils.twitter_checker import check_twitter
from models.image_detector import predict_image
from models.video_detector import predict_video
from verifiers.youtube_verifier import verify_youtube
from verifiers.linkedin_verifier import verify_linkedin
import os


def classify_video_context(video_details):
    """
    Decide whether external verification should matter for this video.
    Returns one of:
    - personal_human
    - fictional_or_animated
    - public_event_or_unknown
    """
    if not video_details:
        return "public_event_or_unknown"

    face_ratio = video_details.get("face_ratio", 0.0)
    has_audio = video_details.get("has_audio", False)
    metadata = video_details.get("metadata", {})
    suspicious_encoder = metadata.get("suspicious_encoder", False)

    if face_ratio >= 0.8 and has_audio and not suspicious_encoder:
        return "personal_human"

    if face_ratio < 0.2:
        return "fictional_or_animated"

    return "public_event_or_unknown"


def fuse_external_evidence(web_result_count, twitter_signal, youtube_result, linkedin_result):
    real_boost = 0
    fake_boost = 0

    if web_result_count >= 3:
        real_boost += 1

    if twitter_signal == "HIGH ACTIVITY":
        real_boost += 1
    elif twitter_signal == "LOW ACTIVITY":
        fake_boost += 1

    if youtube_result.get("signal") == "STRONG":
        real_boost += 1
    elif youtube_result.get("signal") == "NONE":
        fake_boost += 1

    if linkedin_result.get("signal") == "STRONG":
        real_boost += 1
    elif linkedin_result.get("signal") == "NONE":
        fake_boost += 1

    return real_boost, fake_boost


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
            "context": None,
            "twitter_signal": None,
            "sources": [],
            "youtube": {},
            "linkedin": {}
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
        if not result["modality"]:
            result["modality"] = "image"

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
        if not result["modality"]:
            result["modality"] = "video"

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

                # Base video score from local detector
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

                # Context routing
                video_context = classify_video_context(details)
                result["video"]["context"] = video_context
                print("\n🧭 Video Context:", video_context)

                # Claim from filename
                claim = os.path.basename(video_path).replace(".mp4", "").replace("_", " ")
                result["video"]["claim"] = claim
                print("\n🔎 Derived Claim:", claim)

                sources = []
                twitter_signal = "SKIPPED"
                youtube_result = {
                    "platform": "youtube",
                    "query": claim,
                    "num_results": 0,
                    "matches": [],
                    "signal": "SKIPPED"
                }
                linkedin_result = {
                    "platform": "linkedin",
                    "query": claim,
                    "num_results": 0,
                    "matches": [],
                    "signal": "SKIPPED"
                }

                # Only verify externally if the video is plausibly externally verifiable
                if video_context == "public_event_or_unknown":
                    sources = verify_news(claim)
                    twitter_signal = check_twitter(claim)
                    youtube_result = verify_youtube(claim)
                    linkedin_result = verify_linkedin(claim)

                    print("\nTop Related Headlines:")
                    for s in sources:
                        print("-", s)

                    print("\nTwitter Signal:", twitter_signal)
                    print("YouTube Signal:", youtube_result.get("signal"))
                    print("LinkedIn Signal:", linkedin_result.get("signal"))

                    ext_real, ext_fake = fuse_external_evidence(
                        len(sources),
                        twitter_signal,
                        youtube_result,
                        linkedin_result
                    )
                    real_score += ext_real
                    fake_score += ext_fake
                else:
                    print("\n🌐 External verification skipped for this video type.")

                result["video"]["sources"] = sources
                result["video"]["twitter_signal"] = twitter_signal
                result["video"]["youtube"] = youtube_result
                result["video"]["linkedin"] = linkedin_result

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