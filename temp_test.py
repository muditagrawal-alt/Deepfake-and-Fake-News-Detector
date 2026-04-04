from models.video_detector import extract_frames

frames = extract_frames("data/test_videos/video_resume.mp4")
print("Extracted frames:", len(frames))
print(frames[:5])