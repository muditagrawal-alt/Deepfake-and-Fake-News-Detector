"""
The three-stage analysis shared by every modality: analyse -> retrieve -> verify.
"""
import json
import logging
from dataclasses import dataclass, field
from urllib.parse import urlparse

from detector.engine.backends import CallMeta
from detector.engine.parts import Part, TextPart
from detector.schemas import Analysis, LLMVerdict

log = logging.getLogger(__name__)


@dataclass
class StageResult:
    analysis: Analysis
    verdict: LLMVerdict
    sources: list[dict] = field(default_factory=list)      # retrieved: {"title", "url"}
    queries: list[str] = field(default_factory=list)
    research_provider: str | None = None
    research_mode: str = "open"
    calls: list[CallMeta] = field(default_factory=list)


def facts_block(facts: dict) -> TextPart:
    return TextPart("FORENSIC FACTS (measured by tools; reported verbatim, uninterpreted):\n"
                    + json.dumps(facts, indent=1, default=str, ensure_ascii=False))


def _domain(url: str) -> str:
    h = urlparse(url).netloc.lower()
    return h[4:] if h.startswith("www.") else h


def blocklist(settings) -> frozenset[str]:
    return frozenset(d.strip().lower().removeprefix("www.") for d in settings.search_blocklist.split(",") if d.strip())


async def run_stages(services, *, modality: str, parts: list[Part], facts: dict, system_analyse: str,
                     system_verify: str, timer, publisher_domain: str | None = None, progress=None) -> StageResult:
    settings = services.settings
    llm = services.llm
    report = progress or (lambda _s: None)
    calls: list[CallMeta] = []
    try:
        # 1. analyse
        report("analysing content")
        with timer.track("llm_analyse"):
            analysis, meta = await llm.generate_json(system=system_analyse, parts=[*parts, facts_block(facts)],
                                                     schema=Analysis)
        calls.append(meta)

        # 2. retrieve (a tool, not a model)
        queries = list(dict.fromkeys(q.strip() for q in analysis.search_queries if q.strip()))
        if not queries:
            queries = list(dict.fromkeys(c.strip() for c in analysis.claims if c.strip()))
        queries = queries[: settings.max_search_queries]
        sources, notes, provider = [], [], None
        mode = settings.research_mode
        if mode == "open" and queries and services.researcher:
            report("retrieving evidence")
            block = blocklist(settings)
            with timer.track("retrieve"):
                for q in queries:
                    n, srcs, prov = await services.research(q, exclude_domain=publisher_domain, blocklist=block)
                    if n:
                        provider = prov
                        notes.append(f"### Query: {q}\n{n}")
                        sources.extend(srcs)
        seen, unique = set(), []
        for s in sources:
            if s["url"] not in seen:
                seen.add(s["url"]); unique.append(s)

        if mode == "closed":
            evidence = "NO EXTERNAL EVIDENCE: this run is closed-book by design. Judge claims from the content alone and mark those you cannot verify as unverifiable."
        elif notes:
            src_lines = "\n".join(f"- {s['title']}: {s['url']}" for s in unique)
            evidence = ("RETRIEVED EVIDENCE (from sources other than the original publisher):\n\n"
                        + "\n\n".join(notes) + "\n\nSOURCE LIST:\n" + src_lines)
        else:
            evidence = "NO EXTERNAL EVIDENCE WAS FOUND for the queries below. Claims that cannot be checked are unverifiable.\nQueries: " + "; ".join(queries or ["(none)"])

        # 3. verify
        report("verifying claims")
        stage1 = "FIRST-PASS ANALYSIS:\n" + analysis.model_dump_json(indent=1)
        with timer.track("llm_verify"):
            verdict, meta = await llm.generate_json(
                system=system_verify, parts=[*parts, facts_block(facts), TextPart(stage1), TextPart(evidence)],
                schema=LLMVerdict)
        calls.append(meta)
    finally:
        await llm.release()

    return StageResult(analysis=analysis, verdict=verdict, sources=unique, queries=queries,
                       research_provider=provider, research_mode=mode, calls=calls)
