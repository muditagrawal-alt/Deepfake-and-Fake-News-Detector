"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Waveform, FileText } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

interface CaseStudy {
  id: string;
  category: "Short Video" | "News Article" | "Image";
  title: string;
  sourceContext: string;
  verdict: "LIKELY_FAKE" | "LIKELY_REAL";
  confidence: number;
  runtimeSeconds: number;
  claimDecomposition: {
    claim: string;
    status: "corroborated" | "contradicted" | "unverifiable";
    finding: string;
    source: string;
    sourceUrl: string;
  }[];
  technicalSignals: {
    name: string;
    reading: string;
    weight: "high" | "medium";
    direction: "points to fake" | "points to real";
  }[];
  provenanceAudit: {
    manifest: string;
    integrity: string;
    researchMode: string;
  };
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "video-clone",
    category: "Short Video",
    title: "Viral political speech video alleging emergency declaration",
    sourceContext: "TikTok / X video clip (38s, 1080p). Target's face matches official briefing background.",
    verdict: "LIKELY_FAKE",
    confidence: 0.94,
    runtimeSeconds: 14.8,
    claimDecomposition: [
      {
        claim: "Speaker declares nationwide emergency curfew starting 20:00 tonight.",
        status: "contradicted",
        finding: "Official government gazette and live press pool archives contain no emergency declaration.",
        source: "reuters.com",
        sourceUrl: "https://www.reuters.com",
      },
      {
        claim: "Location claimed to be the East Wing briefing room on Oct 28.",
        status: "contradicted",
        finding: "Official schedule confirms official was in Geneva on bilateral trade summit that day.",
        source: "apnews.com",
        sourceUrl: "https://apnews.com",
      },
    ],
    technicalSignals: [
      {
        name: "Audio Voice Clone Discontinuity",
        reading: "Mel-spectrogram phase jitter & synthetic vocoder resonance at 12.4s-18.1s",
        weight: "high",
        direction: "points to fake",
      },
      {
        name: "Video Lip Sync Synchronization",
        reading: "Phoneme-viseme temporal offset exceeds natural threshold (>140ms lag)",
        weight: "high",
        direction: "points to fake",
      },
      {
        name: "Container Metadata",
        reading: "Remuxed with ffmpeg 6.1; original sensor metadata stripped",
        weight: "medium",
        direction: "points to fake",
      },
    ],
    provenanceAudit: {
      manifest: "No C2PA claim present",
      integrity: "Re-encoded MP4",
      researchMode: "Open web multi-source triangulation (18 queries)",
    },
  },
  {
    id: "news-fabrication",
    category: "News Article",
    title: "Breaking wire report claiming central bank currency redenomination",
    sourceContext: "Pasted link from clone domain pretending to be financial press wire.",
    verdict: "LIKELY_FAKE",
    confidence: 0.98,
    runtimeSeconds: 8.2,
    claimDecomposition: [
      {
        claim: "Federal monetary board voted secretly to redenominate currency units by 100:1.",
        status: "contradicted",
        finding: "Federal Reserve public board docket confirms routine interest rate review; zero redenomination vote.",
        source: "federalreserve.gov",
        sourceUrl: "https://www.federalreserve.gov",
      },
      {
        claim: "Cites official executive decree #8492 signed yesterday.",
        status: "contradicted",
        finding: "National Archives Federal Register has no record of decree #8492.",
        source: "federalregister.gov",
        sourceUrl: "https://www.federalregister.gov",
      },
    ],
    technicalSignals: [
      {
        name: "Domain Spoofing / Typosquatting",
        reading: "Registered 48h ago via anonymous privacy proxy in Reykjavik",
        weight: "high",
        direction: "points to fake",
      },
      {
        name: "Zero Independent News Wire Corroboration",
        reading: "Searched Bloomberg, FT, WSJ, Dow Jones — zero wire mentions",
        weight: "high",
        direction: "points to fake",
      },
    ],
    provenanceAudit: {
      manifest: "Untrusted origin",
      integrity: "Synthetic wire attribution",
      researchMode: "Triangulated across 4 central bank registries",
    },
  },
  {
    id: "authentic-photo",
    category: "Image",
    title: "Press pool summit photograph with cryptographic C2PA provenance",
    sourceContext: "High-resolution camera capture uploaded during maritime peace treaty.",
    verdict: "LIKELY_REAL",
    confidence: 0.96,
    runtimeSeconds: 6.4,
    claimDecomposition: [
      {
        claim: "Photographed on location during bilateral treaty exchange at 14:15 UTC.",
        status: "corroborated",
        finding: "Matching angle, lighting and attendees verified across 12 credentialed press cameras.",
        source: "apnews.com",
        sourceUrl: "https://apnews.com",
      },
    ],
    technicalSignals: [
      {
        name: "C2PA Cryptographic Signature",
        reading: "Hardware-backed key verified (Associated Press Press Pool root certificate)",
        weight: "high",
        direction: "points to real",
      },
      {
        name: "Camera Sensor PRNU Noise Consistency",
        reading: "Sensor photo-response non-uniformity uniform across all color planes",
        weight: "high",
        direction: "points to real",
      },
      {
        name: "EXIF & Lens Geometry",
        reading: "Focal length, lens distortion, and solar shadow angle match GPS timestamp",
        weight: "medium",
        direction: "points to real",
      },
    ],
    provenanceAudit: {
      manifest: "C2PA v2.1 Verified Valid",
      integrity: "Cryptographically unbroken",
      researchMode: "Grounded with press wire validation",
    },
  },
];

