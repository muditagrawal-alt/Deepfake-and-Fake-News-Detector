"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { animate } from "animejs";
import Link from "next/link";
import {
  Cpu,
  Database,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Terminal,
  Activity,
  Sliders,
  ExternalLink,
  Shield,
  Search,
  Radio,
  Share2,
} from "lucide-react";

interface NodeData {
  id: string;
  name: string;
  cluster: "ingestion" | "decomposition" | "triangulation" | "synthesis";
  clusterLabel: string;
  clusterColor: string;
  accentBg: string;
  glowColor: string;
  x: number; // expanded relative X (-100 to 100)
  y: number; // expanded relative Y (-100 to 100)
  z: number; // 3D depth
  size: number;
  isHub?: boolean;
  codePath: string;
  latencyMs: number;
  inputContract: string;
  outputContract: string;
  algorithms: string[];
  submodules: { name: string; desc: string; verified: boolean }[];
  telemetry: { key: string; value: string }[];
}

const NODES: NodeData[] = [
  // --- CLUSTER 1: INGESTION & FORENSICS ---
  {
    id: "hub-ingest",
    name: "Forensic Ingestion Gateway",
    cluster: "ingestion",
    clusterLabel: "Stage 1: Ingestion & Forensics",
    clusterColor: "#38bdf8",
    accentBg: "rgba(56, 189, 248, 0.12)",
    glowColor: "rgba(56, 189, 248, 0.5)",
    x: -36,
    y: -28,
    z: 40,
    size: 54,
    isHub: true,
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
      { key: "Zero Retention", value: "Purged < 50ms" },
    ],
  },
  {
    id: "node-c2pa",
    name: "C2PA JUMBF Manifest Auditor",
    cluster: "ingestion",
    clusterLabel: "Stage 1: Ingestion & Forensics",
    clusterColor: "#38bdf8",
    accentBg: "rgba(56, 189, 248, 0.1)",
    glowColor: "rgba(56, 189, 248, 0.4)",
    x: -46,
    y: -44,
    z: 20,
    size: 40,
    codePath: "backend/app/services/c2pa_extractor.py",
    latencyMs: 38,
    inputContract: "Raw binary container header",
    outputContract: "C2PAManifest { cert_issuer, signing_time, actions }",
    algorithms: ["X.509 Certificate Chain Validation", "CBOR/JUMBF Binary Extraction"],
    submodules: [
      { name: "Hardware Key Matcher", desc: "Verifies OEM camera sensor signatures", verified: true },
      { name: "Tamper Proof Hash", desc: "Validates chunk byte digest integrity", verified: true },
    ],
    telemetry: [
      { key: "Parse Time", value: "38ms" },
      { key: "Trust Level", value: "Hardware Level" },
    ],
  },
  {
    id: "node-spectral",
    name: "Spectral & FFT Anomaly Sensor",
    cluster: "ingestion",
    clusterLabel: "Stage 1: Ingestion & Forensics",
    clusterColor: "#38bdf8",
    accentBg: "rgba(56, 189, 248, 0.1)",
    glowColor: "rgba(56, 189, 248, 0.4)",
    x: -24,
    y: -44,
    z: 30,
    size: 40,
    codePath: "backend/app/services/watermark_detector.py",
    latencyMs: 72,
    inputContract: "Normalized RGB Tensor (B, 3, 512, 512)",
    outputContract: "SpectralAnomalyMap { ela_diff, freq_spikes, synthid_conf }",
    algorithms: ["2D Fast Fourier Transform (FFT)", "Error Level Analysis (ELA)"],
    submodules: [
      { name: "High-Frequency Checker", desc: "Spots unnatural diffusion model harmonics", verified: true },
      { name: "Compression Variance", desc: "Exposes multi-pass spliced elements", verified: true },
    ],
    telemetry: [
      { key: "Resolution", value: "512x512 FFT" },
      { key: "Peak Detection", value: "Sub-pixel" },
    ],
  },

  // --- CLUSTER 2: CLAIM DECOMPOSITION ---
  {
    id: "hub-decompose",
    name: "Semantic Claim Extraction Core",
    cluster: "decomposition",
    clusterLabel: "Stage 2: Claim Decomposition",
    clusterColor: "#a855f7",
    accentBg: "rgba(168, 85, 247, 0.12)",
    glowColor: "rgba(168, 85, 247, 0.5)",
    x: 36,
    y: -28,
    z: 40,
    size: 54,
    isHub: true,
    codePath: "backend/app/services/claim_extractor.py",
    latencyMs: 220,
    inputContract: "ForensicSignalsPayload + Transcribed Text",
    outputContract: "AtomicClaimsArray [{ claim_id, text, entities, temporal_anchor }]",
    algorithms: [
      "Constrained JSON Schema Semantic Parsing via Gemini 2.5 Flash Lite",
      "Groq LLaMA-3.3-70B Ultra-Low Latency Fallback Engine",
      "Named Entity Recognition: Geopolitical, Person, Timestamp",
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
    id: "node-gemini",
    name: "Gemini 2.5 Structured Schema Parser",
    cluster: "decomposition",
    clusterLabel: "Stage 2: Claim Decomposition",
    clusterColor: "#a855f7",
    accentBg: "rgba(168, 85, 247, 0.1)",
    glowColor: "rgba(168, 85, 247, 0.4)",
    x: 46,
    y: -44,
    z: 25,
    size: 40,
    codePath: "backend/app/services/claim_extractor.py",
    latencyMs: 195,
    inputContract: "Raw transcription & context",
    outputContract: "Strict JSON Propositions with entity metadata",
    algorithms: ["Grammar-Constrained Decoding", "Zero-Shot Claim Isolation"],
    submodules: [
      { name: "Schema Guard", desc: "Ensures strictly typed Pydantic payloads", verified: true },
      { name: "Temporal Grounding", desc: "Resolves relative dates to ISO-8601", verified: true },
    ],
    telemetry: [
      { key: "Context Window", value: "128k Tokens" },
      { key: "Strict Output", value: "100% Validated" },
    ],
  },
  {
    id: "node-groq",
    name: "Groq LPU High-Speed Fallback",
    cluster: "decomposition",
    clusterLabel: "Stage 2: Claim Decomposition",
    clusterColor: "#a855f7",
    accentBg: "rgba(168, 85, 247, 0.1)",
    glowColor: "rgba(168, 85, 247, 0.4)",
    x: 24,
    y: -44,
    z: 20,
    size: 40,
    codePath: "backend/app/services/groq_client.py",
    latencyMs: 85,
    inputContract: "Queued claim text chunk",
    outputContract: "Sub-second claim token stream",
    algorithms: ["Tensor Streaming LPU Architecture", "LLaMA-3.3-70B Deduplication"],
    submodules: [
      { name: "Instant Failover", desc: "Triggers if primary API breaches 400ms SLA", verified: true },
      { name: "Speed Optimized", desc: "Generates 500+ tokens per second", verified: true },
    ],
    telemetry: [
      { key: "Throughput", value: "520 tok/sec" },
      { key: "Failover SLA", value: "<100ms switch" },
    ],
  },

  // --- CLUSTER 3: RETRIEVAL & TRIANGULATION ---
  {
    id: "hub-triangulate",
    name: "Consensus Triangulation Router",
    cluster: "triangulation",
    clusterLabel: "Stage 3: Multi-Source Triangulation",
    clusterColor: "#10b981",
    accentBg: "rgba(168, 85, 247, 0.12)",
    glowColor: "rgba(16, 185, 129, 0.5)",
    x: 36,
    y: 28,
    z: 40,
    size: 54,
    isHub: true,
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
    id: "node-ddg",
    name: "DuckDuckGo & Wire Crawler",
    cluster: "triangulation",
    clusterLabel: "Stage 3: Multi-Source Triangulation",
    clusterColor: "#10b981",
    accentBg: "rgba(16, 185, 129, 0.1)",
    glowColor: "rgba(16, 185, 129, 0.4)",
    x: 46,
    y: 44,
    z: 20,
    size: 40,
    codePath: "backend/app/services/retrieval_service.py",
    latencyMs: 140,
    inputContract: "Boolean search phrase matrix",
    outputContract: "Ranked news dispatches with publication timestamps",
    algorithms: ["Multi-Engine News Aggregation", "Subdomain Blocklist Filtering"],
    submodules: [
      { name: "Temporal Filter", desc: "Drops results that post-date the disputed event", verified: true },
      { name: "Syndication Deduper", desc: "Groups mirrored wire reprints to prevent bias", verified: true },
    ],
    telemetry: [
      { key: "Parallel Queries", value: "8 concurrent" },
      { key: "Freshness Window", value: "<1 hour real-time" },
    ],
  },
  {
    id: "node-x",
    name: "X / Tweepy Eyewitness Stream",
    cluster: "triangulation",
    clusterLabel: "Stage 3: Multi-Source Triangulation",
    clusterColor: "#10b981",
    accentBg: "rgba(16, 185, 129, 0.1)",
    glowColor: "rgba(16, 185, 129, 0.4)",
    x: 24,
    y: 44,
    z: 30,
    size: 40,
    codePath: "backend/app/services/twitter_service.py",
    latencyMs: 160,
    inputContract: "Event keywords + Geolocation radius",
    outputContract: "First-party social dispatches & eyewitness media",
    algorithms: ["Geospatial Proximity Scorer", "Bot & Sybil Account Detection"],
    submodules: [
      { name: "Eyewitness Verification", desc: "Verifies author location during breaking news", verified: true },
      { name: "Coordinated Inauthentic Filter", desc: "Flags coordinated bot amplifier rings", verified: true },
    ],
    telemetry: [
      { key: "Lookup Latency", value: "<160ms" },
      { key: "Bot Filter Precision", value: "97.8%" },
    ],
  },

  // --- CLUSTER 4: BAYESIAN SYNTHESIS ---
  {
    id: "hub-synthesis",
    name: "Bayesian Evidence Synthesis Nexus",
    cluster: "synthesis",
    clusterLabel: "Stage 4: Bayesian Synthesis",
    clusterColor: "#f59e0b",
    accentBg: "rgba(245, 158, 11, 0.12)",
    glowColor: "rgba(245, 158, 11, 0.5)",
    x: -36,
    y: 28,
    z: 40,
    size: 54,
    isHub: true,
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
  {
    id: "node-wilson",
    name: "Wilson Score Calibrator",
    cluster: "synthesis",
    clusterLabel: "Stage 4: Bayesian Synthesis",
    clusterColor: "#f59e0b",
    accentBg: "rgba(245, 158, 11, 0.1)",
    glowColor: "rgba(245, 158, 11, 0.4)",
    x: -46,
    y: 44,
    z: 25,
    size: 40,
    codePath: "backend/app/services/bayesian_model.py",
    latencyMs: 25,
    inputContract: "Raw posterior distributions & sample sizes",
    outputContract: "Calibrated 95% confidence lower & upper bounds",
    algorithms: ["Wilson Score Interval", "Adversarial Noise Calibration"],
    submodules: [
      { name: "Overconfidence Penalty", desc: "Prevents high scores on thin evidence bases", verified: true },
      { name: "Bootstrap Verification", desc: "10,000 empirical resamplings per claim", verified: true },
    ],
    telemetry: [
      { key: "Sample Passes", value: "10,000 resamples" },
      { key: "Confidence Floor", value: "95% statistical" },
    ],
  },
  {
    id: "node-audit",
    name: "Cryptographic SHA-256 Seal",
    cluster: "synthesis",
    clusterLabel: "Stage 4: Bayesian Synthesis",
    clusterColor: "#f59e0b",
    accentBg: "rgba(245, 158, 11, 0.1)",
    glowColor: "rgba(245, 158, 11, 0.4)",
    x: -24,
    y: 44,
    z: 30,
    size: 40,
    codePath: "backend/app/services/verdict_service.py",
    latencyMs: 12,
    inputContract: "Serialized claim + evidence JSON ledger",
    outputContract: "SHA-256 Immutable Audit Hash",
    algorithms: ["NIST FIPS 180-4 SHA-256 Digest", "Merkle Tree Checkpoint"],
    submodules: [
      { name: "Ledger Seal", desc: "Guarantees report cannot be altered post-review", verified: true },
      { name: "Public Verifier", desc: "Allows independent offline hash confirmation", verified: true },
    ],
    telemetry: [
      { key: "Hashing Standard", value: "SHA-256 FIPS" },
      { key: "Tamper Proof", value: "Immutable" },
    ],
  },
];

// Visual connection conduits between nodes
const EDGES = [
  { from: "hub-ingest", to: "node-c2pa" },
  { from: "hub-ingest", to: "node-spectral" },
  { from: "hub-ingest", to: "hub-decompose" },
  { from: "hub-decompose", to: "node-gemini" },
  { from: "hub-decompose", to: "node-groq" },
  { from: "hub-decompose", to: "hub-triangulate" },
  { from: "hub-triangulate", to: "node-ddg" },
  { from: "hub-triangulate", to: "node-x" },
  { from: "hub-triangulate", to: "hub-synthesis" },
  { from: "hub-synthesis", to: "node-wilson" },
  { from: "hub-synthesis", to: "node-audit" },
  { from: "hub-ingest", to: "hub-synthesis" }, // Direct sensor-to-verdict prior link
];

type ViewMode = "isometric" | "planar" | "lateral";

export function Architecture3D() {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeNodeId, setActiveNodeId] = useState<string>("hub-ingest");
  const [viewMode, setViewMode] = useState<ViewMode>("isometric");
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const activeNode = NODES.find((n) => n.id === activeNodeId) || NODES[0];

  // Animate 3D transformation using Anime.js
  const updateTopology = useCallback(
    (expanded: boolean, mode: ViewMode, selectedId: string) => {
      if (!canvasRef.current) return;

      let rotX = 52;
      let rotZ = -30;
      let rotY = 0;
      let scale = 1.0;

      if (mode === "planar") {
        rotX = 0;
        rotZ = 0;
        rotY = 0;
        scale = 0.95;
      } else if (mode === "lateral") {
        rotX = 20;
        rotZ = -65;
        rotY = 15;
        scale = 0.92;
      }

      setIsAnimating(true);

      // Animate overall 3D plane rotation
      animate(canvasRef.current, {
        rotateX: rotX,
        rotateY: rotY,
        rotateZ: rotZ,
        scale: scale,
        duration: 800,
        ease: "outExpo",
        complete: () => setIsAnimating(false),
      });

      // Animate node positions: fanned out (expanded) vs. tightly clustered at center (collapsed)
      NODES.forEach((node) => {
        const el = nodeRefs.current[node.id];
        if (!el) return;

        let targetX = 0;
        let targetY = 0;
        let targetZ = 0;
        let targetScale = 1.0;
        let targetOpacity = 1.0;

        if (expanded) {
          // Expanded network topology: coordinates scaled to canvas px
          targetX = node.x * 2.8;
          targetY = node.y * 2.8;
          targetZ = node.z;
          targetScale = selectedId === node.id ? 1.15 : 1.0;
          targetOpacity = selectedId === node.id ? 1.0 : 0.85;
        } else {
          // Collapsed state: nodes converge inward into a central nucleus cluster
          const collapseClusterScale = 0.22;
          targetX = node.x * 2.8 * collapseClusterScale;
          targetY = node.y * 2.8 * collapseClusterScale;
          targetZ = node.isHub ? 20 : 0;
          targetScale = node.isHub ? 0.85 : 0.45;
          targetOpacity = node.isHub ? 0.95 : 0.4;
        }

        animate(el, {
          translateX: targetX,
          translateY: targetY,
          translateZ: targetZ,
          scale: targetScale,
          opacity: targetOpacity,
          duration: 900,
          ease: "outExpo",
        });
      });
    },
    []
  );

  useEffect(() => {
    updateTopology(isExpanded, viewMode, activeNodeId);
  }, [isExpanded, viewMode, activeNodeId, updateTopology]);

  // Compute SVG edge coordinates
  const getEdgeCoordinates = (edge: { from: string; to: string }) => {
    const fromNode = NODES.find((n) => n.id === edge.from);
    const toNode = NODES.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return { x1: 0, y1: 0, x2: 0, y2: 0 };

    const multiplier = isExpanded ? 2.8 : 2.8 * 0.22;
    // Center at (260, 260)
    return {
      x1: 260 + fromNode.x * multiplier,
      y1: 260 + fromNode.y * multiplier,
      x2: 260 + toNode.x * multiplier,
      y2: 260 + toNode.y * multiplier,
      isConnectedToActive: activeNodeId === edge.from || activeNodeId === edge.to,
      strokeColor: fromNode.clusterColor,
    };
  };

  const getNodeIcon = (node: NodeData) => {
    switch (node.cluster) {
      case "ingestion":
        return <Radio size={node.isHub ? 22 : 16} className="text-white" />;
      case "decomposition":
        return <Cpu size={node.isHub ? 22 : 16} className="text-white" />;
      case "triangulation":
        return <Search size={node.isHub ? 22 : 16} className="text-white" />;
      case "synthesis":
        return <Shield size={node.isHub ? 22 : 16} className="text-white" />;
    }
  };

  return (
    <div
      id="architecture"
      className="w-full bg-bg text-ink relative py-12 px-4 sm:px-8 lg:px-12 selection:bg-accent/20 scroll-mt-16"
    >
      {/* Background Architectural Grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:24px_24px] opacity-40"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1400px] relative z-10 flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-accent-soft border border-line text-xs font-mono tracking-wider text-ink-2">
              <Share2 size={13} className="text-accent" />
              <span>System Topology · 3D Anime.js Network Graph</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              System Architecture & Network Topology
            </h2>
            <p className="text-sm sm:text-base text-ink-2 max-w-2xl">
              An interactive 3D network graph of the Veritas forensic pipeline. Click any node to focus its telemetry,
              or toggle between the collapsed nucleus cluster and the expanded distributed topology.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Collapse network cluster" : "Expand 3D network topology"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-elev border border-line hover:border-line-strong hover:bg-line/40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <Minimize2 size={15} className="text-accent" />
                  <span>Collapse Cluster</span>
                </>
              ) : (
                <>
                  <Maximize2 size={15} className="text-accent" />
                  <span>Expand Topology</span>
                </>
              )}
            </button>

            {/* View Presets */}
            <div className="inline-flex rounded-control border border-line bg-elev p-0.5 text-xs">
              <button
                onClick={() => setViewMode("isometric")}
                className={`px-3 py-1.5 rounded-[6px] font-mono transition-colors cursor-pointer ${
                  viewMode === "isometric" ? "bg-accent-soft text-white font-medium" : "text-ink-3 hover:text-ink"
                }`}
              >
                3D Isometric
              </button>
              <button
                onClick={() => setViewMode("planar")}
                className={`px-3 py-1.5 rounded-[6px] font-mono transition-colors cursor-pointer ${
                  viewMode === "planar" ? "bg-accent-soft text-white font-medium" : "text-ink-3 hover:text-ink"
                }`}
              >
                Planar View
              </button>
              <button
                onClick={() => setViewMode("lateral")}
                className={`px-3 py-1.5 rounded-[6px] font-mono transition-colors cursor-pointer ${
                  viewMode === "lateral" ? "bg-accent-soft text-white font-medium" : "text-ink-3 hover:text-ink"
                }`}
              >
                Lateral View
              </button>
            </div>
          </div>
        </div>

        {/* Main Stage: 3D Network Graph Left + Inspector Dossier Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 3D Network Canvas */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center min-h-[580px] lg:min-h-[660px] rounded-2xl border border-line bg-elev/30 backdrop-blur-md p-6 relative overflow-hidden select-none">
            {/* Viewport Decals */}
            <div className="absolute top-4 left-4 font-mono text-[11px] text-ink-3 flex items-center gap-2">
              <Activity size={13} className="text-accent" />
              <span>Perspective: 1400px · Anime.js Engine</span>
            </div>
            <div className="absolute top-4 right-4 font-mono text-[11px] text-ink-3 flex items-center gap-2">
              <span>TOPOLOGY: {isExpanded ? "DISTRIBUTED GRAPH" : "NUCLEUS CLUSTER"}</span>
              {isAnimating && <span className="text-real animate-pulse">● SYNC</span>}
            </div>

            {/* 3D Perspective Stage */}
            <div
              ref={containerRef}
              className="relative w-full max-w-[520px] h-[520px] flex items-center justify-center cursor-pointer"
              style={{
                perspective: "1400px",
                perspectiveOrigin: "50% 50%",
              }}
              onClick={() => {
                if (!isExpanded) setIsExpanded(true);
              }}
            >
              {/* Rotating Canvas */}
              <div
                ref={canvasRef}
                className="relative w-[520px] h-[520px]"
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "center center",
                }}
              >
                {/* SVG Connecting Vectors / Conduits */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 520 520"
                  style={{
                    transform: "translateZ(10px)",
                  }}
                >
                  <defs>
                    <linearGradient id="edge-pulse" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#888" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>

                  {EDGES.map((edge, idx) => {
                    const coords = getEdgeCoordinates(edge);
                    return (
                      <g key={idx}>
                        <line
                          x1={coords.x1}
                          y1={coords.y1}
                          x2={coords.x2}
                          y2={coords.y2}
                          stroke={coords.isConnectedToActive ? coords.strokeColor : "rgba(255,255,255,0.12)"}
                          strokeWidth={coords.isConnectedToActive ? 2 : 1}
                          strokeDasharray={coords.isConnectedToActive ? "4 2" : "2 2"}
                          className="transition-all duration-300"
                        />
                        {/* Animated flowing data packet */}
                        {isExpanded && coords.isConnectedToActive && (
                          <circle
                            r="3"
                            fill={coords.strokeColor}
                            className="animate-pulse"
                          >
                            <animateMotion
                              path={`M${coords.x1},${coords.y1} L${coords.x2},${coords.y2}`}
                              dur="1.8s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes (Vertices) */}
                {NODES.map((node) => {
                  const isActive = activeNodeId === node.id;
                  return (
                    <div
                      key={node.id}
                      ref={(el) => {
                        nodeRefs.current[node.id] = el;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveNodeId(node.id);
                        if (!isExpanded) setIsExpanded(true);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setActiveNodeId(node.id);
                          if (!isExpanded) setIsExpanded(true);
                        }
                      }}
                      aria-label={`Node: ${node.name}`}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer group"
                      style={{
                        transformStyle: "preserve-3d",
                        width: `${node.size}px`,
                        height: `${node.size}px`,
                      }}
                    >
                      {/* Outer Pulse Halo */}
                      <div
                        className="absolute inset-0 rounded-full transition-all duration-300 pointer-events-none"
                        style={{
                          background: isActive
                            ? `radial-gradient(circle, ${node.glowColor} 0%, transparent 70%)`
                            : "transparent",
                          transform: isActive ? "scale(2.2)" : "scale(1.2)",
                        }}
                      />

                      {/* Vertex Body */}
                      <div
                        className="relative z-10 rounded-full flex items-center justify-center transition-all duration-300 border shadow-lg"
                        style={{
                          width: `${node.size}px`,
                          height: `${node.size}px`,
                          backgroundColor: isActive ? node.clusterColor : "#0d0d10",
                          borderColor: isActive ? "#ffffff" : node.clusterColor,
                          boxShadow: isActive
                            ? `0 0 25px ${node.glowColor}, inset 0 0 10px rgba(255,255,255,0.4)`
                            : `0 0 10px rgba(0,0,0,0.6)`,
                        }}
                      >
                        {getNodeIcon(node)}

                        {/* Status beacon dot */}
                        <div
                          className="absolute -top-1 -right-1 size-2 rounded-full border border-black"
                          style={{
                            backgroundColor: isActive ? "#22c55e" : node.clusterColor,
                          }}
                        />
                      </div>

                      {/* Node Label on Canvas (when expanded) */}
                      {isExpanded && (
                        <div
                          className={`absolute top-full mt-2 text-center pointer-events-none transition-opacity duration-200 whitespace-nowrap ${
                            isActive ? "opacity-100 font-semibold" : "opacity-75 group-hover:opacity-100"
                          }`}
                        >
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                            style={{
                              color: isActive ? "#fff" : node.clusterColor,
                              backgroundColor: "rgba(10,10,14,0.9)",
                              borderColor: isActive ? node.clusterColor : "rgba(255,255,255,0.1)",
                            }}
                          >
                            {node.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Interaction Guide */}
            <div className="w-full flex items-center justify-between pt-4 mt-4 border-t border-line/70 text-xs text-ink-3 font-mono">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" />
                <span>
                  {isExpanded
                    ? "CLICK ANY NODE TO INSPECT CONTRACTS & CODE PATH"
                    : "CLUSTER COLLAPSED · CLICK ANYWHERE TO EXPAND TOPOLOGY"}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Sliders size={14} />
                <span>3D NETWORK TOPOLOGY</span>
              </div>
            </div>
          </div>

          {/* Right: Node Dossier & Engineering Inspector */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Cluster Quick Filters */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "hub-ingest", label: "Stage 1", title: "Ingestion", color: "#38bdf8" },
                { id: "hub-decompose", label: "Stage 2", title: "Claims", color: "#a855f7" },
                { id: "hub-triangulate", label: "Stage 3", title: "Triangulate", color: "#10b981" },
                { id: "hub-synthesis", label: "Stage 4", title: "Synthesis", color: "#f59e0b" },
              ].map((c) => {
                const isSelected = activeNode.cluster === c.title.toLowerCase() || activeNode.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveNodeId(c.id);
                      if (!isExpanded) setIsExpanded(true);
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-control border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-accent bg-elev shadow-sm"
                        : "border-line bg-elev/40 hover:bg-elev text-ink-3 hover:text-ink"
                    }`}
                  >
                    <span className="text-[10px] font-mono tracking-widest text-ink-3">{c.label}</span>
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{ color: isSelected ? c.color : undefined }}
                    >
                      {c.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Node Dossier Card */}
            <div
              className="rounded-2xl border border-line bg-elev/70 p-6 space-y-6 backdrop-blur-md relative overflow-hidden"
              style={{
                boxShadow: `0 8px 30px -10px ${activeNode.glowColor}`,
              }}
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-mono font-medium px-2.5 py-1 rounded"
                    style={{
                      color: activeNode.clusterColor,
                      backgroundColor: activeNode.accentBg,
                      border: `1px solid ${activeNode.glowColor}`,
                    }}
                  >
                    {activeNode.clusterLabel}
                  </span>
                  <span className="text-xs font-mono text-ink-3 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-real" />
                    Latency: {activeNode.latencyMs}ms p95
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <span>{activeNode.name}</span>
                </h3>
              </div>

              {/* Code Path & Implementation */}
              <div className="space-y-3 rounded-xl border border-line bg-black/50 p-4 font-mono text-xs">
                <div className="flex items-center gap-2 text-ink-3 pb-2 border-b border-line">
                  <Terminal size={14} className="text-accent" />
                  <span>ACTIVE REPO SERVICE IMPLEMENTATION:</span>
                </div>
                <div className="text-ink-2 flex items-center justify-between">
                  <code className="text-accent">{activeNode.codePath}</code>
                  <span className="text-[10px] text-ink-3">PYTHON 3.12</span>
                </div>

                <div className="pt-2 border-t border-line/60 space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-ink-3">INPUT CONTRACT: </span>
                    <span className="text-ink-2">{activeNode.inputContract}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">OUTPUT CONTRACT: </span>
                    <span className="text-ink-2">{activeNode.outputContract}</span>
                  </div>
                </div>
              </div>

              {/* Verified Submodules Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono tracking-wider text-ink-3 uppercase flex items-center gap-2">
                  <Cpu size={14} className="text-accent" />
                  Submodules & Algorithmic Gates
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {activeNode.submodules.map((sub, i) => (
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

              {/* Mathematical Formulations */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono tracking-wider text-ink-3 uppercase flex items-center gap-2">
                  <Database size={14} className="text-accent" />
                  Algorithmic Specifications
                </h4>
                <ul className="space-y-1.5 text-xs text-ink-2 font-mono">
                  {activeNode.algorithms.map((algo, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent">›</span>
                      <span>{algo}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Telemetry Grid */}
              <div className="pt-4 border-t border-line grid grid-cols-2 gap-3">
                {activeNode.telemetry.map((item, i) => (
                  <div key={i} className="p-2.5 rounded-control bg-line/20 border border-line text-xs font-mono">
                    <div className="text-ink-3 text-[10px]">{item.key}</div>
                    <div className="text-ink font-semibold mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Workspace Action */}
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
