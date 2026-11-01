import type { Metadata } from "next";
import Link from "next/link";
import {
  GitCommit,
  ArrowUpRight,
  Database,
  Cpu,
  Globe,
  Scales,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Verification Pipeline Architecture — Veritas",
  description:
    "Explore Veritas's four-stage multimodal verification pipeline: raw media ingestion, atomic claim extraction, autonomous wire consensus triangulation, and calibrated Bayesian verdict synthesis.",
};

const STAGES = [
  {
    step: "01",
    name: "Multimodal Ingestion & Invariant Decoupling",
    icon: Database,
    tag: "Sensor Ingestion",
    latency: "42ms",
    description:
      "Raw media inputs are decrypted and split across modality-specific parsers. Text is extracted via Trafilatura DOM traversal; audio/video streams are decoupled with PyAV and ffprobe; hardware sensor manifests and cryptographically signed C2PA JUMBF blocks are extracted in an isolated Rust enclave.",
    capabilities: [
      "Trafilatura DOM content extraction",
      "Pillow / PyAV 32 fps frame slicing",
      "Librosa 16 kHz acoustic decoupling",
      "C2PA Rust JUMBF X.509 signature verification",
    ],
  },
  {
    step: "02",
    name: "Claim Decomposition & Atomic Extraction",
    icon: Cpu,
    tag: "Reasoning Core",
    latency: "220ms",
    description:
      "Gemini 2.5 Flash Lite parses the ingested material to identify core genres and isolate 2 to 4 checkable, falsifiable atomic claims. The model operates under strict impartial prompts: it reports verifiable facts without issuing a premature verdict or making subjective determinations.",
    capabilities: [
      "Atomic assertion decomposition",
      "Temporal & geographic landmark bounding",
      "Disputed entity normalization",
      "Zero-persistence memory lifecycle",
    ],
  },
  {
    step: "03",
    name: "Autonomous Wire Triangulation",
    icon: Globe,
    tag: "Primary Consensus",
    latency: "380ms",
    description:
      "The server executes independent queries against global primary wire reporting archives (Reuters, Associated Press, AFP, and BBC). The original publisher is strictly excluded from its own search. Claims are categorized into corroborated, contradicted, misleading, or unverifiable states.",
    capabilities: [
      "Strict original publisher omission",
      "14 Tier-1 wire reporting registries",
      "Cross-wire consensus ratio calculation",
      "Direct citation URL binding",
    ],
  },
  {
    step: "04",
    name: "Calibrated Bayesian Verdict Synthesis",
    icon: Scales,
    tag: "Wilson Estimator",
    latency: "18ms",
    description:
      "The Bayesian synthesizer computes an evidentiary balance across physical hardware credentials, acoustic spectrogram residuals, and independent wire consensus. Using a calibrated Wilson-score estimator, Veritas outputs a final verdict accompanied by explicit evidentiary citations.",
    capabilities: [
      "Calibrated Wilson-score confidence",
      "Physical manifest vs wire consensus balance",
      "Cryptographic seal & audit ledger generation",
      "Verifiable JSON-LD & PDF dossier export",
    ],
  },
];

export default function PipelinePage() {
  return (
    <article className="pipeline-page mx-auto max-w-[1280px] px-4 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12">
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
          <GitCommit size={14} className="text-cyan-400" />
          <span className="uppercase tracking-wider">Verification Pipeline DAG</span>
        </div>
        <h1 className="text-[clamp(2.4rem,4.8vw,4rem)] font-bold tracking-tight text-white leading-[1.08]">
          The Provenance Pipeline.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
            From Raw Bits to Calibrated Truth.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 max-w-[68ch] leading-relaxed">
          Veritas runs every link, video, audio clip, or photograph through a deterministic four-stage verification DAG.
          No black boxes, no opaque verdicts—only transparent evidence and verified wire corroboration.
        </p>
      </header>

      {/* Sequential Stages List */}
      <section className="mt-14 space-y-6">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.step}
              className="relative rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] p-6 sm:p-8 transition-all duration-300 hover:border-cyan-500/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-cyan-400">
                    {stage.step}
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Icon size={20} weight="duotone" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                      {stage.name}
                    </h2>
                    <span className="font-mono text-xs text-zinc-400">{stage.tag}</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1 rounded-full bg-white/5 border border-white/5 font-mono text-xs text-zinc-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Avg Latency: {stage.latency}</span>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed max-w-[85ch] mb-6">
                {stage.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-white/5">
                {stage.capabilities.map((cap) => (
                  <div
                    key={cap}
                    className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-black/40 px-3 py-2 rounded-lg border border-white/5"
                  >
                    <span className="size-1 rounded-full bg-cyan-400 shrink-0" />
                    <span className="truncate">{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Link to 3D Architecture Diagram */}
      <section className="mt-14 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-blue-950/10 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
            Interactive Topology
          </span>
          <h3 className="text-lg sm:text-xl font-semibold text-white">
            Explore the 3D System Architecture Flowchart
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-[60ch]">
            Inspect live packet flow, node-to-node telemetry, and real-time causal DAG execution.
          </p>
        </div>
        <Link
          href="/architecture"
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs sm:text-sm px-4 py-2.5 transition-colors shrink-0 shadow-lg shadow-cyan-500/20"
        >
          <span>Open 3D Architecture</span>
          <ArrowUpRight size={15} weight="bold" />
        </Link>
      </section>

      {/* Bottom CTA */}
      <section className="mt-16 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-10 text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">
          Experience the Pipeline in Real Time
        </h2>
        <p className="text-sm text-zinc-400 max-w-[50ch] mx-auto leading-relaxed">
          Launch a forensic review of any digital artifact to observe the four-stage verification DAG live.
        </p>
        <div className="pt-2">
          <Link
            href="/#check"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-5 py-2.5 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
          >
            <span>Open Review Workspace</span>
            <ArrowUpRight size={16} weight="bold" />
          </Link>
        </div>
      </section>
    </article>
  );
}