export default function InteractiveForensicDemo() {
  const [activeCaseId, setActiveCaseId] = useState<string>("video-clone");
  const activeCase = CASE_STUDIES.find((c) => c.id === activeCaseId) || CASE_STUDIES[0];

  return (
    <div className="rounded-xl border border-white/10 bg-[#08080a] p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden">
      {/* Top subtle ambient glow */}
      <div className="absolute top-0 right-1/4 -mt-12 w-96 h-28 bg-white/[0.02] blur-3xl rounded-full pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-real animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-white/50">
              Interactive Case Explorer · Live Forensic Decomposition
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">
            Examine how Veritas dismantles synthetic media
          </h3>
        </div>

        {/* Case Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-white/10 bg-black/40">
          {CASE_STUDIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCaseId(c.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeCaseId === c.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {c.category}
            </button>
          ))}
        </div>
      </div>

      {/* Case Details Stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCase.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 space-y-6"
        >
          {/* Top summary card */}
          <div className="grid gap-4 lg:grid-cols-12 rounded-lg border border-white/10 bg-white/[0.015] p-5">
            <div className="lg:col-span-8 space-y-2">
              <span className="font-mono text-[11px] text-white/50 uppercase tracking-widest">
                VERIFIED THREAT INVESTIGATION • {activeCase.category.toUpperCase()}
              </span>
              <h4 className="text-base sm:text-lg font-semibold text-white leading-snug">
                {activeCase.title}
              </h4>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-mono">
                {activeCase.sourceContext}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-5">
              <div>
                <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                  Authenticity Verdict
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className={`text-xl font-bold tracking-tight ${
                      activeCase.verdict === "LIKELY_FAKE" ? "text-fake" : "text-real"
                    }`}
                  >
                    {activeCase.verdict === "LIKELY_FAKE" ? "Likely Fake" : "Likely Real"}
                  </span>
                  <span className="font-mono text-xs text-white/70 tabular-nums">
                    {Math.round(activeCase.confidence * 100)}% confidence
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-white/50 border-t border-white/5 pt-2">
                <span>VERIFIED IN {activeCase.runtimeSeconds}s</span>
                <span className="text-emerald-400 font-semibold">C2PA COMPLIANT</span>
              </div>
            </div>
          </div>

          {/* Dual columns: Triangulated Claims vs Technical Signals */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: Claim Triangulation */}
            <div className="rounded-lg border border-white/10 bg-white/[0.01] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-white/60" aria-hidden />
                  <span className="font-semibold text-sm text-white">Triangulated Claims</span>
                </div>
                <span className="font-mono text-[11px] text-white/40">Open Web Audit</span>
              </div>

              <div className="space-y-4">
                {activeCase.claimDecomposition.map((claim, idx) => (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      {claim.status === "contradicted" ? (
                        <XCircle size={16} className="text-fake shrink-0 mt-0.5" weight="fill" />
                      ) : (
                        <CheckCircle size={16} className="text-real shrink-0 mt-0.5" weight="fill" />
                      )}
                      <div>
                        <p className="font-medium text-white/90 leading-snug">{claim.claim}</p>
                        <p className="mt-1 text-white/50 leading-relaxed">{claim.finding}</p>
                        <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-white/40">
                          <span>Verified via:</span>
                          <span className="text-white/80 underline decoration-white/20">
                            {claim.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Technical Signals */}
            <div className="rounded-lg border border-white/10 bg-white/[0.01] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Waveform size={16} className="text-white/60" aria-hidden />
                  <span className="font-semibold text-sm text-white">Forensic Sensor Signals</span>
                </div>
                <span className="font-mono text-[11px] text-white/40">Multi-Model</span>
              </div>

              <div className="space-y-3">
                {activeCase.technicalSignals.map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-md border border-white/5 bg-white/[0.02] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-white">{sig.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          sig.direction === "points to fake"
                            ? "bg-fake/10 text-fake border border-fake/20"
                            : "bg-real/10 text-real border border-real/20"
                        }`}
                      >
                        {sig.direction}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-white/50 leading-relaxed">
                      {sig.reading}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[11px] font-mono text-white/40">
                <span>MANIFEST: {activeCase.provenanceAudit.manifest}</span>
                <span className="text-white/60">{activeCase.provenanceAudit.integrity}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
