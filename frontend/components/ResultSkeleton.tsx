"use client";

import { useEffect, useMemo } from "react";
import { ImageGenerationLoader } from "@/components/ui/image-generation-loader";
import { FilmStrip, Globe } from "@phosphor-icons/react";

export default function ResultSkeleton({
  stage,
  file,
  mode = "news",
  url,
}: {
  stage: string | null;
  file?: File | null;
  mode?: "news" | "image" | "video";
  url?: string;
}) {
  const previewUrl = useMemo(() => {
    if (file && mode === "image") {
      try {
        return URL.createObjectURL(file);
      } catch {
        return null;
      }
    }
    return null;
  }, [file, mode]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const bar = (w: string) => <div className={`h-3 rounded-badge bg-line ${w}`} />;

  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="relative overflow-hidden rounded-panel border border-line bg-elev shadow-panel"
    >
      {/* Active Forensic Scan Viewport with Aceternity Image Generation Loader */}
      <div className="relative w-full aspect-16/9 sm:aspect-21/9 max-h-[300px] overflow-hidden bg-neutral-950 border-b border-line flex items-center justify-center">
        {mode === "image" && previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewUrl}
            alt="Analyzing target media"
            className="size-full object-contain opacity-75"
          />
        ) : mode === "video" ? (
          <div className="flex flex-col items-center justify-center gap-2 text-ink-3">
            <FilmStrip size={44} className="opacity-40 animate-pulse" />
            <p className="text-xs font-mono">{file?.name ?? "Video Stream Ingestion"}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-ink-3 px-6 text-center">
            <Globe size={40} className="opacity-40 animate-pulse" />
            <p className="text-xs font-mono truncate max-w-[48ch] text-ink-2">{url || "News Article Extraction"}</p>
          </div>
        )}

        {/* Aceternity Image Generation Loader Canvas Overlay */}
        <ImageGenerationLoader
          effect="scale-wave"
          easing="ease-in-out"
          text="ANALYSING"
          cellSize={3}
          gap={1}
          bandHeight={48}
          colors={["var(--color-blue-500)", "var(--color-blue-800)"]}
        />
      </div>

      {/* Forensic Pipeline Stage Status */}
      <div className="p-6 border-b border-line space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Live Inspection In Progress
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-3">Veritas Engine v3</span>
        </div>
        {stage ? (
          <p className="text-sm font-medium text-ink flex items-center gap-2">
            <span>{stage}</span>
            <span className="soft-pulse text-blue-400">…</span>
          </p>
        ) : (
          <div className="space-y-2">
            {bar("w-full")}
            {bar("w-4/5")}
          </div>
        )}
      </div>

      {/* Skeleton Telemetry Readouts */}
      <div className="grid md:grid-cols-12">
        <div className="md:col-span-7 p-6 space-y-3 border-b md:border-b-0 md:border-r border-line">
          {bar("w-28")}
          {bar("w-full")}
          {bar("w-11/12")}
          {bar("w-3/4")}
          <div className="pt-3" />
          {bar("w-32")}
          {bar("w-full")}
          {bar("w-2/3")}
        </div>
        <div className="md:col-span-5 p-6 space-y-3">
          {bar("w-24")}
          {bar("w-5/6")}
          {bar("w-3/4")}
          {bar("w-4/5")}
          <div className="pt-3" />
          {bar("w-24")}
          {bar("w-full")}
          {bar("w-5/6")}
        </div>
      </div>
    </section>
  );
}
