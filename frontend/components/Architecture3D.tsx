"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  BookOpen,
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
    x: 20,
    y: 35,
    width: 195,
    height: 114,
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
    x: 20,
    y: 168,
    width: 195,
    height: 114,
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
    x: 20,
    y: 301,
    width: 195,
    height: 114,
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
    x: 20,
    y: 434,
    width: 195,
    height: 114,
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
    x: 255,
    y: 75,
    width: 195,
    height: 115,
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
    x: 255,
    y: 218,
    width: 195,
    height: 115,
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
    x: 255,
    y: 361,
    width: 195,
    height: 115,
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
    x: 490,
    y: 190,
    width: 215,
    height: 155,
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
    x: 745,
    y: 135,
    width: 195,
    height: 120,
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
    x: 745,
    y: 300,
    width: 195,
    height: 120,
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
    x: 980,
    y: 75,
    width: 195,
    height: 115,
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
    x: 980,
    y: 218,
    width: 195,
    height: 115,
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
    x: 980,
    y: 361,
    width: 195,
    height: 115,
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
    x1: 215,
    y1: 92,
    x2: 255,
    y2: 132,
  },
  {
    id: "edge-frames-fft",
    sourceId: "node-frames",
    targetId: "node-onnx-fft",
    x1: 215,
    y1: 225,
    x2: 255,
    y2: 275,
  },
  {
    id: "edge-frames-synthid",
    sourceId: "node-frames",
    targetId: "node-synthid",
    x1: 215,
    y1: 225,
    x2: 255,
    y2: 418,
  },
  {
    id: "edge-acoustic-fft",
    sourceId: "node-acoustic",
    targetId: "node-onnx-fft",
    x1: 215,
    y1: 358,
    x2: 255,
    y2: 275,
  },
  {
    id: "edge-exif-c2pa",
    sourceId: "node-exif",
    targetId: "node-c2pa",
    x1: 215,
    y1: 491,
    x2: 255,
    y2: 132,
  },

  // Col 2 -> Col 3 (Convergence into North Star Hub)
  {
    id: "edge-c2pa-gemini",
    sourceId: "node-c2pa",
    targetId: "node-gemini-claims",
    x1: 450,
    y1: 132,
    x2: 490,
    y2: 267,
    badgeX: 470,
    badgeY: 200,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-fft-gemini",
    sourceId: "node-onnx-fft",
    targetId: "node-gemini-claims",
    x1: 450,
    y1: 275,
    x2: 490,
    y2: 267,
    badgeX: 470,
    badgeY: 271,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-synthid-gemini",
    sourceId: "node-synthid",
    targetId: "node-gemini-claims",
    x1: 450,
    y1: 418,
    x2: 490,
    y2: 267,
    badgeX: 470,
    badgeY: 343,
    pillBadge: { text: "-0.644", type: "red" },
  },

  // Col 3 -> Col 4 (Branching out from North Star Hub)
  {
    id: "edge-gemini-retrieval",
    sourceId: "node-gemini-claims",
    targetId: "node-retrieval",
    x1: 705,
    y1: 267,
    x2: 745,
    y2: 195,
    badgeX: 725,
    badgeY: 231,
    pillBadge: { text: "0.388", type: "green" },
  },
  {
    id: "edge-gemini-temporal",
    sourceId: "node-gemini-claims",
    targetId: "node-temporal",
    x1: 705,
    y1: 267,
    x2: 745,
    y2: 360,
    badgeX: 725,
    badgeY: 314,
    pillBadge: { text: "0.999", type: "green" },
  },

  // Col 4 -> Col 5 (Outcomes & Synthesis)
  {
    id: "edge-retrieval-bayesian",
    sourceId: "node-retrieval",
    targetId: "node-bayesian",
    x1: 940,
    y1: 195,
    x2: 980,
    y2: 132,
    badgeX: 960,
    badgeY: 164,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-retrieval-ledger",
    sourceId: "node-retrieval",
    targetId: "node-ledger",
    x1: 940,
    y1: 195,
    x2: 980,
    y2: 275,
    badgeX: 960,
    badgeY: 235,
    pillBadge: { text: "0.999", type: "green" },
  },
  {
    id: "edge-temporal-bayesian",
    sourceId: "node-temporal",
    targetId: "node-bayesian",
    x1: 940,
    y1: 360,
    x2: 980,
    y2: 132,
    badgeX: 955,
    badgeY: 246,
    pillBadge: { text: "0.998", type: "green" },
  },
  {
    id: "edge-temporal-dossier",
    sourceId: "node-temporal",
    targetId: "node-dossier",
    x1: 940,
    y1: 360,
    x2: 980,
    y2: 418,
    badgeX: 960,
    badgeY: 389,
    pillBadge: { text: "0.998", type: "green" },
  },
];

const CANVAS_WIDTH = 1180;
const CANVAS_HEIGHT = 580;

