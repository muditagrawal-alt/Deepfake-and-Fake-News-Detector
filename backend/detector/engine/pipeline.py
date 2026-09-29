"""
The three-stage analysis shared by every modality: analyse -> retrieve -> verify.
"""
import json
import logging
from dataclasses import dataclass, field

from detector.engine.backends import CallMeta
from detector.engine.parts import Part, TextPart, VideoPart
from detector.engine.retrieval import Retrieval, retrieve
from detector.schemas import Analysis, LLMVerdict

log = logging.getLogger(__name__)


@dataclass
class StageResult:
    analysis: Analysis
    verdict: LLMVerdict
    retrieval: Retrieval
    research_mode: str = "open"
    calls: list[CallMeta] = field(default_factory=list)

    # Convenience views used by build_result.
    @property
    def sources(self) -> list[dict]:
        return self.retrieval.sources()

    @property
    def queries(self) -> list[str]:
        return self.retrieval.queries

    @property
    def research_provider(self) -> str | None:
        return self.retrieval.provider if self.retrieval.hits else None


def facts_block(facts: dict) -> TextPart:
    return TextPart("FORENSIC FACTS (measured by tools; reported verbatim, uninterpreted):\n"
                    + json.dumps(facts, indent=1, default=str, ensure_ascii=False))


def blocklist(settings) -> frozenset[str]:
    return frozenset(d.strip().lower().removeprefix("www.") for d in settings.search_blocklist.split(",") if d.strip())


def _queries(analysis: Analysis, limit: int) -> list[str]:
    q = list(dict.fromkeys(s.strip() for s in analysis.search_queries if s.strip()))
    if not q:  # the model gave no queries: search its claims instead
        q = list(dict.fromkeys(c.strip() for c in analysis.claims if c.strip()))
    return q[:limit]


async def run_stages(services, *, modality: str, parts: list[Part], facts: dict, system_analyse: str,
                     system_verify: str, timer, publisher_domain: str | None = None, item_text: str = "",
                     progress=None) -> StageResult:
    settings = services.settings
    llm = services.llm
    report = progress or (lambda _s: None)
    calls: list[CallMeta] = []
    mode = settings.research_mode
    try:
        # 1. analyse
        report("analysing content")
        with timer.track("llm_analyse"):
            analysis, meta = await llm.generate_json(system=system_analyse, parts=[*parts, facts_block(facts)],
                                                     schema=Analysis)
        calls.append(meta)

        # 2. retrieve (a tool, not a model)
        queries = _queries(analysis, settings.max_search_queries)
        if mode == "open":
            report("retrieving evidence")
            with timer.track("retrieve"):
                ret = await retrieve(services.researcher, queries, publisher=publisher_domain,
                                     blocklist=blocklist(settings), exclude_fact_checks=settings.exclude_fact_checks,
                                     item_text=item_text)
        else:
            ret = Retrieval(queries=[])

        if mode == "closed":
            evidence = ("NO EXTERNAL EVIDENCE: this run is closed-book by design. Judge the claims from the content "
                        "alone and mark those you cannot verify as unverifiable.")
        elif ret.hits:
            evidence = ("RETRIEVED EVIDENCE (search results and page extracts from sources other than the item's "
                        "publisher; queries: " + "; ".join(queries) + "):\n\n" + ret.evidence_text())
        else:
            evidence = ("NO EXTERNAL EVIDENCE WAS FOUND for the queries: " + ("; ".join(queries) or "(none)")
                        + ". Claims that cannot be checked are unverifiable.")

        # 3. verify
        report("verifying claims")
        stage1 = "FIRST-PASS ANALYSIS:\n" + analysis.model_dump_json(indent=1)
        with timer.track("llm_verify"):
            verdict, meta = await llm.generate_json(
                system=system_verify, parts=[*parts, facts_block(facts), TextPart(stage1), TextPart(evidence)],
                schema=LLMVerdict)
        calls.append(meta)
    finally:
        await llm.release({str(p.path) for p in parts if isinstance(p, VideoPart)})

    return StageResult(analysis=analysis, verdict=verdict, retrieval=ret, research_mode=mode, calls=calls)
