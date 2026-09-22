import json
import time
import uuid
from contextlib import contextmanager

from detector.providers.gemini import Grounding
from detector.schemas import AnalysisResult, Extraction, LLMVerdict, Provenance, Signal, Source


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class Timer:
    def __init__(self):
        self.t: dict[str, int] = {}

    @contextmanager
    def track(self, name: str):
        start = time.perf_counter()
        try:
            yield
        finally:
            self.t[name] = int((time.perf_counter() - start) * 1000)


def signals_block(title: str, payload: dict) -> str:
    return f"\n\n{title} (computed locally, JSON):\n" + json.dumps(payload, indent=2, default=str)


async def verify_with_research(services, *, contents, system, first, grounding, timer):
    """
    Image/video second pass: if Gemini grounding was not used and the first pass
    produced a search_query, run external research and re-judge with the notes.
    Returns (verdict, grounding), possibly unchanged.
    """
    if grounding.grounded or not first.search_query or not services.researcher:
        return first, grounding
    with timer.track("research"):
        notes, sources, provider = await services.gemini.research(first.search_query)
    if not notes:
        return first, grounding
    grounding.research_provider = provider
    grounding.sources = sources
    grounding.queries = [first.search_query]
    prior = (
        "\n\nYOUR FIRST-PASS ANALYSIS (before web research):\n"
        + json.dumps(first.model_dump(exclude={"claims", "signals", "caveats"}), indent=1)
    )
    with timer.track("llm_verify"):
        verdict, g2 = await services.gemini.generate_json(
            contents=contents, schema=LLMVerdict, system=system, grounded=False,
            extra_context=prior + services.gemini.notes_block(notes, sources),
        )
    grounding.model = g2.model
    return verdict, grounding


def build_result(
    *,
    modality: str,
    verdict: LLMVerdict,
    grounding: Grounding,
    forensics: dict,
    extraction: Extraction | None = None,
    timings: dict[str, int],
    provider: str = "gemini",
    fallback_used: str | None = None,
) -> AnalysisResult:
    seen: set[str] = set()
    evidence: list[Source] = []
    for c in verdict.claims:
        for s in c.sources:
            if s.url and s.url not in seen:
                seen.add(s.url)
                evidence.append(s)
    for s in grounding.sources:
        if s["url"] not in seen:
            seen.add(s["url"])
            evidence.append(Source(title=s["title"], url=s["url"]))

    caveats = list(verdict.caveats)
    signals = list(verdict.signals)
    final_verdict, confidence = verdict.verdict, float(verdict.confidence)

    # Rubric consistency: satire presented as news is "fake" for this service even
    # when the model, having recognised the genre, still answers LIKELY_REAL.
    if modality == "news" and verdict.genre == "satire" and final_verdict != "LIKELY_FAKE":
        final_verdict = "LIKELY_FAKE"
        confidence = max(confidence, 0.8)
        signals.insert(0, Signal(name="satire_genre", value="satire / parody", direction="fake", weight="strong",
                                 note="Content is satire presented in a news format; treated as not factual."))

    if not grounding.web_checked and modality == "news":
        caveats.append("Web verification was unavailable for this run; claims were judged from the article text and model knowledge only.")

    return AnalysisResult(
        id=new_id(modality),
        modality=modality,
        verdict=final_verdict,
        confidence=round(confidence, 3),
        summary=verdict.summary,
        reasoning=verdict.reasoning,
        genre=verdict.genre,
        language=verdict.language,
        description=verdict.description,
        search_query=verdict.search_query,
        transcript_summary=verdict.transcript_summary,
        claims=verdict.claims,
        signals=signals,
        caveats=caveats,
        evidence=evidence,
        extraction=extraction or Extraction(),
        forensics=forensics,
        provenance=Provenance(
            provider=provider,
            model=grounding.model,
            grounded=grounding.grounded,
            research_provider=grounding.research_provider,
            fallback_used=fallback_used,
            search_queries=grounding.queries,
            two_step=grounding.two_step,
        ),
        timings_ms=timings,
    )
