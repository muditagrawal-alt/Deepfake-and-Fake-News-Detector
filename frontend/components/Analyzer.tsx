"use client";

import { FilmStrip, Image as ImageIcon, Newspaper, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { analyzeImage, analyzeNews, analyzeVideo, ApiError, type AnalysisResult } from "@/lib/api";
import ResultCard from "@/components/ResultCard";
import ResultSkeleton from "@/components/ResultSkeleton";

type Mode = "news" | "image" | "video";
const LIMIT_MB: Record<Exclude<Mode, "news">, number> = { image: 10, video: 50 };

const TABS: { id: Mode; label: string; Icon: typeof Newspaper; help: string }[] = [
  { id: "news", label: "News link", Icon: Newspaper, help: "The article is extracted, its claims pulled out and checked against independent sources." },
  { id: "image", label: "Image", Icon: ImageIcon, help: "JPG, PNG or WebP, up to 10 MB. Metadata, a pixel detector, and a visual check for artifacts and context." },
  { id: "video", label: "Video", Icon: FilmStrip, help: "MP4, MOV or WebM, up to 50 MB and 90 seconds. Frames, audio and container metadata are analyzed." },
];

const SAMPLES = [
  { host: "theguardian.com", url: "https://www.theguardian.com/football/2026/apr/01/world-cup-48-questions-messi-ronaldo-trump-tickets" },
  { host: "theonion.com", url: "https://www.theonion.com/report-nation-somehow-more-divided-than-ever-before-1849972712" },
];

export default function Analyzer() {
  const [mode, setMode] = useState<Mode>("news");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const tab = TABS.find((t) => t.id === mode)!;
  const ready = mode === "news" ? /^https?:\/\/\S+$/i.test(url.trim()) : !!file;

  function pick(m: Mode) {
    setMode(m); setFile(null); setError(null); setResult(null); setStage(null);
  }

  function onFile(f: File | null) {
    setError(null);
    if (!f || mode === "news") return setFile(null);
    const limit = LIMIT_MB[mode];
    if (f.size > limit * 1024 * 1024) return setError(`That file is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${limit} MB.`);
    setFile(f);
  }

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || !ready) return;
    setError(null); setResult(null); setBusy(true);
    try {
      let r: AnalysisResult;
      if (mode === "news") {
        setStage("Extracting the article and checking its claims");
        r = await analyzeNews(url.trim());
      } else if (mode === "image") {
        setStage("Reading metadata and analyzing the image");
        r = await analyzeImage(file!);
      } else {
        setStage("Uploading");
        r = await analyzeVideo(file!, (s) => setStage(s.charAt(0).toUpperCase() + s.slice(1)));
      }
      setResult(r);
    } catch (err) {
      const offline = "Could not reach the backend. It may be waking up; try again in about 20 seconds.";
      setError(
        err instanceof ApiError
          ? err.code === "quota_exhausted" ? "Today's free analysis quota is used up. It resets at 00:00 UTC."
            : err.code === "busy" ? "The service is busy right now. Try again in a minute."
            : err.status === 0 || /fetch/i.test(err.message) ? offline
            : err.message
          : offline,
      );
    } finally {
      setBusy(false); setStage(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={run} className="rounded-panel border border-line bg-elev shadow-panel">
        <div role="tablist" aria-label="Input type" className="grid grid-cols-3 border-b border-line">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={mode === t.id} onClick={() => pick(t.id)}
              className={`flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${mode === t.id ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
              <t.Icon size={18} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-ink-2 max-w-[65ch]">{tab.help}</p>

          {mode === "news" ? (
            <div className="space-y-2">
              <label htmlFor="url" className="block text-sm font-medium">Article URL</label>
              <input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" autoComplete="off" spellCheck={false}
                className="w-full rounded-control border border-line-strong bg-bg px-3.5 py-2.5 text-[15px] placeholder:text-ink-3 focus:border-accent" />
              <p className="text-xs text-ink-3">
                Try{" "}
                {SAMPLES.map((s, i) => (
                  <span key={s.url}>
                    <button type="button" onClick={() => setUrl(s.url)} className="underline decoration-line-strong underline-offset-2 hover:text-accent">{s.host}</button>
                    {i < SAMPLES.length - 1 ? " or " : ""}
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="block text-sm font-medium">{mode === "image" ? "Image file" : "Video file"}</span>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0] ?? null); }}
                className={`flex items-center gap-4 rounded-control border border-dashed px-4 py-5 cursor-pointer transition-colors ${dragOver ? "border-accent bg-accent-soft" : "border-line-strong hover:border-ink-3"}`}>
                <input ref={fileInput} type="file" className="sr-only" accept={mode === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/quicktime,video/webm"} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                <UploadSimple size={22} className="shrink-0 text-ink-3" aria-hidden />
                {file ? (
                  <span className="text-sm">
                    <span className="font-medium">{file.name}</span>
                    <span className="block text-xs text-ink-3">{(file.size / 1048576).toFixed(1)} MB. Click to change.</span>
                  </span>
                ) : (
                  <span className="text-sm">
                    Drop a file here or <span className="text-accent underline underline-offset-2">browse</span>
                    <span className="block text-xs text-ink-3">{mode === "image" ? "JPG, PNG, WebP" : "MP4, MOV, WebM"}</span>
                  </span>
                )}
              </label>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button type="submit" disabled={busy || !ready}
              className="shrink-0 whitespace-nowrap rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-[opacity,transform] active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 hover:opacity-90">
              {busy ? "Checking" : "Run check"}
            </button>
            <p className="text-xs text-ink-3">Takes 10 to 30 seconds. Nothing you submit is stored.</p>
          </div>

          {error && <p role="alert" className="rounded-control border border-fake/30 bg-fake-soft px-3.5 py-2.5 text-sm text-fake">{error}</p>}
        </div>
      </form>

      {busy && <ResultSkeleton stage={stage} />}
      {result && !busy && <ResultCard r={result} />}
    </div>
  );
}
