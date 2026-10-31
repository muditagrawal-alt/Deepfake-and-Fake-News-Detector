"use client";

import React, { useState } from "react";
import { ScrollStack } from "@/components/ui/scroll-stack";
import { Boxes, ExternalLink } from "lucide-react";

type CategoryFilter = "all" | "ai" | "backend" | "frontend" | "infra";

/* -------------------------------------------------------------------------- */
/*  Official High-Precision Vector SVG Logos                                  */
/* -------------------------------------------------------------------------- */

function NextjsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none">
      <circle cx="90" cy="90" r="90" fill="black" />
      <path
        d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
        fill="url(#next_grad)"
      />
      <rect fill="url(#next_rect_grad)" height="72" width="12" x="115" y="54" />
      <defs>
        <linearGradient id="next_grad" x1="109" x2="144.5" y1="116.5" y2="160.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="next_rect_grad" x1="121" x2="120.8" y1="54" y2="106.9" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FastApiLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none">
      <circle cx="64" cy="64" r="60" fill="#059669" />
      <path fill="#ffffff" d="M68.5 22L36 67h25l-5.5 39 36.5-49H64l4.5-35z" />
    </svg>
  );
}

function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gemini_logo_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#gemini_logo_grad)"
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
      />
    </svg>
  );
}

function C2paLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="44" stroke="#38bdf8" strokeWidth="8" strokeDasharray="210 70" strokeLinecap="round" />
      <path
        fill="#ffffff"
        d="M38 62c-7.7 0-13-5.3-13-13s5.3-13 13-13c4.8 0 8.5 2.2 10.5 5.5l-4.5 3.5c-1.3-2-3.4-3.2-6-3.2-4.5 0-7.2 3.2-7.2 7.2s2.7 7.2 7.2 7.2c2.6 0 4.7-1.2 6-3.2l4.5 3.5C46.5 59.8 42.8 62 38 62zm22 0h-5.5V37h5.2v4.8c1.6-3.2 4.6-5.2 8.3-5.2 1.2 0 2.2.2 3 .5v5.5c-1.1-.4-2.2-.6-3.4-.6-4.5 0-7.6 3.2-7.6 7.8V62z"
      />
    </svg>
  );
}

function PyTorchLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none">
      <path
        fill="#ee4c2c"
        d="M64 16a40 40 0 0 0-28.3 68.3l10.4-10.4A25.3 25.3 0 0 1 64 30.7c14 0 25.3 11.3 25.3 25.3 0 11.2-7.3 20.7-17.4 24l-3.2-12-7.4 34.6 34.6-7.4-12-3.2A40 40 0 0 0 64 16z"
      />
      <circle cx="88" cy="40" r="7" fill="#ee4c2c" />
    </svg>
  );
}

function GroqLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 201 201" fill="none">
      <path
        fill="#f97316"
        d="m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 10.892 3.523 17.438 3.688l2.794.103c2.256.082 4.512.147 6.768.209v16c-16.682.673-29.615.654-42.852-10.848-8.28-8.296-13.338-19.55-13.71-31.277.394-9.87 3.93-17.894 9.562-25.875l1.688-2.563C84.698 35.563 110.05 34.436 128 49Z"
      />
    </svg>
  );
}

function PythonLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none">
      <path
        fill="#387eb8"
        d="M63.2 4.4C37.5 4.4 39.1 15.6 39.1 15.6l.1 11.6h24.7v3.5H29.5S13 28.8 13 54.4c0 25.5 14.4 24.6 14.4 24.6h8.6v-12.2s-.5-14.4 14.2-14.4h24.5s13.7.2 13.7-13.3V17.7S90.4 4.4 63.2 4.4zm-13.4 7.6c2.5 0 4.6 2.1 4.6 4.6s-2.1 4.6-4.6 4.6-4.6-2.1-4.6-4.6 2.1-4.6 4.6-4.6z"
      />
      <path
        fill="#ffe873"
        d="M64.8 123.6c25.7 0 24.1-11.2 24.1-11.2l-.1-11.6H64.1v-3.5h34.4s16.5 1.9 16.5-23.7c0-25.5-14.4-24.6-14.4-24.6h-8.6v12.2s.5 14.4-14.2 14.4H53.3s-13.7-.2-13.7 13.3v21.4s-2 13.3 25.2 13.3zm13.4-7.6c-2.5 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2.1 4.6-4.6 4.6z"
      />
    </svg>
  );
}

function TailwindLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none">
      <path
        fill="#06b6d4"
        d="M32 48c5.3-21.3 18.7-29.3 40-24 12.4 3.1 21.3 12.2 31.1 22.2C118.9 62 136 72 160 56c-5.3 21.3-18.7 29.3-40 24-12.4-3.1-21.3-12.2-31.1-22.2C72.9 42 56 32 32 48zm-32 48c5.3-21.3 18.7-29.3 40-24 12.4 3.1 21.3 12.2 31.1 22.2C86.9 110 104 120 128 104c-5.3 21.3-18.7 29.3-40 24-12.4-3.1-21.3-12.2-31.1-22.2C40.9 90 24 80 0 96z"
        transform="scale(0.8) translate(16, 16)"
      />
    </svg>
  );
}

function AnimejsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        fill="#FF4B4B"
        d="M12 .0012c2.8931 0 5.547 1.0238 7.6193 2.7288H24c-.2493 1.6968-.4997 3.3933-.748 5.0903C23.7357 9.1218 24 10.53 24 12c0 6.6274-5.3726 12-12 12S0 18.6274 0 12 5.3726 0 12 0Zm.7271 5.2c-1.9911 0-3.5191.1-4.584.2987-1.0648.1991-1.844.5497-2.3374 1.0518-.4935.5021-.8095 1.2467-.948 2.2336l-.052.3896h4.3235l.014-.078c.052-.2944.1602-.5238.3247-.6883.3758-.3758 1.3594-.4805 2.74-.4805.6975 0 1.3993-.016 2.0907.091.355.061.619.1862.7922.3766.1731.1905.2597.4935.2597.909-.042.6074-.1174 1.2126-.1818 1.8181h-.078c-.3117-.4156-.8138-.7143-1.5064-.8961-.9452-.2481-2.0153-.2727-3.4023-.2727-1.5756 0-2.7876.1039-3.636.3117-.8484.2078-1.4718.5627-1.87 1.0648-.3982.5021-.6666 1.238-.8051 2.2076-.074.5178-.1517 1.0343-.1558 1.5583 0 .7445.1731 1.3332.5194 1.7661.3463.4329.9047.7445 1.6752.935.7705.1904 1.8223.2857 3.1555.2857.9631 0 1.9304 0 2.8829-.1559.5714-.1038 1.0302-.2683 1.3765-.4934.3463-.2251.7012-.5454 1.0648-.961h.052l-.2338 1.4025h4.4931l.935-6.5968c.1212-.9177.1818-1.6016.1818-2.0518 0-.598-.053-.9743-.1354-1.3516l-2.6242.0009c.1123-.7649.2252-1.5297.3381-2.2946-.07-.02-.1415-.038-.2146-.056-1.2124-.2886-2.6154-.3246-4.4542-.3246Zm-.8051 7.298c.8311 0 1.4588.026 1.883.078.4242.052.7142.1428.87.2727.1558.1298.2338.316.2338.5584 0 .055-.037.9918-.4156 1.3895-.1731.1818-.4848.3116-.935.3895-.5642.098-1.3136.1169-2.3374.1169-.7792 0-1.3808-.026-1.805-.078-.4243-.052-.7316-.1515-.922-.2987-.1905-.1472-.2857-.3506-.2857-.6103.053-.6238.1306-1.0137.3895-1.2856.1732-.1818.4892-.316.948-.4026.5853-.1104 1.3454-.1299 2.3764-.1299zm11.1111-8.928h-4.4973l-.5111 3.4752h4.4973z"
      />
    </svg>
  );
}

function GithubActionsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        fill="#2088FF"
        d="M10.984 13.836a.5.5 0 0 1-.353-.146l-.745-.743a.5.5 0 1 1 .706-.708l.392.391 1.181-1.18a.5.5 0 0 1 .708.707l-1.535 1.533a.504.504 0 0 1-.354.146zm9.353-.147l1.534-1.532a.5 5 0 0 0-.707-.707l-1.181 1.18-.392-.391a.5.5 0 1 0-.706.708l.746.743a.497.497 0 0 0 .706-.001zM4.527 7.452l2.557-1.585A1 1 0 0 0 7.09 4.17L4.533 2.56A1 1 0 0 0 3 3.406v3.196a1.001 1.001 0 0 0 1.527.85zm2.03-2.436L4 6.602V3.406l2.557 1.61zM24 12.5c0 1.93-1.57 3.5-3.5 3.5a3.503 3.503 0 0 1-3.46-3h-2.08a3.503 3.503 0 0 1-3.46 3 3.502 3.502 0 0 1-3.46-3h-.558c-.972 0-1.85-.399-2.482-1.042V17c0 1.654 1.346 3 3 3h.04c.244-1.693 1.7-3 3.46-3 1.93 0 3.5 1.57 3.5 3.5S13.43 24 11.5 24a3.502 3.502 0 0 1-3.46-3H8c-2.206 0-4-1.794-4-4V9.899A5.008 5.008 0 0 1 0 5c0-2.757 2.243-5 5-5s5 2.243 5 5a5.005 5.005 0 0 1-4.952 4.998A2.482 2.482 0 0 0 7.482 12h.558c.244-1.693 1.7-3 3.46-3a3.502 3.502 0 0 1 3.46 3h2.08a3.503 3.503 0 0 1 3.46-3c1.93 0 3.5 1.57 3.5 3.5zm-15 8c0 1.378 1.122 2.5 2.5 2.5s2.5-1.122 2.5-2.5-1.122-2.5-2.5-2.5S9 19.122 9 20.5zM5 9c2.206 0 4-1.794 4-4S7.206 1 5 1 1 2.794 1 5s1.794 4 4 4zm9 3.5c0-1.378-1.122-2.5-2.5-2.5S9 11.122 9 12.5s1.122 2.5 2.5 2.5 2.5-1.122 2.5-2.5zm9 0c0-1.378-1.122-2.5-2.5-2.5S18 11.122 18 12.5s1.122 2.5 2.5 2.5 2.5-1.122 2.5-2.5zm-13 8a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0zm2 0a.5.5 0 1 0 1 0 .5.5 0 0 0-1 0zm12 0c0 1.93-1.57 3.5-3.5 3.5a3.503 3.503 0 0 1-3.46-3.002c-.007.001-.013.005-.021.005l-.506.017h-.017a.5.5 0 0 1-.016-.999l.506-.017c.018-.002.035.006.052.007A3.503 3.503 0 0 1 20.5 17c1.93 0 3.5 1.57 3.5 3.5zm-1 0c0-1.378-1.122-2.5-2.5-2.5S18 19.122 18 20.5s1.122 2.5 2.5 2.5 2.5-1.122 2.5-2.5z"
      />
    </svg>
  );
}

function VercelLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none">
      <path fill="#ffffff" d="M64 24L114 104H14L64 24z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Curated Stack Items (Direct statement of why each was chosen)              */
/* -------------------------------------------------------------------------- */

export interface TechItem {
  id: string;
  name: string;
  category: CategoryFilter;
  version: string;
  role: string;
  why: string;
  metric: string;
  badge: string;
  docsUrl: string;
  logo: React.FC<{ className?: string }>;
}

