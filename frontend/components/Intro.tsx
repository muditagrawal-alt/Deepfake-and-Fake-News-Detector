"use client";

import {
  ArrowRight,
  ArrowUpRight,
  FilmStrip,
  Image as ImageIcon,
  Newspaper,
  Eye,
  MagnifyingGlass,
  Fingerprint,
  Globe,
  ShieldCheck,
  Cpu,
  LockKey,
  CheckCircle,
} from "@phosphor-icons/react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Analyzer from "@/components/Analyzer";
import InteractiveForensicDemo from "@/components/InteractiveForensicDemo";
import BenchmarkComparison from "@/components/BenchmarkComparison";

const Topography = dynamic(() => import("@/components/Topography"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-[#060608] flex items-center justify-center font-mono text-xs text-white/30">
      INITIALIZING TOPOGRAPHIC MANIFOLD...
    </div>
  ),
});

const INPUT_TYPES = [
  { label: "News links", Icon: Newspaper },
  { label: "Images", Icon: ImageIcon },
  { label: "Short video", Icon: FilmStrip },
] as const;

const PIPELINE_STAGES = [
  {
    id: "source",
    stageNum: "01",
    tag: "INGESTION & DECOMPOSITION",
    title: "Multi-Modal Signal Extraction",
    description:
      "Isolates raw high-resolution video frames at millisecond intervals, decodes 16kHz audio vocoder harmonics, and audits container metadata headers.",
    Icon: Eye,
    detail: "EXIF, C2PA JUMBF manifests, spectral FFT, structural article body",
    readout: {
      type: "signal",
      items: [
        { label: "Keyframe Extraction", value: "32 I-frames decoded", status: "PASS" },
        { label: "Acoustic Spectrum", value: "16kHz harmonic FFT", status: "PASS" },
        { label: "C2PA Container", value: "Manifest parsed & verified", status: "VERIFIED" },
      ],
    },
  },
  {
    id: "evidence",
    stageNum: "02",
    tag: "CROSS-MODAL TRIANGULATION",
    title: "Multi-Angle Wire Triangulation",
    description:
      "Decomposes complex media claims into atomic factual statements. Queries independent global press archives and primary public registries simultaneously.",
    Icon: MagnifyingGlass,
    detail: "Reuters Wire, Associated Press, national archives, Tavily & DuckDuckGo consensus",
    readout: {
      type: "wire",
      items: [
        { label: "Reuters Wire Record", value: "Corroborated 3m ago", status: "MATCH" },
        { label: "Associated Press API", value: "Identical dispatch found", status: "MATCH" },
        { label: "Fact-Check Registries", value: "14 citations audited", status: "CONSENSUS" },
      ],
    },
  },
  {
    id: "signal",
    stageNum: "03",
    tag: "CALIBRATED FUSION",
    title: "Bayesian Evidence Synthesis",
    description:
      "Synthesizes neural sensor signals with external corroboration into a calibrated probability distribution with 95% bootstrap confidence intervals.",
    Icon: Fingerprint,
    detail: "Multi-signal weighting, Bayesian credibility bands, explicit failure caveats",
    readout: {
      type: "synthesis",
      items: [
        { label: "Confidence Interval", value: "95% CI: [0.08, 0.22]", status: "CALIBRATED" },
        { label: "Decision Threshold", value: "Calibrated Bayesian cutoff", status: "OPTIMAL" },
        { label: "Audit Ledger", value: "Immutable cryptographic hash", status: "SIGNED" },
      ],
    },
  },
] as const;

const PRIVACY_PILLARS = [
  {
    title: "Zero-Persistence Ephemeral Media",
    body: "Submitted images and video files are processed in ephemeral containers and purged immediately after analysis. Nothing is retained on server disks.",
    Icon: LockKey,
  },
  {
    title: "Citations & Evidence Stay Visible",
    body: "Veritas never delivers blind verdicts. Every claim lists its corroborating or contradicting citations with direct source links.",
    Icon: Globe,
  },
  {
    title: "Client-Encrypted API Storage",
    body: "Bring your own Gemini, OpenRouter, Groq, or Tavily keys. Keys are AES-encrypted before storage and never exposed in client bundles.",
    Icon: Cpu,
  },
] as const;

