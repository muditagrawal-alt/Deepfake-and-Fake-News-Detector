"""
Pydantic models.

`LLMVerdict` is what the model must return (it is passed to Gemini as
`response_schema`). Keep it free of dict/Any fields: Gemini's structured
output does not support open-ended objects.

`AnalysisResult` is the API response: the LLM verdict plus the locally
computed forensic signals, extraction info and provenance.
"""
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

Verdict = Literal["LIKELY_REAL", "LIKELY_FAKE", "UNCERTAIN"]
Direction = Literal["real", "fake", "neutral"]
Weight = Literal["weak", "moderate", "strong"]
ClaimStatus = Literal["corroborated", "contradicted", "unverifiable", "misleading"]
Genre = Literal[
    "hard_news", "satire", "opinion", "press_release", "advertorial",
    "listicle", "personal_content", "entertainment", "other",
]


class Source(BaseModel):
    title: str = Field(description="Publisher or page title")
    url: str = Field(description="Full URL of the source")


class ClaimCheck(BaseModel):
    claim: str = Field(description="One atomic, checkable claim from the content")
    status: ClaimStatus
    explanation: str = Field(description="1-2 sentences on what the sources say")
    sources: list[Source] = Field(default_factory=list, description="Only sources actually found via search")


class Signal(BaseModel):
    name: str = Field(description="Short signal name, e.g. 'satire_genre', 'no_camera_metadata', 'lip_sync_mismatch'")
    value: str = Field(description="Observed value, short")
    direction: Direction = Field(description="Which way this signal points")
    weight: Weight
    note: str = Field(description="Why it matters, one sentence")


ObservationKind = Literal[
    "visual", "motion_physics", "audio", "on_screen_text", "text_content", "provenance", "context", "other",
]


class Observation(BaseModel):
    what: str = Field(description="A concrete, checkable observation stated as fact")
    where: str = Field(description="Location: image region, frame/time, or text span")
    kind: ObservationKind
    anomaly: bool = Field(description="True only if this detail is inconsistent with the physical world, with how "
                                      "cameras and microphones record it, or with the rest of the content")


class Analysis(BaseModel):
    """Stage 1 output: what the content says and shows. Deliberately contains no verdict."""
    description: str = Field(description="What the content is and what it depicts or reports, including any visible text")
    language: Optional[str] = Field(description="ISO-639-1 language code, or null if there is no language content")
    genre: Optional[Genre] = Field(description="Genre of the content, or null for media with no textual genre")
    claims: list[str] = Field(description="0-4 atomic factual claims that can be checked against independent sources; empty if none")
    observations: list[Observation] = Field(description="3-8 concrete observations about the media or text itself")
    search_queries: list[str] = Field(description="0-3 web search queries that would find independent evidence about the claims or the depicted event; empty if nothing is checkable")
    transcript_summary: Optional[str] = Field(description="Video: what is said, briefly; null otherwise")


class LLMVerdict(BaseModel):
    """Stage 3 output."""
    claims: list[ClaimCheck] = Field(description="One entry per claim from the first-pass analysis; empty if there were none")
    signals: list[Signal] = Field(description="The evidence items that decided the verdict")
    caveats: list[str] = Field(description="Limits of this analysis the user should know")
    genre: Optional[Genre] = Field(description="Content genre as judged after seeing the evidence; null for media with no textual genre")
    reasoning: str = Field(description="How the evidence was weighed; 3-6 sentences, no bullet lists")
    summary: str = Field(description="One or two plain-language sentences a non-expert can act on")
    verdict: Verdict
    confidence: float = Field(ge=0.0, le=1.0, description="Probability that the verdict is correct")


# ----------------------------------------------------------------------
# API response
# ----------------------------------------------------------------------
class Provenance(BaseModel):
    engine_version: str = ""               # detector.__version__
    provider: str                          # backend: gemini | ollama
    model: str                             # model that produced the verdict
    grounded: bool = False                 # kept for API compatibility; retrieval is a separate stage
    research_provider: Optional[str] = None  # search tool used for retrieval (tavily / duckduckgo)
    research_mode: str = "open"            # open | closed (no retrieval)
    fallback_used: Optional[str] = None    # e.g. video sent as frames + transcript
    search_queries: list[str] = Field(default_factory=list)
    two_step: bool = True                  # analyse -> retrieve -> verify
    calls: list[dict] = Field(default_factory=list, description="Per model call: stage, backend, model, seconds, tokens")


class Extraction(BaseModel):
    status: str = "NOT_RUN"           # SUCCESS | FAILED | SKIPPED
    url: Optional[str] = None
    final_url: Optional[str] = None
    title: Optional[str] = None
    site: Optional[str] = None
    author: Optional[str] = None
    published: Optional[str] = None
    text_chars: int = 0
    text_preview: Optional[str] = None


class AnalysisResult(BaseModel):
    id: str
    modality: Literal["news", "image", "video"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verdict: Verdict
    confidence: float
    summary: str
    reasoning: str
    genre: Optional[str] = None
    language: Optional[str] = None
    description: Optional[str] = None
    search_query: Optional[str] = None
    transcript_summary: Optional[str] = None
    claims: list[ClaimCheck] = Field(default_factory=list)
    signals: list[Signal] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list)
    evidence: list[Source] = Field(default_factory=list, description="De-duplicated sources from grounding + claims")
    extraction: Extraction = Field(default_factory=Extraction)
    forensics: dict = Field(default_factory=dict, description="Measured facts (EXIF/XMP/C2PA, ffprobe, detector score, retrieval log)")
    analysis: Optional[Analysis] = Field(default=None, description="Stage-1 output: claims, observations, queries")
    evidence_features: dict = Field(default_factory=dict, description="Structured evidence summary for the learned scorer")
    provenance: Provenance
    timings_ms: dict[str, int] = Field(default_factory=dict)
    disclaimer: str = (
        "Automated estimate from a model's analysis of the content, measured file facts and retrieved evidence. "
        "Treat it as a set of signals, not proof. Hosted model providers may use inputs to improve their services."
    )


class NewsRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class JobStatus(BaseModel):
    job_id: str
    status: Literal["queued", "running", "done", "error"]
    stage: Optional[str] = None
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None