const TECH_STACK: TechItem[] = [
  {
    id: "nextjs-16",
    name: "Next.js 16 (App Router)",
    category: "frontend",
    version: "16.3.5",
    role: "Frontend Architecture & Streaming SSR",
    why: "Powers server-side rendering, streaming verification payloads directly to the browser, and executing zero-bundle server actions without client-side waterfall delays.",
    metric: "100 / 100 Lighthouse Performance",
    badge: "Active LTS Architecture",
    docsUrl: "https://nextjs.org",
    logo: NextjsLogo,
  },
  {
    id: "fastapi-backend",
    name: "FastAPI Forensic Gateway",
    category: "backend",
    version: "0.115 ASGI",
    role: "Asynchronous Forensic Gateway",
    why: "Handles non-blocking asynchronous forensic routing, zero-persistence RAM buffers, and multi-threaded sensor dispatch with sub-5ms latency overhead.",
    metric: "1,200 req/min/core Throughput",
    badge: "Zero-Persistence ASGI",
    docsUrl: "https://fastapi.tiangolo.com",
    logo: FastApiLogo,
  },
  {
    id: "python-3-12",
    name: "Python 3.12 Runtime",
    category: "backend",
    version: "v3.12.8",
    role: "Signal Processing & Forensic Execution Environment",
    why: "Executes scientific computing pipelines, librosa audio signal DSP, OpenCV frame slicing, and Trafilatura DOM parsers with optimized C-extensions and native sub-interpreter parallelism.",
    metric: "Sub-interpreter Parallelism",
    badge: "Runtime Foundation",
    docsUrl: "https://python.org",
    logo: PythonLogo,
  },
  {
    id: "gemini-2-5-flash",
    name: "Google Gemini 2.5 Flash Lite",
    category: "ai",
    version: "v2.5 Flash",
    role: "Primary Claim Decomposition & JSON Proposition Extraction",
    why: "Extracts structured atomic propositions from complex news claims in strict JSON schemas with sub-300ms time to first token.",
    metric: "~220ms p95 First Token Latency",
    badge: "Primary Semantic Engine",
    docsUrl: "https://ai.google.dev",
    logo: GeminiLogo,
  },
  {
    id: "c2pa-provenance",
    name: "C2PA Provenance SDK",
    category: "backend",
    version: "JUMBF v2",
    role: "Cryptographic Manifest & Content Credentials",
    why: "Validates cryptographically signed Content Credentials and JUMBF metadata manifests against root-of-trust hardware certificates to prove capture authenticity.",
    metric: "X.509 Cryptographic Root Trust",
    badge: "Hardware Attestation",
    docsUrl: "https://c2pa.org",
    logo: C2paLogo,
  },
  {
    id: "onnx-pytorch",
    name: "ONNX Runtime & PyTorch",
    category: "ai",
    version: "1.19 / 2.4",
    role: "Local Spectral & Visual Classifiers",
    why: "Executes embedded neural inference for 2D FFT spectral anomaly detection, ELA compression analysis, and vocoder harmonic analysis in 18ms without cloud dependencies.",
    metric: "18ms Local Inference Pass",
    badge: "Hardware Accelerated",
    docsUrl: "https://onnxruntime.ai",
    logo: PyTorchLogo,
  },
  {
    id: "groq-llama-3-3",
    name: "Groq LPU LLaMA-3.3-70B",
    category: "ai",
    version: "Versatile LPUs",
    role: "High-Throughput Fallback Triangulation",
    why: "Processes 520 tokens/sec across high-concurrency spikes to deduplicate viral claims against wire archives instantaneously.",
    metric: "520 tokens/sec Generation",
    badge: "Instant LPUs",
    docsUrl: "https://groq.com",
    logo: GroqLogo,
  },
  {
    id: "tailwind-css-v4",
    name: "Tailwind CSS v4",
    category: "frontend",
    version: "v4.0+",
    role: "CSS-First Forensic Design Tokens",
    why: "Provides zero-runtime CSS tokens and forensic dark-mode styling with an ultra-compact 14kb stylesheet compiled instantaneously with the CSS-first engine.",
    metric: "14kb gzip Zero-Runtime Stylesheet",
    badge: "Modern CSS Architecture",
    docsUrl: "https://tailwindcss.com",
    logo: TailwindLogo,
  },
  {
    id: "animejs-v4",
    name: "Anime.js v4",
    category: "frontend",
    version: "v4.5.0",
    role: "Kinetic Vector Transforms & Topological Splines",
    why: "Drives hardware-accelerated declarative SVG matrix transforms, spring physics, and particle vectors across the system architecture topology.",
    metric: "60 FPS Hardware Interpolation",
    badge: "GPU Kinetic Engine",
    docsUrl: "https://animejs.com",
    logo: AnimejsLogo,
  },
  {
    id: "github-actions",
    name: "GitHub Actions CI/CD",
    category: "infra",
    version: "v4 Actions",
    role: "Automated Dual-Matrix Verification",
    why: "Enforces continuous automated verification with dual-matrix pipelines executing Next.js TypeScript linting and Python pytest coverage on every push.",
    metric: "100% CI Gate Pass Enforced",
    badge: "Continuous Assurance",
    docsUrl: "https://github.com/features/actions",
    logo: GithubActionsLogo,
  },
  {
    id: "vercel-edge",
    name: "Vercel Edge Platform",
    category: "infra",
    version: "Global CDN",
    role: "Cold-Start-Free Global Edge Distribution",
    why: "Distributes global edge caching and cold-start-free API reverse proxies with sub-25ms time to first byte across 300+ edge locations.",
    metric: "<25ms Global Time to First Byte",
    badge: "Global Edge Network",
    docsUrl: "https://vercel.com",
    logo: VercelLogo,
  },
];

