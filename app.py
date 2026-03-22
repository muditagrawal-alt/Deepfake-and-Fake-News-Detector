from models.news_detector import predict_news

text = "Breaking: Government announces new policy to ban all social media platforms."

label, conf = predict_news(text)

print(f"News Prediction: {label}")
print(f"Confidence: {conf*100:.2f}%")