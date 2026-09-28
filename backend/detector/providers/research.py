"""
Web search back-ends used by the retrieval stage.

A researcher only searches: it returns raw hits (title, URL, snippet, date).
Filtering, page reading and formatting happen in detector.engine.retrieval,
identically for every back-end, so the evidence a model sees does not depend
on which search API was configured.

  * TavilyResearcher  - search API (1,000 free credits/month) if TAVILY_API_KEY is set
  * DDGResearcher     - DuckDuckGo web + news search, no key
"""
import asyncio
import logging
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from detector.config import Settings

log = logging.getLogger(__name__)


@dataclass
class Hit:
    title: str
    url: str
    snippet: str = ""
    kind: str = "web"          # web | news
    date: str = ""
    text: str = ""             # page text, filled by the retrieval stage for the pages it reads

    @property
    def domain(self) -> str:
        host = urlparse(self.url).netloc.lower()
        return host[4:] if host.startswith("www.") else host


class TavilyResearcher:
    name = "tavily"

    def __init__(self, settings: Settings):
        self.key = settings.tavily_api_key
        self.enabled = bool(self.key)

    async def search(self, query: str, max_results: int = 8) -> list[Hit]:
        # include_answer is off: Tavily's answer is another model's opinion, not evidence.
        payload = {"api_key": self.key, "query": query[:400], "search_depth": "basic",
                   "max_results": max_results, "include_answer": False}
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post("https://api.tavily.com/search", json=payload)
            r.raise_for_status()
            data = r.json()
        return [Hit(title=i.get("title") or "", url=i.get("url") or "", snippet=(i.get("content") or "")[:400],
                    date=(i.get("published_date") or "")[:10])
                for i in data.get("results", []) if i.get("url")]


class DDGResearcher:
    name = "duckduckgo"
    enabled = True

    def _search_sync(self, query: str, max_results: int) -> list[Hit]:
        from ddgs import DDGS

        hits: list[Hit] = []
        try:
            for r in DDGS().text(query, max_results=max_results) or []:
                hits.append(Hit(title=r.get("title", ""), url=r.get("href", ""), snippet=r.get("body", "")))
        except Exception as exc:
            log.info("ddg text search failed: %s", exc)
        try:
            for r in DDGS().news(query, max_results=5) or []:
                hits.append(Hit(title=r.get("title", ""), url=r.get("url", ""), snippet=r.get("body", ""),
                                kind="news", date=(r.get("date") or "")[:10]))
        except Exception as exc:
            log.info("ddg news search failed: %s", exc)
        return [h for h in hits if h.url]

    async def search(self, query: str, max_results: int = 8) -> list[Hit]:
        return await asyncio.to_thread(self._search_sync, query.strip()[:200], max_results)


def pick_researcher(settings: Settings, groq_provider=None):
    tav = TavilyResearcher(settings)
    return tav if tav.enabled else DDGResearcher()
