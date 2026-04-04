from models.video_detector import predict_video

video_path = "data/test_videos/video_resume.mp4"

label, conf, details = predict_video(video_path)

print("Label:", label)
print("Confidence:", round(conf, 2))
print("Details:")
print(details)