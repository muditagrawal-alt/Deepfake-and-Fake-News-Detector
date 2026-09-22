"""
News pipeline: extract article -> Gemini (grounded) claim verification.
"""
import logging
import re
from urllib.parse import urlparse

from detector.analyzers.common import Timer, build_result, signals_block
from detector.analyzers.prompts import NEWS_SYSTEM
from detector.forensics.article import extract_article, slug_from_url
from detector.schemas import AnalysisResult, LLMVerdict
from detector.services import Services

log = logging.getLogger(__name__)


def _search_query(title: str) -> str:
    """Headline minus the ' | Publisher' / ' - Site' suffix and clutter."""
    t = re.split(r"\s+[|\-–—]\s+", title)[0] if len(title) > 40 else title
    t = re.sub(r"[\"“”‘’']", "", t)
    return t.strip()[:150]


async def analyze_news(url: str, services: Services) -> AnalysisResult:
    timer = Timer()
    with timer.track("extract"):
        extraction, text = await extract_article(url)

    local = {
        "extraction_status": extraction.status,
        "site": extraction.site,
        "title": extraction.title,
        "author": extraction.author,
        "published": extraction.published,
        "text_chars": extraction.text_chars,
    }

    if text:
        task = (
            f"ARTICLE URL: {extraction.final_url or url}\n"
            f"TITLE: {extraction.title or '(unknown)'}\n"
            f"PUBLISHER: {extraction.site or '(unknown)'}\n"
            f"PUBLISHED: {extraction.published or '(unknown)'}\n\n"
            f"ARTICLE TEXT:\n{text}"
        )
    else:
        task = (
            f"ARTICLE URL: {url}\n"
            "The article body could not be extracted (paywall, bot-block or unsupported page). "
            f"Use the URL, its domain and the slug '{slug_from_url(url)}' to identify the story via Google Search, "
            "then verify it. Lower your confidence accordingly and say extraction failed in caveats."
        )
    task += signals_block("LOCAL SIGNALS", local)

    research_query = _search_query(extraction.title) if extraction.title else slug_from_url(url)
    publisher_domain = urlparse(extraction.final_url or url).netloc
    with timer.track("llm"):
        verdict, grounding = await services.gemini.generate_json(
            contents=[task], schema=LLMVerdict, system=NEWS_SYSTEM, grounded=True,
            research_query=research_query, exclude_domain=publisher_domain,
        )

    return build_result(
        modality="news",
        verdict=verdict,
        grounding=grounding,
        forensics={"extraction": local},
        extraction=extraction,
        timings=timer.t,
    )
