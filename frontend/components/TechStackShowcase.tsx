"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ParallaxCard, ParallaxLayer } from "@/components/ui/parallax-card";
import { DecryptedText } from "@/components/ui/decrypted-text";
import {
  Activity,
  ArrowUpRight,
  Boxes,
} from "lucide-react";

interface TechItem {
  name: string;
  category: "ai" | "backend" | "frontend" | "infra";
  version: string;
  role: string;
  description: string;
  metric: string;
  badge: string;
  spotlightColor: string;
  docsUrl: string;
}

const TECH_STACK: TechItem[] = [
  // AI & ML
  {
    name: "Gemini 2.5 Flash Lite",
    category: "ai",
    version: "v2.5",
    role: "Core Claim Extraction & Schema Parser",
    description: "Strict JSON-mode proposition extraction and entity decomposition with sub-300ms time to first token.",
    metric: "~220ms p95 latency",
    badge: "Primary Semantic Model",
    spotlightColor: "rgba(59, 130, 246, 0.15)", // Blue
    docsUrl: "https://ai.google.dev",
  },
  {
    name: "Groq LLaMA-3.3-70B",
    category: "ai",
    version: "Versatile",
    role: "Ultra-Fast Fallback Deduplication",
    description: "LPUs deliver 500+ tokens/sec for instantaneous claim cross-referencing under high concurrent load.",
    metric: "520 tokens/sec",
    badge: "High-Throughput LPUs",
    spotlightColor: "rgba(249, 115, 22, 0.15)", // Orange
    docsUrl: "https://groq.com",
  },
  {
    name: "ONNX Runtime & PyTorch",
    category: "ai",
    version: "1.19",
    role: "Local Spectral & Visual Classifiers",
    description: "Embedded neural inference for FFT frequency anomaly detection, ELA compression analysis, and voice cloning.",
    metric: "18ms inference pass",
    badge: "Hardware Accelerated",
    spotlightColor: "rgba(238, 75, 43, 0.15)", // Red-Orange
    docsUrl: "https://onnxruntime.ai",
  },

  // Backend & Retrieval
  {
    name: "FastAPI & Python 3.12",
    category: "backend",
    version: "0.115 / 3.12",
    role: "Asynchronous Forensic Gateway",
    description: "Type-safe ASGI service with non-blocking concurrency, zero-persistence memory buffers, and Pydantic v2 schemas.",
    metric: "1,200 req/min/core",
    badge: "Zero-Persistence ASGI",
    spotlightColor: "rgba(16, 185, 129, 0.15)", // Emerald
    docsUrl: "https://fastapi.tiangolo.com",
  },
  {
    name: "C2PA Provenance SDK",
    category: "backend",
    version: "JUMBF v2",
    role: "Cryptographic Manifest Validation",
    description: "Hardware certificate binding parser verifying camera sensor identity, edits history, and content credentials.",
    metric: "X.509 Cryptographic Trust",
    badge: "Coalition Standard",
    spotlightColor: "rgba(14, 165, 233, 0.15)", // Sky
    docsUrl: "https://c2pa.org",
  },
  {
    name: "DuckDuckGo & Trafilatura",
    category: "backend",
    version: "2.3.0",
    role: "Autonomous Wire Consensus Scraper",
    description: "Instantaneous web triangulation across Reuters, AP, BBC, and wire feeds with stripped clutter and ads.",
    metric: "14+ Wires Cross-Checked",
    badge: "Consensus Engine",
    spotlightColor: "rgba(234, 179, 8, 0.15)", // Yellow
    docsUrl: "https://trafilatura.readthedocs.io",
  },
  {
    name: "Tweepy & X API v2",
    category: "backend",
    version: "v4.14",
    role: "Social Media Signal Triangulation",
    description: "Real-time timeline and thread verification to correlate disputed claims against eyewitness reporting.",
    metric: "<400ms stream lookup",
    badge: "Eyewitness Ground Truth",
    spotlightColor: "rgba(56, 189, 248, 0.15)", // Cyan
    docsUrl: "https://docs.tweepy.org",
  },

  // Frontend
  {
    name: "Next.js 16 (App Router)",
    category: "frontend",
    version: "16.3.5",
    role: "High-Performance SSR & Edge Hybrid",
    description: "Server Actions, route groups, dynamic metadata, zero-waterfall layouts, and optimized edge caching.",
    metric: "100 / 100 Lighthouse Performance",
    badge: "Active LTS Architecture",
    spotlightColor: "rgba(255, 255, 255, 0.12)", // White
    docsUrl: "https://nextjs.org",
  },
  {
    name: "React 19 Concurrent",
    category: "frontend",
    version: "19.2.8",
    role: "Deterministic State & Micro-Interactions",
    description: "React compiler optimizations, action transitions, and optimistic updates for smooth forensic workspace tabs.",
    metric: "60 FPS Render Loop",
    badge: "Latest Stable",
    spotlightColor: "rgba(97, 218, 251, 0.15)", // React Cyan
    docsUrl: "https://react.dev",
  },
  {
    name: "Tailwind CSS v4",
    category: "frontend",
    version: "v4.0+",
    role: "CSS-First Design Tokens",
    description: "Modern @theme variables, zero CSS bloat, instantaneous compiler builds, and custom forensic dark theme.",
    metric: "14kb gzip CSS",
    badge: "Next-Gen Styling",
    spotlightColor: "rgba(56, 189, 248, 0.15)", // Sky
    docsUrl: "https://tailwindcss.com",
  },
  {
    name: "Anime.js v4",
    category: "frontend",
    version: "v4.5.0",
    role: "3D Isometric Canvas Orchestration",
    description: "Declarative matrix transforms, spring easings, and exploded architectural slab interpolation.",
    metric: "GPU Hardware Accelerated",
    badge: "Kinetic Engine",
    spotlightColor: "rgba(244, 63, 94, 0.15)", // Rose
    docsUrl: "https://animejs.com",
  },
  {
    name: "React Bits Pro & Aceternity",
    category: "frontend",
    version: "Pro Suite",
    role: "Luminous WebGL Shaders & Arc Cursor",
    description: "Kinetic electric arc cursor trails, fluid reactive flame cards, and spotlight illumination overlays.",
    metric: "Hardware 60 FPS WebGL",
    badge: "Visual Excellence",
    spotlightColor: "rgba(168, 85, 247, 0.15)", // Purple
    docsUrl: "https://pro.reactbits.dev",
  },

  // Infra & Testing
  {
    name: "GitHub Actions CI/CD",
    category: "infra",
    version: "v4 Actions",
    role: "Automated Continuous Integration Matrix",
    description: "Dual-matrix pipeline: Node 22 TypeScript lint & build + Python 3.12 pytest unit and integration coverage.",
    metric: "15/15 Tests Passing",
    badge: "Quality Gate",
    spotlightColor: "rgba(34, 197, 94, 0.15)", // Green
    docsUrl: "https://github.com/features/actions",
  },
  {
    name: "Vercel Edge Platform",
    category: "infra",
    version: "Global CDN",
    role: "Zero-Cold-Start Global Distribution",
    description: "Multi-region edge execution for instantaneous frontend loads and direct API reverse proxying.",
    metric: "<25ms Global TTFB",
    badge: "Global Edge",
    spotlightColor: "rgba(255, 255, 255, 0.12)",
    docsUrl: "https://vercel.com",
  },
];

