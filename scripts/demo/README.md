# Demo video pipeline

Two steps: record the browser, then assemble. Run both from the repository root.

```bash
# 1. Record the segments (defaults to localhost; pass the deployed URL instead)
node scripts/demo/record.mjs https://your-app.vercel.app /tmp/veritas-demo

# 2. Assemble: cuts, crossfades, captions, optional music
backend/.venv/bin/python scripts/demo/build.py /tmp/veritas-demo \
  --music docs/assets/music.mp3 \
  --out docs/assets/demo.mp4
```

**What it produces.** A title card, the landing animation, then the news and video
checks. The wait during each analysis is cut out: the recorder captures the start
and the finished result as separate segments, and `build.py` crossfades between
them. Captions are rendered with Pillow and composited bottom-centre, white with a
thin outline and no background bar. The app is recorded in dark mode so the
captions read the way film subtitles do.

**Music.** `docs/assets/music.mp3` is a 32-second excerpt of **"Art Of Silence V2"**
by Uniq, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) and taken
from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Uniq_-_Art_Of_Silence_V2.ogg).
The licence requires attribution, which is why the track is credited in the root
README and in the video file's metadata.

`--music` is optional; without it the video is silent. `--music-db` sets the level
(default -26, the bundled excerpt is mixed at -9 because it is quieter to begin
with, giving about -25 dB mean in the finished video). To swap the track, check the
licence first: the [YouTube Audio Library](https://www.youtube.com/audiolibrary),
[Free Music Archive](https://freemusicarchive.org) filtered to CC0 or CC BY, and
[Pixabay Music](https://pixabay.com/music/) are all reasonable sources.

**Editing the script.** Timings and captions live in `PLAN` at the top of
`build.py`: one entry per segment with how many seconds to keep and the captions
to show over it. Segments named `*_result` keep their tail, everything else keeps
its head.

**Requirements.** ffmpeg, the backend venv (for Pillow), and Playwright, which is
a devDependency of `frontend/`. Chromium must be installed once with
`npx playwright install chromium`.
