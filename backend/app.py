"""
Hugging Face Space entry point.

The Space is created with the Gradio SDK because it is the only free SDK that
runs Python, but nothing Gradio is served: the SDK simply runs `python app.py`
and proxies whatever listens on the port. That is our FastAPI app, unchanged,
so the frontend on Vercel talks to exactly the same endpoints as in local
development.

Locally you would normally run it directly:
    uvicorn detector.main:app --reload --port 7860
"""
import os

import uvicorn

from detector.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7860)), workers=1)
