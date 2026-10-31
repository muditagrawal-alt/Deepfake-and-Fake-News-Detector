"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Shield,
  Activity,
  Terminal,
  ChevronRight,
  Zap,
} from "lucide-react";

export type PayloadPreset = "deepfake_image" | "satire_news" | "verified_dispatch";

export interface PipelineNode {
  id: string;
  stageId: number;
  name: string;
  category: string;
  role: string;
  codePath: string;
  accentColor: string;
  latencyMs: number;
  inputContract: string;
  outputContract: string;
  description: string;
  specs: string[];
  testPayloads: Record<
    PayloadPreset,
    {
      status: "verified" | "flagged" | "passed" | "contradicted";
      readout: string;
      telemetry: string;
    }
  >;
}

export const PIPELINE_STAGES = [
  { id: 0, title: "Multimodal Ingestion", subtitle: "Extract raw container, audio & frame signals", color: "#38bdf8" },
  { id: 1, title: "Sensor Forensics", subtitle: "Audit C2PA certificates, FFT spectra & SynthID", color: "#a855f7" },
  { id: 2, title: "Claim Decomposition", subtitle: "Extract atomic verifiable propositions via LLM", color: "#3b82f6" },
  { id: 3, title: "Wire Triangulation", subtitle: "Cross-check 14 independent wire registries", color: "#f59e0b" },
  { id: 4, title: "Bayesian Synthesis", subtitle: "Calibrate posterior odds & issue cryptographic seal", color: "#10b981" },
];

