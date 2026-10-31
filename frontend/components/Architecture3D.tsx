"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode2,
  ExternalLink,
  BookOpen,
  Zap,
} from "lucide-react";

export type PayloadPreset = "deepfake_image" | "satire_news" | "verified_dispatch";

export interface FlowNode {
  id: string;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  engine: string;
  typeTag: string;
  latencyMs: number;
  codePath: string;
  statusLabel: string;
  statusPercent: number;
  accentColor: string;
  stats: {
    label1: string;
    val1: string;
    diff1: string;
    isPos1: boolean;
    label2: string;
    val2: string;
    diff2: string;
    isPos2: boolean;
    label3: string;
    val3: string;
    diff3: string;
    isPos3: boolean;
  };
  testPayloads: Record<
    PayloadPreset,
    {
      status: "verified" | "flagged" | "passed" | "contradicted";
      readout: string;
      telemetry: string;
      metricScore: string;
      scoreType: "green" | "red" | "amber";
    }
  >;
}

export const FLOW_NODES: FlowNode[] = [
  // COLUMN 1: Inputs & Multi-Modal Ingestion
  {
    id: "node-article",
    column: 1,
    x: 40,
    y: 35,
    width: 245,
    height: 118,
    title: "Article Content Extractor",
    subtitle: "DOM Sanitizer & Clean Markdown",
    engine: "Trafilatura v2.3",
    typeTag: "Modality (Input) · Text",
    latencyMs: 24,
    codePath: "backend/detector/forensics/article.py",
    statusLabel: "100% Parsed",
    statusPercent: 100,
    accentColor: "#38bdf8",
    stats: {
      label1: "DOM Tree",
      val1: "Walker",
      diff1: "0.87% ↗",
      isPos1: true,
      label2: "Chars Ext.",
      val2: "3,890",
      diff2: "2.71% ↗",
      isPos2: true,
      label3: "Latency",
      val3: "24ms",
      diff3: "Fast ↗",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "passed",
        readout: "Static binary payload detected — bypassing article DOM parser.",
        telemetry: "0 bytes DOM extracted (image mode active)",
        metricScore: "Pass",
        scoreType: "green",
      },
      satire_news: {
        status: "passed",
        readout: "Article body successfully parsed from theonion.com. 420 words extracted.",
        telemetry: "Extracted 2,410 chars; author: Editorial Staff",
        metricScore: "0.998",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "passed",
        readout: "Wire article verified from apnews.com dispatch stream. Clean body delivered.",
        telemetry: "Extracted 3,890 chars; accredited AP wire stamp",
        metricScore: "0.999",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-frames",
    column: 1,
    x: 40,
    y: 180,
    width: 245,
    height: 118,
    title: "Keyframe & Slicer",
    subtitle: "PyAV Lossless I-Frame Sampler",
    engine: "Pillow / PyAV",
    typeTag: "Modality (Input) · Frames",
    latencyMs: 38,
    codePath: "backend/detector/forensics/frames.py",
    statusLabel: "32 fps sampled",
    statusPercent: 100,
    accentColor: "#38bdf8",
    stats: {
      label1: "I-Frames",
      val1: "32 fps",
      diff1: "1.04% ↗",
      isPos1: true,
      label2: "Slice RAM",
      val2: "24 MB",
      diff2: "1.44% ↗",
      isPos2: true,
      label3: "Latency",
      val3: "38ms",
      diff3: "39.7% ↗",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Static RGB container decoded at 1024x576 resolution.",
        telemetry: "Frame slice extracted; pixel tensor prepared",
        metricScore: "0.998",
        scoreType: "green",
      },
      satire_news: {
        status: "passed",
        readout: "Lead headline illustration parsed; JPEG headers intact.",
        telemetry: "Single lead frame extracted (1.2MB)",
        metricScore: "Pass",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "High-resolution photojournalism frame sampled at full bit-depth.",
        telemetry: "Raw frame buffer 3840x2160 passed to sensor",
        metricScore: "0.999",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-acoustic",
    column: 1,
    x: 40,
    y: 325,
    width: 245,
    height: 118,
    title: "Acoustic Audio Decoupler",
    subtitle: "16kHz Phase Vocoder & FFT",
    engine: "Librosa Engine",
    typeTag: "Modality (Input) · Audio",
    latencyMs: 32,
    codePath: "backend/detector/forensics/acoustic.py",
    statusLabel: "16kHz Harmonic",
    statusPercent: 85,
    accentColor: "#38bdf8",
    stats: {
      label1: "Sampling",
      val1: "16 kHz",
      diff1: "0.99% ↗",
      isPos1: true,
      label2: "Vocoder",
      val2: "Linear",
      diff2: "0.45% ↗",
      isPos2: true,
      label3: "Latency",
      val3: "32ms",
      diff3: "Realtime",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "passed",
        readout: "No audio track in static image container (bypassed).",
        telemetry: "Pass-through mode engaged",
        metricScore: "Bypass",
        scoreType: "green",
      },
      satire_news: {
        status: "passed",
        readout: "Text modality; audio analyzer zero-latency pass.",
        telemetry: "0ms acoustic buffer",
        metricScore: "Pass",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Authentic ambient background noise floor verified.",
        telemetry: "Natural physical acoustic reverberation verified",
        metricScore: "0.998",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-exif",
    column: 1,
    x: 40,
    y: 470,
    width: 245,
    height: 118,
    title: "Hardware EXIF Parser",
    subtitle: "Camera Serial & Lens Rig Tags",
    engine: "ExifTool Enclave",
    typeTag: "Metadata (Input) · Sensor",
    latencyMs: 15,
    codePath: "backend/detector/forensics/exif.py",
    statusLabel: "Strict Enclave",
    statusPercent: 95,
    accentColor: "#38bdf8",
    stats: {
      label1: "Camera ID",
      val1: "Audit",
      diff1: "-100% ↘",
      isPos1: false,
      label2: "Lens Rig",
      val2: "Tags",
      diff2: "None ↘",
      isPos2: false,
      label3: "Latency",
      val3: "15ms",
      diff3: "Instant",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Missing camera hardware serial and lens EXIF tags. Software signature: 'Gemini Generative Engine'.",
        telemetry: "EXIF missing camera serial number; 0x00 header mismatch",
        metricScore: "-0.644",
        scoreType: "red",
      },
      satire_news: {
        status: "passed",
        readout: "Standard web CMS image publishing tags detected.",
        telemetry: "IEC61966-2.1 color profile validated",
        metricScore: "0.994",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Canon EOS R5 camera serial #0429188 validated with signed Sony/Canon hardware EXIF.",
        telemetry: "Signed EXIF timestamp matches AP newsroom wire dispatch",
        metricScore: "0.999",
        scoreType: "green",
      },
    },
  },

  // COLUMN 2: Sensor Forensics & Anomaly Decoders
  {
    id: "node-c2pa",
    column: 2,
    x: 390,
    y: 80,
    width: 245,
    height: 130,
    title: "C2PA Manifest Auditor",
    subtitle: "Hardware Root CA & X.509 Chain",
    engine: "C2PA Rust Core",
    typeTag: "Forensics · Cryptography",
    latencyMs: 42,
    codePath: "backend/detector/forensics/provenance.py",
    statusLabel: "JUMBF Parser Active",
    statusPercent: 100,
    accentColor: "#a855f7",
    stats: {
      label1: "JUMBF Box",
      val1: "Parsed",
      diff1: "0.87% ↗",
      isPos1: true,
      label2: "Cert Chain",
      val2: "X.509",
      diff2: "Valid ↗",
      isPos2: true,
      label3: "Latency",
      val3: "42ms",
      diff3: "Rust",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "No authentic C2PA hardware manifest detected in binary header.",
        telemetry: "JUMBF box absent; unauthenticated generation origin",
        metricScore: "0.998",
        scoreType: "green",
      },
      satire_news: {
        status: "passed",
        readout: "Editorial CMS manifest verified without camera sensor binding.",
        telemetry: "Web publishing cert present; no camera binding",
        metricScore: "0.998",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Cryptographic C2PA root manifest confirmed from AP photojournalism pool.",
        telemetry: "X.509 cert chain verified to accredited news agency root CA",
        metricScore: "0.999",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-onnx-fft",
    column: 2,
    x: 390,
    y: 265,
    width: 245,
    height: 130,
    title: "Neural FFT & Residuals",
    subtitle: "2D Frequency Anomaly Detector",
    engine: "ONNX Runtime 1.19",
    typeTag: "Forensics · Spectral AI",
    latencyMs: 76,
    codePath: "backend/detector/forensics/onnx_detector.py",
    statusLabel: "Tensor 512x512",
    statusPercent: 92,
    accentColor: "#a855f7",
    stats: {
      label1: "2D FFT",
      val1: "Radial",
      diff1: "91.4% ↗",
      isPos1: true,
      label2: "Residual",
      val2: "Grid",
      diff2: "High ↗",
      isPos2: true,
      label3: "Latency",
      val3: "76ms",
      diff3: "ONNX",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "High-frequency checkerboard grid anomaly detected (91.4% synthetic residual).",
        telemetry: "Spectral anomaly p=0.914; synthetic diffusion artifact confirmed",
        metricScore: "-0.644",
        scoreType: "red",
      },
      satire_news: {
        status: "passed",
        readout: "Text modality; neural image classifier bypassed.",
        telemetry: "Pass-through execution (0ms neural inference)",
        metricScore: "Pass",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Natural CMOS sensor Poisson noise distribution verified across all color channels. 0.04% residual.",
        telemetry: "Noise variance 0.012; authentic physical sensor profile",
        metricScore: "0.998",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-synthid",
    column: 2,
    x: 390,
    y: 450,
    width: 245,
    height: 130,
    title: "SynthID Sparkle Hunter",
    subtitle: "Normalized Cross-Correlation NCC",
    engine: "Template Matcher",
    typeTag: "Forensics · Watermarks",
    latencyMs: 28,
    codePath: "backend/detector/forensics/watermarks.py",
    statusLabel: "4-Fold Symmetry",
    statusPercent: 98,
    accentColor: "#a855f7",
    stats: {
      label1: "Symmetry",
      val1: "4-fold",
      diff1: "0.926 ↗",
      isPos1: true,
      label2: "Radius r",
      val2: "18px",
      diff2: "Match ↗",
      isPos2: true,
      label3: "Latency",
      val3: "28ms",
      diff3: "Fast",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "SynthID 4-pointed astroid sparkle watermark identified at bottom-right corner (confidence 0.926).",
        telemetry: "x: 982, y: 529; arm_ratio: 3.42; Google Gemini watermark active",
        metricScore: "0.999",
        scoreType: "green",
      },
      satire_news: {
        status: "passed",
        readout: "Zero synthetic watermark signatures detected in DOM assets.",
        telemetry: "Clean image checks; zero algorithmic watermarks",
        metricScore: "Pass",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Zero AI watermarks or invisible digital steganography signatures.",
        telemetry: "Watermark NCC < 0.12 across all quadrants",
        metricScore: "0.999",
        scoreType: "green",
      },
    },
  },

  // COLUMN 3: Central Convergence Hub (North Star)
  {
    id: "node-gemini-claims",
    column: 3,
    x: 750,
    y: 245,
    width: 275,
    height: 170,
    title: "Gemini 2.5 Decomposition Hub",
    subtitle: "Atomic Propositions & Search Routing",
    engine: "Gemini 2.5 Flash Lite",
    typeTag: "Metric (North Star) · Claim Hub",
    latencyMs: 220,
    codePath: "backend/detector/providers/gemini.py",
    statusLabel: "Strict JSON Mode",
    statusPercent: 100,
    accentColor: "#3b82f6",
    stats: {
      label1: "Past 7 days",
      val1: "4,411 mins",
      diff1: "0.43% ↗",
      isPos1: true,
      label2: "Past 6 weeks",
      val2: "26.15K mins",
      diff2: "2.57% ↗",
      isPos2: true,
      label3: "Past 12 mos",
      val3: "198.31K mins",
      diff3: "38.59% ↗",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Extracted 3 visual claims: 'Chinese warship struck by missile', 'Fighter jets conducting attack', 'Active maritime battle'.",
        telemetry: "Formulated 4 search queries against naval registries",
        metricScore: "North Star",
        scoreType: "green",
      },
      satire_news: {
        status: "contradicted",
        readout: "Extracted satirical headline claim: 'Nation somehow more divided than ever before after fictional poll'.",
        telemetry: "Isolated key satirical hyperbole propositions",
        metricScore: "North Star",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "passed",
        readout: "Extracted official summit statement: 'Trade delegation signs bilateral tariff reduction accord'.",
        telemetry: "Extracted 3 factual claims with named delegates",
        metricScore: "North Star",
        scoreType: "green",
      },
    },
  },

  // COLUMN 4: Multi-Angle Wire Triangulation
  {
    id: "node-retrieval",
    column: 4,
    x: 1130,
    y: 160,
    width: 245,
    height: 140,
    title: "Autonomous Wire Scraper",
    subtitle: "14 Independent Global News Wires",
    engine: "Reuters / AP / BBC / AFP",
    typeTag: "Verification · Consensus",
    latencyMs: 380,
    codePath: "backend/detector/engine/retrieval.py",
    statusLabel: "14 Wires Audited",
    statusPercent: 96,
    accentColor: "#f59e0b",
    stats: {
      label1: "Registries",
      val1: "14 Wires",
      diff1: "100% ↗",
      isPos1: true,
      label2: "Agreement",
      val2: "Ratio",
      diff2: "Cross ↗",
      isPos2: true,
      label3: "Latency",
      val3: "380ms",
      diff3: "Parallel",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "contradicted",
        readout: "0 of 14 accredited wire registries report any naval engagement. Contradicted by official maritime dispatches.",
        telemetry: "0/14 corroborations; no naval incident logged globally",
        metricScore: "0.388",
        scoreType: "green",
      },
      satire_news: {
        status: "contradicted",
        readout: "Identified domain theonion.com as registered satirical comedy publication; zero primary news hits.",
        telemetry: "Wire corpus confirms satirical origin",
        metricScore: "0.999",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Corroborated across 12 independent news wires including Reuters, AP News, and BBC World Service.",
        telemetry: "12/12 wire agreement; matching press pool dispatch",
        metricScore: "0.999",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-temporal",
    column: 4,
    x: 1130,
    y: 370,
    width: 245,
    height: 140,
    title: "Temporal Consensus Engine",
    subtitle: "Historical Wire & Archive Cross-Check",
    engine: "Timestamp Archive",
    typeTag: "Verification · Chronology",
    latencyMs: 110,
    codePath: "backend/detector/engine/temporal.py",
    statusLabel: "48-Hour Indexer",
    statusPercent: 90,
    accentColor: "#f59e0b",
    stats: {
      label1: "Window",
      val1: "48 Hours",
      diff1: "100% ↗",
      isPos1: true,
      label2: "Recency",
      val2: "Instant",
      diff2: "0.5s ↗",
      isPos2: true,
      label3: "Latency",
      val3: "110ms",
      diff3: "Fast",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "contradicted",
        readout: "No breaking alerts or emergency defense dispatches logged across military communications.",
        telemetry: "Absence-of-evidence scored decisively as synthetic",
        metricScore: "0.998",
        scoreType: "green",
      },
      satire_news: {
        status: "contradicted",
        readout: "Article publication chronology matched with satirical publishing calendar.",
        telemetry: "Zero breaking wire cross-traffic",
        metricScore: "0.998",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Wire timestamps match official White House / G7 press release distribution chronology.",
        telemetry: "Temporal alignment within 45 seconds of official announcement",
        metricScore: "0.998",
        scoreType: "green",
      },
    },
  },

  // COLUMN 5: Outcomes & Bayesian Synthesis
  {
    id: "node-bayesian",
    column: 5,
    x: 1485,
    y: 85,
    width: 255,
    height: 140,
    title: "Bayesian Synthesizer",
    subtitle: "Calibrated Posterior Odds & 95% CI",
    engine: "Wilson-Score Estimator",
    typeTag: "Metric (KPI) · Verdict",
    latencyMs: 18,
    codePath: "backend/detector/engine/pipeline.py",
    statusLabel: "95% Bootstrap CI",
    statusPercent: 100,
    accentColor: "#10b981",
    stats: {
      label1: "Past 7 days",
      val1: "0",
      diff1: "100% ↗",
      isPos1: true,
      label2: "Past 6 wks",
      val2: "-$60",
      diff2: "-100.17% ↘",
      isPos2: false,
      label3: "Past 12 mos",
      val3: "$56,760",
      diff3: "1,676.67% ↗",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Verdict: LIKELY_FAKE (99.0% confidence). 95% CI: [96.8%, 99.7%]. High sensor residual + SynthID match + 0 wire corroboration.",
        telemetry: "Ledger Token #VRT-2026-8812; Cryptographic Seal Engaged",
        metricScore: "99.0% FAKE",
        scoreType: "red",
      },
      satire_news: {
        status: "flagged",
        readout: "Verdict: LIKELY_FAKE (96.0% confidence). Satirical publication identified with contradicted assertions.",
        telemetry: "Ledger Token #VRT-2026-4409; Satirical Flag Affixed",
        metricScore: "96.0% SATIRE",
        scoreType: "amber",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Verdict: LIKELY_REAL (98.4% confidence). 95% CI: [96.9%, 99.4%]. Valid C2PA root + 12 wire corroborations.",
        telemetry: "Ledger Token #VRT-2026-9914; Genuine Cryptographic Seal",
        metricScore: "98.4% REAL",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-ledger",
    column: 5,
    x: 1485,
    y: 275,
    width: 255,
    height: 140,
    title: "Cryptographic Seal Ledger",
    subtitle: "SHA-256 Immutable Proof Token Stamp",
    engine: "Audit Ledger Enclave",
    typeTag: "Metric (KPI) · Proof",
    latencyMs: 8,
    codePath: "backend/detector/engine/ledger.py",
    statusLabel: "Signed Ledger Token",
    statusPercent: 100,
    accentColor: "#10b981",
    stats: {
      label1: "Past 7 days",
      val1: "72,315.8%",
      diff1: "No change",
      isPos1: true,
      label2: "Past 6 wks",
      val2: "71,521.9%",
      diff2: "3.32% ↗",
      isPos2: true,
      label3: "Past 12 mos",
      val3: "63,825.8%",
      diff3: "37.7% ↗",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Token #VRT-2026-8812 minted with immutable cryptographic evidence seal.",
        telemetry: "SHA-256 digest: 8f240... sealed to client dossier",
        metricScore: "#VRT-8812",
        scoreType: "green",
      },
      satire_news: {
        status: "flagged",
        readout: "Token #VRT-2026-4409 minted with satirical publication attribution.",
        telemetry: "SHA-256 digest: 41ca2... sealed to client dossier",
        metricScore: "#VRT-4409",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Token #VRT-2026-9914 minted with full C2PA and 12-wire consensus proof.",
        telemetry: "SHA-256 digest: 1a9f0... sealed to client dossier",
        metricScore: "#VRT-9914",
        scoreType: "green",
      },
    },
  },
  {
    id: "node-dossier",
    column: 5,
    x: 1485,
    y: 465,
    width: 255,
    height: 140,
    title: "Verifiable Evidence Dossier",
    subtitle: "Court-Admissible Export Package",
    engine: "PDF / JSON-LD / C2PA",
    typeTag: "Metric (KPI) · Export",
    latencyMs: 14,
    codePath: "backend/detector/engine/dossier.py",
    statusLabel: "Export Ready",
    statusPercent: 100,
    accentColor: "#10b981",
    stats: {
      label1: "Past 7 days",
      val1: "5,417.23",
      diff1: "0.59% ↗",
      isPos1: true,
      label2: "Past 6 wks",
      val2: "32,032.44",
      diff2: "3.14% ↗",
      isPos2: true,
      label3: "Past 12 mos",
      val3: "246,597.93",
      diff3: "35.85% ↗",
      isPos3: true,
    },
    testPayloads: {
      deepfake_image: {
        status: "flagged",
        readout: "Veritas Verification Dossier packaged with synthetic watermark coordinates & residual graphs.",
        telemetry: "Export payload: PDF, JSON-LD, C2PA claims",
        metricScore: "Export Ready",
        scoreType: "green",
      },
      satire_news: {
        status: "flagged",
        readout: "Dossier packaged with satirical publication citations and fact-check register.",
        telemetry: "Export payload: PDF, JSON-LD, C2PA claims",
        metricScore: "Export Ready",
        scoreType: "green",
      },
      verified_dispatch: {
        status: "verified",
        readout: "Cryptographic Certificate of Authenticity issued with X.509 cert chain.",
        telemetry: "Export payload: C2PA signed package",
        metricScore: "Certified",
        scoreType: "green",
      },
    },
  },
];

// Connector edges defining the DAG with cubic bezier curves and live flowing nodes
export interface FlowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  badgeX?: number;
  badgeY?: number;
  pillBadge?: {
    text: string;
    type: "green" | "red" | "amber";
  };
}

export const FLOW_EDGES: FlowEdge[] = [
  // Col 1 -> Col 2
  {
    id: "edge-article-c2pa",
    sourceId: "node-article",
    targetId: "node-c2pa",
    x1: 285,
    y1: 94,
    x2: 390,
    y2: 145,
  },
  {
    id: "edge-frames-fft",
    sourceId: "node-frames",
    targetId: "node-onnx-fft",
    x1: 285,
    y1: 239,
    x2: 390,
    y2: 330,
  },
  {
    id: "edge-frames-synthid",
    sourceId: "node-frames",
    targetId: "node-synthid",
    x1: 285,
    y1: 239,
    x2: 390,
    y2: 515,
  },
  {
    id: "edge-acoustic-fft",
    sourceId: "node-acoustic",
    targetId: "node-onnx-fft",
    x1: 285,
    y1: 384,
    x2: 390,
    y2: 330,
  },
  {
    id: "edge-exif-c2pa",
    sourceId: "node-exif",
    targetId: "node-c2pa",
    x1: 285,
    y1: 529,
    x2: 390,
    y2: 145,
  },

  // Col 2 -> Col 3 (Convergence into North Star Hub)
  {
    id: "edge-c2pa-gemini",
    sourceId: "node-c2pa",
    targetId: "node-gemini-claims",
    x1: 635,
    y1: 145,
    x2: 750,
    y2: 330,
    badgeX: 692,
    badgeY: 237,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-fft-gemini",
    sourceId: "node-onnx-fft",
    targetId: "node-gemini-claims",
    x1: 635,
    y1: 330,
    x2: 750,
    y2: 330,
    badgeX: 692,
    badgeY: 330,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-synthid-gemini",
    sourceId: "node-synthid",
    targetId: "node-gemini-claims",
    x1: 635,
    y1: 515,
    x2: 750,
    y2: 330,
    badgeX: 692,
    badgeY: 422,
    pillBadge: { text: "-0.644", type: "red" },
  },

  // Col 3 -> Col 4 (Branching out from North Star Hub)
  {
    id: "edge-gemini-retrieval",
    sourceId: "node-gemini-claims",
    targetId: "node-retrieval",
    x1: 1025,
    y1: 330,
    x2: 1130,
    y2: 230,
    badgeX: 1077,
    badgeY: 280,
    pillBadge: { text: "0.388", type: "green" },
  },
  {
    id: "edge-gemini-temporal",
    sourceId: "node-gemini-claims",
    targetId: "node-temporal",
    x1: 1025,
    y1: 330,
    x2: 1130,
    y2: 440,
    badgeX: 1077,
    badgeY: 385,
    pillBadge: { text: "0.999", type: "green" },
  },

  // Col 4 -> Col 5 (Outcomes & Synthesis)
  {
    id: "edge-retrieval-bayesian",
    sourceId: "node-retrieval",
    targetId: "node-bayesian",
    x1: 1375,
    y1: 230,
    x2: 1485,
    y2: 155,
    badgeX: 1430,
    badgeY: 192,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-retrieval-ledger",
    sourceId: "node-retrieval",
    targetId: "node-ledger",
    x1: 1375,
    y1: 230,
    x2: 1485,
    y2: 345,
    badgeX: 1430,
    badgeY: 287,
    pillBadge: { text: "0.999", type: "green" },
  },
  {
    id: "edge-temporal-bayesian",
    sourceId: "node-temporal",
    targetId: "node-bayesian",
    x1: 1375,
    y1: 440,
    x2: 1485,
    y2: 155,
    badgeX: 1410,
    badgeY: 380,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-temporal-dossier",
    sourceId: "node-temporal",
    targetId: "node-dossier",
    x1: 1375,
    y1: 440,
    x2: 1485,
    y2: 535,
    badgeX: 1430,
    badgeY: 487,
    pillBadge: { text: "0.998", type: "green" },
  },
];

export function Architecture3D() {
  const [activePreset, setActivePreset] = useState<PayloadPreset>("verified_dispatch");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-gemini-claims");
  const [zoom, setZoom] = useState<number>(0.88);
  const [activeStep, setActiveStep] = useState<number>(0);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Stepping loop for live status ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5);
    }, Math.max(1200 / simSpeed, 400));
    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  const selectedNode = FLOW_NODES.find((n) => n.id === selectedNodeId) || FLOW_NODES[0];
  const payloadData = selectedNode.testPayloads[activePreset];

  const totalPipelineLatency = FLOW_NODES.reduce((acc, n) => acc + n.latencyMs, 0);

  const handleZoomIn = () => setZoom((z) => Math.min(1.25, z + 0.08));
  const handleZoomOut = () => setZoom((z) => Math.max(0.65, z - 0.08));
  const handleResetZoom = () => setZoom(0.88);

  return (
    <div
      id="architecture"
      className="w-full bg-[#08090d] text-ink relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 selection:bg-accent/20 scroll-mt-24"
    >
      <div className="max-w-[1780px] mx-auto space-y-8 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
              <Activity size={13} className="text-emerald-400 animate-pulse" />
              <span>LIVE SYSTEM ARCHITECTURE · MULTIMODAL DAG FLOW</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              System Architecture Flowchart
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Real-time causal DAG showing continuous small data nodes flowing across multimodal ingestion, sensor forensics,
              central claim decomposition, independent wire triangulation, and calibrated Bayesian synthesis.
            </p>
          </div>

          {/* Test Payload Preset Picker */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Test Payload:</span>
            <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10">
              {[
                { id: "deepfake_image", label: "Synthetic AI Image" },
                { id: "satire_news", label: "Satirical Onion Wire" },
                { id: "verified_dispatch", label: "AP Wire Dispatch" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id as PayloadPreset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activePreset === preset.id
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Simulation Top Controls */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0e14]/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          {/* Controls: Play/Pause, Step, Speed */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? "Pause Flow" : "Resume Flow"}</span>
            </button>

            <button
              onClick={() => setActiveStep((s) => (s + 1) % 5)}
              title="Advance one clock cycle"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <FastForward size={14} />
              <span className="hidden sm:inline">Step Clock</span>
            </button>

            <button
              onClick={() => {
                setActiveStep(0);
                setSelectedNodeId("node-gemini-claims");
              }}
              title="Reset simulation"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-3">
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    simSpeed === spd
                      ? "bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Telemetry Status Bar */}
          <div className="flex items-center gap-5 text-xs font-mono text-zinc-300">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                ENGINE STATUS: <strong className="text-white">STREAMING REAL-TIME</strong>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-zinc-400">
              <Cpu size={13} className="text-cyan-400" />
              <span>
                DAG LATENCY: <strong className="text-white font-mono">{totalPipelineLatency}ms</strong>
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-zinc-400">
              <Shield size={13} className="text-emerald-400" />
              <span>ENCLAVE: ZERO DATA RETENTION</span>
            </div>
          </div>
        </div>

        {/* The Exact Flowchart Canvas Container matching the User Reference */}
        <div className="rounded-3xl border border-white/15 bg-[#0b0c12] overflow-hidden shadow-2xl relative">
          {/* Canvas Top Bar */}
          <div className="px-5 py-3.5 border-b border-white/10 bg-[#0f1018] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-4">
              <span className="text-zinc-200 font-medium tracking-wide">
                Example: Multimodal Deepfake & Wire Verification Pipeline
              </span>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-cyan-400 text-[11px]">
                <BookOpen size={12} />
                <span>Canvas</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-zinc-400">
              <div className="hidden md:flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px]">13 Live Nodes</span>
                <span className="text-zinc-600">·</span>
                <span className="text-[11px]">14 Flow Paths</span>
              </div>

              {/* Top View Indicator */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-[11px] text-zinc-300">
                <span>View:</span>
                <strong className="text-white font-semibold">Causal DAG</strong>
              </div>
            </div>
          </div>

          {/* Canvas Scroll & Viewport Area */}
          <div className="relative overflow-x-auto overflow-y-hidden w-full scrollbar-thin scrollbar-thumb-white/10 select-none">
            <div
              ref={canvasRef}
              className="relative min-w-[1780px] h-[670px] transition-transform duration-200 ease-out origin-top-left"
              style={{
                transform: `scale(${zoom})`,
                marginBottom: `${(1 - zoom) * -670}px`,
                marginRight: `${(1 - zoom) * -1780}px`,
              }}
            >
              {/* Dot-matrix blueprint canvas background exactly matching reference */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.09]"
                style={{
                  backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Column Category Title Headers */}
              <div className="absolute top-2 inset-x-0 flex justify-between px-10 text-[10px] font-mono tracking-wider uppercase text-zinc-300 pointer-events-none">
                <span className="w-[245px]">01 · Ingestion & Sensors (Inputs)</span>
                <span className="w-[245px] ml-16">02 · Forensic Analyzers</span>
                <span className="w-[275px] ml-16 text-center text-cyan-400 font-semibold">
                  03 · North Star Decomposition Hub
                </span>
                <span className="w-[245px] ml-16">04 · Wire Triangulation</span>
                <span className="w-[255px] ml-16 text-right text-emerald-400 font-semibold">
                  05 · Bayesian Verdict & Proof
                </span>
              </div>

              {/* SVG Layer: Connecting Bezier Splines, Flowing Animated Small Nodes, and Metric Badges */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 1780 670"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Glowing Filter for Flowing Particle Nodes */}
                  <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.0" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Direct High-Altitude Hardware Sensor Bypass Path */}
                <path
                  id="path-bypass"
                  d="M 635 145 C 850 40, 1260 40, 1485 155"
                  stroke="rgba(168, 85, 247, 0.22)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {isPlaying && (
                  <>
                    <circle r="3" fill="#c084fc" filter="url(#glow-cyan)">
                      <animateMotion
                        dur={`${4.2 / simSpeed}s`}
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href="#path-bypass" />
                      </animateMotion>
                    </circle>
                    <circle r="3" fill="#c084fc" filter="url(#glow-cyan)">
                      <animateMotion
                        dur={`${4.2 / simSpeed}s`}
                        begin={`${2.1 / simSpeed}s`}
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href="#path-bypass" />
                      </animateMotion>
                    </circle>
                  </>
                )}

                {/* Render All Connecting Bezier Curves with Animated Small Nodes */}
                {FLOW_EDGES.map((edge, idx) => {
                  const dx = edge.x2 - edge.x1;
                  const cx1 = edge.x1 + dx * 0.5;
                  const cx2 = edge.x2 - dx * 0.5;
                  const pathD = `M ${edge.x1} ${edge.y1} C ${cx1} ${edge.y1}, ${cx2} ${edge.y2}, ${edge.x2} ${edge.y2}`;

                  const isFlaggedEdge =
                    activePreset === "deepfake_image" &&
                    (edge.id === "edge-synthid-gemini" ||
                      edge.id === "edge-fft-gemini" ||
                      edge.id === "edge-gemini-retrieval");

                  const strokeColor = isFlaggedEdge
                    ? "rgba(239, 68, 68, 0.45)"
                    : activePreset === "verified_dispatch"
                    ? "rgba(16, 185, 129, 0.4)"
                    : "rgba(56, 189, 248, 0.3)";

                  const particleColor = isFlaggedEdge
                    ? "#ef4444"
                    : activePreset === "verified_dispatch"
                    ? "#10b981"
                    : "#38bdf8";

                  const particleFilter = isFlaggedEdge
                    ? "url(#glow-red)"
                    : activePreset === "verified_dispatch"
                    ? "url(#glow-green)"
                    : "url(#glow-cyan)";

                  const durSec = (2.2 + (idx % 3) * 0.4) / simSpeed;

                  return (
                    <g key={edge.id}>
                      {/* Background Curve Stroke (Dotted like reference) */}
                      <path
                        id={edge.id}
                        d={pathD}
                        stroke={strokeColor}
                        strokeWidth="1.75"
                        strokeDasharray="4 4"
                      />

                      {/* Small Flowing Data Packet Nodes (3 per curve for continuous rhythm) */}
                      {isPlaying && (
                        <>
                          <circle r="3.5" fill={particleColor} filter={particleFilter}>
                            <animateMotion
                              dur={`${durSec}s`}
                              repeatCount="indefinite"
                              rotate="auto"
                            >
                              <mpath href={`#${edge.id}`} />
                            </animateMotion>
                          </circle>
                          <circle r="3.5" fill={particleColor} filter={particleFilter}>
                            <animateMotion
                              dur={`${durSec}s`}
                              begin={`${durSec * 0.33}s`}
                              repeatCount="indefinite"
                              rotate="auto"
                            >
                              <mpath href={`#${edge.id}`} />
                            </animateMotion>
                          </circle>
                          <circle r="3.5" fill={particleColor} filter={particleFilter}>
                            <animateMotion
                              dur={`${durSec}s`}
                              begin={`${durSec * 0.66}s`}
                              repeatCount="indefinite"
                              rotate="auto"
                            >
                              <mpath href={`#${edge.id}`} />
                            </animateMotion>
                          </circle>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Metric Correlation Pill Badges on the Curves matching reference image */}
              {FLOW_EDGES.filter((e) => e.pillBadge).map((edge) => {
                const posX = edge.badgeX ?? (edge.x1 + edge.x2) / 2;
                const posY = edge.badgeY ?? (edge.y1 + edge.y2) / 2;
                const badge = edge.pillBadge!;

                const isRedBadge =
                  badge.type === "red" ||
                  (activePreset === "deepfake_image" &&
                    (edge.id === "edge-synthid-gemini" || edge.id === "edge-fft-gemini"));

                const textVal = isRedBadge ? "-0.644" : badge.text;

                return (
                  <div
                    key={`badge-${edge.id}`}
                    className={`absolute z-20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight shadow-md border pointer-events-none transition-transform hover:scale-110 ${
                      isRedBadge
                        ? "bg-[#ef4444] text-white border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        : "bg-[#10b981] text-white border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    }`}
                    style={{
                      left: `${posX}px`,
                      top: `${posY}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {textVal}
                  </div>
                );
              })}

              {/* Interactive Node Cards Grid matching the Reference Design */}
              {FLOW_NODES.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isCenterHub = node.id === "node-gemini-claims";
                const payload = node.testPayloads[activePreset];

                const isFlagged = payload.status === "flagged" || payload.status === "contradicted";
                const isStepActive = isPlaying && node.column === (activeStep % 5) + 1;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`absolute z-20 rounded-xl cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                      isSelected
                        ? "ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] bg-[#13151f] border-cyan-500/50"
                        : isStepActive
                        ? "bg-[#141624] border-cyan-500/35 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                        : "bg-[#10121a]/95 hover:bg-[#151722] border-white/10 hover:border-white/20 shadow-lg"
                    } border`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                      padding: "10px 12px",
                    }}
                  >
                    {/* Top Row: Title on its own line & Engine tag beneath */}
                    <div>
                      <div className="flex flex-col gap-0.5 mb-1.5">
                        <span className="text-xs font-bold text-white tracking-tight leading-tight">
                          {node.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                          <span className="text-cyan-400/90 font-medium">{node.engine}</span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-400">{node.latencyMs}ms</span>
                          <ExternalLink size={10} className="text-zinc-500 ml-auto" />
                        </div>
                      </div>

                      {/* Sub-tag row matching reference: Metric (Input) · Sum */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-2">
                        <span className={isCenterHub ? "text-cyan-400 font-semibold" : "text-zinc-400"}>
                          {node.typeTag}
                        </span>
                        {activePreset === "verified_dispatch" ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            Verified
                          </span>
                        ) : activePreset === "satire_news" ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            Satire Match
                          </span>
                        ) : isFlagged ? (
                          <span className="text-cyan-400 font-medium flex items-center gap-1">
                            <Zap size={10} className="text-amber-400" />
                            Anomaly Caught
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            Pass
                          </span>
                        )}
                      </div>

                      {/* Progress Bar matching reference design: colorful execution status */}
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCenterHub
                              ? "bg-cyan-400"
                              : node.column === 1
                              ? "bg-sky-400"
                              : node.column === 2
                              ? "bg-purple-400"
                              : node.column === 4
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                          style={{ width: `${node.statusPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Micro Stats Table Row matching reference columns */}
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5 text-[9px] font-mono">
                      <div>
                        <span className="text-zinc-500 block truncate">{node.stats.label1}</span>
                        <span className="text-zinc-200 font-semibold block">{node.stats.val1}</span>
                        <span
                          className={`block text-[8px] ${
                            node.stats.isPos1 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {node.stats.diff1}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block truncate">{node.stats.label2}</span>
                        <span className="text-zinc-200 font-semibold block">{node.stats.val2}</span>
                        <span
                          className={`block text-[8px] ${
                            node.stats.isPos2 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {node.stats.diff2}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block truncate">{node.stats.label3}</span>
                        <span className="text-zinc-200 font-semibold block">{node.stats.val3}</span>
                        <span
                          className={`block text-[8px] ${
                            node.stats.isPos3 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {node.stats.diff3}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Zoom Controls in bottom-right corner matching user's reference */}
          <div className="absolute bottom-5 right-5 z-30 flex flex-col items-center bg-[#13151f] border border-white/15 rounded-xl shadow-2xl p-1 gap-1">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={handleResetZoom}
              title="Fit to Screen / Reset Zoom"
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Maximize2 size={15} />
            </button>
            <div className="text-[9px] font-mono text-zinc-400 pb-1 border-t border-white/10 pt-1 w-full text-center">
              {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        {/* Selected Node Technical Telemetry & Enclave Inspector */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0e14] p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: selectedNode.accentColor }}
              />
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedNode.title}</span>
                  <span className="text-xs font-mono font-normal text-zinc-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {selectedNode.typeTag}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedNode.subtitle}</p>
              </div>
            </div>

            {/* Clickable repository source code path */}
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 px-3 py-1.5 rounded-lg">
              <FileCode2 size={13} />
              <span>{selectedNode.codePath}</span>
            </div>
          </div>

          {/* Test Payload Live Execution Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Payload Forensic Signal</span>
              <div className="flex items-center gap-2">
                {payloadData.status === "verified" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 size={14} /> Verified Genuine Dispatch
                  </span>
                ) : payloadData.status === "flagged" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                    <Zap size={14} className="text-amber-400" /> Synthetic Anomaly Isolated (Caught)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <CheckCircle2 size={14} /> Satirical Assertion Identified
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed pt-1">{payloadData.readout}</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Hardware & Telemetry Log</span>
              <div className="font-mono text-xs text-zinc-300 bg-black/40 p-2.5 rounded-lg border border-white/5">
                {payloadData.telemetry}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Service Architecture Health</span>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Engine:</span>
                  <span className="text-white">{selectedNode.engine}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Service SLA:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> 100% Operational
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Latency:</span>
                  <span className="text-cyan-400 font-semibold">{selectedNode.latencyMs}ms</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Enclave:</span>
                  <span className="text-emerald-400 font-semibold">Zero Data Retention</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Architecture3D;