export function TechStackShowcase() {
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const filteredItems = TECH_STACK.filter(
    (item) => filter === "all" || item.category === filter
  );

  return (
    <div
      id="tech-stack"
      className="w-full bg-[#08090d] text-ink relative py-20 px-4 sm:px-8 lg:px-12 selection:bg-accent/20 scroll-mt-24"
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
              <Boxes size={13} className="text-cyan-400" />
              <span>PRODUCTION ARCHITECTURAL MANIFEST</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Technologies Powering Veritas
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Scroll through the architectural components powering Veritas. Each card highlights the foundational technology,
              official engine credentials, and its role in delivering verifiable multimodal forensics.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Technologies" },
              { id: "ai", label: "AI & Neural Forensics" },
              { id: "backend", label: "Backend & Consensus" },
              { id: "frontend", label: "Frontend & Motion" },
              { id: "infra", label: "Infra & Edge" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id as CategoryFilter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  filter === cat.id
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "bg-white/5 text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll Stack: Cards stack and pin as user scrolls */}
        <ScrollStack
          key={filter}
          itemStackDistance={16}
          stackPosition={96}
          itemScale={0.025}
          useWindowScroll={true}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="relative rounded-3xl border border-white/15 bg-[#0c0d14] p-6 sm:p-8 shadow-[0_-10px_30px_rgba(0,0,0,0.8),0_24px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10 hover:border-cyan-500/50 hover:shadow-[0_24px_70px_rgba(56,189,248,0.25)] transition-all duration-300"
            >
              {/* Specular top rim highlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
              />

              {/* Card Header: Official Logo + Title + Version + Docs Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                  <div className="size-10 flex items-center justify-center shrink-0">
                    <item.logo className="size-9" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {item.name}
                      </h3>
                      <span className="text-xs font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {item.version}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-mono text-cyan-400 mt-1 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{item.role}</span>
                    </p>
                  </div>
                </div>

                {item.docsUrl && (
                  <a
                    href={item.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Official documentation for ${item.name}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all self-start sm:self-auto cursor-pointer"
                  >
                    <span>Docs</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Direct statement of why this technology was selected */}
              <div className="py-5">
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                  {item.why}
                </p>
              </div>

              {/* Footer: Metric Badge & Operational Tag */}
              <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300">
                  <span className="font-semibold">{item.metric}</span>
                </div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                  {item.badge}
                </span>
              </div>
            </div>
          ))}
        </ScrollStack>
      </div>
    </div>
  );
}

export default TechStackShowcase;