type CategoryFilter = "all" | "ai" | "backend" | "frontend" | "infra";

export function TechStackShowcase() {
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const filteredItems =
    filter === "all" ? TECH_STACK : TECH_STACK.filter((item) => item.category === filter);

  return (
    <div
      id="tech-stack"
      className="w-full bg-bg text-ink relative py-12 px-4 sm:px-8 lg:px-12 selection:bg-accent/20 scroll-mt-16"
    >
      {/* Background Architectural Grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:24px_24px] opacity-40"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1360px] relative z-10 flex flex-col gap-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-accent-soft border border-line text-xs font-mono tracking-wider text-ink-2">
              <Boxes size={14} className="text-accent" />
              <span>Architectural Stack · Production Manifest</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              Technologies Powering Veritas
            </h1>
            <p className="text-sm sm:text-base text-ink-2 max-w-2xl">
              Engineered with modern, production-grade frameworks for sub-second multimodal forensic inspection,
              dynamic consensus triangulation, and hardware-accelerated 60 FPS interfaces.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 text-xs font-mono text-ink-3">
            <div className="px-3.5 py-2 rounded-control bg-elev border border-line">
              <span className="text-ink-2 font-semibold">14</span> Modules
            </div>
            <div className="px-3.5 py-2 rounded-control bg-elev border border-line">
              <span className="text-real font-semibold">100%</span> Type-Safe
            </div>
            <div className="px-3.5 py-2 rounded-control bg-elev border border-line">
              <span className="text-accent font-semibold">0</span> AI Slop
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Technologies" },
            { id: "ai", label: "AI, LLMs & Neural Forensics" },
            { id: "backend", label: "Backend & Triangulation Engines" },
            { id: "frontend", label: "Frontend & Interactive 3D" },
            { id: "infra", label: "CI/CD & Cloud Infrastructure" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as CategoryFilter)}
              className={`px-4 py-2 rounded-control text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                filter === cat.id
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "bg-elev/70 text-ink-2 border border-line hover:border-line-strong hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Interactive Grid of Parallax Depth Cards with React Bits Decrypted Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <ParallaxCard
              key={item.name}
              glowColor={item.spotlightColor}
              maxTilt={12}
              mouseSensitivity={1.3}
              enableMagneticAttraction={true}
              enableDepthFog={true}
              className="flex flex-col justify-between h-full group"
            >
              {/* Card Top: Badges & Version with depth shift */}
              <ParallaxLayer depth={15} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono tracking-wider px-2.5 py-1 rounded bg-line/60 border border-line text-ink-2">
                    {item.badge}
                  </span>
                  <span className="text-xs font-mono text-ink-3">{item.version}</span>
                </div>
              </ParallaxLayer>

              {/* Card Middle: Tech Title & Description with higher depth shift */}
              <ParallaxLayer depth={35} className="space-y-3 my-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-white group-hover:text-accent transition-colors flex items-center justify-between">
                    <DecryptedText
                      text={item.name}
                      speed={35}
                      maxIterations={8}
                      className="text-white"
                      encryptedClassName="text-accent font-mono"
                    />
                    <a
                      href={item.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Official docs for ${item.name}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-white"
                    >
                      <ArrowUpRight size={16} />
                    </a>
                  </h3>
                  <div className="text-xs font-mono text-accent mt-1 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-real" />
                    <span>{item.role}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                  {item.description}
                </p>
              </ParallaxLayer>

              {/* Card Bottom: Metric & Category Tag with midground depth shift */}
              <ParallaxLayer depth={20} className="pt-4 mt-auto border-t border-line/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-ink">
                  <Activity size={13} className="text-real" />
                  <span>{item.metric}</span>
                </div>
                <span className="text-ink-3 uppercase text-[10px] tracking-wider">
                  {item.category}
                </span>
              </ParallaxLayer>
            </ParallaxCard>
          ))}
        </div>

        {/* Bottom Verification & Open Source Banner */}
        <div className="rounded-2xl border border-line bg-gradient-to-r from-elev/80 via-elev to-elev/80 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-semibold text-white">Continuous Integration & Automated Gates</h3>
            <p className="text-xs sm:text-sm text-ink-2 max-w-xl">
              Every commit is validated across our GitHub Actions matrix with TypeScript strict mode, ESLint,
              and 15 automated pytest verification suites before production deployment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/architecture"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-colors"
            >
              <span>Explore 3D Architecture</span>
              <ArrowUpRight size={15} />
            </Link>
            <Link
              href="/demo/workspace"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control bg-elev border border-line hover:border-line-strong text-ink text-xs sm:text-sm transition-colors"
            >
              <span>Live Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
