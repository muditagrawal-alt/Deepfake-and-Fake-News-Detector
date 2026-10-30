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
} from "@phosphor-icons/react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  type MotionValue,
} from "motion/react";
import { Fragment, useCallback, useEffect, useRef } from "react";
import Analyzer from "@/components/Analyzer";
import ForensicCanvas3D from "@/components/ForensicCanvas3D";
import InteractiveForensicDemo from "@/components/InteractiveForensicDemo";
import BenchmarkComparison from "@/components/BenchmarkComparison";

const INPUT_TYPES = [
  { label: "News links", Icon: Newspaper },
  { label: "Images", Icon: ImageIcon },
  { label: "Short video", Icon: FilmStrip },
] as const;

const PIPELINE_STAGES = [
  {
    id: "source",
    title: "Source Ingestion & Extraction",
    description: "Extract the article body, isolate raw video frames, decode audio channels, and read container metadata.",
    Icon: Eye,
    metric: "STAGE 01 // EXTRACT",
    detail: "EXIF, C2PA manifests, audio vocoder harmonics, structural article text",
  },
  {
    id: "evidence",
    title: "Multi-Angle Triangulation",
    description: "Formulate atomic claim queries across independent global press registries. Every returned citation remains linked.",
    Icon: MagnifyingGlass,
    metric: "STAGE 02 // SEARCH",
    detail: "Open-web registries, Reuters, AP, government archives, DuckDuckGo & Tavily",
  },
  {
    id: "signal",
    title: "Calibrated Evidence Synthesis",
    description: "Synthesize extracted forensic signals with verified independent facts. Estimates include uncertainty bounds and caveats.",
    Icon: Fingerprint,
    metric: "STAGE 03 // SYNTHESIZE",
    detail: "Multi-signal weighting, Bayesian confidence intervals, failure mode caveats",
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
      ? { x: -30, y: 4 }
      : direction === "right"
        ? { x: 30, y: 4 }
        : { x: 0, y: 28 };

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
      transition={{
        duration: reduceMotion ? 0 : 0.72,
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
  const start = (index / Math.max(count - 1, 1)) * 0.75;
  const end = Math.min(start + 0.32, 1);
  const opacity = useTransform(progress, [start, end], [0.4, 1]);
  const y = useTransform(progress, [start, end], [12, 0]);

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
/*  Parallax mouse tracker                                                    */
/* -------------------------------------------------------------------------- */

function useMouseParallax(strength: number = 8) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    function onMove(e: MouseEvent) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      x.set(((e.clientX - cx) / cx) * strength);
      y.set(((e.clientY - cy) / cy) * strength);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [x, y, strength, reduceMotion]);

  return { x, y };
}

/* -------------------------------------------------------------------------- */
/*  Main landing page                                                         */
/* -------------------------------------------------------------------------- */

const heroChildVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Intro({ onContinue }: { onContinue?: () => void }) {
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);
  const evidenceHeadingRef = useRef<HTMLHeadingElement>(null);
  const canvas3DRef = useRef<HTMLDivElement>(null);

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

  const { scrollYProgress: canvas3DProgress } = useScroll({
    target: canvas3DRef,
    offset: ["start end", "end start"],
  });

  const mouse = useMouseParallax(4);

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
      {/*  HERO                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section id="platform" className="landing-hero relative px-4 sm:px-8 lg:px-12">
        <ScanGrid className="absolute inset-0 opacity-40" />

        {/* Top telemetry ticker */}
        <div className="mx-auto max-w-[1320px] pt-8 pb-4 flex items-center justify-between text-[11px] font-mono text-white/40 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-real animate-pulse" />
            <span>VERITAS v3 // MULTI-MODAL PROVENANCE ENGINE</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>ZERO PERSISTENCE</span>
            <span>OPEN WEB TRIANGULATION</span>
            <span>MEDIAN LATENCY: 12.4s</span>
          </div>
        </div>

        <div className="landing-hero-grid mx-auto grid max-w-[1320px] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
          <motion.div
            className="landing-hero-copy relative z-10"
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
            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="hero-status-badge"
            >
              <span className="hero-status-dot" />
              Intelligence-Grade Media Verification
            </motion.div>

            <motion.h1
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.78,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="landing-display mt-6 text-white"
            >
              See the evidence behind the media.
            </motion.h1>

            <motion.p
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-6 max-w-[54ch] text-[15px] leading-7 text-white/60 sm:text-base"
            >
              Veritas extracts source facts, queries independent press records, and audits
              forensic sensor signals into one transparent review — so analysts and newsrooms
              can inspect where an assessment comes from and where its limits begin.
            </motion.p>

            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-8 flex flex-wrap items-center gap-3"
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

            <motion.div
              variants={heroChildVariants}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.72,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="landing-input-list mt-10 grid grid-cols-3 border-t border-white/10 pt-5"
              aria-label="Supported media types"
            >
              {INPUT_TYPES.map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-xs font-medium text-white/50 sm:text-sm"
                >
                  <Icon size={17} aria-hidden /> {label}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero interactive review card */}
          <motion.section
            id="product-check"
            aria-labelledby="preview-title"
            className="landing-tool-card relative"
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, y: 34, scale: 0.985 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.85,
              delay: shouldReduceMotion ? 0 : 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={
              shouldReduceMotion ? {} : { x: mouse.x, y: mouse.y }
            }
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
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  3D FORENSIC CANVAS SECTION                                        */}
      {/* ------------------------------------------------------------------ */}
      <section
        ref={canvas3DRef}
        className="landing-section relative overflow-hidden scroll-mt-[68px] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-36 border-t border-white/5"
      >
        <ScanGrid className="absolute inset-0 opacity-20" />
        <div className="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5 space-y-6">
            <ScrollReveal reduceMotion={shouldReduceMotion} direction="left">
              <span className="font-mono text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                Interactive 3D Decomposition
              </span>
              <h2 className="mt-3 text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                Every check inspects three dimensions at once.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
                Veritas projects incoming media onto three orthogonal inspection planes. Drag to orbit the 3D volume; scrolling separates the forensic plates along the Z-axis.
              </p>
            </ScrollReveal>

            {/* Pipeline Stage Cards */}
            <div className="space-y-3 pt-2">
              {PIPELINE_STAGES.map((stage, idx) => (
                <ScrollReveal
                  key={stage.id}
                  reduceMotion={shouldReduceMotion}
                  delay={idx * 0.1}
                >
                  <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between text-xs font-mono text-white/40 mb-1">
                      <span>{stage.metric}</span>
                      <stage.Icon size={16} className="text-white/60" aria-hidden />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{stage.title}</h3>
                    <p className="mt-1 text-xs text-white/50 leading-relaxed">
                      {stage.description}
                    </p>
                    <p className="mt-2 text-[10px] font-mono text-white/30 border-t border-white/5 pt-1.5">
                      {stage.detail}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Right: 3D Canvas Projection Component */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <ScrollReveal
              reduceMotion={shouldReduceMotion}
              direction="right"
              className="w-full rounded-2xl border border-white/10 bg-[#060608] p-4 sm:p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2 font-mono text-xs text-white/40">
                <span>CANVAS 3D // SPATIAL VOLUMETRIC SCANNER</span>
                <span className="text-real">REAL-TIME RENDER</span>
              </div>
              <ForensicCanvas3D scrollProgress={canvas3DProgress.get()} />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  INTERACTIVE FORENSIC DEMO (Live Case Explorer)                    */}
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
      {/*  EMPIRICAL BENCHMARKS (Anti-AI-Slop Empirical Proof)                */}
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
      {/*  HOW A REVIEW WORKS (Evidence Stays Close)                          */}
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
                <div className="mt-6 pt-4 border-t border-white/5 font-mono text-[11px] text-real flex items-center gap-1.5">
                  <ShieldCheck size={14} aria-hidden />
                  <span>GUARANTEED ARCHITECTURE</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  FINAL CTA (Institutional Grade)                                   */}
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