const KINETIC_TELEMETRY_TRACK_1 = [
  { tag: "C2PA", text: "JUMBF MANIFEST VALIDATION" },
  { tag: "VOCODER", text: "16kHz SPECTRAL DECOMPOSITION" },
  { tag: "WIRE", text: "REUTERS & AP OPEN CONSENSUS" },
  { tag: "PRNU", text: "SENSOR RESIDUAL COHERENCE" },
  { tag: "LATENCY", text: "12.4s MEDIAN PIPELINE" },
  { tag: "BOOTSTRAP", text: "95% CONFIDENCE INTERVALS" },
  { tag: "RAM", text: "ZERO DISK PERSISTENCE" },
  { tag: "ATOMIC", text: "CLAIM TRIPLET EXTRACTION" },
];

const KINETIC_TELEMETRY_TRACK_2 = [
  { tag: "BAYESIAN", text: "CALIBRATED SIGNAL SYNTHESIS" },
  { tag: "LIAR", text: "78.4% BALANCED ACCURACY" },
  { tag: "FF++", text: "91.2% CROSS-DATASET AUC" },
  { tag: "MMSOC", text: "CROSS-MODAL LATTICE RESOLUTION" },
  { tag: "EPHEMERAL", text: "IN-MEMORY CONTAINER EXECUTION" },
  { tag: "CHAIN", text: "CRYPTOGRAPHIC PROVENANCE DOSSIER" },
  { tag: "CUSTODY", text: "SHA-256 IMMUTABLE LEDGER" },
  { tag: "SEARCH", text: "MULTI-REGISTRY TRIANGULATION" },
];

/* -------------------------------------------------------------------------- */
/*  Scroll-reveal primitives                                                  */
/* -------------------------------------------------------------------------- */

