"use client";

import React, { useState } from "react";
import { ParallaxCards, type ParallaxCardItem } from "@/components/ui/parallax-cards";
import { Boxes, Layers, LayoutGrid } from "lucide-react";

type CategoryFilter = "all" | "ai" | "backend" | "frontend" | "infra";
type ViewMode = "3d_deck" | "grid";

const TECH_STACK: ParallaxCardItem[] = [
  // AI & ML
  {
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash Lite",
    category: "ai",
    version: "v2.5",
    role: "Core Claim Extraction & Schema Parser",
    description: "Strict JSON-mode proposition extraction and entity decomposition with sub-300ms time to first token.",
    metric: "~220ms p95 latency",
    badge: "Primary Semantic Model",
    spotlightColor: "rgba(59, 130, 246, 0.15)",
    docsUrl: "https://ai.google.dev",
  },
  {
    id: "groq-llama-3-3",
    name: "Groq LLaMA-3.3-70B",
    category: "ai",
    version: "Versatile",
    role: "Ultra-Fast Fallback Deduplication",
    description: "LPUs deliver 500+ tokens/sec for instantaneous claim cross-referencing under high concurrent load.",
    metric: "520 tokens/sec",
    badge: "High-Throughput LPUs",
    spotlightColor: "rgba(249, 115, 22, 0.15)",
    docsUrl: "https://groq.com",
  },
  {
    id: "onnx-pytorch",
    name: "ONNX Runtime & PyTorch",
    category: "ai",
    version: "1.19",
    role: "Local Spectral & Visual Classifiers",
    description: "Embedded neural inference for FFT frequency anomaly detection, ELA compression analysis, and voice cloning.",
    metric: "18ms inference pass",
    badge: "Hardware Accelerated",
    spotlightColor: "rgba(238, 75, 43, 0.15)",
    docsUrl: "https://onnxruntime.ai",
  },

  // Backend & Retrieval
  {
    id: "fastapi-python",
    name: "FastAPI & Python 3.12",
    category: "backend",
    version: "0.115 / 3.12",
    role: "Asynchronous Forensic Gateway",
    description: "Type-safe ASGI service with non-blocking concurrency, zero-persistence memory buffers, and Pydantic v2 schemas.",
    metric: "1,200 req/min/core",
    badge: "Zero-Persistence ASGI",
    spotlightColor: "rgba(16, 185, 129, 0.15)",
    docsUrl: "https://fastapi.tiangolo.com",
  },
  {
    id: "c2pa-provenance",
    name: "C2PA Provenance SDK",
    category: "backend",
    version: "JUMBF v2",
    role: "Cryptographic Manifest Validation",
    description: "Hardware certificate binding parser verifying camera sensor identity, edits history, and content credentials.",
    metric: "X.509 Cryptographic Trust",
    badge: "Coalition Standard",
    spotlightColor: "rgba(14, 165, 233, 0.15)",
    docsUrl: "https://c2pa.org",
  },
  {
    id: "duckduckgo-trafilatura",
    name: "DuckDuckGo & Trafilatura",
    category: "backend",
    version: "2.3.0",
    role: "Autonomous Wire Consensus Scraper",
    description: "Instantaneous web triangulation across Reuters, AP, BBC, and wire feeds with stripped clutter and ads.",
    metric: "14+ Wires Cross-Checked",
    badge: "Consensus Engine",
    spotlightColor: "rgba(234, 179, 8, 0.15)",
    docsUrl: "https://trafilatura.readthedocs.io",
  },
  {
    id: "tweepy-x-api",
    name: "Tweepy & X API v2",
    category: "backend",
    version: "v4.14",
    role: "Social Media Signal Triangulation",
    description: "Real-time timeline and thread verification to correlate disputed claims against eyewitness reporting.",
    metric: "<400ms stream lookup",
    badge: "Eyewitness Ground Truth",
    spotlightColor: "rgba(56, 189, 248, 0.15)",
    docsUrl: "https://www.tweepy.org",
  },

  // Frontend & UI
  {
    id: "nextjs-16",
    name: "Next.js 16 (App Router)",
    category: "frontend",
    version: "16.3.5",
    role: "High-Performance SSR & Edge Hybrid",
    description: "Server Actions, route groups, dynamic metadata, zero-waterfall layouts, and optimized edge caching.",
    metric: "100 / 100 Lighthouse",
    badge: "Active LTS Architecture",
    spotlightColor: "rgba(255, 255, 255, 0.15)",
    docsUrl: "https://nextjs.org",
  },
  {
    id: "react-19",
    name: "React 19 Concurrent",
    category: "frontend",
    version: "19.2.8",
    role: "Deterministic State & Micro-Interactions",
    description: "React compiler optimizations, action transitions, and optimistic updates for smooth forensic workspace tabs.",
    metric: "60 FPS Render Loop",
    badge: "Latest Stable",
    spotlightColor: "rgba(97, 218, 251, 0.15)",
    docsUrl: "https://react.dev",
  },
  {
    id: "tailwind-css-v4",
    name: "Tailwind CSS v4",
    category: "frontend",
    version: "v4.0+",
    role: "CSS-First Design Tokens",
    description: "Modern @theme variables, zero CSS bloat, instantaneous compiler builds, and custom forensic dark theme.",
    metric: "14kb gzip CSS",
    badge: "Next-Gen Styling",
    spotlightColor: "rgba(56, 189, 248, 0.15)",
    docsUrl: "https://tailwindcss.com",
  },
  {
    id: "animejs-v4",
    name: "Anime.js v4",
    category: "frontend",
    version: "v4.5.0",
    role: "3D Isometric Canvas Orchestration",
    description: "Declarative matrix transforms, spring easings, and exploded architectural slab interpolation.",
    metric: "GPU Hardware Accelerated",
    badge: "Kinetic Engine",
    spotlightColor: "rgba(244, 63, 94, 0.15)",
    docsUrl: "https://animejs.com",
  },
  {
    id: "webgl-shaders",
    name: "WebGL Shader Engine",
    category: "frontend",
    version: "Hardware 60 FPS",
    role: "Luminous Flame & Arc Cursor Effects",
    description: "Custom WebGL fragments powering interactive swirling flames, arc cursor discharges, and dither waves.",
    metric: "Zero Dropped Frames",
    badge: "Visual Excellence",
    spotlightColor: "rgba(168, 85, 247, 0.15)",
    docsUrl: "https://ui.aceternity.com",
  },

  // Infra & Testing
  {
    id: "github-actions",
    name: "GitHub Actions CI/CD",
    category: "infra",
    version: "v4 Actions",
    role: "Automated Continuous Integration Matrix",
    description: "Dual-matrix pipeline: Node 22 TypeScript lint & build + Python 3.12 pytest unit and integration coverage.",
    metric: "15/15 Tests Passing",
    badge: "Quality Gate",
    spotlightColor: "rgba(34, 197, 94, 0.15)",
    docsUrl: "https://github.com/features/actions",
  },
  {
    id: "vercel-edge",
    name: "Vercel Edge Platform",
    category: "infra",
    version: "Global CDN",
    role: "Zero-Cold-Start Global Distribution",
    description: "Multi-region edge execution for instantaneous frontend loads and direct API reverse proxying.",
    metric: "<25ms Global TTFB",
    badge: "Global Edge",
    spotlightColor: "rgba(168, 85, 247, 0.15)",
    docsUrl: "https://vercel.com",
  },
];