export const PIPELINE_NODES: PipelineNode[] = [
  // Stage 0: Multimodal Ingestion
  {
    id: "node-trafilatura",
    stageId: 0,
    name: "Article Content Extractor",
    category: "Ingestion Bus",
    role: "DOM Sanitization & Text Extraction",
    codePath: "backend/detector/forensics/article.py",
    accentColor: "#38bdf8",
    latencyMs: 24,
    inputContract: "{ url: string, raw_html?: string }",
    outputContract: "{ title: string, text: string, domain: string, author?: string }",
    description:
      "Strips script payloads, banner ads, and boilerplate tracking elements to construct clean markdown text for NLP extraction.",
    specs: ["Trafilatura v2.3.0 Engine", "Sub-50ms DOM Tree Walker", "Strict Enclave Zero-Retention Buffer"],
    testPayloads: {
      deepfake_image: {
        status: "passed",
        readout: "Static binary payload detected — bypassing article DOM parser.",
        telemetry: "0 bytes DOM extracted (image mode active)",
      },
      satire_news: {
        status: "passed",
        readout: "Article body successfully parsed from theonion.com. 420 words extracted.",
        telemetry: "Extracted 2,410 chars; author: Editorial Staff",
      },
      verified_dispatch: {
        status: "passed",
        readout: "Wire article verified from apnews.com dispatch stream. Clean body delivered.",
        telemetry: "Extracted 3,890 chars; accredited AP wire stamp",
      },
    },
  },
  {
    id: "node-frame-decoder",
    stageId: 0,
    name: "Keyframe & EXIF Decoder",
    category: "Ingestion Bus",
    role: "Hardware Metadata & I-Frame Extraction",
    codePath: "backend/detector/forensics/frames.py",
    accentColor: "#38bdf8",
    latencyMs: 38,
    inputContract: "{ binary_stream: Buffer, mime: string }",
    outputContract: "{ exif: Record<string, any>, frames: ImageBuffer[], fps: number }",
    description:
      "Extracts unaltered raw EXIF camera metadata, lens profiles, exposure tags, and samples I-frames at calibrated millisecond intervals.",
    specs: ["Pillow + PyAV Hardware Acceleration", "Lossless RAM Frame Slicing", "EXIF/TIFF Tag Extraction"],
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Missing camera hardware serial and lens EXIF tags. Software signature: 'Gemini Generative Engine'.",
        telemetry: "EXIF missing camera serial number; 0x00 header mismatch",
      },
      satire_news: {
        status: "passed",
        readout: "Headline banner image parsed; stock photo tags verified intact.",
        telemetry: "Metadata format valid; sRGB IEC61966-2.1 profile",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Canon EOS R5 camera serial #0429188 validated with signed Sony/Canon hardware EXIF.",
        telemetry: "Signed EXIF timestamp matches AP newsroom wire dispatch",
      },
    },
  },

  // Stage 1: Sensor Forensics
  {
    id: "node-c2pa",
    stageId: 1,
    name: "C2PA Provenance Auditor",
    category: "Forensics Engine",
    role: "Hardware Signature & Manifest Verification",
    codePath: "backend/detector/forensics/provenance.py",
    accentColor: "#a855f7",
    latencyMs: 42,
    inputContract: "{ raw_buffer: Buffer }",
    outputContract: "{ jumbf_valid: boolean, cert_chain: string[], signed_by?: string }",
    description:
      "Inspects the binary JUMBF box for Coalition for Content Provenance and Authenticity (C2PA) cryptographic manifests and root CA certs.",
    specs: ["C2PA Rust-backed Core Parser", "X.509 Cryptographic Certificate Chain", "Hardware Signature Matcher"],
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "No authentic C2PA hardware manifest detected in binary header.",
        telemetry: "JUMBF box absent; unauthenticated generation origin",
      },
      satire_news: {
        status: "passed",
        readout: "Editorial CMS manifest verified without camera sensor binding.",
        telemetry: "Web publishing cert present; no camera binding",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Cryptographic C2PA root manifest confirmed from AP photojournalism pool.",
        telemetry: "X.509 cert chain verified to accredited news agency root CA",
      },
    },
  },
  {
    id: "node-onnx-fft",
    stageId: 1,
    name: "Neural FFT & Stego Hunter",
    category: "Forensics Engine",
    role: "2D Spectral Frequency Anomaly Detector",
    codePath: "backend/detector/forensics/onnx_detector.py",
    accentColor: "#a855f7",
    latencyMs: 76,
    inputContract: "{ image_tensor: Float32Array[1, 3, 512, 512] }",
    outputContract: "{ synth_prob: number, spectral_residual: number, watermark_detected: boolean }",
    description:
      "Performs 2D Fast Fourier Transform (FFT) and discrete cosine transform (DCT) to expose diffusion model high-frequency checkerboard artifacts and SynthID watermarks.",
    specs: ["Local ONNX Runtime 1.19 CPU/GPU", "2D FFT Radial Spatial Residuals", "SynthID Steganographic Decoder"],
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "High-frequency checkerboard grid anomaly detected (91.4% synthetic residual). SynthID watermark match.",
        telemetry: "Spectral anomaly p=0.914; SynthID digital watermark active",
      },
      satire_news: {
        status: "passed",
        readout: "Text modality; neural image classifier bypassed.",
        telemetry: "Pass-through execution (0ms neural inference)",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Natural CMOS sensor Poisson noise distribution verified across all color channels. 0.04% residual.",
        telemetry: "Noise variance 0.012; authentic physical sensor profile",
      },
    },
  },

  // Stage 2: Claim Decomposition
  {
    id: "node-gemini-claims",
    stageId: 2,
    name: "Gemini 2.5 Flash Lite",
    category: "Decomposition Stage",
    role: "Atomic Proposition & Query Extractor",
    codePath: "backend/detector/providers/gemini.py",
    accentColor: "#3b82f6",
    latencyMs: 220,
    inputContract: "{ modality: string, content: string | ImagePart, forensic_facts: Record<string, any> }",
    outputContract: "{ claims: string[], search_queries: string[], genre: string }",
    description:
      "Decomposes complex media claims into atomic, testable propositions and formulates targeted search queries in strict JSON mode.",
    specs: ["Structured Output Mode (Strict Schema)", "Sub-300ms p95 First Token", "Zero-Shot Claim Isolation"],
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Extracted 3 visual claims: 'Chinese warship struck by missile', 'Fighter jets conducting attack', 'Active maritime battle'.",
        telemetry: "Formulated 4 search queries against naval registries",
      },
      satire_news: {
        status: "contradicted",
        readout: "Extracted satirical headline claim: 'Nation somehow more divided than ever before after fictional poll'.",
        telemetry: "Isolated key satirical hyperbole propositions",
      },
      verified_dispatch: {
        status: "passed",
        readout: "Extracted official summit statement: 'Trade delegation signs bilateral tariff reduction accord'.",
        telemetry: "Extracted 3 factual claims with named delegates",
      },
    },
  },

  // Stage 3: Wire Triangulation
  {
    id: "node-retrieval",
    stageId: 3,
    name: "Autonomous Wire Scraper",
    category: "Triangulation Engine",
    role: "Multi-Source Consensus Verification",
    codePath: "backend/detector/engine/retrieval.py",
    accentColor: "#f59e0b",
    latencyMs: 380,
    inputContract: "{ queries: string[], limit: number }",
    outputContract: "{ hits: WireHit[], provider: string, agreement_ratio: number }",
    description:
      "Queries 14 independent wire registries (Reuters, Associated Press, BBC, AFP, Bloomberg) to triangulate independent corroboration.",
    specs: ["DuckDuckGo + Google Grounding Fallback", "14 Wire Registries Scraped", "Adversarial Disinformation Filter"],
    testPayloads: {
      deepfake_image: {
        status: "contradicted",
        readout: "0 of 14 accredited wire registries report any naval engagement. Contradicted by official maritime dispatches.",
        telemetry: "0/14 corroborations; no naval incident logged globally",
      },
      satire_news: {
        status: "contradicted",
        readout: "Identified domain theonion.com as registered satirical comedy publication; zero primary news hits.",
        telemetry: "Wire corpus confirms satirical origin",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Corroborated across 12 independent news wires including Reuters, AP News, and BBC World Service.",
        telemetry: "12/12 wire agreement; matching press pool dispatch",
      },
    },
  },

  // Stage 4: Bayesian Synthesis
  {
    id: "node-bayesian",
    stageId: 4,
    name: "Bayesian Evidence Synthesizer",
    category: "Synthesis Engine",
    role: "Empirical Likelihood & Confidence Calibration",
    codePath: "backend/detector/engine/pipeline.py",
    accentColor: "#10b981",
    latencyMs: 18,
    inputContract: "{ claims: Claim[], signals: Signal[], forensic_facts: Record<string, any> }",
    outputContract: "{ verdict: string, confidence: number, ci_95: [number, number], ledger_hash: string }",
    description:
      "Combines neural sensor probabilities, C2PA manifest trust, and wire consensus through calibrated Bayesian likelihood calculation.",
    specs: ["Wilson-Score Confidence Interval (95% CI)", "Calibrated Posterior Odds Ratio", "SHA-256 Ledger Token Seal"],
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Verdict: LIKELY_FAKE (94.2% confidence). 95% CI: [91.8%, 96.5%]. High sensor residual + 0 wire corroboration.",
        telemetry: "Ledger Token #VRT-2026-8812; Cryptographic Seal Engaged",
      },
      satire_news: {
        status: "flagged",
        readout: "Verdict: LIKELY_FAKE (96.0% confidence). Satirical publication identified with contradicted assertions.",
        telemetry: "Ledger Token #VRT-2026-4409; Satirical Flag Affixed",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Verdict: LIKELY_REAL (98.4% confidence). 95% CI: [96.9%, 99.4%]. Valid C2PA root + 12 wire corroborations.",
        telemetry: "Ledger Token #VRT-2026-9914; Genuine Cryptographic Seal",
      },
    },
  },
];

