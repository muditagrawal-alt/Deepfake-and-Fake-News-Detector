from models.video_detector import analyze_frames, has_audio, get_video_metadata, has_meaningful_metadata

video_path = "data/test_videos/pokemon.mp4"

result = analyze_frames(video_path)

print("Total frames:", result["total_frames"])
print("Real frames:", result["real_frames"])
print("Fake frames:", result["fake_frames"])

print("\nHas audio:", has_audio(video_path))
print("Has meaningful metadata:", has_meaningful_metadata(video_path))

metadata = get_video_metadata(video_path)
print("\nFormat tags:")
print(metadata.get("format", {}).get("tags", {}))