function ScrollReveal({
  children,
  reduceMotion,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  reduceMotion: boolean;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const offset =
    direction === "left"
      ? { x: -28, y: 0 }
      : direction === "right"
        ? { x: 28, y: 0 }
        : { x: 0, y: 24 };

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
      transition={{
        duration: reduceMotion ? 0 : 0.68,
        delay: reduceMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function ScrollRevealWord({
  word,
  index,
  count,
  progress,
  reduceMotion,
}: {
  word: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const start = (index / Math.max(count - 1, 1)) * 0.72;
  const end = Math.min(start + 0.28, 1);
  const opacity = useTransform(progress, [start, end], [0.35, 1]);
  const y = useTransform(progress, [start, end], [8, 0]);

  return (
    <motion.span
      style={reduceMotion ? { opacity: 1, y: 0 } : { opacity, y }}
      className="inline-block"
    >
      {word}
    </motion.span>
  );
}

function ScrollRevealHeading({
  text,
  progress,
  headingRef,
  reduceMotion,
}: {
  text: string;
  progress: MotionValue<number>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  reduceMotion: boolean;
}) {
  const words = text.split(" ");

  return (
    <h2
      ref={headingRef}
      className="mt-4 text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-white"
    >
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <ScrollRevealWord
            word={word}
            index={index}
            count={words.length}
            progress={progress}
            reduceMotion={reduceMotion}
          />
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h2>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scan line grid background                                                 */
/* -------------------------------------------------------------------------- */

function ScanGrid({ className }: { className?: string }) {
  return (
    <div className={`scan-grid ${className ?? ""}`} aria-hidden="true">
      <div className="scan-grid-h" />
      <div className="scan-grid-v" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Kinetic Scroll Telemetry Ribbon                                           */
/* -------------------------------------------------------------------------- */

function KineticScrollTelemetry({
  pageProgress,
  reduceMotion,
}: {
  pageProgress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const track1X = useTransform(pageProgress, [0, 1], ["0%", "-35%"]);
  const track2X = useTransform(pageProgress, [0, 1], ["-25%", "8%"]);

  return (
    <div className="kinetic-stream-wrapper" aria-hidden="true">
      <div className="kinetic-stream-fade-left" />
      <div className="kinetic-stream-fade-right" />

      {/* Track 1: Glides Left on Scroll */}
      <motion.div
        className="flex items-center gap-3 py-1.5"
        style={reduceMotion ? {} : { x: track1X }}
      >
        {[...KINETIC_TELEMETRY_TRACK_1, ...KINETIC_TELEMETRY_TRACK_1].map(
          (item, idx) => (
            <div key={`track1-${idx}`} className="kinetic-chip">
              <span className="kinetic-chip-tag">[{item.tag}]</span>
              <span>{item.text}</span>
            </div>
          )
        )}
      </motion.div>

      {/* Track 2: Glides Right on Scroll */}
      <motion.div
        className="flex items-center gap-3 py-1.5 mt-2"
        style={reduceMotion ? {} : { x: track2X }}
      >
        {[...KINETIC_TELEMETRY_TRACK_2, ...KINETIC_TELEMETRY_TRACK_2].map(
          (item, idx) => (
            <div key={`track2-${idx}`} className="kinetic-chip">
              <span className="kinetic-chip-tag">[{item.tag}]</span>
              <span>{item.text}</span>
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scrollytelling Forensic Pipeline Component                                */
/* -------------------------------------------------------------------------- */

function ScrollyPipelineSection({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  return (
    <section
      id="pipeline"
      className="landing-section relative px-4 py-24 sm:px-8 sm:py-32 lg:px-12 border-t border-white/5"
    >
      <ScanGrid className="absolute inset-0 opacity-20" />

      <div className="mx-auto max-w-[1280px]">
        {/* Section Header */}
        <ScrollReveal reduceMotion={reduceMotion}>
          <div className="text-center max-w-[70ch] mx-auto mb-16">
            <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
              Forensic Inspection Pipeline
            </span>
            <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              From raw bytes to auditable chain-of-custody.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
              Veritas executes an uncompromising multi-stage pipeline. Every signal is
              isolated, cross-checked with independent wire registries, and assembled into
              an evidentiary dossier.
            </p>
          </div>
        </ScrollReveal>

        {/* 3-Stage Scrollytelling Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {PIPELINE_STAGES.map((stage, idx) => (
            <ScrollReveal
              key={stage.id}
              reduceMotion={reduceMotion}
              delay={idx * 0.12}
              className="scrolly-pipeline-card flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white/80">
                      STAGE {stage.stageNum}
                    </span>
                    <span className="font-mono text-[10px] text-white/30">{"//"}</span>
                    <span className="font-mono text-[10px] text-white/40 tracking-wider">
                      {stage.tag}
                    </span>
                  </div>
                  <stage.Icon size={18} className="text-white/60" aria-hidden />
                </div>

                <h3 className="text-lg font-semibold text-white tracking-tight">
                  {stage.title}
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-white/50 leading-relaxed">
                  {stage.description}
                </p>

                {/* Simulated Diagnostic Telemetry */}
                <div className="mt-6 space-y-2 rounded-lg border border-white/5 bg-white/[0.015] p-3 font-mono text-[11px]">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest pb-1 border-b border-white/5">
                    Live Diagnostics
                  </div>
                  {stage.readout.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-center justify-between py-1 border-b border-white/[0.03] last:border-0"
                    >
                      <span className="text-white/40">{item.label}</span>
                      <span className="text-white/80 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-white/30">
                <span>{stage.detail}</span>
                <span className="text-white/60">ACTIVE</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Signal Geometry // Topographic Latent Manifold Component                 */
/* -------------------------------------------------------------------------- */

function TopographySection({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  const [color, setColor] = useState("#4f7cff");

  return (
    <section
      id="signal-geometry"
      className="landing-section relative px-4 py-24 sm:px-8 sm:py-32 lg:px-12 border-t border-white/5 overflow-hidden"
    >
      <ScanGrid className="absolute inset-0 opacity-20" />

      <div className="mx-auto max-w-[1280px]">
        <ScrollReveal reduceMotion={reduceMotion}>
          <div className="text-center max-w-[70ch] mx-auto mb-12">
            <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
              Signal Geometry // Latent Space Mapping
            </span>
            <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Multi-modal signals mapped onto topological surfaces.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
              High-dimensional forensic features — vocoder harmonics, PRNU noise print residuals, and claim embeddings — projected into a continuous 22-contour elevation manifold. Hover to deform the field; click to propagate an evidentiary pulse wave.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal reduceMotion={reduceMotion} delay={0.1}>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#060608] shadow-2xl">
            {/* Top Telemetry Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/60 px-4 py-3 font-mono text-xs text-white/60 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span
                  className="size-2 rounded-full animate-pulse"
                  style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                />
                <span className="font-semibold text-white">
                  TOPOGRAPHY :: 22-CONTOUR SIGNAL ELEVATION MESH
                </span>
              </div>

              {/* Color & Pulse Controls */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 hidden sm:inline">PALETTE:</span>
                <button
                  type="button"
                  onClick={() => setColor("#4f7cff")}
                  className={`px-2.5 py-1 rounded text-[10px] transition-colors ${
                    color === "#4f7cff"
                      ? "bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/40"
                      : "text-white/40 border border-white/10 hover:text-white"
                  }`}
                >
                  Sapphire #4f7cff
                </button>
                <button
                  type="button"
                  onClick={() => setColor("#d4d4d8")}
                  className={`px-2.5 py-1 rounded text-[10px] transition-colors ${
                    color === "#d4d4d8"
                      ? "bg-white/20 text-white border border-white/40"
                      : "text-white/40 border border-white/10 hover:text-white"
                  }`}
                >
                  Monochrome
                </button>
                <button
                  type="button"
                  onClick={() => setColor("#34d399")}
                  className={`px-2.5 py-1 rounded text-[10px] transition-colors ${
                    color === "#34d399"
                      ? "bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/40"
                      : "text-white/40 border border-white/10 hover:text-white"
                  }`}
                >
                  Emerald
                </button>
              </div>
            </div>

            {/* The Topography Canvas Container with user props */}
            <div style={{ width: "100%", height: "600px", position: "relative" }}>
              <Topography
                color={color}
                lineCount={22}
                lineWidth={1.2}
                elevation={1}
                foreground={0.2}
                tilt={32}
                speed={0.25}
                direction="forward"
                glow={0.6}
                depthOfField={0.4}
                fog={0.35}
                hoverEffect="lift"
                clickEffect="pulse"
              />
            </div>

            {/* Bottom Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/60 px-4 py-2.5 font-mono text-[10px] text-white/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span>INTERACTIVE CONTROLS:</span>
                <span className="text-white/70">HOVER TO LIFT FIELD</span>
                <span>·</span>
                <span className="text-white/70">CLICK TO DISPATCH PROBE PULSE</span>
              </div>
              <div className="flex items-center gap-3">
                <span>TILT: 32°</span>
                <span>SPEED: 0.25</span>
                <span>LINES: 22</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Parallax Chain-of-Custody Dossier Section (Spatial Depth Transition)      */
/* -------------------------------------------------------------------------- */

function ParallaxDossierSection({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: sectionProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(sectionProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });

  // Multi-layer parallax scroll transforms
  const bgGridY = useTransform(smoothProgress, [0, 1], [-40, 40]);
  const floatingStamp1Y = useTransform(smoothProgress, [0, 1], [50, -50]);
  const floatingStamp2Y = useTransform(smoothProgress, [0, 1], [-40, 40]);
  const cardScale = useTransform(smoothProgress, [0, 0.5, 1], [0.97, 1, 0.98]);

  return (
    <section
      ref={containerRef}
      className="landing-section relative px-4 py-24 sm:px-8 sm:py-32 lg:px-12 border-t border-white/5 overflow-hidden"
    >
      <div className="mx-auto max-w-[1280px]">
        <ScrollReveal reduceMotion={reduceMotion}>
          <div className="text-center max-w-[70ch] mx-auto mb-14">
            <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
              Verifiable Evidence Chain
            </span>
            <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Every assessment yields an immutable dossier.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
              Veritas produces an auditable chain-of-custody. We provide timestamped
              cryptographic hashes, explicit evidentiary citations, and calibrated model
              uncertainty boundaries.
            </p>
          </div>
        </ScrollReveal>

        {/* Parallax Depth Shell */}
        <div className="parallax-dossier-shell p-6 sm:p-12 relative">
          {/* Layer 1: Parallax Grid Background */}
          <motion.div
            className="parallax-grid-bg"
            style={reduceMotion ? {} : { y: bgGridY }}
          />

          {/* Layer 2: Main Grounded Dossier Document */}
          <motion.div
            className="relative z-10 w-full max-w-[760px] rounded-xl border border-white/10 bg-[#08080a] p-6 sm:p-8 shadow-2xl"
            style={reduceMotion ? {} : { scale: cardScale }}
          >
            {/* Dossier Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-white">
                    VERITAS FORENSIC DOSSIER
                  </span>
                  <span className="font-mono text-[10px] text-white/40">#VRT-2026-8812</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-white/40">
                  SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                </p>
              </div>
              <div className="font-mono text-[10px] px-2.5 py-1 rounded border border-white/10 text-white/60 bg-white/[0.03]">
                CHAIN-OF-CUSTODY ACTIVE
              </div>
            </div>

            {/* Dossier Content Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3 font-mono text-xs">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] text-white/40 uppercase">Ingestion Signal</div>
                <div className="mt-1 font-semibold text-white">C2PA Manifest Validated</div>
                <div className="mt-1 text-[10px] text-white/50">Zero tamper detected in raw bytes</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] text-white/40 uppercase">Wire Consensus</div>
                <div className="mt-1 font-semibold text-white">Reuters / AP Matched</div>
                <div className="mt-1 text-[10px] text-white/50">Independent corroboration confirmed</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] text-white/40 uppercase">Calibrated Confidence</div>
                <div className="mt-1 font-semibold text-white">96.8% Genuine</div>
                <div className="mt-1 text-[10px] text-white/50">95% CI: [94.2%, 98.4%]</div>
              </div>
            </div>

            {/* Evidence Audit Trail */}
            <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.015] p-4 font-mono text-xs">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
                Auditable Verification Trail
              </div>
              <div className="space-y-1.5 text-[11px] text-white/60">
                <div className="flex items-center gap-2">
                  <span className="text-white/30">[00.12s]</span>
                  <span>Received client payload; ephemeral sandbox spawned.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30">[01.45s]</span>
                  <span>Deconstructed 4 atomic factual claims; queried Tavily & press APIs.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30">[04.82s]</span>
                  <span>Acoustic vocoder analysis revealed natural vocal tract resonance.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30">[07.91s]</span>
                  <span>Bayesian fusion resolved consensus; source data wiped from RAM.</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Layer 3A: Floating Parallax Stamp (Top Right) */}
          <motion.div
            className="absolute right-6 sm:right-16 top-10 sm:top-14 z-20 hidden md:flex items-center gap-2 rounded-full border border-white/15 bg-black/90 px-4 py-2 font-mono text-xs text-white shadow-xl backdrop-blur-md"
            style={reduceMotion ? {} : { y: floatingStamp1Y }}
          >
            <ShieldCheck size={16} className="text-white/80" aria-hidden />
            <span>CRYPTOGRAPHIC SEAL VERIFIED</span>
          </motion.div>

          {/* Layer 3B: Floating Parallax Stamp (Bottom Left) */}
          <motion.div
            className="absolute left-6 sm:left-16 bottom-10 sm:bottom-14 z-20 hidden md:flex items-center gap-2 rounded-full border border-white/15 bg-black/90 px-4 py-2 font-mono text-xs text-white shadow-xl backdrop-blur-md"
            style={reduceMotion ? {} : { y: floatingStamp2Y }}
          >
            <CheckCircle size={16} className="text-white/80" aria-hidden />
            <span>4 INDEPENDENT CITATIONS ATTACHED</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main landing page                                                         */
/* -------------------------------------------------------------------------- */

const heroChildVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

export default function Intro({ onContinue }: { onContinue?: () => void }) {
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);
  const evidenceHeadingRef = useRef<HTMLHeadingElement>(null);

  const { scrollYProgress: pageProgress } = useScroll();
  const smoothPageProgress = useSpring(pageProgress, {
    stiffness: 110,
    damping: 28,
    restDelta: 0.001,
  });

  const { scrollYProgress: evidenceProgress } = useScroll({
    target: evidenceHeadingRef,
    offset: ["start 0.92", "start 0.34"],
  });

  const scrollToWorkflow = useCallback(() => {
    document.getElementById("how-it-works")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [reduceMotion]);

  useEffect(() => {
    window.addEventListener("veritas:how-it-works", scrollToWorkflow);
    return () =>
      window.removeEventListener("veritas:how-it-works", scrollToWorkflow);
  }, [scrollToWorkflow]);

  return (
    <div data-app-stage="landing" className="landing-shell">
      {/* Scroll progress bar */}
      <motion.div
        aria-hidden="true"
        className="landing-scroll-progress fixed inset-x-0 top-[68px] z-30 h-[2px] origin-left"
        style={{ scaleX: shouldReduceMotion ? 0 : smoothPageProgress }}
      />

      {/* ------------------------------------------------------------------ */}
      {/*  HERO (CENTERED HEADLINE & CONTROL ROOM ARCHITECTURE)              */}
      {/* ------------------------------------------------------------------ */}
      <section id="platform" className="landing-hero relative px-4 sm:px-8 lg:px-12">
        <ScanGrid className="absolute inset-0 opacity-40" />

        {/* Top telemetry ticker (Clean monochrome, no green dots) */}
        <div className="mx-auto max-w-[1320px] pt-8 pb-4 flex items-center justify-between text-[11px] font-mono text-white/40 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-white/50 border border-white/10 rounded px-1.5 py-0.5">
              SYS.ACTIVE
            </span>
            <span>VERITAS v3 // MULTI-MODAL PROVENANCE ENGINE</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>ZERO PERSISTENCE</span>
            <span>OPEN WEB TRIANGULATION</span>
            <span>MEDIAN LATENCY: 12.4s</span>
          </div>
        </div>

        {/* Centered Hero Header */}
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center pt-12 sm:pt-16 pb-8">
          <motion.div
            className="flex flex-col items-center text-center w-full"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  delayChildren: shouldReduceMotion ? 0 : 0.08,
                  staggerChildren: shouldReduceMotion ? 0 : 0.12,
                },
              },
            }}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
          >
            {/* Status Badge — Clean monochrome, no green dot */}
            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="hero-status-badge mx-auto"
            >
              <span className="size-1.5 rounded-full bg-white/50" />
              Intelligence-Grade Media Verification
            </motion.div>

            {/* Tagline — Perfectly Centered */}
            <motion.h1
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.78,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="landing-display mt-6 text-white text-center mx-auto max-w-[18ch]"
            >
              See the evidence behind the media.
            </motion.h1>

            {/* Supporting Copy — Centered */}
            <motion.p
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-6 max-w-[58ch] text-[15px] leading-7 text-white/60 sm:text-base text-center mx-auto"
            >
              Veritas extracts source facts, queries independent press records, and audits
              forensic sensor signals into one transparent review — so analysts and newsrooms
              can inspect where an assessment comes from and where its limits begin.
            </motion.p>

            {/* Action Buttons — Centered */}
            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <motion.button
                type="button"
                onClick={onContinue}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                className="landing-primary-button inline-flex min-h-12 items-center gap-3 rounded-control px-6 text-sm font-semibold"
              >
                Start an inspection <ArrowUpRight size={17} aria-hidden />
              </motion.button>
              <motion.button
                type="button"
                onClick={scrollToWorkflow}
                whileHover={shouldReduceMotion ? undefined : { x: 3 }}
                className="landing-secondary-button inline-flex min-h-12 items-center gap-2 rounded-control px-4 text-sm font-medium"
              >
                How it works <ArrowRight size={16} aria-hidden />
              </motion.button>
            </motion.div>

            {/* Supported Input Formats — Centered */}
            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 border-t border-white/10 pt-5 text-xs sm:text-sm text-white/50"
              aria-label="Supported media types"
            >
              {INPUT_TYPES.map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-2 font-medium">
                  <Icon size={17} aria-hidden />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Centered Interactive Review Terminal */}
        <motion.section
          id="product-check"
          aria-labelledby="preview-title"
          className="landing-tool-card relative mx-auto max-w-4xl w-full mb-16"
          initial={
            shouldReduceMotion
              ? false
              : { opacity: 0, y: 32, scale: 0.985 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.85,
            delay: shouldReduceMotion ? 0 : 0.28,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div className="landing-tool-card-scan" aria-hidden="true" />
          <div className="landing-preview-heading">
            <div>
              <p className="text-xs font-mono font-medium text-[var(--ink-3)]">
                TERMINAL :: VERITAS WORKSPACE
              </p>
              <h2
                id="preview-title"
                className="mt-1 text-lg font-semibold tracking-tight text-white"
              >
                Start a new review
              </h2>
            </div>
            <span className="landing-preview-label font-mono">LIVE PREVIEW</span>
          </div>
          <Analyzer preview />
          <p className="landing-preview-note font-mono">
            Choose an input type to inspect the review parameters. Ephemeral processing active.
          </p>
        </motion.section>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 1: KINETIC SCROLL TELEMETRY STREAM                     */}
      {/* ------------------------------------------------------------------ */}
      <KineticScrollTelemetry
        pageProgress={smoothPageProgress}
        reduceMotion={shouldReduceMotion}
      />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 2: SCROLLYTELLING FORENSIC PIPELINE                    */}
      {/* ------------------------------------------------------------------ */}
      <ScrollyPipelineSection reduceMotion={shouldReduceMotion} />

      {/* ------------------------------------------------------------------ */}
      {/*  SIGNAL GEOMETRY // TOPOGRAPHIC LATENT MANIFOLD                    */}
      {/* ------------------------------------------------------------------ */}
      <TopographySection reduceMotion={shouldReduceMotion} />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 3: MULTI-LAYER PARALLAX FORENSIC DOSSIER               */}
      {/* ------------------------------------------------------------------ */}
      <ParallaxDossierSection reduceMotion={shouldReduceMotion} />

      {/* ------------------------------------------------------------------ */}
      {/*  INTERACTIVE FORENSIC DEMO (Live Multimodal Case Explorer)         */}
      {/* ------------------------------------------------------------------ */}
      <section className="landing-section relative px-4 py-20 sm:px-8 sm:py-28 lg:px-12 border-t border-white/5">
        <div className="mx-auto max-w-[1280px]">
          <ScrollReveal reduceMotion={shouldReduceMotion}>
            <div className="text-center max-w-[70ch] mx-auto mb-12">
              <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Auditable Case Walkthrough
              </span>
              <h2 className="mt-3 text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                Inspect authentic multimodal breakdowns.
              </h2>
              <p className="mt-4 text-sm text-white/55 sm:text-base leading-relaxed">
                Click across real case studies to observe how claim triangulation, acoustic voice clone signals, and C2PA manifests are reported with explicit evidentiary citations.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal reduceMotion={shouldReduceMotion} delay={0.1}>
            <InteractiveForensicDemo />
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  EMPIRICAL BENCHMARKS (Academic Ground Truth)                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="landing-section relative px-4 py-20 sm:px-8 sm:py-28 lg:px-12 border-t border-white/5">
        <div className="mx-auto max-w-[1280px]">
          <ScrollReveal reduceMotion={shouldReduceMotion}>
            <div className="text-center max-w-[70ch] mx-auto mb-12">
              <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Empirical Evaluation // Controlled Runs
              </span>
              <h2 className="mt-3 text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                Tested against academic benchmark datasets.
              </h2>
              <p className="mt-4 text-sm text-white/55 sm:text-base leading-relaxed">
                Single-turn AI checkers hallucinate consensus or overfit to compression noise. Veritas measures balanced accuracy with 95% confidence intervals and open provenance.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal reduceMotion={shouldReduceMotion} delay={0.1}>
            <BenchmarkComparison />
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 4: WORD-BY-WORD SCROLL SCRUBBING (How it Works)        */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="how-it-works"
        className="landing-section relative scroll-mt-[68px] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 border-t border-white/5"
      >
        <div className="mx-auto max-w-[1120px]">
          <ScrollReveal
            reduceMotion={shouldReduceMotion}
            className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end md:gap-14"
          >
            <div>
              <p className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Verification Methodology
              </p>
              <ScrollRevealHeading
                headingRef={evidenceHeadingRef}
                progress={evidenceProgress}
                reduceMotion={!!reduceMotion}
                text="Evidence stays close to the decision."
              />
            </div>
            <p className="max-w-[54ch] text-sm leading-relaxed text-white/60 sm:text-base">
              A confidence score is a model estimate, never proof. Veritas keeps returned independent reporting, file metadata, and reasoning in view so humans can make their own call.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {PRIVACY_PILLARS.map((pillar, idx) => (
              <ScrollReveal
                key={pillar.title}
                reduceMotion={shouldReduceMotion}
                delay={idx * 0.12}
                className="p-6 rounded-xl border border-white/10 bg-white/[0.015] hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="size-10 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/70 mb-4">
                    <pillar.Icon size={20} aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-white/50 leading-relaxed">
                    {pillar.body}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 font-mono text-[11px] text-white/60 flex items-center gap-1.5">
                  <ShieldCheck size={14} aria-hidden />
                  <span>GUARANTEED ARCHITECTURE</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  FINAL CTA                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="landing-control relative px-4 py-20 sm:px-8 sm:py-28 lg:px-12 border-t border-white/5">
        <ScanGrid className="absolute inset-0 opacity-15" />
        <div className="relative mx-auto max-w-[1120px]">
          <div className="cta-final">
            <div className="cta-final-content space-y-3">
              <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Ready for Verification
              </span>
              <h2 className="text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                Start with the source you have.
              </h2>
              <p className="max-w-[48ch] text-sm text-white/55 sm:text-base leading-relaxed">
                Examine a public news URL, an image, or a short video. Transparent citations and file signals in one review.
              </p>
            </div>
            <motion.button
              type="button"
              onClick={onContinue}
              whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className="landing-primary-button inline-flex min-h-14 items-center gap-3 rounded-control px-8 text-base font-semibold shrink-0"
            >
              Start an inspection <ArrowUpRight size={18} aria-hidden />
            </motion.button>
          </div>
        </div>
      </section>
    </div>
  );
}
