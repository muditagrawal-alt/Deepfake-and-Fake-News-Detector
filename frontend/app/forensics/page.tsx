import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Waveform,
  Eye,
  Certificate,
  ArrowUpRight,
  ArrowsLeftRight,
} from "@phosphor-icons/react/dist/ssr";
import InteractiveForensicDemo from "@/components/InteractiveForensicDemo";

export const metadata: Metadata = {
  title: "Forensics & Multimodal Invariants — Veritas",
  description:
    "Explore Veritas's four multimodal forensic engines: claim triangulation against primary wires, spectral voice clone audits, micro-saccade visual analysis, and C2PA cryptographic provenance.",
};

const ENGINES = [
  {
    icon: ArrowsLeftRight,
    title: "Autonomous Claim Triangulation",
    tag: "Source Consensus",
    description:
      "Cross-indexes disputed assertions against Reuters, AP, and BBC primary reporting. The original publisher is strictly excluded from its own corroboration.",
    metrics: [
      { label: "Wire Registry", value: "14 Wires" },
      { label: "Consensus Agreement", value: "Cross-Indexed" },
      { label: "Search Latency", value: "< 420ms" },
    ],
  },
  {
    icon: Waveform,
    title: "Spectral Voice Clone Audit",
    tag: "Acoustic AI",
    description:
      "Detects ElevenLabs, VALL-E, and diffusion vocoders by measuring mel-frequency pitch micro-jitter, synthetic timbre distribution, and vocoder phase anomalies.",
    metrics: [
      { label: "Sampling Rate", value: "16 kHz Linear" },
      { label: "Vocoder Audit", value: "Phase Invariant" },
      { label: "Phoneme Latency", value: "32ms" },
    ],
  },
  {
    icon: Eye,
    title: "Micro-Saccade & Boundary Vision",
    tag: "Visual Residuals",
    description:
      "Surfaces blending seam artifacts, pupil micro-fixation symmetry, and 2D FFT spectral high-frequency residual drop-offs typical of generative image models.",
    metrics: [
      { label: "ONNX Runtime", value: "v1.19" },
      { label: "Residual Mesh", value: "High Grid" },
      { label: "Symmetry Test", value: "4-Fold Radial" },
    ],
  },
  {
    icon: Certificate,
    title: "C2PA Cryptographic Provenance",
    tag: "Hardware Enclave",
    description:
      "Reads cryptographically signed JUMBF metadata directly from camera sensors and authorized editing suites to verify authentic provenance and generator seals.",
    metrics: [
      { label: "Manifest Core", value: "Rust / C2PA" },
      { label: "Cert Chain", value: "X.509 Validated" },
      { label: "Signature Audit", value: "Deterministic" },
    ],
  },
];

export default function ForensicsPage() {
  return (
    <article className="forensics-page mx-auto max-w-[1280px] px-4 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12">
      {/* Top Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-white"
        >
          <span aria-hidden>←</span>
          <span>Veritas</span>
        </Link>
      </div>

      {/* Hero Header */}
      <header className="max-w-[840px] space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
          <ShieldCheck size={14} className="text-cyan-400" />
          <span className="uppercase tracking-wider">Multimodal Forensic Invariants</span>
        </div>
        <h1 className="text-[clamp(2.4rem,4.8vw,4rem)] font-bold tracking-tight text-white leading-[1.08]">
          Four Forensic Layers.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
            Zero Unverified Assumptions.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 max-w-[68ch] leading-relaxed">
          Veritas unifies independent neural, spectral, and hardware layers. Disputed media is decomposed,
          triangulated with primary wire consensus, and assessed against verifiable physical invariants.
        </p>
      </header>

      {/* Forensic Engine Cards */}
      <section className="mt-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ENGINES.map((engine) => {
            const Icon = engine.icon;
            return (
              <div
                key={engine.title}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] p-6 sm:p-7 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_8px_30px_rgba(56,189,248,0.08)]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform">
                    <Icon size={22} weight="duotone" />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                    {engine.tag}
                  </span>
                </div>

                <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
                  {engine.title}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  {engine.description}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5 font-mono text-xs">
                  {engine.metrics.map((m) => (
                    <div key={m.label} className="space-y-0.5">
                      <p className="text-[10px] uppercase text-zinc-500">{m.label}</p>
                      <p className="text-zinc-200 font-medium truncate">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Case Studies Section */}
      <section className="mt-20 border-t border-white/10 pt-16">
        <div className="mb-10 text-center max-w-[70ch] mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            Auditable Case Walkthrough
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Inspect Authentic Multimodal Breakdowns
          </h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Click through real-world case studies to explore how acoustic telemetry, wire triangulation,
            and cryptographic provenance are evaluated side by side.
          </p>
        </div>

        <InteractiveForensicDemo />
      </section>

      {/* Bottom CTA */}
      <section className="mt-20 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-10 text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">
          Test Suspect Media in the Workspace
        </h2>
        <p className="text-sm text-zinc-400 max-w-[50ch] mx-auto leading-relaxed">
          Submit any article URL, audio snippet, video link, or photograph to run all four forensic engines in seconds.
        </p>
        <div className="pt-2">
          <Link
            href="/#check"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-5 py-2.5 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
          >
            <span>Launch Review Workspace</span>
            <ArrowUpRight size={16} weight="bold" />
          </Link>
        </div>
      </section>
    </article>
  );
}
