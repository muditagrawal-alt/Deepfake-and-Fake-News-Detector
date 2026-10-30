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
  provenance: { provider: string; model: string; grounded: boolean; research_provider?: string | null; research_mode?: "open" | "closed"; fallback_used?: string | null; search_queries: string[]; two_step: boolean };
  timings_ms: Record<string, number>;
  disclaimer: string;
};

export type Health = {
  status: string;
  providers: Record<string, boolean>;
  engine: {
    backend: string;
    model: string;
    pinned: boolean;
    research_mode: string;
    exclude_fact_checks: boolean;
    researcher: string | null;
    video_strategy: string;
    onnx_detector: string | null;
  };
  quota: { daily_used: number; daily_limit: number; daily_remaining: number; rpm_used: number; rpm_limit: number };
  onnx_ready: boolean;
  onnx_error?: string | null;
};

export type AccountStatus = {
  free_limit: number;
  free_used: number;
  free_remaining: number;
  keys: string[];
  byok_ready: boolean;
  history_limit: number;
  history_enabled: boolean;
  is_new_user: boolean;
};

export type HistoryEntry = {
  id: string;
  modality: AnalysisResult["modality"];
  verdict: Verdict;
  summary: string;
  confidence: number;
  created_at: string;
  input_label: string;
  result: AnalysisResult;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  unavailableMessage = "The Veritas API could not be reached. Check that the backend is running and NEXT_PUBLIC_API_URL points to it.",
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(unavailableMessage, 0, "api_unavailable");
  }
}

async function parseError(res: Response): Promise<never> {
  let message = `${res.status} ${res.statusText}`;
  let code: string | undefined;
  try {
    const body = await res.json();
    const detail = body.detail;
    code = body.error || detail?.error;
    message = body.message || detail?.message || (typeof detail === "string" ? detail : JSON.stringify(detail ?? body));
  } catch {}
  if (res.status === 429 && !code) message = "Too many requests from your network. Please try again later.";
  throw new ApiError(message, res.status, code);
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let tokenRequest: Promise<string> | null = null;

async function backendToken(): Promise<string> {
  if (cachedToken && tokenExpiresAt > Date.now() + 30_000) return cachedToken;
  if (!tokenRequest) {
    tokenRequest = apiFetch(
      "/api/backend-token",
      { cache: "no-store" },
      "The sign-in service could not be reached. Refresh the page and try again.",
    ).then(async (res) => {
      if (!res.ok) return parseError(res);
      const body = await res.json();
      const token = body.token as string;
      cachedToken = token;
      tokenExpiresAt = Date.now() + (body.expires_in as number) * 1000;
      return token;
    }).finally(() => { tokenRequest = null; });
  }
  return tokenRequest;
}

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await backendToken()}`);
  return apiFetch(`${API_URL}${path}`, { ...init, headers, cache: init.cache || "no-store" });
}

export async function getHealth(signal?: AbortSignal): Promise<Health> {
  const res = await apiFetch(`${API_URL}/health`, { signal, cache: "no-store" });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function analyzeNews(url: string): Promise<AnalysisResult> {
  const res = await authorizedFetch("/analyze/news", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function analyzeImage(file: File, caption?: string): Promise<AnalysisResult> {
  const fd = new FormData();
  fd.append("file", file);
  if (caption?.trim()) fd.append("caption", caption.trim());
  const res = await authorizedFetch("/analyze/image", { method: "POST", body: fd });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function analyzeVideo(file: File, onStage: (stage: string) => void): Promise<AnalysisResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await authorizedFetch("/analyze/video", { method: "POST", body: fd });
  if (!res.ok) return parseError(res);
  const { job_id } = await res.json();
  onStage("queued");
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const jr = await authorizedFetch(`/jobs/${job_id}`);
    if (!jr.ok) return parseError(jr);
    const job = await jr.json();
    if (job.stage) onStage(job.stage);
    if (job.status === "done") return job.result as AnalysisResult;
    if (job.status === "error") throw new ApiError(job.error || "Analysis failed", 500);
  }
  throw new ApiError("Timed out waiting for the analysis.", 504);
}

export async function getAccount(): Promise<AccountStatus> {
  const res = await authorizedFetch("/account");
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const res = await authorizedFetch("/account/history");
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function clearHistory(): Promise<void> {
  const res = await authorizedFetch("/account/history", { method: "DELETE" });
  if (!res.ok) return parseError(res);
}

export async function setHistoryEnabled(enabled: boolean): Promise<{ history_enabled: boolean; deleted: number }> {
  const res = await authorizedFetch("/account/preferences/history", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  const res = await authorizedFetch("/account", { method: "DELETE" });
  if (!res.ok) return parseError(res);
}

export async function saveApiKey(provider: string, key: string): Promise<void> {
  const res = await authorizedFetch("/account/keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, key }),
  });
  if (!res.ok) return parseError(res);
}

export async function deleteApiKey(provider: string): Promise<void> {
  const res = await authorizedFetch(`/account/keys/${encodeURIComponent(provider)}`, { method: "DELETE" });
  if (!res.ok) return parseError(res);
}
