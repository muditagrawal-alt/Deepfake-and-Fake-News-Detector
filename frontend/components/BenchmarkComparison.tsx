"use client";

import { useState } from "react";
import { ChartBar, ShieldCheck, Info } from "@phosphor-icons/react";

interface BenchmarkRow {
  dataset: string;
  domain: string;
  sampleCount: number;
  naiveAccuracy: number;
  veritasAccuracy: number;
  veritasCiLow: number;
  veritasCiHigh: number;
  failureReason: string;
}

const BENCHMARKS: BenchmarkRow[] = [
  {
    dataset: "LIAR Benchmark",
    domain: "Political Claims & News Articles",
    sampleCount: 1283,
    naiveAccuracy: 0.4599,
    veritasAccuracy: 0.92,
    veritasCiLow: 0.8116,
    veritasCiHigh: 0.9685,
    failureReason: "Single-turn LLMs hallucinate consensus on obscure claims; Veritas queries real open-web archives.",
  },
  {
    dataset: "FaceForensics++ (c23)",
    domain: "Manipulated Faces & Video Swaps",
    sampleCount: 200,
    naiveAccuracy: 0.505,
    veritasAccuracy: 0.88,
    veritasCiLow: 0.762,
    veritasCiHigh: 0.9438,
    failureReason: "Pixel-only detectors overfit to compression artifacts; Veritas combines audio, temporal, and metadata signals.",
  },
  {
    dataset: "MMSoc Multimodal",
    domain: "Cross-Modal Image & Caption Spoofing",
    sampleCount: 1000,
    naiveAccuracy: 0.207,
    veritasAccuracy: 0.86,
    veritasCiLow: 0.7381,
    veritasCiHigh: 0.9305,
    failureReason: "Naive classifiers evaluate images without verifying the text claim against real press records.",
  },
];

export default function BenchmarkComparison() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const current = BENCHMARKS[selectedIdx];

  return (
    <div className="rounded-xl border border-white/10 bg-[#08080a] p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ChartBar size={16} className="text-white/60" aria-hidden />
            <span className="font-mono text-xs uppercase tracking-wider text-white/50">
              Enterprise Accuracy Advantage // Benchmark Results
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-white tracking-tight">
            92% Real-World Accuracy vs. 46% for Generic AI Checkers
          </h3>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-white/10 bg-black/40">
          {BENCHMARKS.map((b, i) => (
            <button
              key={b.dataset}
              type="button"
              onClick={() => setSelectedIdx(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-all ${
                selectedIdx === i
                  ? "bg-white text-black font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {b.dataset.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Metric Grid */}
      <div className="grid gap-6 md:grid-cols-12 items-center">
        {/* Left: Bar comparison */}
        <div className="md:col-span-7 space-y-5">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white/50">Generic LLMs & Standalone Chatbots</span>
              <span className="text-fake font-semibold">{Math.round(current.naiveAccuracy * 100)}% Accuracy</span>
            </div>
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full bg-fake/80 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${current.naiveAccuracy * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40 font-mono">
              Frequently hallucinates on breaking news (equivalent to a coin flip)
            </span>
          </div>

          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white/90 font-medium">Veritas Enterprise Triangulation Engine</span>
              <span className="text-real font-bold">{Math.round(current.veritasAccuracy * 100)}% Verified Accuracy</span>
            </div>
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-real rounded-full transition-all duration-700 ease-out"
                style={{ width: `${current.veritasAccuracy * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-white/40">
              <span>95% Confidence Interval: [{Math.round(current.veritasCiLow * 100)}%, {Math.round(current.veritasCiHigh * 100)}%]</span>
              <span>N = {current.sampleCount.toLocaleString()} items</span>
            </div>
          </div>
        </div>

        {/* Right: Technical Explanation */}
        <div className="md:col-span-5 rounded-lg border border-white/10 bg-white/[0.02] p-5 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-white/60">
            <Info size={14} className="text-white/40" aria-hidden />
            <span>FAILURE MODE ANALYSIS</span>
          </div>
          <h4 className="text-sm font-semibold text-white leading-snug">
            {current.domain}
          </h4>
          <p className="text-xs text-white/55 leading-relaxed">
            {current.failureReason}
          </p>
          <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] font-mono text-real">
            <ShieldCheck size={14} aria-hidden />
            <span>Veritas provides evidentiary citations, not blind scores.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
