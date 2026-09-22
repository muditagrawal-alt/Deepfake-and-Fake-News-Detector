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


class LLMVerdict(BaseModel):
    verdict: Verdict
    confidence: float = Field(ge=0.0, le=1.0, description="Calibrated probability that the verdict is correct")
    summary: str = Field(description="One or two plain-language sentences a non-expert can act on")
    reasoning: str = Field(description="How the evidence was weighed; 3-6 sentences, no bullet lists")
    genre: Optional[Genre] = Field(default=None, description="Content genre; for news, satire counts as not-factual")
    language: Optional[str] = Field(default=None, description="ISO-639-1 language of the content")
    description: Optional[str] = Field(default=None, description="Image/video: what is depicted, including any on-screen text (OCR)")
    search_query: Optional[str] = Field(default=None, description="Image/video: a web search query to verify the depicted public figure, event or spoken claim. Null for personal/private content with nothing checkable.")
    transcript_summary: Optional[str] = Field(default=None, description="Video: what is said in the audio, briefly")
    claims: list[ClaimCheck] = Field(default_factory=list)
    signals: list[Signal] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list, description="Limits of this analysis the user should know")


# ----------------------------------------------------------------------
# API response
# ----------------------------------------------------------------------
class Provenance(BaseModel):
    provider: str
    model: str
    grounded: bool = False                 # Gemini's own Google Search grounding
    research_provider: Optional[str] = None  # external search used instead (groq_browser_search / tavily)
    fallback_used: Optional[str] = None
    search_queries: list[str] = Field(default_factory=list)
    two_step: bool = False


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
    forensics: dict = Field(default_factory=dict, description="Raw local signals (EXIF, ffprobe, detector probabilities)")
    provenance: Provenance
    timings_ms: dict[str, int] = Field(default_factory=dict)
    disclaimer: str = (
        "Automated estimate combining local forensics and an LLM fact-check. "
        "Treat it as a set of signals, not proof. Free-tier model providers may use inputs to improve their services."
    )


class NewsRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class JobStatus(BaseModel):
    job_id: str
    status: Literal["queued", "running", "done", "error"]
    stage: Optional[str] = None
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None
