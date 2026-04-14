from utils.web_verifier import verify_news
from utils.twitter_checker import check_twitter
from verifiers.youtube_verifier import verify_youtube
from verifiers.linkedin_verifier import verify_linkedin


def verify_external_sources(query):
    web_sources = verify_news(query)
    twitter_signal = check_twitter(query)
    youtube_result = verify_youtube(query)
    linkedin_result = verify_linkedin(query)

    return {
        "query": query,
        "web_sources": web_sources,
        "twitter_signal": twitter_signal,
        "youtube": youtube_result,
        "linkedin": linkedin_result
    }


def fuse_external_signals(evidence, modality="news"):
    real_boost = 0
    fake_boost = 0

    web_count = len(evidence.get("web_sources", []))
    twitter_signal = evidence.get("twitter_signal")
    youtube_signal = evidence.get("youtube", {}).get("signal")
    linkedin_signal = evidence.get("linkedin", {}).get("signal")

    # =========================
    # 📰 NEWS
    # =========================
    if modality == "news":
        if web_count >= 3:
            real_boost += 1

        if twitter_signal == "HIGH ACTIVITY":
            real_boost += 1
        elif twitter_signal == "LOW ACTIVITY":
            fake_boost += 1

        # Keep these weak for news
        if youtube_signal == "STRONG":
            real_boost += 0

        if linkedin_signal == "STRONG":
            real_boost += 0

        return real_boost, fake_boost

    # =========================
    # 🎥 VIDEO
    # =========================
    if modality == "video":
        if web_count >= 3:
            real_boost += 1

        if twitter_signal == "HIGH ACTIVITY":
            real_boost += 1
        elif twitter_signal == "LOW ACTIVITY":
            fake_boost += 1

        if youtube_signal == "STRONG":
            real_boost += 1

        if linkedin_signal == "STRONG":
            real_boost += 1

        return real_boost, fake_boost

    # =========================
    # 🖼️ IMAGE
    # =========================
    if modality == "image":
        if web_count >= 3:
            real_boost += 1

        if twitter_signal == "HIGH ACTIVITY":
            real_boost += 1

        return real_boost, fake_boost

    return real_boost, fake_boost