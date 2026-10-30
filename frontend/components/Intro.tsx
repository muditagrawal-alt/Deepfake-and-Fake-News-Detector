"use client";

import { ArrowRight, ArrowUpRight, FilmStrip, Image as ImageIcon, Newspaper } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Fragment, useCallback, useEffect, useRef, type RefObject } from "react";
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

function ScrollRevealWord({ word, index, count, progress, reduceMotion }: {
  word: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const start = (index / Math.max(count - 1, 1)) * 0.8;
  const end = Math.min(start + 0.32, 1);
  const opacity = useTransform(progress, [start, end], [0.48, 1]);
  const y = useTransform(progress, [start, end], [4, 0]);

  return <motion.span style={reduceMotion ? { opacity: 1, y: 0 } : { opacity, y }} className="inline-block">{word}</motion.span>;
}

/** A restrained, Motion-powered adaptation of React Bits' word-by-word Scroll Reveal. */
function ScrollRevealHeading({ text, progress, headingRef, reduceMotion }: {
  text: string;
  progress: MotionValue<number>;
  headingRef: RefObject<HTMLHeadingElement | null>;
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
  const evidenceHeadingRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress: pageProgress } = useScroll();
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
        className="landing-scroll-progress fixed inset-x-0 top-[68px] z-30 h-px origin-left"
        style={{ scaleX: reduceMotion ? 0 : pageProgress }}
      />
      <section id="platform" className="landing-hero px-4 sm:px-8 lg:px-12">
        <div className="landing-hero-grid mx-auto grid max-w-[1320px] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:py-24">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Media review workspace</p>
            <h1 className="landing-display mt-5 text-white">
              Make every media review easier to explain.
            </h1>
            <p className="mt-6 max-w-[58ch] text-[15px] leading-7 text-white/70 sm:text-base">
              Veritas brings source details, independent reporting and model analysis into one review—so teams can inspect the evidence and its uncertainty.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                onClick={onContinue}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="landing-primary-button inline-flex min-h-12 items-center gap-3 rounded-control px-5 text-sm font-semibold"
              >
                Start a review <ArrowUpRight size={17} aria-hidden />
              </motion.button>
              <button
                type="button"
                onClick={scrollToWorkflow}
                className="landing-secondary-button inline-flex min-h-12 items-center gap-2 rounded-control px-4 text-sm font-medium"
              >
                How it works <ArrowRight size={16} aria-hidden />
              </button>
            </div>

            <div className="landing-input-list mt-9 grid grid-cols-3 border-t border-white/15 pt-4" aria-label="Supported media types">
              {INPUT_TYPES.map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs font-medium text-white/70 sm:text-sm">
                  <Icon size={17} aria-hidden /> {label}
                </div>
              ))}
            </div>
          </div>

          <motion.section
            id="product-check"
            aria-labelledby="preview-title"
            className="landing-tool-card"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.2, 0.75, 0.25, 1] }}
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
          <div className="landing-section-heading grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-end md:gap-12">
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
              Each review follows a clear path from the original material to the sources and reasoning behind the assessment.
            </p>
          </div>

          <div className="landing-workflow mt-10 border-t border-white/15">
            {REVIEW_STEPS.map((step, index) => (
              <motion.article
                key={step.number}
                className="landing-workflow-row grid gap-3 border-b border-white/15 py-6 md:grid-cols-[72px_0.75fr_1.5fr_190px] md:items-start md:gap-6 md:py-7"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.04 }}
              >
                <span className="font-mono text-xs tabular-nums text-white/40">{step.number}</span>
                <h3 className="text-base font-semibold tracking-[-0.02em] text-white">{step.title}</h3>
                <p className="max-w-[62ch] text-sm leading-6 text-white/65">{step.description}</p>
                <span className="text-xs font-medium text-white/45 md:text-right">{step.detail}</span>
              </motion.article>
            ))}
          </div>

          <p className="landing-caveat mt-8 max-w-[75ch] text-sm leading-6 text-white/65">
            A confidence score is a model-reported estimate, not proof. Veritas keeps sources and caveats available so people can make their own judgment.
          </p>
        </div>
      </section>

      <section className="landing-control px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="landing-kicker">Designed for careful review</p>
            <h2 className="mt-4 max-w-[14ch] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.045em] text-white">
              A result you can examine, not just accept.
            </h2>
            <p className="mt-5 max-w-[54ch] text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
              Review the pages returned, the available file facts and the model’s reasoning in one place. The final call stays with you.
            </p>
          </div>

          <div className="landing-control-list divide-y divide-white/15 border-y border-white/15">
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
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-[1120px] flex-wrap items-center justify-between gap-5 border-t border-white/15 pt-7">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Start with the source you have.</h2>
            <p className="mt-2 text-sm text-white/60">Review a news link, image or short video in Veritas.</p>
          </div>
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={reduceMotion ? undefined : { y: -1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className="landing-primary-button inline-flex min-h-12 items-center gap-3 rounded-control px-5 text-sm font-semibold"
          >
            Start a review <ArrowUpRight size={17} aria-hidden />
          </motion.button>
        </div>
      </section>
    </div>
  );
}
