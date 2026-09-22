"""Print the Gemini model ids your key can call with generateContent."""
from detector.services import get_services

services = get_services()
if not services.gemini.enabled:
    raise SystemExit("GEMINI_API_KEY is not set (put it in .env at the repo root).")
for name in services.gemini.list_models():
    print(name)
