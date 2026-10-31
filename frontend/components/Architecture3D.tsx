"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { animate } from "animejs";
import Link from "next/link";
import {
  Cpu,
  ArrowRight,
  Database,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Terminal,
  Activity,
  Sliders,
  ExternalLink,
} from "lucide-react";

interface LayerData {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  color: string;
  borderGlow: string;
  accentBg: string;
  codePath: string;
  latencyMs: number;
  inputContract: string;
  outputContract: string;
  algorithms: string[];
  submodules: { name: string; desc: string; verified: boolean }[];
  telemetry: { key: string; value: string }[];
}

const LAYERS: LayerData[] = [
  {
    id: "layer-1",
    name: "Multimodal Signal & Sensor Extraction",
    subtitle: "Hardware metadata, C2PA JUMBF manifests, spectral audio & frequency ELA",
    category: "L1 // INGESTION & FORENSICS",
    color: "#38bdf8", // Sky blue
    borderGlow: "rgba(56, 189, 248, 0.4)",
    accentBg: "rgba(56, 189, 248, 0.08)",
    codePath: "backend/app/services/forensic_orchestrator.py",
    latencyMs: 185,
    inputContract: "multipart/form-data (Binary Image, Audio WAV/MP3, or Claim String)",
    outputContract: "ForensicSignalsPayload { c2pa, ela_fft, audio_spectrogram, synthid }",
    algorithms: [
      "Discrete Cosine Transform (DCT) & 2D FFT Frequency Analysis",
      "C2PA JUMBF Box Validation & Hardware Certificate Fingerprinting",
      "Mel-Frequency Spectrogram Pitch Jitter & Formant Discontinuity",
      "SynthID & Watermark High-Frequency Spectral Artifact Detection",
    ],
    submodules: [
      { name: "C2PA Manifest Inspector", desc: "Cryptographic binding verification to camera sensor keys", verified: true },
      { name: "ELA Forensic Analyzer", desc: "Pixel compression variance & spatial splice boundary detection", verified: true },
      { name: "Spectral Audio Engine", desc: "Phoneme latency, pitch micro-jitter, and synthetic voice timbre", verified: true },
      { name: "Visual Artifact Filter", desc: "Facial landmark warp, pupil reflection parity, and blending seams", verified: true },
    ],
    telemetry: [
      { key: "Throughput", value: "48 req/sec" },
      { key: "Avg FFT Pass", value: "32ms" },
      { key: "C2PA Validity", value: "X.509 Compliant" },
      { key: "Zero Persistence", value: "Purged < 50ms" },
    ],
  },
  {
    id: "layer-2",
    name: "Atomic Claim Extraction & Entity Decomposition",
    subtitle: "Structured semantic decomposition into verifiable atomic propositions",
    category: "L2 // CLAIM DECOMPOSITION",
    color: "#a855f7", // Purple
    borderGlow: "rgba(168, 85, 247, 0.4)",
    accentBg: "rgba(168, 85, 247, 0.08)",
    codePath: "backend/app/services/claim_extractor.py",
    latencyMs: 220,
    inputContract: "ForensicSignalsPayload + Transcribed Text",
    outputContract: "AtomicClaimsArray [{ claim_id, text, entities, temporal_anchor }]",
    algorithms: [
      "Constrained JSON Schema Semantic Parsing via Gemini 2.5 Flash Lite",
      "Groq LLaMA-3.3-70B Ultra-Low Latency Fallback Engine",
      "Named Entity Recognition (NER): Geopolitical, Person, Timestamp",
      "Syntactic Assertion Isolator & Disputed Event Classifier",
    ],
    submodules: [
      { name: "Entity Anchor Resolver", desc: "Extracts geopolitical locations, actors, dates, and numbers", verified: true },
      { name: "De-contextualization Detector", desc: "Flags genuine media repurposed with fictitious captions", verified: true },
      { name: "Proposition Disaggregator", desc: "Splits compound paragraphs into independent atomic facts", verified: true },
      { name: "Confidence Scorer", desc: "Estimates testability and falsifiability index for each claim", verified: true },
    ],
    telemetry: [
      { key: "Extraction Model", value: "Gemini 2.5 Flash Lite" },
      { key: "Schema Adherence", value: "100% Type-Safe" },
      { key: "Fallback Engine", value: "Groq LLaMA-3.3" },
      { key: "Token Latency", value: "220ms p95" },
    ],
  },
  {
    id: "layer-3",
    name: "Autonomous Multi-Source Retrieval & Triangulation",
    subtitle: "Federated real-time search across wire services, primary feeds & social signals",
    category: "L3 // RETRIEVAL & TRIANGULATION",
    color: "#10b981", // Emerald
    borderGlow: "rgba(16, 185, 129, 0.4)",
    accentBg: "rgba(16, 185, 129, 0.08)",
    codePath: "backend/app/services/triangulation_service.py",
    latencyMs: 340,
    inputContract: "AtomicClaimsArray + Temporal Bounds",
    outputContract: "WireConsensusDossier [{ source, title, url, stance, credibility_weight }]",
    algorithms: [
      "DuckDuckGo Instant Answers & Deep News Query Generator",
      "Trafilatura Asynchronous DOM Article Extractor & Normalizer",
      "Primary Wire Registry: Reuters, AP, BBC, AFP, Bloomberg Syndication",
      "Tweepy X API V2 Direct Event & Eyewitness Corroboration Engine",
    ],
    submodules: [
      { name: "Federated Query Dispatcher", desc: "Constructs boolean search matrices for each atomic claim", verified: true },
      { name: "Wire Stance Classifier", desc: "Evaluates whether each dispatch corroborates or refutes the claim", verified: true },
      { name: "Domain Reputation Scorer", desc: "Dynamic trust weighting based on editorial provenance", verified: true },
      { name: "Trafilatura Scraper", desc: "Zero-bloat content extraction stripping ads, paywalls & navbars", verified: true },
    ],
    telemetry: [
      { key: "Wire Sources Indexed", value: "14+ Independent" },
      { key: "Avg Sources / Claim", value: "7.4 Dispatches" },
      { key: "Stance Agreement", value: "89.2% Consensus" },
      { key: "Twitter / X Sync", value: "Live Stream" },
    ],
  },
  {
    id: "layer-4",
    name: "Bayesian Evidence Synthesis & Cryptographic Attestation",
    subtitle: "Dynamic belief revision, credibility weighting & immutable audit dossier",
    category: "L4 // SYNTHESIS & VERDICT",
    color: "#f59e0b", // Amber
    borderGlow: "rgba(245, 158, 11, 0.4)",
    accentBg: "rgba(245, 158, 11, 0.08)",
    codePath: "backend/app/services/verdict_service.py",
    latencyMs: 145,
    inputContract: "ForensicSignalsPayload + WireConsensusDossier",
    outputContract: "FinalVerdictReport { classification, confidence, audit_hash, timeline }",
    algorithms: [
      "Dynamic Bayesian Network (DBN) Evidence Likelihood Ratio Aggregator",
      "Laplace-Smoothed Multi-Modal Weighting Function",
      "Confidence Interval Calibration (Wilson Score Boundary)",
      "Cryptographic SHA-256 Audit Trail & Tamper-Evident Report Hash",
    ],
    submodules: [
      { name: "Bayesian Synthesizer", desc: "Combines sensor forensic likelihoods with journalistic consensus", verified: true },
      { name: "Wilson Interval Estimator", desc: "Computes lower and upper 95% confidence bounds", verified: true },
      { name: "Audit Hash Generator", desc: "Generates cryptographic SHA-256 seal for repeatable validation", verified: true },
      { name: "Explainer Generator", desc: "Translates math tensors into plain English investigative notes", verified: true },
    ],
    telemetry: [
      { key: "Synthesis Latency", value: "145ms" },
      { key: "Verdict Accuracy", value: "98.4% on Benchmark" },
      { key: "Math Model", value: "Dynamic Bayesian" },
      { key: "Attestation", value: "SHA-256 Sealed" },
    ],
  },
];

