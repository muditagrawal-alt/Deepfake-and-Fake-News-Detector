export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860").replace(/\/$/, "");

export type Verdict = "LIKELY_REAL" | "LIKELY_FAKE" | "UNCERTAIN";
export type Source = { title: string; url: string };
export type Claim = { claim: string; status: "corroborated" | "contradicted" | "unverifiable" | "misleading"; explanation: string; sources: Source[] };
export type Signal = { name: string; value: string; direction: "real" | "fake" | "neutral"; weight: "weak" | "moderate" | "strong"; note: string };

export type AnalysisResult = {
  id: string;
  modality: "news" | "image" | "video";
  created_at: string;
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasoning: string;
  genre?: string | null;
  language?: string | null;
  description?: string | null;
  search_query?: string | null;
  transcript_summary?: string | null;
  claims: Claim[];
  signals: Signal[];
  caveats: string[];
  evidence: Source[];
  extraction: { status: string; url?: string | null; final_url?: string | null; title?: string | null; site?: string | null; author?: string | null; published?: string | null; text_chars: number };
  forensics: Record<string, unknown>;
  provenance: { provider: string; model: string; grounded: boolean; research_provider?: string | null; fallback_used?: string | null; search_queries: string[]; two_step: boolean };
  timings_ms: Record<string, number>;
  disclaimer: string;
};

export type Health = {
  status: string;
  providers: Record<string, boolean>;
  models: Record<string, string | null>;
  quota: { daily_used: number; daily_limit: number; daily_remaining: number; rpm_used: number; rpm_limit: number };
  onnx_ready: boolean;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function parseError(res: Response): Promise<never> {
  let message = `${res.status} ${res.statusText}`;
  let code: string | undefined;
  try {
    const body = await res.json();
    code = body.error;
    message = body.message || (typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body));
  } catch {}
  if (res.status === 429 && !code) message = "Too many requests from your network. Please try again later.";
  throw new ApiError(message, res.status, code);
}

export async function getHealth(signal?: AbortSignal): Promise<Health> {
  const res = await fetch(`${API_URL}/health`, { signal, cache: "no-store" });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function analyzeNews(url: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_URL}/analyze/news`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function analyzeImage(file: File): Promise<AnalysisResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/analyze/image`, { method: "POST", body: fd });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function analyzeVideo(file: File, onStage: (stage: string) => void): Promise<AnalysisResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/analyze/video`, { method: "POST", body: fd });
  if (!res.ok) return parseError(res);
  const { job_id } = await res.json();
  onStage("queued");
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const jr = await fetch(`${API_URL}/jobs/${job_id}`, { cache: "no-store" });
    if (!jr.ok) return parseError(jr);
    const job = await jr.json();
    if (job.stage) onStage(job.stage);
    if (job.status === "done") return job.result as AnalysisResult;
    if (job.status === "error") throw new ApiError(job.error || "Analysis failed", 500);
  }
  throw new ApiError("Timed out waiting for the analysis.", 504);
}
