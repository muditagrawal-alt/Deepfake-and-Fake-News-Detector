"""
External web research used when Gemini's Google Search grounding is not
available (free keys currently get 429 on grounded calls).

Implementations, chosen in this order:
  * TavilyResearcher  - search API (1,000 free credits/month) if TAVILY_API_KEY is set
  * DDGResearcher     - DuckDuckGo (no key) + fetch the top pages with trafilatura
  * GroqResearcher    - GPT-OSS browser_search; last resort, one call can eat the
                        200K tokens/day free quota

All return (notes_text, sources[{"title","url"}]).
"""
import asyncio
import json
import logging
import re
from urllib.parse import urlparse

import httpx
import trafilatura

from detector.config import Settings

log = logging.getLogger(__name__)

_URL_RE = re.compile(r"https?://[^\s)\]>\"'|]+")


def _dedupe_urls(urls: list[str]) -> list[dict]:
    seen, out = set(), []
    for u in urls:
        u = u.rstrip(".,;")
        if u not in seen:
            seen.add(u)
            out.append({"title": urlparse(u).netloc or u, "url": u})
    return out


def _domain(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def _same_site(url: str, exclude_domain: str | None) -> bool:
    if not exclude_domain:
        return False
    ex = exclude_domain.lower().removeprefix("www.")
    d = _domain(url)
    return d == ex or d.endswith("." + ex) or ex.endswith("." + d)


_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


async def _fetch_extract(client: httpx.AsyncClient, url: str, max_chars: int) -> str:
    try:
        r = await client.get(url)
        if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
            return ""
        text = trafilatura.extract(r.text, url=url, include_comments=False, include_tables=False) or ""
        return text.strip()[:max_chars]
    except Exception:
        return ""


class TavilyResearcher:
    name = "tavily"

    def __init__(self, settings: Settings):
        self.key = settings.tavily_api_key
        self.enabled = bool(self.key)

    async def research(self, query: str, exclude_domain: str | None = None) -> tuple[str, list[dict]]:
        payload = {"api_key": self.key, "query": query[:400], "search_depth": "basic", "max_results": 6, "include_answer": True}
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post("https://api.tavily.com/search", json=payload)
            r.raise_for_status()
            data = r.json()
        lines = []
        if data.get("answer"):
            lines.append(f"Search summary: {data['answer']}")
        sources = []
        for item in data.get("results", []):
            title, url, content = item.get("title", ""), item.get("url", ""), (item.get("content") or "")[:500]
            if url and not _same_site(url, exclude_domain):
                sources.append({"title": title or urlparse(url).netloc, "url": url})
                lines.append(f"- {title} ({url}): {content}")
        return "\n".join(lines), sources


class DDGResearcher:
    """DuckDuckGo text+news search, then read the top independent pages."""

    name = "duckduckgo"
    enabled = True

    def __init__(self, *, max_results: int = 8, read_pages: int = 4, chars_per_page: int = 1800):
        self.max_results = max_results
        self.read_pages = read_pages
        self.chars_per_page = chars_per_page

    def _search_sync(self, query: str) -> list[dict]:
        from ddgs import DDGS

        hits: list[dict] = []
        try:
            for r in DDGS().text(query, max_results=self.max_results) or []:
                hits.append({"title": r.get("title", ""), "url": r.get("href", ""), "snippet": r.get("body", ""), "kind": "web"})
        except Exception as exc:
            log.info("ddg text search failed: %s", exc)
        try:
            for r in DDGS().news(query, max_results=5) or []:
                hits.append({"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("body", ""), "kind": "news", "date": (r.get("date") or "")[:10], "source": r.get("source")})
        except Exception as exc:
            log.info("ddg news search failed: %s", exc)
        return hits

    async def research(self, query: str, exclude_domain: str | None = None) -> tuple[str, list[dict]]:
        query = query.strip()[:200]
        hits = await asyncio.to_thread(self._search_sync, query)
        seen, picked = set(), []
        for h in hits:
            u = h.get("url") or ""
            if not u or u in seen or _same_site(u, exclude_domain):
                continue
            seen.add(u)
            picked.append(h)
        if not picked:
            return "", []

        to_read = picked[: self.read_pages]
        async with httpx.AsyncClient(follow_redirects=True, timeout=12.0, headers={"User-Agent": _UA}) as client:
            texts = await asyncio.gather(*[_fetch_extract(client, h["url"], self.chars_per_page) for h in to_read])

        lines = [f"Search query: {query}", f"Original publisher excluded from results: {exclude_domain or 'n/a'}", ""]
        for h, body in zip(to_read, texts):
            head = f"[{h['kind']}] {h['title']} — {h['url']}"
            if h.get("date"):
                head += f" (published {h['date']})"
            lines.append(head)
            lines.append("  snippet: " + (h.get("snippet") or "")[:300])
            if body:
                lines.append("  page text: " + body.replace("\n", " "))
            lines.append("")
        for h in picked[self.read_pages :]:
            lines.append(f"[{h['kind']}] {h['title']} — {h['url']}\n  snippet: {(h.get('snippet') or '')[:300]}\n")
        sources = [{"title": h["title"] or _domain(h["url"]), "url": h["url"]} for h in picked]
        return "\n".join(lines), sources


class GroqResearcher:
    name = "groq_browser_search"

    def __init__(self, groq_provider):
        self.groq = groq_provider
        self.enabled = groq_provider.enabled

    async def research(self, query: str, exclude_domain: str | None = None) -> tuple[str, list[dict]]:
        notes = await self.groq.research(
            "Fact-check the following. Search for independent, reputable coverage and report what each source says, "
            "with full URLs. If you find nothing relevant, say so explicitly.\n\n" + query[:1500]
        )
        return notes, _dedupe_urls(_URL_RE.findall(notes))


def pick_researcher(settings: Settings, groq_provider):
    tav = TavilyResearcher(settings)
    if tav.enabled:
        return tav
    if settings.researcher == "groq":
        grq = GroqResearcher(groq_provider)
        if grq.enabled:
            return grq
    return DDGResearcher()