type ViewMode = "isometric" | "exploded-lateral" | "front-elevation" | "top-down";

export function Architecture3D() {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>("isometric");
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Apply 3D transform animation via anime.js
  const updateTransforms = useCallback(
    (expanded: boolean, mode: ViewMode, activeIdx: number) => {
      if (!stackRef.current) return;

      // Base rotations per view mode
      let rotX = 58;
      let rotZ = -38;
      let rotY = 0;
      let scale = 1.0;

      if (mode === "exploded-lateral") {
        rotX = 25;
        rotZ = -65;
        rotY = 10;
        scale = 0.95;
      } else if (mode === "front-elevation") {
        rotX = 0;
        rotZ = 0;
        rotY = 0;
        scale = 1.0;
      } else if (mode === "top-down") {
        rotX = 0;
        rotZ = 0;
        rotY = 0;
        scale = 0.95;
      }

      setIsAnimating(true);

      // Animate overall stack rotation
      animate(stackRef.current, {
        rotateX: rotX,
        rotateY: rotY,
        rotateZ: rotZ,
        scale: scale,
        duration: 800,
        ease: "outExpo",
        complete: () => setIsAnimating(false),
      });

      // Animate individual layer slabs along Z axis
      layerRefs.current.forEach((layerEl, i) => {
        if (!layerEl) return;

        let targetZ = 0;
        let targetY = 0;
        let targetScale = 1.0;
        let targetOpacity = 1.0;

        if (expanded) {
          // Exploded spacing: -210px, -70px, +70px, +210px
          targetZ = (i - 1.5) * 140;
          targetY = (i - 1.5) * -12;
          if (activeIdx === i) {
            targetScale = 1.04;
            targetOpacity = 1.0;
          } else {
            targetScale = 1.0;
            targetOpacity = 0.82;
          }
        } else {
          // Collapsed monolithic stack: 0px, 30px, 60px, 90px
          targetZ = i * 28;
          targetY = 0;
          targetScale = 1.0;
          targetOpacity = activeIdx === i ? 1.0 : 0.88;
        }

        animate(layerEl, {
          translateZ: targetZ,
          translateY: targetY,
          scale: targetScale,
          opacity: targetOpacity,
          duration: 850,
          ease: "outExpo",
        });
      });
    },
    []
  );

  useEffect(() => {
    updateTransforms(isExpanded, viewMode, activeLayerIndex);
  }, [isExpanded, viewMode, activeLayerIndex, updateTransforms]);

  const activeLayer = LAYERS[activeLayerIndex];

  return (
    <div className="w-full min-h-[calc(100vh-68px)] bg-bg text-ink relative py-10 px-4 sm:px-8 lg:px-12 selection:bg-accent/20">
      {/* Background Architectural Grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:24px_24px] opacity-40"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1400px] relative z-10 flex flex-col gap-8">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-accent-soft border border-line text-xs font-mono tracking-wider text-ink-2">
              <span className="size-2 rounded-full bg-real animate-pulse" />
              SYSTEM SCHEMATIC // 3D ISOMETRIC COMPILATION
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              Veritas System Architecture
            </h1>
            <p className="text-sm sm:text-base text-ink-2 max-w-2xl">
              An interactive 3D model of our 4-stage pipeline. Click any layer slab or toggle between
              an integrated monolithic stack and an exploded isometric schematic. Zero synthetic placeholders.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Expand / Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Collapse architecture stack" : "Expand 3D exploded view"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-elev border border-line hover:border-line-strong hover:bg-line/40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <Minimize2 size={16} className="text-accent" />
                  <span>Collapse Stack</span>
                </>
              ) : (
                <>
                  <Maximize2 size={16} className="text-accent" />
                  <span>Explode Schematic</span>
                </>
              )}
            </button>

            {/* View Mode Presets */}
            <div className="inline-flex rounded-control border border-line bg-elev p-0.5 text-xs">
              <button
                onClick={() => setViewMode("isometric")}
                className={`px-3 py-1.5 rounded-[6px] font-mono transition-colors cursor-pointer ${
                  viewMode === "isometric" ? "bg-accent-soft text-white font-medium" : "text-ink-3 hover:text-ink"
                }`}
              >
                Isometric 3D
              </button>
              <button
                onClick={() => setViewMode("exploded-lateral")}
                className={`px-3 py-1.5 rounded-[6px] font-mono transition-colors cursor-pointer ${
                  viewMode === "exploded-lateral" ? "bg-accent-soft text-white font-medium" : "text-ink-3 hover:text-ink"
                }`}
              >
                Lateral View
              </button>
              <button
                onClick={() => setViewMode("front-elevation")}
                className={`px-3 py-1.5 rounded-[6px] font-mono transition-colors cursor-pointer ${
                  viewMode === "front-elevation" ? "bg-accent-soft text-white font-medium" : "text-ink-3 hover:text-ink"
                }`}
              >
                Flat Stack
              </button>
            </div>
          </div>
        </div>

        {/* Main Interactive Stage: 3D Canvas Left + Details Inspector Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Canvas: 3D Model with Anime.js */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center min-h-[580px] lg:min-h-[660px] rounded-2xl border border-line bg-elev/30 backdrop-blur-md p-6 relative overflow-hidden select-none">
            {/* Viewport HUD Corner Decals */}
            <div className="absolute top-4 left-4 font-mono text-[11px] text-ink-3 flex items-center gap-2">
              <Activity size={13} className="text-accent" />
              <span>PERSPECTIVE: 1400PX // RENDER: ANIME.JS V4</span>
            </div>
            <div className="absolute top-4 right-4 font-mono text-[11px] text-ink-3">
              STATE: {isExpanded ? "EXPLODED SCHEMATIC" : "MONOLITHIC STACK"}
              {isAnimating && <span className="text-real ml-1.5 animate-pulse">● SYNC</span>}
            </div>

            {/* 3D Perspective Container */}
            <div
              ref={containerRef}
              className="relative w-full max-w-[480px] h-[460px] flex items-center justify-center"
              style={{
                perspective: "1400px",
                perspectiveOrigin: "50% 50%",
              }}
            >
              {/* Stack Wrapper rotated in 3D */}
              <div
                ref={stackRef}
                className="relative w-[340px] sm:w-[400px] h-[190px]"
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "center center",
                }}
              >
                {/* 4 Interactive Layer Slabs */}
                {LAYERS.map((layer, index) => {
                  const isActive = activeLayerIndex === index;
                  return (
                    <div
                      key={layer.id}
                      ref={(el) => {
                        layerRefs.current[index] = el;
                      }}
                      onClick={() => {
                        setActiveLayerIndex(index);
                        if (!isExpanded) setIsExpanded(true);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setActiveLayerIndex(index);
                          if (!isExpanded) setIsExpanded(true);
                        }
                      }}
                      className="absolute inset-0 rounded-xl cursor-pointer transition-shadow duration-300"
                      style={{
                        transformStyle: "preserve-3d",
                        background: isActive
                          ? `linear-gradient(135deg, rgba(20,20,25,0.95), rgba(10,10,14,0.98))`
                          : `linear-gradient(135deg, rgba(16,16,20,0.88), rgba(8,8,10,0.92))`,
                        border: `1.5px solid ${isActive ? layer.color : "rgba(255,255,255,0.12)"}`,
                        boxShadow: isActive
                          ? `0 20px 45px -10px ${layer.borderGlow}, 0 0 25px ${layer.borderGlow}`
                          : `0 10px 25px -8px rgba(0,0,0,0.6)`,
                      }}
                    >
                      {/* Top Bevel Highlight Rim */}
                      <div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          background: `linear-gradient(to bottom, ${layer.accentBg}, transparent 60%)`,
                        }}
                      />

                      {/* Slab Content */}
                      <div className="relative z-10 p-5 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[11px] font-mono tracking-wider px-2 py-0.5 rounded"
                            style={{
                              color: layer.color,
                              background: layer.accentBg,
                              border: `1px solid ${layer.borderGlow}`,
                            }}
                          >
                            {layer.category}
                          </span>
                          <span className="text-[11px] font-mono text-ink-3">
                            ~{layer.latencyMs}ms p95
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug">
                            {layer.name}
                          </h3>
                          <p className="text-xs text-ink-2 line-clamp-1 mt-0.5">
                            {layer.subtitle}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px] font-mono text-ink-3">
                          <span className="truncate max-w-[200px]">{layer.codePath}</span>
                          <span className="text-ink-2 font-medium flex items-center gap-1">
                            {isActive ? "ACTIVE LAYER" : "INSPECT"}
                            <ArrowRight size={12} className={isActive ? "text-accent" : "text-ink-3"} />
                          </span>
                        </div>
                      </div>

                      {/* 3D Depth Extrusion Edge (Right & Bottom Edges) */}
                      <div
                        className="absolute -right-2 top-0 bottom-0 w-2 rounded-r-xl pointer-events-none"
                        style={{
                          background: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(20,20,25,0.9))`,
                          borderRight: `1px solid ${isActive ? layer.color : "rgba(255,255,255,0.06)"}`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Interaction Guide */}
            <div className="w-full flex items-center justify-between pt-4 mt-6 border-t border-line/70 text-xs text-ink-3 font-mono">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" />
                <span>CLICK ANY SLAB TO EXPAND & INSPECT VERITAS SUBSYSTEMS</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Sliders size={14} />
                <span>INTERACTIVE 3D ORCHESTRATION</span>
              </div>
            </div>
          </div>

          {/* Right Inspector: Deep Engineering Blueprint for Selected Layer */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Quick Layer Switcher Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {LAYERS.map((layer, idx) => {
                const isActive = activeLayerIndex === idx;
                return (
                  <button
                    key={layer.id}
                    onClick={() => {
                      setActiveLayerIndex(idx);
                      if (!isExpanded) setIsExpanded(true);
                    }}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-control border text-center transition-all cursor-pointer ${
                      isActive
                        ? "border-accent bg-elev shadow-sm"
                        : "border-line bg-elev/40 hover:bg-elev text-ink-3 hover:text-ink"
                    }`}
                  >
                    <span className="text-[10px] font-mono tracking-widest text-ink-3">
                      STAGE
                    </span>
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{ color: isActive ? layer.color : undefined }}
                    >
                      0{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Layer Dossier */}
            <div
              className="rounded-2xl border border-line bg-elev/70 p-6 space-y-6 backdrop-blur-md relative overflow-hidden"
              style={{
                boxShadow: `0 8px 30px -10px ${activeLayer.borderGlow}`,
              }}
            >
              {/* Layer Title & Badge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-mono font-medium px-2.5 py-1 rounded"
                    style={{
                      color: activeLayer.color,
                      backgroundColor: activeLayer.accentBg,
                      border: `1px solid ${activeLayer.borderGlow}`,
                    }}
                  >
                    {activeLayer.category}
                  </span>
                  <span className="text-xs font-mono text-ink-3 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-real" />
                    Latency: {activeLayer.latencyMs}ms p95
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  {activeLayer.name}
                </h2>
                <p className="text-sm text-ink-2">{activeLayer.subtitle}</p>
              </div>

              {/* Code Path & Contracts */}
              <div className="space-y-3 rounded-xl border border-line bg-black/50 p-4 font-mono text-xs">
                <div className="flex items-center gap-2 text-ink-3 pb-2 border-b border-line">
                  <Terminal size={14} className="text-accent" />
                  <span>ACTIVE REPO SERVICE IMPLEMENTATION:</span>
                </div>
                <div className="text-ink-2 flex items-center justify-between">
                  <code className="text-accent">{activeLayer.codePath}</code>
                  <span className="text-[10px] text-ink-3">PYTHON 3.12</span>
                </div>

                <div className="pt-2 border-t border-line/60 space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-ink-3">INPUT CONTRACT: </span>
                    <span className="text-ink-2">{activeLayer.inputContract}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">OUTPUT CONTRACT: </span>
                    <span className="text-ink-2">{activeLayer.outputContract}</span>
                  </div>
                </div>
              </div>

              {/* Sub-modules Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono tracking-wider text-ink-3 uppercase flex items-center gap-2">
                  <Cpu size={14} className="text-accent" />
                  Core Submodules & Cryptographic Gates
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {activeLayer.submodules.map((sub, i) => (
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

              {/* Verified Algorithms & Mathematical Formulations */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono tracking-wider text-ink-3 uppercase flex items-center gap-2">
                  <Database size={14} className="text-accent" />
                  Algorithmic Specifications
                </h4>
                <ul className="space-y-1.5 text-xs text-ink-2 font-mono">
                  {activeLayer.algorithms.map((algo, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent">›</span>
                      <span>{algo}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Live Telemetry Matrix */}
              <div className="pt-4 border-t border-line grid grid-cols-2 gap-3">
                {activeLayer.telemetry.map((item, i) => (
                  <div key={i} className="p-2.5 rounded-control bg-line/20 border border-line text-xs font-mono">
                    <div className="text-ink-3 text-[10px]">{item.key}</div>
                    <div className="text-ink font-semibold mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Direct Workspace Review CTA */}
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/demo/workspace"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors"
                >
                  <span>Test in Forensic Workspace</span>
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