export function Architecture3D() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-gemini-claims");
  const [zoom, setZoom] = useState<number>(1.0);
  const [activeStep, setActiveStep] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState<number>(1);

  // Responsive auto-fit scaling so the entire flowchart fits with zero sideways scroll!
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const clientW = containerRef.current.clientWidth;
        const scale = Math.min(1, Math.max(0.4, (clientW - 4) / CANVAS_WIDTH));
        setFitScale(scale);
      }
    };
    updateSize();
    const obs = new ResizeObserver(updateSize);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Continuous rhythmic cycling of active step
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const totalPipelineLatency = FLOW_NODES.reduce((acc, n) => acc + n.latencyMs, 0);

  const handleZoomIn = () => setZoom((z) => Math.min(1.4, z + 0.1));
  const handleZoomOut = () => setZoom((z) => Math.max(0.7, z - 0.1));
  const handleResetZoom = () => setZoom(1.0);

  return (
    <div
      id="architecture"
      className="w-full bg-[#08090d] text-ink relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 selection:bg-accent/20 scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
              <Activity size={13} className="text-emerald-400 animate-pulse" />
              <span>SYSTEM ARCHITECTURE · CAUSAL DATAFLOW PIPELINE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              System Architecture Flowchart
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Causal DAG illustrating the end-to-end multimodal pipeline: parallel sensor forensics,
              central claim decomposition, independent wire triangulation, and calibrated Bayesian synthesis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span>12 Active Pipeline Nodes</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs font-mono text-cyan-400">
              <span>Bayesian Directed Acyclic Graph</span>
            </div>
          </div>
        </div>

        {/* The Exact Flowchart Canvas Container: Fits within page without horizontal scroll */}
        <div 
          ref={containerRef}
          className="rounded-3xl border border-white/15 bg-[#0b0c12] overflow-hidden shadow-2xl relative w-full"
        >
          {/* Canvas Top Bar */}
          <div className="px-5 py-3 border-b border-white/10 bg-[#0f1018] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-zinc-200 font-medium tracking-wide truncate">
                Multimodal Deepfake & Wire Verification Pipeline
              </span>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-400 text-[11px]">
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
                <span className="text-zinc-600">·</span>
                <span className="text-cyan-400 font-medium">{totalPipelineLatency}ms DAG Latency</span>
              </div>

              {/* Top View Indicator */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-[11px] text-zinc-300">
                <span>View:</span>
                <strong className="text-white font-semibold">Causal DAG</strong>
              </div>
            </div>
          </div>

          {/* Canvas Viewport Area: Responsive auto-scaling with zero sideways scroll */}
          <div 
            className={`relative w-full ${zoom > 1.05 ? "overflow-x-auto" : "overflow-hidden"} overflow-y-hidden select-none`}
            style={{
              height: `${Math.round(CANVAS_HEIGHT * fitScale * zoom)}px`,
            }}
          >
            <div
              ref={canvasRef}
              className="relative origin-top-left transition-transform duration-150 ease-out"
              style={{
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                transform: `scale(${fitScale * zoom})`,
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
              <div className="absolute top-2 inset-x-0 h-6 text-[10px] font-mono tracking-wider uppercase text-zinc-400 pointer-events-none">
                <span style={{ position: "absolute", left: "20px", width: "195px" }}>01 · Ingestion & Sensors</span>
                <span style={{ position: "absolute", left: "255px", width: "195px" }}>02 · Forensic Analyzers</span>
                <span style={{ position: "absolute", left: "490px", width: "215px" }} className="text-cyan-400 font-semibold text-center">
                  03 · Decomposition Hub
                </span>
                <span style={{ position: "absolute", left: "745px", width: "195px" }}>04 · Wire Triangulation</span>
                <span style={{ position: "absolute", left: "980px", width: "195px" }} className="text-emerald-400 font-semibold text-right">
                  05 · Bayesian Verdict
                </span>
              </div>

              {/* SVG Layer: Connecting Bezier Splines, Flowing Animated Small Nodes, and Metric Badges */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 1180 580"
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
                  d="M 450 132 C 600 30, 850 30, 980 132"
                  stroke="rgba(168, 85, 247, 0.22)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <circle r="3" fill="#c084fc" filter="url(#glow-cyan)">
                  <animateMotion
                    dur="4.2s"
                    repeatCount="indefinite"
                    rotate="auto"
                  >
                    <mpath href="#path-bypass" />
                  </animateMotion>
                </circle>
                <circle r="3" fill="#c084fc" filter="url(#glow-cyan)">
                  <animateMotion
                    dur="4.2s"
                    begin="2.1s"
                    repeatCount="indefinite"
                    rotate="auto"
                  >
                    <mpath href="#path-bypass" />
                  </animateMotion>
                </circle>

                {/* Render All Connecting Bezier Curves with Animated Small Nodes */}
                {FLOW_EDGES.map((edge, idx) => {
                  const dx = edge.x2 - edge.x1;
                  const cx1 = edge.x1 + dx * 0.5;
                  const cx2 = edge.x2 - dx * 0.5;
                  const pathD = `M ${edge.x1} ${edge.y1} C ${cx1} ${edge.y1}, ${cx2} ${edge.y2}, ${edge.x2} ${edge.y2}`;

                  const strokeColor = "rgba(56, 189, 248, 0.35)";
                  const particleColor = "#38bdf8";
                  const particleFilter = "url(#glow-cyan)";
                  const durSec = 2.4 + (idx % 3) * 0.4;

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
                    </g>
                  );
                })}
              </svg>

              {/* Metric Correlation Pill Badges on the Curves matching reference image */}
              {FLOW_EDGES.filter((e) => e.pillBadge).map((edge) => {
                const posX = edge.badgeX ?? (edge.x1 + edge.x2) / 2;
                const posY = edge.badgeY ?? (edge.y1 + edge.y2) / 2;
                const badge = edge.pillBadge!;
                const isRedBadge = badge.type === "red";
                const textVal = badge.text;

                return (
                  <div
                    key={`badge-${edge.id}`}
                    className={`absolute z-20 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight shadow-md border pointer-events-none transition-transform hover:scale-110 ${
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
                const isStepActive = node.column === (activeStep % 5) + 1;

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
                      padding: "8px 10px",
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

                      {/* Sub-tag row: Modality/Role tag & Active status pill */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-2">
                        <span className={isCenterHub ? "text-cyan-400 font-semibold" : "text-zinc-400"}>
                          {node.typeTag}
                        </span>
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Active
                        </span>
                      </div>

                      {/* Progress Bar matching reference design: architectural status */}
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
      </div>
    </div>
  );
}

export default Architecture3D;
