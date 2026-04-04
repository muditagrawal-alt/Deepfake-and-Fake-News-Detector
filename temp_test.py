from models.video_detector import analyze_frames

result = analyze_frames("data/test_videos/video_resume.mp4")

print("Total frames:", result["total_frames"])
print("Real frames:", result["real_frames"])
print("Fake frames:", result["fake_frames"])
print("First 3 results:")
for item in result["frame_results"][:3]:
    print(item)