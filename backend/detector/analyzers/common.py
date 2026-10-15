import time
import uuid
from collections import Counter
from contextlib import contextmanager

from detector import __version__
from detector.engine.pipeline import StageResult
from detector.schemas import AnalysisResult, Extraction, Provenance, Source


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


def _provenance_facts(facts: dict) -> dict:
    """C2PA / XMP / EXIF facts as flat features (no raw size or duration: those are dataset properties)."""
    meta = facts.get("metadata") or {}
    c2pa = meta.get("c2pa") or {}
    xmp = meta.get("xmp") or {}
    exif = meta.get("exif") or {}
    return {
        "c2pa_present": bool(c2pa.get("present")),
        "c2pa_valid": bool(c2pa.get("valid")),
        "c2pa_digital_source_types": ";".join(c2pa.get("digital_source_types") or []),
        "xmp_digital_source_type": xmp.get("DigitalSourceType"),
        "exif_camera_make": exif.get("Make"),
        "container_encoder": (meta.get("container_tags") or {}).get("encoder"),
        "has_audio": meta.get("has_audio"),
    }


def evidence_features(stage: StageResult, facts: dict, cited_dropped: int) -> dict:
    v = stage.verdict
    status = Counter(c.status for c in v.claims)
    obs = stage.analysis.observations
    anomalies = Counter(o.kind for o in obs if o.anomaly)
    return {
        "llm_verdict": v.verdict,
        "llm_confidence": float(v.confidence),
        "genre": v.genre or stage.analysis.genre,
        "n_claims": len(v.claims),
        "n_corroborated": status["corroborated"],
        "n_contradicted": status["contradicted"],
        "n_misleading": status["misleading"],
        "n_unverifiable": status["unverifiable"],
        "n_observations": len(obs),
        "n_anomalies": sum(anomalies.values()),
        **{f"n_anomalies_{k}": anomalies[k] for k in ("visual", "motion_physics", "audio", "on_screen_text", "text_content")},
        "n_queries": len(stage.queries),
        "n_sources_retrieved": len(stage.sources),
        "n_pages_read": sum(bool(h.text) for h in stage.retrieval.hits),
        **{f"n_dropped_{r}": stage.retrieval.dropped.get(r, 0) for r in ("publisher", "blocklist", "fact_check", "duplicate")},
        "n_citations_outside_retrieved": cited_dropped,
        "research_mode": stage.research_mode,
        **_provenance_facts(facts),
    }


def build_result(*, modality: str, stage: StageResult, facts: dict, extraction: Extraction | None = None,
                 timings: dict[str, int], fallback_used: str | None = None) -> AnalysisResult:
    v = stage.verdict
    retrieved = {s["url"] for s in stage.sources}

    # A citation must point at evidence the retrieval stage actually returned.
    dropped = 0
    for c in v.claims:
        kept = [s for s in c.sources if s.url in retrieved]
        dropped += len(c.sources) - len(kept)
        c.sources = kept

    evidence: list[Source] = []
    seen: set[str] = set()
    for c in v.claims:
        for s in c.sources:
            if s.url not in seen:
                seen.add(s.url); evidence.append(s)
    for s in stage.sources:
        if s["url"] not in seen:
            seen.add(s["url"]); evidence.append(Source(title=s["title"], url=s["url"]))

    caveats = list(v.caveats)
    if stage.research_mode == "open" and not stage.sources:
        caveats.append("No independent web evidence was retrieved; claims were judged from the content alone.")

    forensics = {**facts, "retrieval": {"mode": stage.research_mode, **stage.retrieval.log()}}
    stages = ("analyse", "verify")
    calls = [{"stage": stages[i] if i < 2 else f"call{i}", "backend": m.backend, "model": m.model,
              "seconds": round(m.seconds, 2), "prompt_tokens": m.prompt_tokens, "output_tokens": m.output_tokens,
              "thinking_tokens": (m.extra or {}).get("thinking_tokens"), "repairs": (m.extra or {}).get("repairs")}
             for i, m in enumerate(stage.calls)]

    return AnalysisResult(
        id=new_id(modality),
        modality=modality,
        verdict=v.verdict,
        confidence=round(float(v.confidence), 3),
        summary=v.summary,
        reasoning=v.reasoning,
        genre=v.genre or stage.analysis.genre,
        language=stage.analysis.language,
        description=stage.analysis.description,
        search_query=stage.queries[0] if stage.queries else None,
        transcript_summary=stage.analysis.transcript_summary,
        claims=v.claims,
        signals=v.signals,
        caveats=caveats,
        evidence=evidence,
        extraction=extraction or Extraction(),
        forensics=forensics,
        analysis=stage.analysis,
        evidence_features=evidence_features(stage, facts, dropped),
        provenance=Provenance(
            engine_version=__version__,
            provider=stage.calls[-1].backend if stage.calls else "unknown",
            model=stage.calls[-1].model if stage.calls else "unknown",
            research_provider=stage.research_provider,
            research_mode=stage.research_mode,
            fallback_used=fallback_used,
            search_queries=stage.queries,
            calls=calls,
        ),
        timings_ms=timings,
    )
