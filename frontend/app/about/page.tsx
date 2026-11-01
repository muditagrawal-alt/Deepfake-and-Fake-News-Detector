import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShieldCheck, Cpu, FileLock2, Search, AlertTriangle, Fingerprint } from "lucide-react";

export const metadata = {
  title: "About Veritas | Forensic Intelligence & Misinformation Architecture",
  description: "Learn how Veritas builds cryptographic evidence chains, detects synthetic media, and cross-examines news claims using multimodal AI and local forensics.",
};

const PILLARS = [
  {
    icon: Fingerprint,
    title: "Measured Forensic Signals",
    subtitle: "Hardware & Container Level",
    description: "Every file begins with uninterpreted mathematical measurements: raw EXIF tags, XMP markers, invisible SynthID watermarks, error level analysis (ELA), and cryptographically signed C2PA provenance manifests.",
  },
  {
    icon: Search,
    title: "Independent Web Retrieval",
    subtitle: "Publisher Contamination Control",
    description: "Atomic claims are identified and checked against external reporting from independent global wires (excluding the publisher itself) to prevent confirmation loops and circular citations.",
  },
  {
    icon: Cpu,
    title: "Dual-Stage Reasoning",
    subtitle: "Observation Before Verdict",
    description: "The evaluation engine first catalogs factual observations without drawing conclusions. It then weighs those measured signals against retrieved corroboration to issue an auditable, calibrated verdict.",
  },
  {
    icon: FileLock2,
    title: "Zero-Knowledge BYOK",
    subtitle: "AES-256-GCM & Ephemeral Tokens",
    description: "User provider keys are encrypted using AES-256-GCM authenticated encryption and never transmitted back to the browser. API interactions use short-lived HMAC-SHA256 bearer tokens.",
  },
];

const STAGES = [
  {
    num: "01",
    name: "Extraction & Cryptographic Hashing",
    details: "The asset is immediately fingerprinted with SHA-256 for chain of custody. Article text is stripped of DOM clutter via Trafilatura; image headers and video containers are probed with FFprobe.",
  },
  {
    num: "02",
    name: "Spectral & Spatial Artifact Scanning",
    details: "Media frames undergo frequency and compression analysis. Synthetic visual artifacts (warping, uncanny skin textures, boundary anomalies) and audio sync irregularities are cataloged.",
  },
  {
    num: "03",
    name: "Claim Decomposition",
    details: "The model extracts 2 to 4 discrete, verifiable assertions from the content. Unverifiable opinions are filtered out to focus solely on testable assertions of fact.",
  },
  {
    num: "04",
    name: "External Wire Cross-Examination",
    details: "Claims are matched against neutral primary sources (Reuters, Associated Press, official bulletins). Corroborated, contradicted, or misleading elements are flagged with citations.",
  },
  {
    num: "05",
    name: "Forensic Synthesis & Dossier Generation",
    details: "A comprehensive assessment combines verdict, confidence estimate, detected anomalies, and source citations into a court-ready, multi-page Forensic PDF Dossier.",
  },
];

export default function About() {
  return (
    <article className="about-page mx-auto max-w-[1200px] px-4 pb-24 pt-20 sm:px-8 sm:pt-28 lg:px-12 text-ink">
      {/* Navigation Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-control border border-line bg-elev/60 px-3.5 py-1.5 text-xs font-medium text-ink-2 backdrop-blur-md transition-colors hover:border-accent hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          <span>Back to Veritas Overview</span>
        </Link>
      </nav>

      {/* Hero Header */}
      <header className="mt-8 max-w-[840px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <ShieldCheck className="size-3.5" aria-hidden />
          <span>Enterprise Forensic Intelligence</span>
        </div>
        <h1 className="mt-4 text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.04em] text-ink">
          Trust built on evidence, not assumptions.
        </h1>
        <p className="mt-6 max-w-[70ch] text-base leading-relaxed text-ink-2 sm:text-lg">
          Veritas is an open-source forensic intelligence platform engineering transparency in an era of synthetic deception. By unifying hardware-level file forensics with multimodal evidence verification, Veritas provides verifiable proof for journalists, researchers, and forensic analysts.
        </p>
      </header>

      {/* Core Architectural Pillars */}
      <section className="mt-16" aria-labelledby="pillars-heading">
        <h2 id="pillars-heading" className="text-xs font-mono uppercase tracking-widest text-ink-3">
          Foundational Architecture
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="relative flex flex-col rounded-card border border-line/80 bg-elev/40 p-6 backdrop-blur-md transition-all hover:border-line hover:bg-elev/70"
            >
              <div className="flex size-10 items-center justify-center rounded-control bg-accent-soft text-accent">
                <pillar.icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">{pillar.title}</h3>
              <p className="text-xs font-medium text-accent">{pillar.subtitle}</p>
              <p className="mt-2.5 text-xs leading-relaxed text-ink-2">{pillar.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Step-by-Step Verification Methodology */}
      <section className="mt-20 border-t border-line pt-14" aria-labelledby="method-heading">
        <div className="max-w-[760px]">
          <h2 id="method-heading" className="text-xs font-mono uppercase tracking-widest text-accent">
            Methodology & Execution Pipeline
          </h2>
          <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-ink">
            How every assessment is assembled.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            No single signal determines a verdict. Every submission traverses a five-stage pipeline designed to eliminate confirmation bias and preserve complete chain-of-custody evidence.
          </p>
        </div>

        <div className="mt-10 divide-y divide-line rounded-card border border-line bg-elev/30 backdrop-blur-sm">
          {STAGES.map((stage) => (
            <div key={stage.num} className="grid gap-3 p-6 sm:grid-cols-[64px_220px_1fr] sm:gap-6 sm:p-8">
              <span className="font-mono text-sm font-bold text-accent">{stage.num}</span>
              <h4 className="text-base font-semibold text-ink">{stage.name}</h4>
              <p className="text-sm leading-relaxed text-ink-2">{stage.details}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Epistemic Boundaries & Ethics */}
      <section className="mt-16 rounded-card border border-warn/30 bg-warn-soft/40 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-warn/15 text-warn">
            <AlertTriangle className="size-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Epistemic Limitations & Forensic Ethics</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Artificial intelligence models are probabilistic estimators. While Veritas integrates deterministic cryptographic hashes (SHA-256), signed C2PA credentials, and cross-referenced primary sources, a model verdict is an evidence-backed finding—not absolute legal certitude. Users should review cited primary sources alongside the full forensic dossier.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Navigation */}
      <div className="mt-14 flex flex-wrap items-center gap-4">
        <Link
          href="/#check"
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-accent px-5 text-sm font-semibold text-accent-ink transition-all hover:opacity-90 shadow-sm"
        >
          <span>Launch Verification Workspace</span>
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
        <Link
          href="/architecture"
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-elev/70 px-4 text-sm font-medium text-ink-2 hover:border-line hover:text-ink transition-colors"
        >
          <span>View 3D System Topology</span>
        </Link>
        <Link
          href="/tech-stack"
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-elev/70 px-4 text-sm font-medium text-ink-2 hover:border-line hover:text-ink transition-colors"
        >
          <span>Explore Tech Stack</span>
        </Link>
      </div>
    </article>
  );
}
