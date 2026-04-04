from models.video_detector import analyze_frames, has_audio

video_path = "data/test_videos/video_resume.mp4"

result = analyze_frames(video_path)

print("Total frames:", result["total_frames"])
print("Real frames:", result["real_frames"])
print("Fake frames:", result["fake_frames"])

print("\nHas audio:", has_audio(video_path))