export function TechStackShowcase() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("3d_deck");

  const filteredItems = TECH_STACK.filter(
    (item) => filter === "all" || item.category === filter
  );

  return (
    <div
      id="tech-stack"
      className="w-full bg-bg text-ink relative py-16 px-4 sm:px-8 lg:px-12 selection:bg-accent/20 scroll-mt-20"
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

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Clean, Non-Repetitive Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-accent-soft border border-line text-xs font-mono tracking-wider text-ink-2">
              <Boxes size={14} className="text-accent" />
              <span>Architectural Stack · Production Manifest</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              Technologies Powering Veritas
            </h2>
            <p className="text-sm sm:text-base text-ink-2 max-w-2xl leading-relaxed">
              Engineered with modern, production-grade frameworks for sub-second multimodal forensic inspection,
              dynamic consensus triangulation, and hardware-accelerated 60 FPS interfaces.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex p-1 rounded-control bg-elev border border-line self-start md:self-auto">
            <button
              onClick={() => setViewMode("3d_deck")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                viewMode === "3d_deck"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-ink-2 hover:text-white"
              }`}
            >
              <Layers size={13} />
              <span>3D Parallax Deck</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-ink-2 hover:text-white"
              }`}
            >
              <LayoutGrid size={13} />
              <span>All Modules Grid</span>
            </button>
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

        {/* Primary View: 3D Parallax Cards Layered Deck */}
        {viewMode === "3d_deck" ? (
          <ParallaxCards
            key={filter}
            items={filteredItems}
            cardWidth={380}
            cardHeight={300}
            perspective={2500}
            mouseSensitivity={3.0}
            enableDepthFog={true}
            enableMagneticAttraction={true}
          />
        ) : (
          /* Secondary View: Clean Flat Module Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-line bg-elev/60 p-6 flex flex-col justify-between hover:border-line-strong transition-all duration-200"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono tracking-wider px-2.5 py-1 rounded bg-line/60 border border-line text-ink-2">
                      {item.badge}
                    </span>
                    <span className="text-xs font-mono text-ink-3">{item.version}</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-white flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.docsUrl && (
                        <a
                          href={item.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Official documentation for ${item.name}`}
                          className="text-xs font-mono text-ink-3 hover:text-white px-2 py-0.5 rounded bg-line/40 hover:bg-line transition-colors"
                        >
                          Docs &nearr;
                        </a>
                      )}
                    </h3>
                    <div className="text-xs font-mono text-accent mt-1 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-real" />
                      <span>{item.role}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-5 border-t border-line/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-ink">{item.metric}</span>
                  <span className="text-ink-3 uppercase text-[10px] tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TechStackShowcase;
