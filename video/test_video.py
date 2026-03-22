import sys
import os
import argparse

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from detector import predict_video

def main():
    parser = argparse.ArgumentParser(description="Deepfake detection for a video")
    parser.add_argument('--video', type=str, required=True, help='Path to the video file')
    args = parser.parse_args()

    video_path = args.video
    if not os.path.isfile(video_path):
        print(f"Error: Video file not found at {video_path}")
        return

    result = predict_video(video_path)
    if result is None:
        print("Prediction failed.")
        return

    print(f"\nFinal Results:")
    print(f"Deepfake Score: {result['video_fake_score']:.2f}")
    print(f"Prediction: {result['label']}")

if __name__ == "__main__":
    main()