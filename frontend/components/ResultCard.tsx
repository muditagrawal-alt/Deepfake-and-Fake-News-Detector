"use client";

import {
  ArrowSquareOut, CaretDown, CaretUp, CheckCircle, Minus, Question, Warning, XCircle,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { AnalysisResult, Claim, Signal } from "@/lib/api";

const VERDICT: Record<AnalysisResult["verdict"], { label: string; color: string }> = {
  LIKELY_REAL: { label: "Likely real", color: "text-real" },
  LIKELY_FAKE: { label: "Likely fake", color: "text-fake" },
  UNCERTAIN: { label: "Uncertain", color: "text-warn" },
};

const CLAIM: Record<Claim["status"], { label: string; cls: string; Icon: typeof CheckCircle }> = {
  corroborated: { label: "Corroborated", cls: "text-real bg-real-soft", Icon: CheckCircle },
  contradicted: { label: "Contradicted", cls: "text-fake bg-fake-soft", Icon: XCircle },
  misleading: { label: "Misleading", cls: "text-fake bg-fake-soft", Icon: Warning },
  unverifiable: { label: "Unverifiable", cls: "text-warn bg-warn-soft", Icon: Question },
};

const DIR: Record<Signal["direction"], { cls: string; Icon: typeof CaretUp; title: string }> = {
  real: { cls: "text-real", Icon: CaretUp, title: "points to real" },
  fake: { cls: "text-fake", Icon: CaretDown, title: "points to fake" },
  neutral: { cls: "text-ink-3", Icon: Minus, title: "neutral" },
};

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-ink">{children}</h3>;
}

export default function ResultCard({ r }: { r: AnalysisResult }) {
  const v = VERDICT[r.verdict];
  const pct = Math.round(r.confidence * 100);
  const [raw, setRaw] = useState(false);
  const webChecked = r.provenance.grounded || !!r.provenance.research_provider;
  const seconds = (Object.values(r.timings_ms).reduce((a, b) => a + b, 0) / 1000).toFixed(0);
  const via = r.provenance.grounded ? "Google Search" : r.provenance.research_provider === "duckduckgo" ? "DuckDuckGo" : r.provenance.research_provider?.replace(/_/g, " ");

  return (
    <section className="rise rounded-panel border border-line bg-elev shadow-panel" aria-live="polite">
      <header className="p-6 border-b border-line">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className={`text-2xl font-semibold tracking-tight ${v.color}`}>{v.label}</h2>
          <span className="text-sm text-ink-2 tabular-nums">{pct}% confidence</span>
          <span className="text-sm text-ink-3 ml-auto">
            {r.modality === "news" ? "Article" : r.modality === "image" ? "Image" : "Video"}
            {r.genre ? ` · ${r.genre.replace(/_/g, " ")}` : ""}
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed max-w-[70ch]">{r.summary}</p>
        <dl className="mt-3 space-y-1 text-sm text-ink-2">
          {r.extraction?.title && <div><dt className="inline text-ink-3">Checked: </dt><dd className="inline">{r.extraction.title}{r.extraction.site ? ` (${r.extraction.site})` : ""}</dd></div>}
          {r.description && <div><dt className="inline text-ink-3">Shows: </dt><dd className="inline">{r.description}</dd></div>}
          {r.transcript_summary && <div><dt className="inline text-ink-3">Says: </dt><dd className="inline">{r.transcript_summary}</dd></div>}
        </dl>
      </header>

      <div className="grid md:grid-cols-12">
        <div className="md:col-span-7 p-6 space-y-7 border-b md:border-b-0 md:border-r border-line">
          <div>
            <Label>Why</Label>
            <p className="mt-2 text-sm leading-relaxed text-ink-2 max-w-[65ch]">{r.reasoning}</p>
          </div>

          {r.claims.length > 0 && (
            <div>
              <Label>Claims checked</Label>
              <ol className="mt-3 space-y-4">
                {r.claims.map((c, i) => {
                  const s = CLAIM[c.status];
                  return (
                    <li key={i} className="grid grid-cols-[auto_1fr] gap-x-3">
                      <s.Icon size={18} weight="fill" className={`mt-0.5 ${s.cls.split(" ")[0]}`} aria-hidden />
                      <div>
                        <p className="text-sm">
                          <span className={`mr-2 rounded-badge px-1.5 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>
                          {c.claim}
                        </p>
                        <p className="mt-1 text-sm text-ink-2">{c.explanation}</p>
                        {c.sources.length > 0 && (
                          <p className="mt-1 text-xs text-ink-3 flex flex-wrap gap-x-3">
                            {c.sources.map((src, j) => (
                              <a key={j} href={src.url} target="_blank" rel="noreferrer noopener" className="hover:text-accent underline decoration-line-strong underline-offset-2">{host(src.url)}</a>
                            ))}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {r.caveats.length > 0 && (
            <div>
              <Label>Caveats</Label>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-2 max-w-[65ch]">
                {r.caveats.map((c, i) => <li key={i} className="grid grid-cols-[auto_1fr] gap-x-2"><span className="text-ink-3" aria-hidden>·</span>{c}</li>)}
              </ul>
            </div>
          )}
        </div>

        <aside className="md:col-span-5 p-6 space-y-7">
          {r.signals.length > 0 && (
            <div>
              <Label>Signals</Label>
              <ul className="mt-3 space-y-3">
                {r.signals.map((s, i) => {
                  const d = DIR[s.direction];
                  return (
                    <li key={i} className="grid grid-cols-[auto_1fr] gap-x-2 text-sm">
                      <d.Icon size={16} weight="bold" className={`mt-0.5 ${d.cls}`} aria-label={d.title} />
                      <div>
                        <p><span className="font-medium">{s.name.replace(/_/g, " ")}</span> <span className="text-xs text-ink-3">{s.weight}</span></p>
                        <p className="text-ink-2">{s.value}{s.note ? `. ${s.note}` : ""}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <Label>Sources</Label>
            {r.evidence.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {r.evidence.slice(0, 8).map((e, i) => (
                  <li key={i}>
                    <a href={e.url} target="_blank" rel="noreferrer noopener" className="group grid grid-cols-[1fr_auto] gap-2 items-start hover:text-accent">
                      <span>
                        <span className="line-clamp-1">{e.title || host(e.url)}</span>
                        <span className="block text-xs text-ink-3">{host(e.url)}</span>
                      </span>
                      <ArrowSquareOut size={14} className="mt-1 text-ink-3 group-hover:text-accent" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-3">{webChecked ? "No relevant sources found." : "No web check was needed for this item."}</p>
            )}
          </div>

          <p className="text-xs text-ink-3 leading-relaxed">
            {r.provenance.model}{via ? `, research via ${via}` : ""}. {seconds} s.
          </p>
        </aside>
      </div>

      <div className="border-t border-line">
        <button onClick={() => setRaw((x) => !x)} aria-expanded={raw} className="w-full flex items-center gap-2 px-6 py-3 text-xs text-ink-2 hover:text-ink transition-colors">
          {raw ? <CaretUp size={14} aria-hidden /> : <CaretDown size={14} aria-hidden />}
          Raw forensic signals
        </button>
        {raw && <pre className="px-6 pb-5 text-[11px] leading-snug overflow-x-auto font-mono text-ink-2">{JSON.stringify(r.forensics, null, 2)}</pre>}
      </div>
    </section>
  );
}
