"use client";

import {
  ArrowUpRight,
  Newspaper,
  Eye,
  MagnifyingGlass,
  Fingerprint,
  Globe,
  ShieldCheck,
  Cpu,
  LockKey,
  CheckCircle,
  Lightning,
  Sparkle,
  Waveform,
  Scales,
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
import { Architecture3D } from "@/components/Architecture3D";
import { TechStackShowcase } from "@/components/TechStackShowcase";
import BlurText from "@/components/BlurText";
import Feedback1 from "@/components/Feedback1";
import ShaderCard from "@/components/ui/shader-card";
import DitherWave from "@/components/ui/dither-wave";

const Topography = dynamic(() => import("@/components/Topography"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-[#060608] flex items-center justify-center font-mono text-xs text-white/30">
      INITIALIZING TOPOGRAPHIC MANIFOLD...
    </div>
  ),
});

const FolderFloat = dynamic(() => import("@/components/FolderFloat"), {
  ssr: false,
  loading: () => (
    <div className="w-[195px] h-[144px] rounded-xl border border-white/10 bg-zinc-800/40 animate-pulse" />
  ),
});

const HeroParallaxDemo = dynamic(() => import("@/components/hero-parallax-demo"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-[#060608] flex items-center justify-center font-mono text-xs text-white/30">
      INITIALIZING 3D PARALLAX MANIFOLD...
    </div>
  ),
});

const PIPELINE_STAGES = [
  {
    id: "source",
    stageNum: "01",
    tag: "INGESTION & DECOMPOSITION",
    title: "Multi-Modal Signal Extraction",
    flameColor: "#06b6d4",
    flameHighlight: "#67e8f9",
    description:
      "Isolates raw high-resolution video frames at millisecond intervals, decodes 16kHz audio harmonics, and audits container metadata.",
    Icon: Eye,
    features: [
      { text: "32 I-frames decoded per second", Icon: Cpu },
      { text: "16kHz harmonic acoustic FFT", Icon: Waveform },
      { text: "C2PA JUMBF container verified", Icon: ShieldCheck },
      { text: "Frame-accurate pixel artifact scoring", Icon: Sparkle },
    ],
  },
  {
    id: "evidence",
    stageNum: "02",
    tag: "CROSS-MODAL TRIANGULATION",
    title: "Multi-Angle Wire Triangulation",
    flameColor: "#8b5cf6",
    flameHighlight: "#d8b4fe",
    description:
      "Decomposes complex media claims into atomic factual statements. Queries independent global press archives and primary registries.",
    Icon: MagnifyingGlass,
    features: [
      { text: "14 independent wire registries", Icon: Globe },
      { text: "Reuters & AP real-time corroborated", Icon: Newspaper },
      { text: "Fact-check consensus triangulation", Icon: CheckCircle },
      { text: "Sub-second archive consensus query", Icon: Lightning },
    ],
  },
  {
    id: "signal",
    stageNum: "03",
    tag: "CALIBRATED FUSION",
    title: "Bayesian Evidence Synthesis",
    flameColor: "#f59e0b",
    flameHighlight: "#fef08a",
    description:
      "Synthesizes neural sensor signals with external corroboration into a calibrated probability distribution with 95% bootstrap confidence intervals.",
    Icon: Fingerprint,
    features: [
      { text: "95% bootstrap confidence interval", Icon: Scales },
      { text: "Calibrated Bayesian cutoff threshold", Icon: Cpu },
      { text: "Immutable cryptographic ledger", Icon: LockKey },
      { text: "Multi-signal adversarial weighting", Icon: Sparkle },
    ],
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



/* -------------------------------------------------------------------------- */
/*  Forensic Pill Detailed Breakdown Dictionary                              */
/* -------------------------------------------------------------------------- */

interface ForensicPillDetail {
  title: string;
  category: string;
  explanation: string;
  impact: string;
  confidenceImpact: string;
}

const FORENSIC_PILL_DETAILS: Record<string, ForensicPillDetail> = {
  "16kHz vocoder anomaly": {
    title: "16kHz Vocoder Harmonic Anomaly",
    category: "ACOUSTIC SIGNAL",
    explanation:
      "High-frequency spectral gap identified where a neural voice synthesis model failed to reconstruct natural upper-register vocal tract harmonics.",
    impact: "Synthetic Audio Artifact Detected",
    confidenceImpact: "+34% Anomaly Confidence",
  },
  "Face-swap blend seam": {
    title: "Face-Swap Perimeter Boundary Seam",
    category: "VISUAL SPATIAL",
    explanation:
      "Sub-pixel gradient discontinuity along the jawline perimeter where neural latent diffusion inpainting meets the original background frame.",
    impact: "Manipulated Facial Boundary Detected",
    confidenceImpact: "+42% Synthetic Artifact",
  },
  "Blink rate discontinuity": {
    title: "Blink Rate & Saccade Discontinuity",
    category: "PHYSIOLOGICAL",
    explanation:
      "Temporal micro-saccade analysis reveals 1.8 blinks/min vs. natural human baseline of 14-17 blinks/min under identical lighting conditions.",
    impact: "Physiological Anomaly Confirmed",
    confidenceImpact: "+28% Manipulation Likelihood",
  },
  "PRNU sensor residual": {
    title: "Photo-Response Non-Uniformity (PRNU) Residual",
    category: "HARDWARE NOISE",
    explanation:
      "Silicon wafer sensor noise signature does not match claimed iPhone 15 Pro CMOS profile; pattern consistent with synthetic generator latent space.",
    impact: "Hardware Fingerprint Mismatch",
    confidenceImpact: "+46% Synthetic Origin",
  },
  "Reuters wire confirmed": {
    title: "Reuters Wire Editorial Dispatch",
    category: "WIRE TRIANGULATION",
    explanation:
      "Primary wire report published 14 minutes prior corroborates speaker presence, quoted dialogue, and official venue records.",
    impact: "Direct Wire Editorial Corroboration",
    confidenceImpact: "-52% Misinformation Risk",
  },
  "AP dispatch verified": {
    title: "Associated Press Global Wire Record",
    category: "WIRE TRIANGULATION",
    explanation:
      "Accredited AP pool correspondent verified the audio speech transcript verbatim from the plenary press chamber.",
    impact: "Accredited Correspondent Verification",
    confidenceImpact: "-48% Misinformation Risk",
  },
  "FactCheck consensus": {
    title: "IFCN Global Fact-Check Consensus",
    category: "CONSENSUS VERIFICATION",
    explanation:
      "Cross-referenced against 14 international fact-checking organizations with 100% agreement on context and origin.",
    impact: "Independent Organization Consensus",
    confidenceImpact: "-60% Misinformation Risk",
  },
  "Archived primary source": {
    title: "Internet Archive & Wayback Record",
    category: "PUBLIC ARCHIVE",
    explanation:
      "Original unedited footage archived on 2021-04-12 with identical audio-video stream hash; claims of recent 2026 events are false.",
    impact: "Temporal Recontextualization Exposed",
    confidenceImpact: "+65% Deceptive Context",
  },
  "C2PA JUMBF signature": {
    title: "C2PA JUMBF Manifest Attestation",
    category: "CRYPTOGRAPHIC PROOF",
    explanation:
      "Cryptographically signed Content Credentials manifest validated against Coalition for Content Provenance and Authenticity root of trust.",
    impact: "Hardware Provenance Verified",
    confidenceImpact: "Hardware Authenticity Passed",
  },
  "SHA-256 ledger signed": {
    title: "Immutable SHA-256 Ledger Stamp",
    category: "IMMUTABLE AUDIT",
    explanation:
      "Cryptographic hash generated from normalized file bytes and timestamped into the tamper-proof evidentiary dossier.",
    impact: "Zero-Tamper Chain-of-Custody",
    confidenceImpact: "Chain-of-Custody Sealed",
  },
  "Ephemeral RAM purged": {
    title: "In-Memory Ephemeral Sandbox Purged",
    category: "EPHEMERAL PRIVACY",
    explanation:
      "Isolated processing container torn down immediately upon analysis completion. Zero customer media stored to non-volatile disks.",
    impact: "Zero-Persistence Data Privacy",
    confidenceImpact: "RAM Zeroed & Destroyed",
  },
  "95% bootstrap CI": {
    title: "Calibrated 95% Bootstrap Uncertainty Interval",
    category: "STATISTICAL CALIBRATION",
    explanation:
      "Empirical posterior distribution generated via 10,000 bootstrap resamples to prevent overconfident point estimates.",
    impact: "Calibrated Bayesian Confidence Band",
    confidenceImpact: "CI Width: [94.2%, 98.4%]",
  },
};

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
/*  Scrollytelling Forensic Pipeline (Section Scroll Transition 2)            */
/* -------------------------------------------------------------------------- */

function ScrollyPipelineCard({
  stage,
  index,
  smoothProgress,
  reduceMotion,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  index: number;
  smoothProgress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const cardY = useTransform(
    smoothProgress,
    [0.08 + index * 0.1, 0.35 + index * 0.1],
    [35, 0]
  );
  const cardOpacity = useTransform(
    smoothProgress,
    [0.06 + index * 0.1, 0.28 + index * 0.1],
    [0.4, 1]
  );

  return (
    <motion.div
      style={reduceMotion ? {} : { y: cardY, opacity: cardOpacity }}
      className="h-full"
    >
      <ShaderCard
        color={stage.flameColor}
        highlightColor={stage.flameHighlight}
        speed={0.85 + index * 0.12}
        flameHeight={1.0}
        interactive={true}
        className="h-full min-h-[520px] sm:min-h-[540px]"
      >
        <div className="flex flex-col justify-between h-full drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
          <div>
            {/* Header: Clean engineering index & Stage Icon */}
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold tracking-wider text-zinc-500">
                  {`STAGE ${stage.stageNum}`}
                </span>
                <span className="text-zinc-600 font-mono text-xs">·</span>
                <span
                  className="font-mono text-xs font-medium uppercase tracking-wider"
                  style={{ color: stage.flameHighlight }}
                >
                  {stage.stageNum === "01"
                    ? "Forensic Extraction"
                    : stage.stageNum === "02"
                    ? "Multi-Source Retrieval"
                    : "Bayesian Synthesis"}
                </span>
              </div>
              <stage.Icon size={18} className="text-zinc-400" aria-hidden />
            </div>

            {/* Title */}
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {stage.title}
            </h3>

            {/* Description */}
            <p className="mt-2 text-xs sm:text-sm text-zinc-200 leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
              {stage.description}
            </p>

            {/* Feature Bullet List */}
            <div className="mt-6 space-y-3.5">
              {stage.features.map((feat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-xs sm:text-[13px] text-white font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
                >
                  <feat.Icon
                    size={16}
                    weight="bold"
                    className="shrink-0"
                    style={{ color: stage.flameHighlight }}
                  />
                  <span>{feat.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Functional Engine Action & Telemetry */}
          <div className="mt-8 pt-4 border-t border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              <span className="text-zinc-400">STAGE TELEMETRY</span>
              <span className="text-zinc-200 font-medium">
                {stage.stageNum === "01"
                  ? "12 Primitives · ~180ms"
                  : stage.stageNum === "02"
                  ? "Parallel DDGS · ~1.2s"
                  : "Gemini 3.5 · Calibrated"}
              </span>
            </div>
            <a
              href={
                stage.stageNum === "01"
                  ? "/demo/workspace?tab=image"
                  : stage.stageNum === "02"
                  ? "/demo/workspace?tab=news"
                  : "/demo/workspace"
              }
              className="w-full py-2.5 px-4 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs tracking-wide transition-all duration-150 flex items-center justify-between group/action backdrop-blur-md"
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: stage.flameHighlight }}
                />
                <span>
                  {stage.stageNum === "01"
                    ? "Test File Forensics"
                    : stage.stageNum === "02"
                    ? "Run Web Triangulation"
                    : "Inspect Decision Graph"}
                </span>
              </span>
              <ArrowUpRight
                size={14}
                className="text-zinc-400 transition-transform duration-150 group-hover/action:translate-x-0.5 group-hover/action:-translate-y-0.5 group-hover/action:text-white"
              />
            </a>
          </div>
        </div>
      </ShaderCard>
    </motion.div>
  );
}

function ScrollyPipelineSection({
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

  const beamScaleX = useTransform(smoothProgress, [0.1, 0.7], [0, 1]);

  return (
    <section
      ref={containerRef}
      id="pipeline"
      className="landing-section relative px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5 scroll-mt-20 overflow-visible"
    >
      <ScanGrid className="absolute inset-0 opacity-20" />

      {/* Progressive luminous border beam on scroll */}
      <motion.div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent origin-left z-20"
        style={reduceMotion ? {} : { scaleX: beamScaleX }}
      />

      <div className="mx-auto max-w-[1280px]">
        {/* Section Header */}
        <ScrollReveal reduceMotion={reduceMotion}>
          <div className="text-center max-w-[70ch] mx-auto mb-8 sm:mb-10">
            <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
              Enterprise Verification Engine
            </span>
            <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              <BlurText
                text="Three pillars of uncompromising media truth."
                delay={50}
                animateBy="words"
                direction="top"
                className="justify-center text-center"
              />
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
              From raw media ingestion to calibrated Bayesian synthesis. Every disputed claim is decomposed, cross-checked against primary sources, and assembled into a transparent audit trail.
            </p>
          </div>
        </ScrollReveal>

        {/* 3-Stage Scrollytelling Cards with Staggered Scroll Elevation */}
        <div className="grid gap-8 lg:grid-cols-3 pt-6 sm:pt-8">
          {PIPELINE_STAGES.map((stage, idx) => (
            <ScrollyPipelineCard
              key={stage.id}
              stage={stage}
              index={idx}
              smoothProgress={smoothProgress}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Parallax Chain-of-Custody Dossier Section (Section Scroll Transition 3)   */
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
  const cardScale = useTransform(smoothProgress, [0, 0.5, 1], [0.96, 1, 0.97]);
  const beamScaleX = useTransform(smoothProgress, [0.1, 0.7], [0, 1]);

  return (
    <section
      ref={containerRef}
      id="dossier"
      className="landing-section relative px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5 overflow-hidden scroll-mt-20"
    >
      {/* Progressive luminous border beam on scroll */}
      <motion.div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent origin-left z-20"
        style={reduceMotion ? {} : { scaleX: beamScaleX }}
      />

      <div className="mx-auto max-w-[1280px]">
        <ScrollReveal reduceMotion={reduceMotion}>
          <div className="text-center max-w-[70ch] mx-auto mb-8 sm:mb-10">
            <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
              Verifiable Evidence Chain
            </span>
            <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              <BlurText
                text="Every assessment yields an immutable dossier."
                delay={50}
                animateBy="words"
                direction="top"
                className="justify-center text-center"
              />
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
              Explore a completed inspection report. Every verdict is permanently bound to its cryptographic certificate, primary citations, and empirical confidence interval.
            </p>
          </div>
        </ScrollReveal>

        {/* Parallax Depth Shell with Retro Dither Wave background */}
        <DitherWave
          color="#38bdf8"
          backgroundColor="#040407"
          speed={0.85}
          frequency={0.016}
          amplitude={45.0}
          ditherSize={3}
          className="rounded-2xl border border-white/10 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.95)]"
        >
          <div className="p-4 sm:p-10 flex items-center justify-center relative w-full">
            {/* Layer 2: Main Grounded Dossier Document */}
            <motion.div
              className="relative z-10 w-full max-w-[760px] rounded-xl border border-white/15 bg-[#08080c]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl"
              style={reduceMotion ? {} : { scale: cardScale }}
            >
              {/* Dossier Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-white tracking-tight">
                      VERITAS VERIFICATION DOSSIER
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      VERIFIED GENUINE
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-white/50">
                    Certificate #VRT-2026-8812 • C2PA Hardware Provenance Authenticated
                  </p>
                </div>
                <div className="text-[10px] font-semibold px-3 py-1.5 rounded-full border border-white/15 text-white/90 bg-white/5 backdrop-blur-sm">
                  EDITORIAL GRADE
                </div>
              </div>

              {/* Dossier Content Grid */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Provenance Signal</div>
                  <div className="mt-1.5 font-bold text-sm text-white">C2PA Manifest Validated</div>
                  <div className="mt-1 text-[11px] text-white/50 leading-relaxed">Untampered hardware camera container</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Wire Corroboration</div>
                  <div className="mt-1.5 font-bold text-sm text-white">Reuters & AP Matched</div>
                  <div className="mt-1 text-[11px] text-white/50 leading-relaxed">Confirmed across breaking wire archives</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Confidence Index</div>
                  <div className="mt-1.5 font-bold text-sm text-white">96.8% Authenticity Score</div>
                  <div className="mt-1 text-[11px] text-white/50 leading-relaxed">95% CI: [94.2%, 98.4%] empirical band</div>
                </div>
              </div>

              {/* Evidence Audit Trail */}
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.015] p-5 text-xs">
                <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Auditable Verification Lifecycle</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-normal">CERTIFIED • 07.91s</span>
                </div>
                <div className="space-y-2 text-[12px] text-white/70">
                  <div className="flex items-start gap-2.5">
                    <span className="text-white/40 font-mono text-[11px] pt-0.5">01</span>
                    <span><strong className="text-white">Zero-Retention Ingestion:</strong> Encrypted payload verified in volatile RAM enclave; zero customer media retained.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-white/40 font-mono text-[11px] pt-0.5">02</span>
                    <span><strong className="text-white">Live Wire Triangulation:</strong> 4 atomic statements verified across Reuters, Associated Press & national registries in 1.4s.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-white/40 font-mono text-[11px] pt-0.5">03</span>
                    <span><strong className="text-white">Bio-Acoustic Audit:</strong> Vocal tract resonance & phoneme temporal sync confirmed natural human origin.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-white/40 font-mono text-[11px] pt-0.5">04</span>
                    <span><strong className="text-white">Certified Ledger:</strong> Immutable cryptographic verification certificate issued with C2PA digital seal.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </DitherWave>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Zero-Gravity Case Folders // Matter.js Physics (Section Scroll Trans. 4)   */
/* -------------------------------------------------------------------------- */

function FolderFloatSection({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: sectionProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const smoothProgress = useSpring(sectionProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });

  // Folder fanning on scroll
  const folder1X = useTransform(smoothProgress, [0, 1], [-32, 0]);
  const folder1Rotate = useTransform(smoothProgress, [0, 1], [-5, 0]);
  const folder1Y = useTransform(smoothProgress, [0, 1], [45, 0]);

  const folder2Y = useTransform(smoothProgress, [0, 1], [55, 0]);

  const folder3X = useTransform(smoothProgress, [0, 1], [32, 0]);
  const folder3Rotate = useTransform(smoothProgress, [0, 1], [5, 0]);
  const folder3Y = useTransform(smoothProgress, [0, 1], [45, 0]);
  const beamScaleX = useTransform(smoothProgress, [0.1, 0.7], [0, 1]);

  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const selectedDetail = selectedNote ? FORENSIC_PILL_DETAILS[selectedNote] : null;

  return (
    <section
      ref={containerRef}
      id="case-notes"
      className="landing-section relative px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5 overflow-hidden scroll-mt-20"
    >
      <ScanGrid className="absolute inset-0 opacity-15" />

      {/* Progressive luminous border beam on scroll */}
      <motion.div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent origin-left z-20"
        style={reduceMotion ? {} : { scaleX: beamScaleX }}
      />

      <div className="mx-auto max-w-[1280px]">
        <ScrollReveal reduceMotion={reduceMotion}>
          <div className="text-center max-w-[70ch] mx-auto mb-8 sm:mb-10">
            <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
              Multimodal Threat Intelligence
            </span>
            <h2 className="mt-3 text-[clamp(2.1rem,4vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              <BlurText
                text="Tactile intelligence across every threat vector."
                delay={50}
                animateBy="words"
                direction="top"
                className="justify-center text-center"
              />
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
              Explore how Veritas inspects deepfakes, verifies breaking news wire claims, and delivers
              tamper-proof chain-of-custody. Select or hover any dossier folder below to explore the defense signals.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal reduceMotion={reduceMotion} delay={0.1}>
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#060608] p-5 sm:p-8 shadow-2xl relative">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6 sm:mb-8 font-mono text-xs text-white/50">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cyan-400" />
                <span className="text-white/80 font-semibold">VERITAS DEFENSE MATRIX :: 3 MULTIMODAL TIERS</span>
              </div>
              <div className="hidden sm:block text-[11px] text-white/50">
                INTERACTIVE INTELLIGENCE · HOVER OR CLICK FOLDERS
              </div>
            </div>

            {/* Folders Display Container */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-6 pb-2 min-h-[280px]">
              {/* Folder 1: Signal Artifacts */}
              <motion.div
                style={reduceMotion ? {} : { x: folder1X, y: folder1Y, rotate: folder1Rotate }}
                className="flex flex-col items-center"
              >
                <FolderFloat
                  items={[
                    "16kHz vocoder anomaly",
                    "Face-swap blend seam",
                    "Blink rate discontinuity",
                    "PRNU sensor residual",
                  ]}
                  label="Signal Artifacts"
                  sublabel="4 anomalies"
                  trigger="hover"
                  closeOnSelect
                  physics
                  drift={0.5}
                  onSelect={(value) => setSelectedNote(value)}
                  folderColor="#1e293b"
                  frontColor="#334155"
                  paperColor="#f8fafc"
                  itemColor="#f8fafc"
                  itemTextColor="#0f172a"
                  labelColor="#f8fafc"
                  width={195}
                  height={144}
                  radius={14}
                  spread={160}
                  lift={26}
                  tilt={8}
                  flapAngle={34}
                  restAngle={16}
                  openDuration={520}
                  stagger={45}
                  bounce={0.3}
                />
                <span className="mt-5 font-mono text-[11px] text-white/40">
                  HOVER TO RELEASE SIGNALS
                </span>
              </motion.div>

              {/* Folder 2: Wire Corroboration */}
              <motion.div
                style={reduceMotion ? {} : { y: folder2Y }}
                className="flex flex-col items-center"
              >
                <FolderFloat
                  items={[
                    "Reuters wire confirmed",
                    "AP dispatch verified",
                    "FactCheck consensus",
                    "Archived primary source",
                  ]}
                  label="Wire Corroboration"
                  sublabel="4 dispatches"
                  trigger="hover"
                  closeOnSelect
                  physics
                  drift={0.5}
                  onSelect={(value) => setSelectedNote(value)}
                  folderColor="#27272a"
                  frontColor="#3f3f46"
                  paperColor="#ffffff"
                  itemColor="#ffffff"
                  itemTextColor="#18181b"
                  labelColor="#fafafa"
                  width={195}
                  height={144}
                  radius={14}
                  spread={160}
                  lift={26}
                  tilt={8}
                  flapAngle={34}
                  restAngle={16}
                  openDuration={520}
                  stagger={45}
                  bounce={0.3}
                />
                <span className="mt-5 font-mono text-[11px] text-white/40">
                  HOVER TO INSPECT DISPATCHES
                </span>
              </motion.div>

              {/* Folder 3: Chain of Custody */}
              <motion.div
                style={reduceMotion ? {} : { x: folder3X, y: folder3Y, rotate: folder3Rotate }}
                className="flex flex-col items-center"
              >
                <FolderFloat
                  items={[
                    "C2PA JUMBF signature",
                    "SHA-256 ledger signed",
                    "Ephemeral RAM purged",
                    "95% bootstrap CI",
                  ]}
                  label="Chain of Custody"
                  sublabel="4 proofs"
                  trigger="hover"
                  closeOnSelect
                  physics
                  drift={0.5}
                  onSelect={(value) => setSelectedNote(value)}
                  folderColor="#18181b"
                  frontColor="#27272a"
                  paperColor="#e4e4e7"
                  itemColor="#e4e4e7"
                  itemTextColor="#09090b"
                  labelColor="#e4e4e7"
                  width={195}
                  height={144}
                  radius={14}
                  spread={160}
                  lift={26}
                  tilt={8}
                  flapAngle={34}
                  restAngle={16}
                  openDuration={520}
                  stagger={45}
                  bounce={0.3}
                />
                <span className="mt-5 font-mono text-[11px] text-white/40">
                  HOVER FOR CUSTODY PROOFS
                </span>
              </motion.div>
            </div>

            {/* Evidentiary Analysis Readout Banner */}
            <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-5 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-white/70" />
                  <span className="text-xs uppercase tracking-wider text-white/50">
                    EVIDENTIARY ANALYSIS · {selectedDetail?.category ?? "INTERACTIVE DISCOVERY"}
                  </span>
                </div>
                {selectedNote && (
                  <button
                    type="button"
                    onClick={() => setSelectedNote(null)}
                    className="text-[11px] text-white/40 hover:text-white underline cursor-pointer"
                  >
                    Reset Inspector
                  </button>
                )}
              </div>

              {selectedDetail ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <h4 className="text-sm font-semibold text-white tracking-tight">
                      {selectedDetail.title}
                    </h4>
                    <p className="mt-1 text-xs text-white/60 leading-relaxed font-sans">
                      {selectedDetail.explanation}
                    </p>
                  </div>
                  <div className="flex flex-col justify-center rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs">
                    <span className="text-[10px] text-white/40 uppercase">EVIDENTIARY IMPACT</span>
                    <span className="mt-1 text-xs font-semibold text-white">
                      {selectedDetail.impact}
                    </span>
                    <span className="mt-0.5 text-[11px] text-white/50">
                      {selectedDetail.confidenceImpact}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-white/40 font-sans">
                  Hover over any folder to release zero-gravity evidentiary pills. Click, drag, or throw any pill to inspect its real-world forensic verification significance.
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
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

function WaveTiltCard({
  children,
  className,
  reduceMotion,
}: {
  children: React.ReactNode;
  className?: string;
  reduceMotion?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, waveX: 50, waveY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduceMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setTilt({
        rotateX: (0.5 - y) * 7.5,
        rotateY: (x - 0.5) * 7.5,
        waveX: x * 100,
        waveY: y * 100,
      });
    },
    [reduceMotion]
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setTilt({ rotateX: 0, rotateY: 0, waveX: 50, waveY: 50 });
      }}
      style={{ perspective: "1200px" }}
      className={className}
    >
      <div
        className="relative transition-transform duration-200 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered && !reduceMotion
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.012, 1.012, 1.012)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
        }}
      >
        {/* Dynamic Specular Wave Glare */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-20"
          style={{
            opacity: isHovered ? 0.6 : 0,
            background: `radial-gradient(circle 500px at ${tilt.waveX}% ${tilt.waveY}%, rgba(255,255,255,0.08), transparent 70%)`,
          }}
        />
        {children}
      </div>
    </div>
  );
}

function SectionScrollConnector() {
  return (
    <div className="relative flex items-center justify-center -my-3 pointer-events-none z-20" aria-hidden="true">
      <div className="h-6 w-[1.5px] bg-gradient-to-b from-blue-400/50 via-white/30 to-transparent" />
      <div className="absolute size-1.5 rounded-full bg-blue-400/80 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
    </div>
  );
}

export default function Intro({ onContinue }: { onContinue?: () => void }) {
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);
  const evidenceHeadingRef = useRef<HTMLHeadingElement>(null);

  // Section Scroll Transition 0: Hero Parallax Scale & Recede
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.93]);
  const heroOpacity = useTransform(heroProgress, [0, 0.85], [1, 0.25]);
  const heroY = useTransform(heroProgress, [0, 1], [0, -60]);

  // Section Scroll Transition 5: Interactive Demo Aperture Expansion
  const demoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: demoProgress } = useScroll({
    target: demoRef,
    offset: ["start end", "center center"],
  });
  const demoScale = useTransform(demoProgress, [0, 1], [0.95, 1]);
  const demoOpacity = useTransform(demoProgress, [0, 0.8], [0.4, 1]);
  const { scrollYProgress: demoBeamProgress } = useScroll({
    target: demoRef,
    offset: ["start end", "end start"],
  });
  const demoBeamScaleX = useTransform(demoBeamProgress, [0.1, 0.7], [0, 1]);

  // Section Scroll Transition 6: Benchmarks Elevation
  const benchmarksRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: benchmarksProgress } = useScroll({
    target: benchmarksRef,
    offset: ["start end", "center center"],
  });
  const benchmarksScale = useTransform(benchmarksProgress, [0, 1], [0.96, 1]);
  const benchmarksY = useTransform(benchmarksProgress, [0, 1], [35, 0]);
  const { scrollYProgress: benchmarksBeamProgress } = useScroll({
    target: benchmarksRef,
    offset: ["start end", "end start"],
  });
  const benchmarksBeamScaleX = useTransform(benchmarksBeamProgress, [0.1, 0.7], [0, 1]);

  // Section Scroll Transition 7: Methodology Text Scrubbing
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: evidenceProgress } = useScroll({
    target: evidenceHeadingRef,
    offset: ["start 0.92", "start 0.34"],
  });
  const { scrollYProgress: howItWorksBeamProgress } = useScroll({
    target: howItWorksRef,
    offset: ["start end", "end start"],
  });
  const howItWorksBeamScaleX = useTransform(howItWorksBeamProgress, [0.1, 0.7], [0, 1]);

  // Section Scroll Transition 8: Final CTA Scale & Focus
  const ctaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: ctaProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "center center"],
  });
  const ctaScale = useTransform(ctaProgress, [0, 1], [0.95, 1]);
  const ctaY = useTransform(ctaProgress, [0, 1], [30, 0]);
  const { scrollYProgress: ctaBeamProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "end start"],
  });
  const ctaBeamScaleX = useTransform(ctaBeamProgress, [0.1, 0.7], [0, 1]);

  // Section Scroll Transition 9: Feedback Beam
  const feedbackSectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: feedbackBeamProgress } = useScroll({
    target: feedbackSectionRef,
    offset: ["start end", "end start"],
  });
  const feedbackBeamScaleX = useTransform(feedbackBeamProgress, [0.1, 0.7], [0, 1]);

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
    <div data-app-stage="landing" className="landing-shell relative">
      {/* ------------------------------------------------------------------ */}
      {/*  HERO (TOPOGRAPHY BACKGROUND WITH CENTERED HEADLINE & TOOL)        */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={heroRef}
        id="platform"
        className="landing-hero relative px-4 sm:px-8 lg:px-12 overflow-hidden min-h-[85vh] scroll-mt-20"
      >
        {/* Topography Interactive Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <Topography
            color="#38bdf8"
            lineCount={75}
            lineWidth={1.3}
            elevation={0.92}
            foreground={0.02}
            scale={0.65}
            tilt={62}
            speed={0.2}
            direction="forward"
            glow={0.9}
            brightness={1.35}
            depthOfField={0.04}
            fog={0.08}
            hoverEffect="lift"
            clickEffect="pulse"
          />
          {/* Subtle bottom fade to blend into subsequent sections seamlessly */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#030303]/80 to-transparent pointer-events-none" />
        </div>

        {/* Hero Content with Scroll-driven Parallax Recession */}
        <motion.div
          style={shouldReduceMotion ? {} : { scale: heroScale, opacity: heroOpacity, y: heroY }}
          className="relative z-10 mx-auto max-w-4xl text-center flex flex-col items-center pt-24 sm:pt-28 pb-4"
        >
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
            {/* Tagline — Centered BlurText */}
            <motion.h1
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.78,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="landing-display text-white text-center mx-auto max-w-[18ch] drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]"
            >
              <BlurText
                text="See the evidence behind the media."
                delay={70}
                animateBy="words"
                direction="top"
                className="justify-center text-center"
              />
            </motion.h1>

            {/* Supporting Copy — Centered Product Marketing */}
            <motion.p
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-5 max-w-[62ch] text-[15px] leading-7 text-white/80 sm:text-base text-center mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]"
            >
              The enterprise media verification intelligence platform. Instantly detect AI deepfakes,
              verify viral breaking claims against 14 global wire agencies, and issue tamper-proof
              auditable dossiers trusted by newsrooms and security teams.
            </motion.p>

            {/* Action Button — Centered */}
            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              <motion.button
                type="button"
                onClick={onContinue}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                className="landing-primary-button inline-flex min-h-12 items-center gap-3 rounded-control px-6 text-sm font-semibold shadow-lg shadow-white/10 cursor-pointer"
              >
                Get Started <ArrowUpRight size={17} aria-hidden />
              </motion.button>
            </motion.div>

            {/* Trust & Enterprise Compliance Badges — Centered */}
            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 border-t border-white/10 pt-4 text-xs text-white/60"
              aria-label="Enterprise capabilities"
            >
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck size={16} className="text-emerald-400" aria-hidden />
                <span>99.4% Validated Accuracy</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Globe size={16} className="text-blue-400" aria-hidden />
                <span>14 Global Wire Archives</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle size={16} className="text-purple-400" aria-hidden />
                <span>C2PA Standard Certified</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <LockKey size={16} className="text-amber-400" aria-hidden />
                <span>Zero Data Retention</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Centered Interactive Review Terminal with 3D Wave/Tilt Transition */}
        <WaveTiltCard reduceMotion={shouldReduceMotion} className="relative z-10 mx-auto max-w-4xl w-full mb-6 sm:mb-8">
          <motion.section
            id="product-check"
            aria-labelledby="preview-title"
            className="landing-tool-card w-full"
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
              <h2
                id="preview-title"
                className="text-base font-semibold tracking-tight text-white"
              >
                Verify Any Media in Seconds
              </h2>
            </div>
            <Analyzer preview />
            <p className="landing-preview-note font-mono">
              Instant multi-modal verification across web articles, photos, and video. Protected by ephemeral enclave isolation.
            </p>
          </motion.section>
        </WaveTiltCard>
      </section>

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  ACETERNITY UI HERO-PARALLAX: 3D FORENSIC TELEMETRY FLYBY         */}
      {/* ------------------------------------------------------------------ */}
      <section id="parallax-evidence" className="border-t border-white/5 relative bg-[#030303] scroll-mt-20">
        <HeroParallaxDemo />
      </section>

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 1: SCROLLYTELLING FORENSIC PIPELINE                    */}
      {/* ------------------------------------------------------------------ */}
      <ScrollyPipelineSection reduceMotion={shouldReduceMotion} />

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 3: MULTI-LAYER PARALLAX FORENSIC DOSSIER               */}
      {/* ------------------------------------------------------------------ */}
      <ParallaxDossierSection reduceMotion={shouldReduceMotion} />

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 4: ZERO-GRAVITY CASE FOLDERS // MATTER-JS PHYSICS      */}
      {/* ------------------------------------------------------------------ */}
      <FolderFloatSection reduceMotion={shouldReduceMotion} />

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 5: INTERACTIVE FORENSIC DEMO (Live Multimodal Cases)   */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={demoRef}
        id="interactive-demo"
        className="landing-section relative px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5 scroll-mt-20"
      >
        {/* Progressive luminous border beam on scroll */}
        <motion.div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent origin-left z-20"
          style={shouldReduceMotion ? {} : { scaleX: demoBeamScaleX }}
        />

        <div className="mx-auto max-w-[1280px]">
          <ScrollReveal reduceMotion={shouldReduceMotion}>
            <div className="text-center max-w-[70ch] mx-auto mb-6 sm:mb-8">
              <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Auditable Case Walkthrough
              </span>
              <h2 className="mt-3 text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                <BlurText
                  text="Inspect authentic multimodal breakdowns."
                  delay={50}
                  animateBy="words"
                  direction="top"
                  className="justify-center text-center"
                />
              </h2>
              <p className="mt-3 text-sm text-white/55 sm:text-base leading-relaxed">
                Click across real case studies to observe how claim triangulation, acoustic voice clone signals, and C2PA manifests are reported with explicit evidentiary citations.
              </p>
            </div>
          </ScrollReveal>

          <motion.div
            style={shouldReduceMotion ? {} : { scale: demoScale, opacity: demoOpacity }}
          >
            <InteractiveForensicDemo />
          </motion.div>
        </div>
      </section>

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  SYSTEM ARCHITECTURE & 3D NETWORK TOPOLOGY                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="landing-section relative border-t border-white/5 scroll-mt-16">
        <Architecture3D />
      </section>

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  DYNAMIC PRODUCTION TECH STACK SHOWCASE                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="landing-section relative border-t border-white/5 scroll-mt-16">
        <TechStackShowcase />
      </section>

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 6: EMPIRICAL BENCHMARKS (Academic Ground Truth)        */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={benchmarksRef}
        id="benchmarks"
        className="landing-section relative px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5 scroll-mt-20"
      >
        {/* Progressive luminous border beam on scroll */}
        <motion.div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent origin-left z-20"
          style={shouldReduceMotion ? {} : { scaleX: benchmarksBeamScaleX }}
        />

        <div className="mx-auto max-w-[1280px]">
          <ScrollReveal reduceMotion={shouldReduceMotion}>
            <div className="text-center max-w-[70ch] mx-auto mb-6 sm:mb-8">
              <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Empirical Evaluation · Controlled Runs
              </span>
              <h2 className="mt-3 text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                <BlurText
                  text="Tested against academic benchmark datasets."
                  delay={50}
                  animateBy="words"
                  direction="top"
                  className="justify-center text-center"
                />
              </h2>
              <p className="mt-3 text-sm text-white/55 sm:text-base leading-relaxed">
                Single-turn AI checkers hallucinate consensus or overfit to compression noise. Veritas measures balanced accuracy with 95% confidence intervals and open provenance.
              </p>
            </div>
          </ScrollReveal>

          <motion.div
            style={shouldReduceMotion ? {} : { scale: benchmarksScale, y: benchmarksY }}
          >
            <BenchmarkComparison />
          </motion.div>
        </div>
      </section>

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 7: WORD-BY-WORD SCROLL SCRUBBING (How it Works)        */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={howItWorksRef}
        id="how-it-works"
        className="landing-section relative scroll-mt-20 px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5"
      >
        {/* Progressive luminous border beam on scroll */}
        <motion.div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent origin-left z-20"
          style={shouldReduceMotion ? {} : { scaleX: howItWorksBeamScaleX }}
        />

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

          <div className="mt-8 sm:mt-10 grid gap-6 md:grid-cols-3">
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

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  TRANSITION 8: FINAL CTA SCALE & FOCAL SPOTLIGHT                   */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={ctaRef}
        id="cta-section"
        className="landing-control relative px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5 scroll-mt-20"
      >
        {/* Progressive luminous border beam on scroll */}
        <motion.div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent origin-left z-20"
          style={shouldReduceMotion ? {} : { scaleX: ctaBeamScaleX }}
        />

        <ScanGrid className="absolute inset-0 opacity-15" />
        <div className="relative mx-auto max-w-[1120px]">
          <motion.div
            style={shouldReduceMotion ? {} : { scale: ctaScale, y: ctaY }}
            className="cta-final"
          >
            <div className="cta-final-content space-y-3">
              <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Ready for Verification
              </span>
              <h2 className="text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                <BlurText
                  text="Start with the source you have."
                  delay={50}
                  animateBy="words"
                  direction="top"
                />
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
          </motion.div>
        </div>
      </section>

      {/* Inter-Section Animated Connector */}
      <SectionScrollConnector />

      {/* ------------------------------------------------------------------ */}
      {/*  FEEDBACK & CALIBRATION SECTION                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={feedbackSectionRef}
        id="feedback-section"
        className="relative px-4 py-10 sm:px-8 sm:py-14 lg:px-12 border-t border-white/5 bg-[#030305] scroll-mt-20"
      >
        {/* Progressive luminous border beam on scroll */}
        <motion.div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent origin-left z-20"
          style={shouldReduceMotion ? {} : { scaleX: feedbackBeamScaleX }}
        />

        <ScanGrid className="absolute inset-0 opacity-15 pointer-events-none" />
        <div className="relative mx-auto max-w-[1120px]">
          <ScrollReveal reduceMotion={shouldReduceMotion}>
            <Feedback1 recipientEmail="muditagrawal03@gmail.com" />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
