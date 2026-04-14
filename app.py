from utils.article_extractor import extract_article
from models.news_detector import predict_news
from models.image_detector import predict_image
from models.video_detector import predict_video
from verifiers.external_verifier import verify_external_sources, fuse_external_signals
import os


def derive_query_from_url(url):
    slug = url.rstrip("/").split("/")[-1]
    slug = slug.replace("-", " ")
    return slug


def classify_video_context(video_details):
    """
    Returns one of:
    - personal_human
    - public_human_content
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

    if face_ratio >= 0.4 and has_audio:
        return "public_human_content"

    if face_ratio < 0.2:
        return "fictional_or_animated"

    return "public_event_or_unknown"


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
            "sources": [],
            "youtube": {},
            "linkedin": {},
            "extraction_status": "NOT_RUN"
        },
        "image": {
            "label": None,
            "confidence": None,
            "query": None,
            "twitter_signal": None,
            "sources": [],
            "youtube": {},
            "linkedin": {}
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
            result["news"]["extraction_status"] = "SUCCESS"
            result["news"]["title"] = title
            print("\n📰 TITLE:", title)

            news_label, news_conf = predict_news(text[:512])
            result["news"]["label"] = news_label
            result["news"]["confidence"] = news_conf

            print("\nNews Prediction:", news_label)
            print(f"Confidence: {news_conf*100:.2f}%")

            # Local text-model signal
            if news_label == "REAL":
                real_score += 2
            else:
                fake_score += 2

            # Shared external evidence
            evidence = verify_external_sources(title)
            ext_real, ext_fake = fuse_external_signals(evidence, modality="news")

            real_score += ext_real
            fake_score += ext_fake

            result["news"]["sources"] = evidence["web_sources"]
            result["news"]["twitter_signal"] = evidence["twitter_signal"]
            result["news"]["youtube"] = evidence["youtube"]
            result["news"]["linkedin"] = evidence["linkedin"]

            print("\nTop Related Headlines:")
            for s in evidence["web_sources"]:
                print("-", s)

            print("\nTwitter Signal:", evidence["twitter_signal"])
            print("YouTube Signal:", evidence["youtube"].get("signal"))
            print("LinkedIn Signal:", evidence["linkedin"].get("signal"))

        else:
            print("❌ Failed to extract article.")
            fallback_query = derive_query_from_url(url)
            result["news"]["extraction_status"] = "FAILED_FALLBACK_USED"
            result["news"]["title"] = fallback_query

            print("🔎 Using fallback query:", fallback_query)

            evidence = verify_external_sources(fallback_query)
            ext_real, ext_fake = fuse_external_signals(evidence, modality="news")

            real_score += ext_real
            fake_score += ext_fake

            result["news"]["sources"] = evidence["web_sources"]
            result["news"]["twitter_signal"] = evidence["twitter_signal"]
            result["news"]["youtube"] = evidence["youtube"]
            result["news"]["linkedin"] = evidence["linkedin"]

            print("\nTop Related Headlines:")
            for s in evidence["web_sources"]:
                print("-", s)

            print("\nTwitter Signal:", evidence["twitter_signal"])
            print("YouTube Signal:", evidence["youtube"].get("signal"))
            print("LinkedIn Signal:", evidence["linkedin"].get("signal"))

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

                # Local image-model signal
                if image_label == "REAL":
                    real_score += 2
                elif image_label == "FAKE":
                    fake_score += 2
                else:
                    real_score += 1
                    fake_score += 1

                # Lightweight external evidence from filename-derived query
                image_query = os.path.splitext(os.path.basename(image_path))[0].replace("_", " ")
                result["image"]["query"] = image_query
                print("\n🔎 Image Query:", image_query)

                evidence = verify_external_sources(image_query)
                ext_real, ext_fake = fuse_external_signals(evidence, modality="image")

                real_score += ext_real
                fake_score += ext_fake

                result["image"]["sources"] = evidence["web_sources"]
                result["image"]["twitter_signal"] = evidence["twitter_signal"]
                result["image"]["youtube"] = evidence["youtube"]
                result["image"]["linkedin"] = evidence["linkedin"]

                print("\nTop Related Headlines:")
                for s in evidence["web_sources"]:
                    print("-", s)

                print("\nTwitter Signal:", evidence["twitter_signal"])
                print("YouTube Signal:", evidence["youtube"].get("signal"))
                print("LinkedIn Signal:", evidence["linkedin"].get("signal"))

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
                    fake_score += 1

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
                claim = os.path.splitext(os.path.basename(video_path))[0].replace("_", " ")
                result["video"]["claim"] = claim
                print("\n🔎 Derived Claim:", claim)

                evidence = {
                    "web_sources": [],
                    "twitter_signal": "SKIPPED",
                    "youtube": {
                        "platform": "youtube",
                        "query": claim,
                        "num_results": 0,
                        "matches": [],
                        "signal": "SKIPPED"
                    },
                    "linkedin": {
                        "platform": "linkedin",
                        "query": claim,
                        "num_results": 0,
                        "matches": [],
                        "signal": "SKIPPED"
                    }
                }

                # Only verify externally when it makes sense
                if video_context in ["public_event_or_unknown", "public_human_content"]:
                    evidence = verify_external_sources(claim)

                    print("\nTop Related Headlines:")
                    for s in evidence["web_sources"]:
                        print("-", s)

                    print("\nTwitter Signal:", evidence["twitter_signal"])
                    print("YouTube Signal:", evidence["youtube"].get("signal"))
                    print("LinkedIn Signal:", evidence["linkedin"].get("signal"))

                    ext_real, ext_fake = fuse_external_signals(evidence, modality="video")

                    # Public human content should not be heavily penalized for weak external evidence
                    if video_context == "public_human_content":
                        ext_fake = min(ext_fake, 1)

                    real_score += ext_real
                    fake_score += ext_fake
                else:
                    print("\n🌐 External verification skipped for this video type.")

                result["video"]["sources"] = evidence["web_sources"]
                result["video"]["twitter_signal"] = evidence["twitter_signal"]
                result["video"]["youtube"] = evidence["youtube"]
                result["video"]["linkedin"] = evidence["linkedin"]

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