"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import {
  Cpu,
  Database,
  CheckCircle2,
  Terminal,
  Activity,
  ExternalLink,
  Shield,
  Search,
  Radio,
  Lock,
  Wrench,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface ChassisModule {
  id: string;
  name: string;
  role: string;
  quadrant: "top" | "left" | "right" | "bottom";
  mechanicalTag: string;
  accentColor: string;
  glowColor: string;
  codePath: string;
  latencyMs: number;
  inputContract: string;
  outputContract: string;
  purpose: string;
  specifications: string[];
  submodules: { name: string; desc: string }[];
}

const CHASSIS_MODULES: ChassisModule[] = [
  {
    id: "chassis-ingest",
    name: "Forensic Ingestion Chassis",
    role: "Hardware C2PA Provenance & Signal Extraction",
    quadrant: "top",
    mechanicalTag: "CHASSIS MODULE: OPTIC SENSOR CROWN",
    accentColor: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.4)",
    codePath: "backend/app/services/forensic_orchestrator.py",
    latencyMs: 185,
    inputContract: "multipart/form-data (Binary Image, Audio WAV/MP3, or Claim String)",
    outputContract: "ForensicSignalsPayload { c2pa, ela_fft, audio_spectrogram, synthid }",
    purpose: "Audits immutable hardware container manifests, 2D FFT frequency anomalies, and acoustic vocoder pitch micro-jitter before claim parsing.",
    specifications: [
      "X.509 C2PA Hardware Certificate Chain Matcher",
      "Discrete Cosine Transform (DCT) & 2D FFT Spatial Residuals",
      "Mel-Frequency Spectrogram Acoustic Pitch Discontinuity",
      "Volatile Enclave Zero Media Retention Protocol",
    ],
    submodules: [
      { name: "C2PA JUMBF Box Auditor", desc: "Verifies camera hardware sensor cryptographic binding" },
      { name: "ELA Forensic Analyzer", desc: "Identifies multi-pass compression & spatial splice boundaries" },
    ],
  },
  {
    id: "chassis-decompose",
    name: "Proposition Decomposition Core",
    role: "Structured Proposition Parsing & NER",
    quadrant: "left",
    mechanicalTag: "CHASSIS MODULE: PROPOSITION MATRIX",
    accentColor: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.4)",
    codePath: "backend/app/services/claim_extractor.py",
    latencyMs: 220,
    inputContract: "ForensicSignalsPayload + Transcribed Text",
    outputContract: "AtomicClaimsArray [{ claim_id, text, entities, temporal_anchor }]",
    purpose: "Deconstructs complex multimedia statements into atomic testable assertions with strict JSON Schema constraints using Gemini 2.5 Flash Lite.",
    specifications: [
      "Strict JSON-Mode Grammar Constraint (Gemini 2.5)",
      "Groq LPU LLaMA-3.3-70B Failover Engine (<100ms SLA)",
      "Geopolitical & Temporal Entity Resolution (NER)",
      "Contextual Repurposing & Misattribution Classifier",
    ],
    submodules: [
      { name: "Entity Anchor Resolver", desc: "Maps actors, timestamps, and geolocation coordinates" },
      { name: "Atomic Fact Disaggregator", desc: "Isolates falsifiable propositions from compound sentences" },
    ],
  },
  {
    id: "chassis-triangulate",
    name: "Wire Triangulation Router",
    role: "Federated Press Archive Cross-Referencing",
    quadrant: "right",
    mechanicalTag: "CHASSIS MODULE: CROSS-WIRE REGISTRY",
    accentColor: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.4)",
    codePath: "backend/app/services/triangulation_service.py",
    latencyMs: 340,
    inputContract: "AtomicClaimsArray + Temporal Bounds",
    outputContract: "WireConsensusDossier [{ source, title, url, stance, credibility_weight }]",
    purpose: "Autonomously cross-indexes extracted atomic claims across 14 independent wire archives (Reuters, AP, BBC) and live eyewitness streams.",
    specifications: [
      "DuckDuckGo Deep News Indexation & Boolean Query Matrix",
      "Trafilatura Zero-Clutter DOM Extractor & Ad Stripper",
      "Editorial Stance Agreement & Corroboration Engine",
      "Tweepy X API v2 Real-Time Event Correlator",
    ],
    submodules: [
      { name: "Federated Query Dispatcher", desc: "Dispatches parallel search vectors to wire registries" },
      { name: "Domain Reputation Scorer", desc: "Dynamic credibility weighting based on editorial lineage" },
    ],
  },
  {
    id: "chassis-synthesis",
    name: "Bayesian Synthesis Nexus",
    role: "Dynamic Likelihood Aggregator & Attestation",
    quadrant: "bottom",
    mechanicalTag: "CHASSIS MODULE: CHEVRON KEEL FOUNDATION",
    accentColor: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.4)",
    codePath: "backend/app/services/verdict_service.py",
    latencyMs: 145,
    inputContract: "ForensicSignalsPayload + WireConsensusDossier",
    outputContract: "FinalVerdictReport { classification, confidence, audit_hash, timeline }",
    purpose: "Synthesizes multi-modal forensic probabilities with journalistic wire consensus into a calibrated authenticity verdict with SHA-256 seal.",
    specifications: [
      "Dynamic Bayesian Network (DBN) Likelihood Aggregator",
      "Wilson Score 95% Bootstrap Empirical Confidence Bounds",
      "Laplace-Smoothed Adversarial Signal Weighting",
      "NIST FIPS 180-4 Immutable Cryptographic Report Hash",
    ],
    submodules: [
      { name: "Bayesian Synthesizer", desc: "Calculates posterior belief distribution across all vectors" },
      { name: "SHA-256 Audit Seal", desc: "Produces tamper-evident cryptographic verification seal" },
    ],
  },
];

