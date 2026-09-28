"""
Stage 2: retrieval. A tool, not a model.

For each query: search, drop hits that cannot count as independent evidence,
read the top remaining pages, and format what is left. Every dropped hit is
counted by reason so runs can report what the filters removed.

Filters, in order:
  publisher      the item's own publisher (a source cannot corroborate itself)
  blocklist      domains or domain/path prefixes excluded for this run (SEARCH_BLOCKLIST)
  fact_check     fact-check publishers and fact-check sections (EXCLUDE_FACT_CHECKS). Used on
                 benchmarks whose labels come from fact-checkers, where a retrieved fact-check
                 would hand the model the label. Off in production.
  duplicate      a page or snippet that is a near-copy of the item's own text (syndicated or
                 scraped copies): a copy is not independent evidence
"""
import asyncio
import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx
import trafilatura

from detector.providers.research import Hit

log = logging.getLogger(__name__)

_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# Fact-checking organisations (IFCN signatories and others whose articles carry verdicts).
FACT_CHECK_DOMAINS = frozenset({
    "politifact.com", "snopes.com", "factcheck.org", "fullfact.org", "leadstories.com", "checkyourfact.com",
    "truthorfiction.com", "gossipcop.com", "africacheck.org", "boomlive.in", "altnews.in", "factly.in",
    "newschecker.in", "vishvasnews.com", "healthfeedback.org", "climatefeedback.org", "sciencefeedback.co",
    "hoax-slayer.net", "mediabiasfactcheck.com", "factcheck.afp.com", "misbar.com", "teyit.org", "maldita.es",
    "newtral.es", "correctiv.org", "demagog.org.pl", "logically.ai", "thequint.com/news/webqoof",
})
# Fact-check sections of general news sites (matched anywhere in the URL path).
_FACT_CHECK_PATH = re.compile(r"fact[-_]?check|/webqoof/|/verify/|hoax", re.I)

DUPLICATE_CONTAINMENT = 0.5    # share of a hit's 8-word shingles found in the item's text
_SHINGLE = 8


def _norm_domain(d: str) -> str:
    d = d.lower().strip()
    return d[4:] if d.startswith("www.") else d


def _match(url: str, entry: str) -> bool:
    """entry is 'domain' or 'domain/path-prefix'."""
    p = urlparse(url)
    host = _norm_domain(p.netloc)
    dom, _, path = entry.partition("/")
    if not (host == dom or host.endswith("." + dom)):
        return False
    return not path or p.path.lstrip("/").startswith(path)


def _shingles(text: str) -> set[tuple[str, ...]]:
    w = re.findall(r"[a-z0-9]+", text.lower())
    return {tuple(w[i:i + _SHINGLE]) for i in range(max(0, len(w) - _SHINGLE + 1))}


@dataclass
class Retrieval:
    queries: list[str]
    hits: list[Hit] = field(default_factory=list)
    dropped: Counter = field(default_factory=Counter)
    provider: str | None = None

    def sources(self) -> list[dict]:
        return [{"title": h.title or h.domain, "url": h.url} for h in self.hits]

    def log(self) -> dict:
        return {"queries": self.queries, "provider": self.provider, "dropped": dict(self.dropped),
                "sources": [{"title": h.title, "url": h.url, "date": h.date, "read": bool(h.text)} for h in self.hits]}

    def evidence_text(self) -> str:
        lines = []
        for h in self.hits:
            head = f"[{h.kind}] {h.title} — {h.url}" + (f" (published {h.date})" if h.date else "")
            lines.append(head)
            if h.snippet:
                lines.append("  snippet: " + h.snippet[:300].replace("\n", " "))
            if h.text:
                lines.append("  page text: " + h.text.replace("\n", " "))
            lines.append("")
        return "\n".join(lines)


async def _read(client: httpx.AsyncClient, url: str, max_chars: int) -> str:
    try:
        r = await client.get(url)
        if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
            return ""
        return (trafilatura.extract(r.text, url=url, include_comments=False, include_tables=False) or "").strip()[:max_chars]
    except Exception:
        return ""


async def retrieve(researcher, queries: list[str], *, publisher: str | None, blocklist: frozenset[str],
                   exclude_fact_checks: bool, item_text: str = "", per_query: int = 6, read_pages: int = 3,
                   chars_per_page: int = 1200) -> Retrieval:
    out = Retrieval(queries=queries, provider=getattr(researcher, "name", None))
    if not researcher or not queries:
        return out
    item_sh = _shingles(item_text) if item_text else set()
    publisher = _norm_domain(urlparse(publisher).netloc or publisher) if publisher else None
    seen: set[str] = set()

    def reason(h: Hit) -> str | None:
        if publisher and _match(h.url, publisher):
            return "publisher"
        if any(_match(h.url, b) for b in blocklist):
            return "blocklist"
        if exclude_fact_checks and (any(_match(h.url, d) for d in FACT_CHECK_DOMAINS)
                                    or _FACT_CHECK_PATH.search(urlparse(h.url).path or "")):
            return "fact_check"
        return None

    def duplicate(text: str) -> bool:
        sh = _shingles(text)
        return bool(item_sh) and len(sh) >= 5 and len(sh & item_sh) / len(sh) >= DUPLICATE_CONTAINMENT

    async with httpx.AsyncClient(follow_redirects=True, timeout=12.0, headers={"User-Agent": _UA}) as client:
        for q in queries:
            try:
                raw = await researcher.search(q, max_results=per_query + 2)
            except Exception as exc:
                log.warning("search failed for %r: %s", q[:80], exc)
                out.dropped["search_error"] += 1
                continue
            kept: list[Hit] = []
            for h in raw:
                if h.url in seen:
                    continue
                seen.add(h.url)
                r = reason(h) or ("duplicate" if duplicate(h.snippet) else None)
                if r:
                    out.dropped[r] += 1
                    continue
                kept.append(h)
            # Read a little past read_pages so a page dropped as a copy does not leave a gap.
            to_read = kept[: read_pages + 2]
            texts = await asyncio.gather(*[_read(client, h.url, chars_per_page) for h in to_read])
            n_read = 0
            for h, t in zip(to_read, texts):
                if t and duplicate(t):
                    out.dropped["duplicate"] += 1
                    kept.remove(h)
                    continue
                if t and n_read < read_pages:
                    h.text = t
                    n_read += 1
            out.hits.extend(kept[:per_query])
    return out
