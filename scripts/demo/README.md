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

**Music.** `--music` is optional; without it the video is silent. Drop any track at
`docs/assets/music.mp3`. Sources that are free for this use: the
[YouTube Audio Library](https://www.youtube.com/audiolibrary), [Free Music Archive](https://freemusicarchive.org)
(filter to CC0 or CC-BY), or [Pixabay Music](https://pixabay.com/music/). Check the
licence and credit the track in the README if the licence asks for it.

**Editing the script.** Timings and captions live in `PLAN` at the top of
`build.py`: one entry per segment with how many seconds to keep and the captions
to show over it. Segments named `*_result` keep their tail, everything else keeps
its head.

**Requirements.** ffmpeg, the backend venv (for Pillow), and Playwright, which is
a devDependency of `frontend/`. Chromium must be installed once with
`npx playwright install chromium`.