export function Architecture3D() {
  const [activePreset, setActivePreset] = useState<PayloadPreset>("deepfake_image");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-onnx-fft");
  const [packetProgress, setPacketProgress] = useState<number>(0);

  // Simulation timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = Math.max(30, 40 / simSpeed);
    const interval = setInterval(() => {
      setPacketProgress((prev) => {
        if (prev >= 100) {
          setCurrentStage((s) => (s + 1) % PIPELINE_STAGES.length);
          return 0;
        }
        return prev + 2;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  const selectedNode = PIPELINE_NODES.find((n) => n.id === selectedNodeId) || PIPELINE_NODES[0];
  const payloadData = selectedNode.testPayloads[activePreset];

  // Stage Latencies calculation
  const stageLatencies = [
    PIPELINE_NODES.filter((n) => n.stageId === 0).reduce((acc, n) => acc + n.latencyMs, 0),
    PIPELINE_NODES.filter((n) => n.stageId === 1).reduce((acc, n) => acc + n.latencyMs, 0),
    PIPELINE_NODES.filter((n) => n.stageId === 2).reduce((acc, n) => acc + n.latencyMs, 0),
    PIPELINE_NODES.filter((n) => n.stageId === 3).reduce((acc, n) => acc + n.latencyMs, 0),
    PIPELINE_NODES.filter((n) => n.stageId === 4).reduce((acc, n) => acc + n.latencyMs, 0),
  ];
  const totalLatency = stageLatencies.reduce((a, b) => a + b, 0);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStage((s) => (s + 1) % PIPELINE_STAGES.length);
    setPacketProgress(0);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStage(0);
    setPacketProgress(0);
  }, []);

  return (
    <div
      id="architecture"
      className="w-full bg-bg text-ink relative pt-20 pb-16 px-4 sm:px-8 lg:px-12 selection:bg-accent/20 scroll-mt-24"
    >
      {/* Background blueprint coordinate grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-line pb-8">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge bg-elev border border-line text-xs font-mono text-accent">
              <Activity size={13} className="text-real" />
              <span>LIVE FORENSIC PIPELINE ARCHITECTURE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Dynamic Live Pipeline Architecture
            </h2>
            <p className="text-sm sm:text-base text-ink-2 leading-relaxed">
              Real-time interactive topology demonstrating how Veritas decomposes raw multimodal media, verifies C2PA
              hardware provenance, extracts atomic propositions, triangulates wire consensus, and performs calibrated
              Bayesian evidence synthesis.
            </p>
          </div>

          {/* Test Payload Preset Picker */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs font-mono text-ink-3 uppercase tracking-wider">Test Payload:</span>
            <div className="inline-flex p-1 rounded-control bg-elev border border-line">
              {[
                { id: "deepfake_image", label: "Synthetic AI Image" },
                { id: "satire_news", label: "Satirical Onion Wire" },
                { id: "verified_dispatch", label: "AP Wire Dispatch" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setActivePreset(preset.id as PayloadPreset);
                    handleReset();
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                    activePreset === preset.id
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-ink-2 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Simulation Control Bar & Real-Time Telemetry Bar */}
        <div className="rounded-2xl border border-line bg-elev/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-panel">
          {/* Controls: Play/Pause, Step, Reset, Speed */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? "Pause Simulation" : "Run Live Simulation"}</span>
            </button>

            <button
              onClick={handleStepForward}
              title="Advance one stage"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control bg-elev border border-line hover:border-line-strong text-xs font-medium text-ink transition-colors cursor-pointer"
            >
              <FastForward size={14} />
              <span className="hidden sm:inline">Step Stage</span>
            </button>

            <button
              onClick={handleReset}
              title="Reset simulation"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control bg-elev border border-line hover:border-line-strong text-xs font-medium text-ink transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-2 border-l border-line pl-3">
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    simSpeed === spd
                      ? "bg-accent/20 text-accent font-semibold border border-accent/40"
                      : "text-ink-3 hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Telemetry Metrics Readout */}
          <div className="flex items-center gap-5 text-xs font-mono text-ink-2">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-real animate-pulse" />
              <span>
                ACTIVE STAGE: <strong className="text-white">{PIPELINE_STAGES[currentStage].title}</strong>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-ink-3">
              <Cpu size={13} className="text-accent" />
              <span>
                TOTAL LATENCY: <strong className="text-white font-mono">{totalLatency}ms</strong>
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-ink-3">
              <Shield size={13} className="text-real" />
              <span>ENCLAVE: ZERO RETENTION</span>
            </div>
          </div>
        </div>

        {/* Dynamic Live Pipeline Chart Canvas & Nodes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: The Dynamic Interactive Flow Topology */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-line bg-elev/50 p-6 relative overflow-hidden">
              {/* Stage Progress Tracker Header */}
              <div className="grid grid-cols-5 gap-2 pb-6 border-b border-line/60">
                {PIPELINE_STAGES.map((stg, i) => {
                  const isActive = currentStage === i;
                  const isPassed = currentStage > i;
                  return (
                    <button
                      key={stg.id}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStage(i);
                        setPacketProgress(0);
                      }}
                      className="flex flex-col text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className={`size-2 rounded-full transition-colors ${
                            isActive
                              ? "bg-accent shadow-[0_0_8px_#38bdf8]"
                              : isPassed
                              ? "bg-real"
                              : "bg-line-strong"
                          }`}
                        />
                        <span className="text-[10px] font-mono uppercase text-ink-3 group-hover:text-ink">
                          0{i + 1}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-medium truncate transition-colors ${
                          isActive ? "text-white font-semibold" : "text-ink-2 group-hover:text-white"
                        }`}
                      >
                        {stg.title}
                      </span>
                      {/* Active progress bar indicator */}
                      <div className="w-full h-1 bg-line/60 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full transition-all duration-100"
                          style={{
                            width: isActive ? `${packetProgress}%` : isPassed ? "100%" : "0%",
                            backgroundColor: stg.color,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Interactive Node Grid with SVG Circuit Bus */}
              <div className="py-8 relative">
                {/* SVG Circuit Bus Lines with Dynamic Pulsing Data Packets */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-0"
                  viewBox="0 0 800 480"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                >
                  {/* Circuit Wire Traces */}
                  <path
                    d="M 120 70 L 260 70 L 260 160 L 400 160"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 120 160 L 400 160"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="2"
                  />
                  <path
                    d="M 400 160 L 540 160 L 540 260 L 680 260"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 400 260 L 540 260"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="2"
                  />

                  {/* Active Glowing Packet traveling along the current active stage wire */}
                  {isPlaying && (
                    <circle
                      r="4"
                      fill={PIPELINE_STAGES[currentStage].color}
                      filter="drop-shadow(0 0 6px currentColor)"
                      cx={100 + currentStage * 140 + packetProgress * 1.3}
                      cy={currentStage % 2 === 0 ? 160 : 180}
                      className="transition-all duration-75"
                    />
                  )}
                </svg>

                {/* Pipeline Nodes Layout */}
                <div className="space-y-8 relative z-10">
                  {PIPELINE_STAGES.map((stg) => {
                    const stageNodes = PIPELINE_NODES.filter((n) => n.stageId === stg.id);
                    const isStageActive = currentStage === stg.id;

                    return (
                      <div
                        key={stg.id}
                        className={`p-4 rounded-xl border transition-all duration-300 ${
                          isStageActive
                            ? "bg-elev border-accent/60 shadow-[0_0_25px_-5px_rgba(56,189,248,0.15)]"
                            : "bg-elev/30 border-line/60 opacity-80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: isStageActive ? stg.color : "#64748b" }}
                            />
                            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                              {stg.title}
                            </h4>
                            <span className="text-[11px] font-mono text-ink-3">
                              ({stageLatencies[stg.id]}ms p95)
                            </span>
                          </div>

                          <span className="text-[11px] text-ink-3 hidden sm:inline">{stg.subtitle}</span>
                        </div>

                        {/* Nodes in this stage */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {stageNodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const res = node.testPayloads[activePreset];

                            return (
                              <button
                                key={node.id}
                                onClick={() => setSelectedNodeId(node.id)}
                                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative group ${
                                  isSelected
                                    ? "bg-elev border-white shadow-md"
                                    : "bg-elev/60 border-line hover:border-line-strong hover:bg-elev"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-line/60 text-ink-2">
                                    {node.latencyMs}ms
                                  </span>
                                  {/* Result status icon for this test preset */}
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${
                                      res.status === "verified"
                                        ? "text-real"
                                        : res.status === "flagged"
                                        ? "text-fake"
                                        : res.status === "contradicted"
                                        ? "text-warn"
                                        : "text-ink-3"
                                    }`}
                                  >
                                    {res.status === "verified" ? (
                                      <CheckCircle2 size={12} />
                                    ) : res.status === "flagged" ? (
                                      <AlertTriangle size={12} />
                                    ) : (
                                      <Zap size={12} />
                                    )}
                                    <span className="uppercase">{res.status}</span>
                                  </span>
                                </div>

                                <div className="font-semibold text-xs sm:text-sm text-white group-hover:text-accent transition-colors flex items-center justify-between">
                                  <span>{node.name}</span>
                                  <ChevronRight
                                    size={13}
                                    className={`transition-transform ${isSelected ? "text-accent translate-x-0.5" : "text-ink-3"}`}
                                  />
                                </div>

                                <p className="text-[11px] text-ink-2 mt-1 line-clamp-1">{node.role}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Oscilloscope: Real-Time Latency Breakdown Chart */}
              <div className="pt-6 mt-6 border-t border-line/70 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-ink-2 flex items-center gap-2">
                    <Activity size={14} className="text-real" />
                    <span>REAL-TIME PIPELINE LATENCY OSCILLOSCOPE</span>
                  </span>
                  <span className="text-white font-semibold">Total: {totalLatency}ms</span>
                </div>

                {/* Horizontal Multi-Stage Latency Distribution Bar */}
                <div className="w-full h-3 rounded-full bg-elev border border-line flex overflow-hidden">
                  {PIPELINE_STAGES.map((stg, i) => {
                    const widthPct = (stageLatencies[i] / totalLatency) * 100;
                    return (
                      <div
                        key={stg.id}
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: stg.color,
                        }}
                        title={`${stg.title}: ${stageLatencies[i]}ms (${Math.round(widthPct)}%)`}
                        className="h-full transition-all duration-300 relative group cursor-pointer"
                      />
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-ink-3">
                  {PIPELINE_STAGES.map((stg, i) => (
                    <div key={stg.id} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: stg.color }} />
                      <span>
                        {stg.title}: <strong className="text-ink">{stageLatencies[i]}ms</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Technical Inspector Dossier for Selected Node */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-elev/70 p-6 flex flex-col justify-between h-full shadow-panel space-y-6">
              {/* Header & Category */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-line/60 border border-line text-ink-2">
                    {selectedNode.category}
                  </span>
                  <span className="text-xs font-mono text-real flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-real" />
                    <span>{selectedNode.latencyMs}ms p95</span>
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight">{selectedNode.name}</h3>
                <p className="text-xs font-mono text-accent mt-0.5">{selectedNode.role}</p>
                <p className="text-xs text-ink-2 leading-relaxed mt-3">{selectedNode.description}</p>
              </div>

              {/* Active Repository Source Link */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-line text-xs font-mono space-y-1.5">
                <div className="text-ink-3 flex items-center gap-1.5 text-[11px]">
                  <Terminal size={12} className="text-accent" />
                  <span>ACTIVE REPO SERVICE IMPLEMENTATION</span>
                </div>
                <div className="text-real truncate">{selectedNode.codePath}</div>
              </div>

              {/* Live Payload Execution Telemetry for the active preset */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-ink-3 flex items-center gap-1.5">
                  <Zap size={13} className="text-warn" />
                  <span>LIVE EXECUTION TELEMETRY (SELECTED PRESET)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-elev border border-line space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ink-2">Status Outcome:</span>
                    <span
                      className={`font-semibold uppercase ${
                        payloadData.status === "verified"
                          ? "text-real"
                          : payloadData.status === "flagged"
                          ? "text-fake"
                          : payloadData.status === "contradicted"
                          ? "text-warn"
                          : "text-ink"
                      }`}
                    >
                      {payloadData.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed font-sans">{payloadData.readout}</p>
                  <div className="text-[11px] font-mono text-ink-3 pt-2 border-t border-line/60">
                    &gt; {payloadData.telemetry}
                  </div>
                </div>
              </div>

              {/* Input / Output Contracts */}
              <div className="space-y-2 text-xs font-mono">
                <div className="text-ink-3">DATA CONTRACT SCHEMAS</div>
                <div className="space-y-1.5">
                  <div className="p-2.5 rounded bg-black/30 border border-line/70">
                    <span className="text-ink-3 text-[10px] block mb-0.5">INPUT CONTRACT:</span>
                    <code className="text-ink text-[11px] break-all">{selectedNode.inputContract}</code>
                  </div>
                  <div className="p-2.5 rounded bg-black/30 border border-line/70">
                    <span className="text-ink-3 text-[10px] block mb-0.5">OUTPUT CONTRACT:</span>
                    <code className="text-accent text-[11px] break-all">{selectedNode.outputContract}</code>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="space-y-2 pt-2 border-t border-line/60">
                <div className="text-xs font-mono text-ink-3">TECHNICAL SPECIFICATIONS</div>
                <ul className="space-y-1 text-xs text-ink-2">
                  {selectedNode.specs.map((spec, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-accent" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Architecture3D;
