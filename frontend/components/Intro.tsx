"use client";

import { ArrowRight, ArrowUpRight, FilmStrip, Image as ImageIcon, Newspaper } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { Fragment, useCallback, useEffect, useRef } from "react";
import Analyzer from "@/components/Analyzer";

const INPUT_TYPES = [
  { label: "News links", Icon: Newspaper },
  { label: "Images", Icon: ImageIcon },
  { label: "Short video", Icon: FilmStrip },
] as const;

const REVIEW_STEPS = [
  {
    number: "01",
    title: "Inspect the source",
    description: "Read the article or file details and identify the claims or observations that need context.",
    detail: "Source and file facts",
  },
  {
    number: "02",
    title: "Find related evidence",
    description: "Search for independent pages related to the claim, with returned sources kept visible in the review.",
    detail: "Independent sources",
  },
  {
    number: "03",
    title: "Review the assessment",
    description: "See how the evidence and available signals informed the result, including its limits and uncertainty.",
    detail: "Reasoning and caveats",
  },
] as const;

const heroChildVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

function ScrollReveal({ children, reduceMotion, className, delay = 0, direction = "up" }: {
  children: React.ReactNode;
  reduceMotion: boolean;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const offset = direction === "left" ? { x: -30, y: 4 } : direction === "right" ? { x: 30, y: 4 } : { x: 0, y: 28 };

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -56px 0px" }}
      transition={{ duration: reduceMotion ? 0 : 0.72, delay: reduceMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ScrollRevealWord({ word, index, count, progress, reduceMotion }: {
  word: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const start = (index / Math.max(count - 1, 1)) * 0.8;
  const end = Math.min(start + 0.32, 1);
  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const y = useTransform(progress, [start, end], [18, 0]);

  return <motion.span style={reduceMotion ? { opacity: 1, y: 0 } : { opacity, y }} className="inline-block">{word}</motion.span>;
}

/** A Motion-powered adaptation of React Bits' word-by-word Scroll Reveal pattern. */
function ScrollRevealHeading({ text, progress, headingRef, reduceMotion }: {
  text: string;
  progress: MotionValue<number>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  reduceMotion: boolean;
}) {
  const words = text.split(" ");

  return (
    <h2 ref={headingRef} className="mt-4 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.045em] text-white">
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <ScrollRevealWord word={word} index={index} count={words.length} progress={progress} reduceMotion={reduceMotion} />
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h2>
  );
}

export default function Intro({ onContinue }: { onContinue?: () => void }) {
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion);
  const evidenceHeadingRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress: pageProgress } = useScroll();
  const smoothPageProgress = useSpring(pageProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
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
    return () => window.removeEventListener("veritas:how-it-works", scrollToWorkflow);
  }, [scrollToWorkflow]);

  return (
    <div data-app-stage="landing" className="landing-shell">
      <motion.div
        aria-hidden="true"
        className="landing-scroll-progress fixed inset-x-0 top-[68px] z-30 h-[2px] origin-left"
        style={{ scaleX: shouldReduceMotion ? 0 : smoothPageProgress }}
      />
      <section id="platform" className="landing-hero px-4 sm:px-8 lg:px-12">
        <div className="landing-hero-grid mx-auto grid max-w-[1320px] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:py-24">
          <motion.div
            className="landing-hero-copy"
            variants={{ hidden: {}, visible: { transition: { delayChildren: shouldReduceMotion ? 0 : 0.08, staggerChildren: shouldReduceMotion ? 0 : 0.12 } } }}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
          >
            <motion.p variants={heroChildVariants} transition={{ duration: shouldReduceMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1] }} className="landing-eyebrow">Media review workspace</motion.p>
            <motion.h1 variants={heroChildVariants} transition={{ duration: shouldReduceMotion ? 0 : 0.78, ease: [0.16, 1, 0.3, 1] }} className="landing-display mt-5 text-white">
              See the evidence behind the media.
            </motion.h1>
            <motion.p variants={heroChildVariants} transition={{ duration: shouldReduceMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1] }} className="mt-6 max-w-[58ch] text-[15px] leading-7 text-white/70 sm:text-base">
              Veritas brings source details, independent reporting and available media signals into one review—so teams can examine where an assessment comes from, and where its limits begin.
            </motion.p>

            <motion.div variants={heroChildVariants} transition={{ duration: shouldReduceMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1] }} className="mt-8 flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                onClick={onContinue}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                className="landing-primary-button inline-flex min-h-12 items-center gap-3 rounded-control px-5 text-sm font-semibold"
              >
                Start a review <ArrowUpRight size={17} aria-hidden />
              </motion.button>
              <motion.button
                type="button"
                onClick={scrollToWorkflow}
                whileHover={shouldReduceMotion ? undefined : { x: 3 }}
                className="landing-secondary-button inline-flex min-h-12 items-center gap-2 rounded-control px-4 text-sm font-medium"
              >
                See how it works <ArrowRight size={16} aria-hidden />
              </motion.button>
            </motion.div>

            <motion.div variants={heroChildVariants} transition={{ duration: shouldReduceMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1] }} className="landing-input-list mt-9 grid grid-cols-3 border-t border-white/15 pt-4" aria-label="Supported media types">
              {INPUT_TYPES.map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs font-medium text-white/70 sm:text-sm">
                  <Icon size={17} aria-hidden /> {label}
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.section
            id="product-check"
            aria-labelledby="preview-title"
            className="landing-tool-card"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 34, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.85, delay: shouldReduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="landing-preview-heading">
              <div>
                <p className="text-xs font-medium text-[var(--ink-3)]">Veritas workspace</p>
                <h2 id="preview-title" className="mt-1 text-lg font-semibold tracking-tight">Start a new review</h2>
              </div>
              <span className="landing-preview-label">Interactive preview</span>
            </div>
            <Analyzer preview />
            <p className="landing-preview-note">Choose an input type to see the review form. Preview content is not submitted.</p>
          </motion.section>
        </div>
      </section>

      <section id="how-it-works" className="landing-section scroll-mt-[68px] px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1120px]">
          <ScrollReveal reduceMotion={shouldReduceMotion} className="landing-section-heading grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-end md:gap-12">
            <div>
              <p className="landing-kicker">How a review works</p>
              <ScrollRevealHeading
                headingRef={evidenceHeadingRef}
                progress={evidenceProgress}
                reduceMotion={!!reduceMotion}
                text="Evidence stays close to the decision."
              />
            </div>
            <p className="max-w-[58ch] text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
              Follow the review from the original material to related reporting, available signals and the reasoning behind the assessment.
            </p>
          </ScrollReveal>

          <div className="landing-workflow mt-10 border-t border-white/15">
            {REVIEW_STEPS.map((step, index) => (
              <motion.article
                key={step.number}
                className="landing-workflow-row grid gap-3 border-b border-white/15 py-6 md:grid-cols-[72px_0.75fr_1.5fr_190px] md:items-start md:gap-6 md:py-7"
                initial={shouldReduceMotion ? false : { opacity: 0, x: -20, y: 18 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -48px 0px" }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.72, delay: shouldReduceMotion ? 0 : index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="font-mono text-xs tabular-nums text-white/40">{step.number}</span>
                <h3 className="text-base font-semibold tracking-[-0.02em] text-white">{step.title}</h3>
                <p className="max-w-[62ch] text-sm leading-6 text-white/65">{step.description}</p>
                <span className="text-xs font-medium text-white/45 md:text-right">{step.detail}</span>
              </motion.article>
            ))}
          </div>

          <ScrollReveal reduceMotion={shouldReduceMotion} delay={0.16}>
            <p className="landing-caveat mt-8 max-w-[75ch] text-sm leading-6 text-white/65">
              A confidence score is a model-reported estimate, not proof. Veritas keeps sources and caveats available so people can make their own judgment.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="landing-control px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <ScrollReveal reduceMotion={shouldReduceMotion} direction="left">
            <p className="landing-kicker">Designed for careful review</p>
            <h2 className="mt-4 max-w-[14ch] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.045em] text-white">
              A result to examine, not simply accept.
            </h2>
            <p className="mt-5 max-w-[54ch] text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
              Review related pages, available file facts and the model’s reasoning in one place. The final call stays with you.
            </p>
          </ScrollReveal>

          <ScrollReveal reduceMotion={shouldReduceMotion} direction="right" delay={0.12} className="landing-control-list divide-y divide-white/15 border-y border-white/15">
            <div className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
              <h3 className="text-sm font-semibold text-white">Sources remain visible</h3>
              <p className="text-sm leading-6 text-white/65">See which independent pages were returned and how they relate to the claims under review.</p>
            </div>
            <div className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
              <h3 className="text-sm font-semibold text-white">History is optional</h3>
              <p className="text-sm leading-6 text-white/65">History starts off. Turn it on only when you want to keep review results.</p>
            </div>
            <div className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
              <h3 className="text-sm font-semibold text-white">Uploads are temporary</h3>
              <p className="text-sm leading-6 text-white/65">Uploaded media is removed after processing. Provider data handling depends on the analysis route.</p>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal reduceMotion={shouldReduceMotion} delay={0.08} className="mx-auto mt-12 flex max-w-[1120px] flex-wrap items-center justify-between gap-5 border-t border-white/15 pt-7">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Start with the source you have.</h2>
            <p className="mt-2 text-sm text-white/60">Review a news link, image or short video in Veritas.</p>
          </div>
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            className="landing-primary-button inline-flex min-h-12 items-center gap-3 rounded-control px-5 text-sm font-semibold"
          >
            Start a review <ArrowUpRight size={17} aria-hidden />
          </motion.button>
        </ScrollReveal>
      </section>
    </div>
  );
}
