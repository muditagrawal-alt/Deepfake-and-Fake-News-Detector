"""
Article extraction with trafilatura (replaces newspaper3k + bs4).
"""
import json
import logging
from urllib.parse import parse_qs, unquote, urlparse

import httpx
import trafilatura

from detector.schemas import Extraction

log = logging.getLogger(__name__)

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def normalize_url(url: str) -> str:
    """Unwrap Google redirect links; otherwise return as-is."""
    try:
        parsed = urlparse(url.strip())
        if "google." in parsed.netloc and parsed.path == "/url":
            qs = parse_qs(parsed.query)
            for key in ("url", "q"):
                if qs.get(key):
                    return unquote(qs[key][0])
        return url.strip()
    except Exception:
        return url


def slug_from_url(url: str) -> str:
    path = urlparse(url).path.rstrip("/")
    slug = path.split("/")[-1] if path else ""
    slug = slug.rsplit(".", 1)[0]
    return slug.replace("-", " ").replace("_", " ").strip()


async def extract_article(url: str, *, max_chars: int = 14000) -> tuple[Extraction, str]:
    """Return (Extraction metadata, body text). Body is '' when extraction fails."""
    clean = normalize_url(url)
    ext = Extraction(url=url, final_url=clean)

    html = None
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0, headers={"User-Agent": _UA}) as client:
            resp = await client.get(clean)
            resp.raise_for_status()
            html = resp.text
            ext.final_url = str(resp.url)
    except Exception as exc:
        log.info("httpx fetch failed for %s (%s); trying trafilatura fetch", clean, exc)
        try:
            html = trafilatura.fetch_url(clean)
        except Exception as exc2:
            log.info("trafilatura fetch failed too: %s", exc2)

    if not html:
        ext.status = "FAILED"
        return ext, ""

    try:
        raw = trafilatura.extract(
            html,
            url=ext.final_url,
            output_format="json",
            with_metadata=True,
            include_comments=False,
            include_tables=False,
            favor_recall=True,
        )
    except Exception as exc:
        log.info("trafilatura extract error: %s", exc)
        raw = None

    if not raw:
        ext.status = "FAILED"
        return ext, ""

    data = json.loads(raw)
    text = (data.get("text") or "").strip()
    if not text:
        ext.status = "FAILED"
        return ext, ""

    ext.status = "SUCCESS"
    ext.title = (data.get("title") or "").strip() or None
    ext.site = data.get("sitename") or urlparse(ext.final_url or clean).netloc
    ext.author = data.get("author") or None
    ext.published = data.get("date") or None
    ext.text_chars = len(text)
    ext.text_preview = text[:300]
    return ext, text[:max_chars]
