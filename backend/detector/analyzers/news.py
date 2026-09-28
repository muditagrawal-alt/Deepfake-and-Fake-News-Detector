"""
News: extract the article, then analyse -> retrieve -> verify.
"""
from urllib.parse import urlparse

from detector.analyzers.common import Timer, build_result
from detector.analyzers.prompts import ANALYSE, VERIFY
from detector.engine.parts import ImagePart, TextPart
from detector.engine.pipeline import run_stages
from detector.forensics.article import extract_article, slug_from_url
from detector.schemas import AnalysisResult
from detector.services import Services


async def analyze_news(url: str, services: Services, *, progress=None) -> AnalysisResult:
    timer = Timer()
    with timer.track("extract"):
        extraction, text = await extract_article(url)

    facts = {
        "extraction": {
            "status": extraction.status,
            "site": extraction.site,
            "author": extraction.author,
            "published": extraction.published,
            "text_chars": extraction.text_chars,
        }
    }
    if text:
        body = (f"ARTICLE URL: {extraction.final_url or url}\n"
                f"TITLE: {extraction.title or '(unknown)'}\n"
                f"PUBLISHER: {extraction.site or '(unknown)'}\n"
                f"PUBLISHED: {extraction.published or '(unknown)'}\n\n"
                f"ARTICLE TEXT:\n{text}")
    else:
        body = (f"ARTICLE URL: {url}\n"
                f"URL SLUG: {slug_from_url(url)}\n"
                "The article body could not be extracted (paywall, bot block or unsupported page); "
                "only the URL is available.")

    stage = await run_stages(
        services, modality="news", parts=[TextPart(body)], facts=facts,
        system_analyse=ANALYSE["news"], system_verify=VERIFY["news"], timer=timer,
        publisher_domain=urlparse(extraction.final_url or url).netloc, item_text=text or "", progress=progress,
    )
    return build_result(modality="news", stage=stage, facts=facts, extraction=extraction, timings=timer.t)


async def analyze_news_text(text: str, services: Services, *, title: str | None = None, publisher: str | None = None,
                            published: str | None = None, image: bytes | None = None, speaker: str | None = None,
                            context: str | None = None, progress=None) -> AnalysisResult:
    """
    News given as text, optionally with its image (benchmarks such as FakeNewsNet,
    MM-Soc or LIAR ship content, not live URLs). With publisher=None the model sees
    no source identity: the publisher-masked condition.
    """
    timer = Timer()
    facts = {"extraction": {"status": "PROVIDED_TEXT", "text_chars": len(text), "image": image is not None}}
    body = ((f"TITLE: {title}\n" if title else "")
            + (f"PUBLISHER: {publisher}\n" if publisher else "")
            + (f"PUBLISHED: {published}\n" if published else "")
            + (f"SPEAKER: {speaker}\n" if speaker else "")
            + (f"CONTEXT: {context}\n" if context else "")
            + f"\nTEXT:\n{text}")
    parts = [TextPart(body)]
    if image is not None:
        parts.append(ImagePart(image, label="image published with the article"))
    stage = await run_stages(
        services, modality="news", parts=parts, facts=facts,
        system_analyse=ANALYSE["news"], system_verify=VERIFY["news"], timer=timer,
        publisher_domain=publisher, item_text=text, progress=progress,
    )
    return build_result(modality="news", stage=stage, facts=facts, timings=timer.t)
