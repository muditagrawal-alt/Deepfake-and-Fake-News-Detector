from models.video_detector import (
    analyze_frames,
    has_audio,
    analyze_metadata,
    detect_face_ratio
)

video_path = "data/test_videos/buffet.mp4"

result = analyze_frames(video_path)
meta = analyze_metadata(video_path)
face_ratio = detect_face_ratio()

print("Total frames:", result["total_frames"])
print("Real frames:", result["real_frames"])
print("Fake frames:", result["fake_frames"])

print("\nHas audio:", has_audio(video_path))
print("\nMetadata analysis:")
print(meta)

print("\nFace ratio:", round(face_ratio, 2))