export function Architecture3D() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Active chassis selection for inspection
  const [activeChassisId, setActiveChassisId] = useState<string>("chassis-ingest");
  const [manualAssembly, setManualAssembly] = useState<number | null>(null);

  // Scroll tracking across this mechanical section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Smooth scroll assembly progress (0.0 = completely collapsed chassis, 1.0 = fully assembled Veritas logo)
  const mappedScrollProgress = useTransform(scrollYProgress, [0.18, 0.68], [0, 1]);
  const smoothProgress = useSpring(mappedScrollProgress, {
    stiffness: 85,
    damping: 22,
    restDelta: 0.001,
  });

  const [scrollProgressVal, setScrollProgressVal] = useState(0);

  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (latest) => {
      setScrollProgressVal(Math.max(0, Math.min(1, latest)));
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  const assemblyProgress =
    manualAssembly !== null ? manualAssembly : scrollProgressVal;

  const activeChassis =
    CHASSIS_MODULES.find((m) => m.id === activeChassisId) || CHASSIS_MODULES[0];

  const p = shouldReduceMotion ? 1 : assemblyProgress;
  const isFullyAssembled = p >= 0.88;

  return (
    <div
      ref={sectionRef}
      id="architecture"
      className="w-full bg-bg text-ink relative py-16 px-4 sm:px-8 lg:px-12 selection:bg-accent/20 scroll-mt-16"
    >
      {/* Blueprint Coordinate Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e222a_1px,transparent_1px)] [background-size:28px_28px] opacity-45"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1400px] relative z-10 flex flex-col gap-10">
        {/* Section Technical Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-accent-soft border border-line text-xs font-mono tracking-wider text-ink-2">
              <Wrench size={13} className="text-accent" />
              <span>MECHANICAL ARCHITECTURE · SCROLL-DRIVEN VERITAS LOGO ASSEMBLY</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              System Architecture & Mechanical Model
            </h2>
            <p className="text-sm sm:text-base text-ink-2 max-w-2xl leading-relaxed">
              Scroll into this section to witness Veritas&apos;s four core pipeline chassis mechanically
              articulate, slide, and interlock into the iconic Veritas Shield logo. Click any module to inspect its
              active repo code path and data contracts.
            </p>
          </div>

          {/* Interactive Mechanical Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Toggle Assembly Button */}
            <button
              onClick={() => {
                if (manualAssembly === null) {
                  setManualAssembly(isFullyAssembled ? 0 : 1);
                } else {
                  setManualAssembly(manualAssembly > 0.5 ? 0 : 1);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-elev border border-line hover:border-line-strong hover:bg-line/40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              {isFullyAssembled ? (
                <>
                  <Minimize2 size={15} className="text-accent" />
                  <span>Disassemble Chassis</span>
                </>
              ) : (
                <>
                  <Maximize2 size={15} className="text-accent" />
                  <span>Assemble Logo (100%)</span>
                </>
              )}
            </button>

            {/* Manual Assembly Progress Scrubber */}
            <div className="inline-flex items-center gap-2.5 rounded-control border border-line bg-elev px-3 py-1.5 text-xs font-mono">
              <span className="text-ink-3">ALIGN:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={p}
                onChange={(e) => setManualAssembly(parseFloat(e.target.value))}
                className="w-24 sm:w-32 accent-accent cursor-pointer"
                aria-label="Mechanical assembly scrubber"
              />
              <span className="text-white font-semibold w-9 text-right">
                {Math.round(p * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Main Stage: Mechanical Stage Left + Chassis Blueprint Inspector Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 3D Mechanical Assembly Canvas */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center min-h-[620px] lg:min-h-[700px] rounded-2xl border border-line bg-[#07080b] p-6 relative overflow-hidden select-none shadow-2xl">
            {/* Blueprint HUD Caliper Corners */}
            <div className="absolute top-4 left-4 font-mono text-[11px] text-ink-3 flex items-center gap-2">
              <Activity size={13} className="text-accent" />
              <span>CHASSIS TOLERANCE: ±0.015MM · TORQUE: 42NM</span>
            </div>
            <div className="absolute top-4 right-4 font-mono text-[11px] text-ink-3 flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: isFullyAssembled ? "#22c55e" : "#eab308" }} />
              <span>{isFullyAssembled ? "VERITAS LOGO ASSEMBLED" : "COLLAPSED CHASSIS BLUEPRINT"}</span>
            </div>

            {/* Circular Caliper Angle Reticle */}
            <div
              className="absolute size-[480px] rounded-full border border-line/40 pointer-events-none"
              style={{
                transform: `rotate(${p * 90}deg)`,
                transition: "transform 200ms ease-out",
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black border border-line text-[9px] font-mono text-ink-3">
                000°
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 px-2 py-0.5 rounded bg-black border border-line text-[9px] font-mono text-ink-3">
                180°
              </div>
            </div>

            {/* Mechanical Articulation Arena */}
            <div className="relative w-full max-w-[460px] h-[460px] flex items-center justify-center">
              {/* Hydraulic Piston Vectors (Visible during assembly) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 460 460">
                <line
                  x1="230"
                  y1={80 + (1 - p) * -30}
                  x2="230"
                  y2={230}
                  stroke="rgba(56, 189, 248, 0.35)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <line
                  x1={80 + (1 - p) * -30}
                  y1="230"
                  x2="230"
                  y2="230"
                  stroke="rgba(168, 85, 247, 0.35)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <line
                  x1={380 + (1 - p) * 30}
                  y1="230"
                  x2="230"
                  y2="230"
                  stroke="rgba(16, 185, 129, 0.35)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <line
                  x1="230"
                  y1={380 + (1 - p) * 30}
                  x2="230"
                  y2="230"
                  stroke="rgba(245, 158, 11, 0.35)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Central Shield Logo Assembly Target */}
              <div className="relative size-[280px] sm:size-[320px] flex items-center justify-center">
                {/* 1. TOP CHASSIS (Forensic Optic Crown) */}
                <div
                  onClick={() => setActiveChassisId("chassis-ingest")}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 z-20 cursor-pointer transition-all duration-300 group ${
                    activeChassisId === "chassis-ingest" ? "scale-105" : ""
                  }`}
                  style={{
                    transform: `translate(-50%, ${(1 - p) * -95}px)`,
                  }}
                >
                  <div
                    className="relative px-4 py-2.5 rounded-t-2xl rounded-b-md border shadow-lg flex flex-col items-center bg-[#0d0f14]"
                    style={{
                      borderColor: activeChassisId === "chassis-ingest" ? "#38bdf8" : "rgba(255,255,255,0.15)",
                      boxShadow: activeChassisId === "chassis-ingest" ? "0 0 25px rgba(56, 189, 248, 0.4)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-400">
                      <Radio size={14} />
                      <span>INGESTION CROWN</span>
                    </div>
                    {p < 0.6 && (
                      <span className="text-[10px] font-mono text-ink-3 mt-0.5">
                        C2PA & Spectral FFT
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. LEFT CHASSIS (Decomposition Flange) */}
                <div
                  onClick={() => setActiveChassisId("chassis-decompose")}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer transition-all duration-300 group ${
                    activeChassisId === "chassis-decompose" ? "scale-105" : ""
                  }`}
                  style={{
                    transform: `translate(${(1 - p) * -95}px, -50%)`,
                  }}
                >
                  <div
                    className="relative px-3.5 py-3 rounded-l-2xl rounded-r-md border shadow-lg flex flex-col items-center bg-[#0d0f14]"
                    style={{
                      borderColor: activeChassisId === "chassis-decompose" ? "#a855f7" : "rgba(255,255,255,0.15)",
                      boxShadow: activeChassisId === "chassis-decompose" ? "0 0 25px rgba(168, 85, 247, 0.4)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-purple-400">
                      <Cpu size={14} />
                      <span>CLAIMS</span>
                    </div>
                    {p < 0.6 && (
                      <span className="text-[10px] font-mono text-ink-3 mt-0.5 whitespace-nowrap">
                        Gemini JSON
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. RIGHT CHASSIS (Triangulation Flange) */}
                <div
                  onClick={() => setActiveChassisId("chassis-triangulate")}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer transition-all duration-300 group ${
                    activeChassisId === "chassis-triangulate" ? "scale-105" : ""
                  }`}
                  style={{
                    transform: `translate(${(1 - p) * 95}px, -50%)`,
                  }}
                >
                  <div
                    className="relative px-3.5 py-3 rounded-r-2xl rounded-l-md border shadow-lg flex flex-col items-center bg-[#0d0f14]"
                    style={{
                      borderColor: activeChassisId === "chassis-triangulate" ? "#10b981" : "rgba(255,255,255,0.15)",
                      boxShadow: activeChassisId === "chassis-triangulate" ? "0 0 25px rgba(16, 185, 129, 0.4)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400">
                      <Search size={14} />
                      <span>WIRES</span>
                    </div>
                    {p < 0.6 && (
                      <span className="text-[10px] font-mono text-ink-3 mt-0.5 whitespace-nowrap">
                        Reuters & AP
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. BOTTOM CHASSIS (Bayesian Keel) */}
                <div
                  onClick={() => setActiveChassisId("chassis-synthesis")}
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 z-20 cursor-pointer transition-all duration-300 group ${
                    activeChassisId === "chassis-synthesis" ? "scale-105" : ""
                  }`}
                  style={{
                    transform: `translate(-50%, ${(1 - p) * 95}px)`,
                  }}
                >
                  <div
                    className="relative px-4 py-2.5 rounded-b-2xl rounded-t-md border shadow-lg flex flex-col items-center bg-[#0d0f14]"
                    style={{
                      borderColor: activeChassisId === "chassis-synthesis" ? "#f59e0b" : "rgba(255,255,255,0.15)",
                      boxShadow: activeChassisId === "chassis-synthesis" ? "0 0 25px rgba(245, 158, 11, 0.4)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
                      <Shield size={14} />
                      <span>SYNTHESIS KEEL</span>
                    </div>
                    {p < 0.6 && (
                      <span className="text-[10px] font-mono text-ink-3 mt-0.5">
                        Bayesian & SHA-256
                      </span>
                    )}
                  </div>
                </div>

                {/* CENTER PIECE: THE VERITAS SHIELD LOGO */}
                <div
                  className="relative z-10 flex items-center justify-center transition-all duration-500"
                  style={{
                    transform: `scale(${0.65 + p * 0.45}) rotate(${(1 - p) * 180}deg)`,
                    opacity: 0.35 + p * 0.65,
                  }}
                >
                  {/* Glowing Core Halo behind shield */}
                  <div
                    className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none"
                    style={{
                      opacity: p >= 0.7 ? 0.8 : 0.2,
                      background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(56, 189, 248, 0.25) 50%, transparent 80%)",
                    }}
                  />

                  {/* Veritas Shield Mark Logo */}
                  <Image
                    src="/veritas-mark.png"
                    alt="Veritas Shield Mark"
                    width={180}
                    height={180}
                    priority
                    className="relative z-10 object-contain drop-shadow-[0_4px_24px_rgba(255,255,255,0.25)] select-none"
                  />

                  {/* Central Aperture Iris Ring */}
                  <div
                    className="absolute size-14 rounded-full border-2 border-white/60 pointer-events-none"
                    style={{
                      transform: `rotate(${p * 360}deg) scale(${0.7 + p * 0.3})`,
                      boxShadow: p >= 0.8 ? "0 0 20px #38bdf8" : "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Status Ticker */}
            <div className="w-full flex items-center justify-between pt-4 mt-4 border-t border-line/70 text-xs text-ink-3 font-mono">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: isFullyAssembled ? "#22c55e" : "#38bdf8" }}
                />
                <span>
                  {isFullyAssembled
                    ? "VERITAS SHIELD FULLY LOCKED — ALL SUBSYSTEMS INTEGRATED"
                    : "SCROLL DOWN OR DRAG SCRUBBER TO INTERLOCK COMPONENTS INTO VERITAS LOGO"}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-ink-2">
                <Lock size={13} className={isFullyAssembled ? "text-real" : "text-ink-3"} />
                <span>{isFullyAssembled ? "CRYPTOGRAPHIC SEAL ENGAGED" : "UNLOCKED ASSEMBLY"}</span>
              </div>
            </div>
          </div>

          {/* Right: Chassis Blueprint Dossier & Telemetry Inspector */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Quick Chassis Selector Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {CHASSIS_MODULES.map((chassis) => {
                const isSelected = activeChassisId === chassis.id;
                return (
                  <button
                    key={chassis.id}
                    onClick={() => setActiveChassisId(chassis.id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-control border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-accent bg-elev shadow-sm"
                        : "border-line bg-elev/40 hover:bg-elev text-ink-3 hover:text-ink"
                    }`}
                  >
                    <span className="text-[10px] font-mono tracking-widest text-ink-3">
                      {chassis.quadrant.toUpperCase()}
                    </span>
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{ color: isSelected ? chassis.accentColor : undefined }}
                    >
                      {chassis.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Chassis Dossier Card */}
            <div
              className="rounded-2xl border border-line bg-elev/70 p-6 space-y-6 backdrop-blur-md relative overflow-hidden"
              style={{
                boxShadow: `0 8px 30px -10px ${activeChassis.glowColor}`,
              }}
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-mono font-medium px-2.5 py-1 rounded border"
                    style={{
                      color: activeChassis.accentColor,
                      backgroundColor: "rgba(10,12,18,0.8)",
                      borderColor: activeChassis.glowColor,
                    }}
                  >
                    {activeChassis.mechanicalTag}
                  </span>
                  <span className="text-xs font-mono text-ink-3 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-real" />
                    Latency: {activeChassis.latencyMs}ms p95
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  {activeChassis.name}
                </h3>
                <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                  {activeChassis.purpose}
                </p>
              </div>

              {/* Repo Service Path & Data Contracts */}
              <div className="space-y-3 rounded-xl border border-line bg-black/60 p-4 font-mono text-xs">
                <div className="flex items-center gap-2 text-ink-3 pb-2 border-b border-line">
                  <Terminal size={14} className="text-accent" />
                  <span>ACTIVE REPO SERVICE IMPLEMENTATION:</span>
                </div>
                <div className="text-ink-2 flex items-center justify-between">
                  <code className="text-accent">{activeChassis.codePath}</code>
                  <span className="text-[10px] text-ink-3">PYTHON 3.12</span>
                </div>

                <div className="pt-2 border-t border-line/60 space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-ink-3">INPUT CONTRACT: </span>
                    <span className="text-ink-2">{activeChassis.inputContract}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">OUTPUT CONTRACT: </span>
                    <span className="text-ink-2">{activeChassis.outputContract}</span>
                  </div>
                </div>
              </div>

              {/* Submodules Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono tracking-wider text-ink-3 uppercase flex items-center gap-2">
                  <Cpu size={14} className="text-accent" />
                  Mechanical Submodules
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {activeChassis.submodules.map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-control bg-elev/60 border border-line/80 hover:border-line-strong transition-colors"
                    >
                      <CheckCircle2 size={16} className="text-real shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-white">{sub.name}</div>
                        <div className="text-xs text-ink-3 mt-0.5">{sub.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specifications List */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono tracking-wider text-ink-3 uppercase flex items-center gap-2">
                  <Database size={14} className="text-accent" />
                  Technical Specifications
                </h4>
                <ul className="space-y-1.5 text-xs text-ink-2 font-mono">
                  {activeChassis.specifications.map((spec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent">›</span>
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/demo/workspace"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors"
                >
                  <span>Test in Workspace</span>
                  <ExternalLink size={14} />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control bg-elev border border-line hover:border-line-strong text-ink text-xs sm:text-sm transition-colors"
                >
                  <span>Whitepaper</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Architecture3D;
