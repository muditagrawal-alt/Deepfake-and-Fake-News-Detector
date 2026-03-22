from utils.article_extractor import extract_article
from models.news_detector import predict_news
from utils.web_verifier import verify_news
from utils.twitter_checker import check_twitter
from models.image_detector import predict_image


# 🔗 INPUTS
url = "https://www.aljazeera.com/news/2026/3/22/iran-war-whats-happening-on-day-23-of-us-israel-attacks"
image_path = "data/test_images/test.jpg"  # set None if no image


# 🧠 EXTRACT ARTICLE
title, text = extract_article(url)

if text:
    print("\n==============================")
    print("TITLE:", title)
    print("==============================")

    # 📰 NEWS MODEL
    news_label, news_conf = predict_news(text[:512])
    print("\nNews Prediction:", news_label)
    print(f"Confidence: {news_conf*100:.2f}%")

    # 🐦 TWITTER SIGNAL
    twitter_signal = check_twitter(title)
    print("\nTwitter Signal:", twitter_signal)

    # 🌐 WEB VERIFICATION
    sources = verify_news(title)

    print("\nTop Related Headlines:")
    for s in sources:
        print("-", s)

    # 🖼️ IMAGE MODEL (optional)
    image_label = None
    image_conf = 0

    if image_path:
        try:
            image_label, image_conf = predict_image(image_path)
            print("\nImage Prediction:", image_label)
            print(f"Confidence: {image_conf*100:.2f}%")
        except Exception as e:
            print("\nImage Error:", e)

    # ==============================
    # 🧠 FINAL DECISION ENGINE
    # ==============================

    real_score = 0
    fake_score = 0

    # 📰 NEWS MODEL (PRIMARY)
    if news_label == "REAL":
        real_score += 2
    else:
        fake_score += 2

    # 🖼️ IMAGE MODEL (STRONG if present)
    if image_label:
        if image_label.lower() == "real":
            real_score += 2
        else:
            fake_score += 2

    # 🌐 WEB SIGNAL
    if len(sources) >= 3:
        real_score += 1

    # 🐦 TWITTER SIGNAL
    if twitter_signal == "HIGH ACTIVITY":
        real_score += 1
    elif twitter_signal == "LOW ACTIVITY":
        fake_score += 1

    # ⚖️ FINAL DECISION
    if real_score > fake_score:
        final = "LIKELY REAL"
    elif fake_score > real_score:
        final = "LIKELY FAKE"
    else:
        final = "UNCERTAIN"

    print("\n==============================")
    print("FINAL VERDICT:", final)
    print("==============================")

else:
    print("❌ Failed to extract article.")