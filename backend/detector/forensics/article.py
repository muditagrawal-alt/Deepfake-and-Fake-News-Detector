"""
Article extraction with trafilatura (replaces newspaper3k + bs4).
"""
import json
import logging
from urllib.parse import parse_qs, unquote, urlparse

import httpx
import trafilatura

from detector.forensics.safe_fetch import fetch_html
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


def is_youtube_url(url: str) -> bool:
    try:
        host = urlparse(url.strip()).netloc.lower()
        return "youtube.com" in host or "youtu.be" in host
    except Exception:
        return False


async def fetch_youtube_metadata(client: httpx.AsyncClient, url: str) -> tuple[Extraction, str] | None:
    """Fetch video metadata via YouTube's public oEmbed endpoint."""
    try:
        oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
        resp = await client.get(oembed_url, timeout=10.0)
        if resp.status_code == 200:
            data = resp.json()
            title = (data.get("title") or "").strip()
            author = (data.get("author_name") or "").strip()
            provider = (data.get("provider_name") or "YouTube").strip()
            if title:
                ext = Extraction(
                    status="SUCCESS",
                    url=url,
                    final_url=url,
                    title=title,
                    site=provider,
                    author=author or None,
                    text_chars=len(title),
                    text_preview=title[:300],
                )
                body = (
                    f"ONLINE VIDEO PAYLOAD / CLAIM METADATA:\n"
                    f"Platform: {provider}\n"
                    f"Video Title / Stated Narrative: {title}\n"
                    f"Channel / Creator: {author or '(unknown)'}\n"
                    f"URL: {url}\n\n"
                    f"STATED CLAIM FOR VERIFICATION:\n"
                    f"The online video published by '{author or '(unknown)'}' on {provider} claims: \"{title}\"."
                )
                return ext, body
    except Exception as exc:
        log.info("youtube oembed fetch error for %s: %s", url, exc)
    return None


async def extract_article(url: str, *, max_chars: int = 14000) -> tuple[Extraction, str]:
    """Return (Extraction metadata, body text). Body is '' when extraction fails."""
    clean = normalize_url(url)
    ext = Extraction(url=url, final_url=clean)

    # Intercept online video URLs (YouTube Shorts/Videos) so player footer boilerplate is not treated as article text
    if is_youtube_url(clean):
        try:
            async with httpx.AsyncClient(follow_redirects=True, trust_env=False, timeout=12.0,
                                         headers={"User-Agent": _UA}) as yt_client:
                yt_res = await fetch_youtube_metadata(yt_client, clean)
                if yt_res:
                    return yt_res
        except Exception as exc:
            log.info("youtube handler error for %s: %s", clean, exc)

    html = None
    try:
        async with httpx.AsyncClient(follow_redirects=False, trust_env=False, timeout=20.0,
                                     headers={"User-Agent": _UA}) as client:
            fetched = await fetch_html(client, clean, max_bytes=4 * 1024 * 1024)
            if fetched:
                ext.final_url, html = fetched
    except Exception as exc:
        # Do not use trafilatura.fetch_url here: it follows redirects without
        # our public-address checks and response-size limit.
        log.info("article fetch failed for %s (%s)", clean, exc)

    if not html:
        ext.status = "FAILED"
        slug = slug_from_url(clean)
        if slug and not ext.title:
            ext.title = slug.title()
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
        slug = slug_from_url(clean)
        if slug and not ext.title:
            ext.title = slug.title()
        return ext, ""

    try:
        data = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        ext.status = "FAILED"
        slug = slug_from_url(clean)
        if slug and not ext.title:
            ext.title = slug.title()
        return ext, ""

    text = (data.get("text") or "").strip()
    # Reject video site footer boilerplate if scraped accidentally
    if is_youtube_url(clean) and any(bp in text for bp in ("About\nPress", "Copyright Contact us", "Terms Privacy Policy")):
        text = ""

    if not text:
        ext.status = "FAILED"
        slug = slug_from_url(clean)
        if slug and not ext.title:
            ext.title = slug.title()
        return ext, ""

    ext.status = "SUCCESS"
    ext.title = (data.get("title") or "").strip() or None
    if not ext.title:
        slug = slug_from_url(clean)
        if slug:
            ext.title = slug.title()
    ext.site = data.get("sitename") or urlparse(ext.final_url or clean).netloc
    ext.author = data.get("author") or None
    ext.published = data.get("date") or None
    ext.text_chars = len(text)
    ext.text_preview = text[:300]
    return ext, text[:max_chars]
