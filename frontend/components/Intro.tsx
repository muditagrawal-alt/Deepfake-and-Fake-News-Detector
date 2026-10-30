"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import Analyzer from "@/components/Analyzer";

const STORY_STEPS = [
  {
    number: "01",
    label: "Source",
    title: "Start with what arrived.",
    description: "Inspect the link or file itself: its format, available metadata and the claim attached to it.",
    image: "/images/landing/newspaper.jpg",
    imageAlt: "Close view of a printed newspaper",
    note: "FILE · ORIGIN · CLAIM",
  },
  {
    number: "02",
    label: "Context",
    title: "Follow the claim outward.",
    description: "Look for related reporting and independent pages. A post rarely carries the whole story on its own.",
    image: "/images/landing/phone.jpg",
    imageAlt: "A person reviews media on a phone",
    note: "CLAIM · CONTEXT · SOURCES",
  },
  {
    number: "03",
    label: "Evidence",
    title: "Keep the caveats in view.",
    description: "Read the model’s assessment beside the evidence and its limits. A confidence score is an estimate, not proof.",
    image: "/images/landing/reporting.jpg",
    imageAlt: "A camera operator records an interview",
    note: "SIGNALS · EVIDENCE · LIMITS",
  },
] as const;

export default function Intro({ onContinue }: { onContinue?: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const { scrollYProgress: storyProgress } = useScroll({ target: storyRef, offset: ["start start", "end end"] });
  const heroPanelY = useTransform(heroProgress, [0, 1], [0, 22]);
  const globeScrollY = useTransform(heroProgress, [0, 1], [0, -62]);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const globeX = useSpring(pointerX, { stiffness: 48, damping: 22, mass: 0.9 });
  const globePointerY = useSpring(pointerY, { stiffness: 48, damping: 22, mass: 0.9 });
  const globeY = useTransform([globePointerY, globeScrollY], ([pointer, scroll]) => Number(pointer) + Number(scroll));
  const stepOneOpacity = useTransform(storyProgress, [0, 0.28, 0.37, 0.68, 0.76, 1], [1, 1, 0, 0, 0, 0]);
  const stepTwoOpacity = useTransform(storyProgress, [0, 0.28, 0.37, 0.68, 0.76, 1], [0, 0, 1, 1, 0, 0]);
  const stepThreeOpacity = useTransform(storyProgress, [0, 0.28, 0.37, 0.68, 0.76, 1], [0, 0, 0, 0, 1, 1]);
  const stepOneY = useTransform(storyProgress, [0, 0.28, 0.37], [0, 0, -18]);
  const stepTwoY = useTransform(storyProgress, [0.28, 0.37, 0.68, 0.76], [18, 0, 0, -18]);
  const stepThreeY = useTransform(storyProgress, [0.68, 0.76, 1], [18, 0, 0]);
  const imageOpacities = [stepOneOpacity, stepTwoOpacity, stepThreeOpacity];
  const copyY = [stepOneY, stepTwoY, stepThreeY];
  const stepOneProgress = useTransform(storyProgress, [0, 0.34], [0, 1]);
  const stepTwoProgress = useTransform(storyProgress, [0.34, 0.68], [0, 1]);
  const stepThreeProgress = useTransform(storyProgress, [0.68, 1], [0, 1]);
  const progressBars = [stepOneProgress, stepTwoProgress, stepThreeProgress];

  const followSignal = useCallback(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);

  function moveGlobe(event: React.PointerEvent<HTMLElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 24);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 18);
  }

  function resetGlobe() {
    pointerX.set(0);
    pointerY.set(0);
  }

  useEffect(() => {
    window.addEventListener("veritas:how-it-works", followSignal);
    return () => window.removeEventListener("veritas:how-it-works", followSignal);
  }, [followSignal]);

  return (
    <div data-app-stage="landing" className="landing-shell">
      <section ref={heroRef} onPointerMove={moveGlobe} onPointerLeave={resetGlobe} className="landing-hero relative isolate min-h-[min(900px,calc(100svh-68px))] overflow-hidden px-4 py-16 sm:px-8 lg:px-12">
        <div className="landing-hero-grain pointer-events-none absolute inset-0" aria-hidden="true" />

        <motion.div
          aria-hidden="true"
          className="landing-signal-globe pointer-events-none absolute"
          style={{ x: globeX, y: globeY }}
        >
          <div className="landing-globe-halo" />
          <div className="landing-globe-dots" />
          <div className="landing-globe-shade" />
          <div className="landing-globe-ring landing-globe-ring-a" />
          <div className="landing-globe-ring landing-globe-ring-b" />
          <span className="landing-globe-reticle landing-globe-reticle-top" />
          <span className="landing-globe-reticle landing-globe-reticle-bottom" />
        </motion.div>

        <div className="landing-hero-index pointer-events-none absolute left-4 top-8 z-10 font-mono text-[9px] uppercase tracking-[0.17em] text-white/45 sm:left-8 lg:left-12">
          <span>Field note</span><span className="mx-3 text-lime-300/70">/</span><span>Veritas signal 001</span>
        </div>

        <div className="landing-hero-copy relative z-10 mx-auto w-full max-w-[1440px]">
          <div className="landing-hero-intro max-w-[730px]">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
              className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/65 sm:mb-7 sm:text-xs"
            >
              <span className="landing-live-dot size-2 rounded-full bg-lime-300" /> Independent media checks
            </motion.p>

            <h1 className="landing-display text-white">
              <span className="landing-title-mask"><motion.span initial={{ y: "112%", scaleX: 0.82 }} animate={{ y: 0, scaleX: 0.82 }} transition={{ duration: 0.85, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}>Look beyond</motion.span></span>
              <span className="landing-title-mask landing-title-outline"><motion.span initial={{ y: "112%", scaleX: 0.82 }} animate={{ y: 0, scaleX: 0.82 }} transition={{ duration: 0.9, delay: 0.17, ease: [0.16, 1, 0.3, 1] }}>the moment<span className="landing-title-period">.</span></motion.span></span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.27 }}
              className="mt-6 max-w-[46ch] text-[14px] leading-[1.75] text-white/72 sm:mt-8 sm:text-base"
            >
              Check a news link, image or video against its context, file signals and independent sources. Read the reasoning, keep the uncertainty.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.36 }}
              className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 sm:mt-8"
            >
              <motion.button
                type="button"
                onClick={onContinue}
                whileHover={{ y: -3, boxShadow: "0 16px 38px -18px rgb(201 239 89 / 0.55)" }}
                whileTap={{ scale: 0.97 }}
                className="landing-primary-button group inline-flex min-h-14 items-center gap-5 rounded-full px-6 text-sm font-semibold"
              >
                Start a check <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </motion.button>
              <button
                type="button"
                onClick={followSignal}
                className="group inline-flex min-h-12 items-center gap-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                Follow the signal <ArrowDownRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:translate-y-1" aria-hidden />
              </button>
            </motion.div>

            <div className="landing-format-rail mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 sm:mt-12 sm:gap-x-6 sm:pt-5">
              <span>Inputs</span><span className="landing-rail-mark" aria-hidden="true" />
              <span>News</span><span className="landing-rail-mark" aria-hidden="true" />
              <span>Image</span><span className="landing-rail-mark" aria-hidden="true" />
              <span>Video</span>
            </div>
          </div>

          <motion.div
            className="landing-tool-card landing-hero-check relative p-3 sm:p-5 lg:p-6"
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: heroPanelY }}
          >
            <div className="landing-card-orbit" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between gap-4 px-1">
              <div>
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-3)]">Veritas / Check</span>
                <span className="mt-1 block text-sm font-medium">Choose a starting point</span>
              </div>
              <span className="landing-tool-live inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em]"><span className="size-1.5 rounded-full bg-current" /> Preview</span>
            </div>
            <Analyzer preview />
            <p className="px-1 pt-4 text-[10px] leading-relaxed text-[var(--ink-3)]">Choose an input type here. Open the checker to submit a source and review its evidence.</p>
          </motion.div>
        </div>

        <div className="landing-hero-index landing-scroll-note pointer-events-none absolute bottom-[68px] left-4 z-10 hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/45 sm:flex sm:left-8 lg:left-12">
          <span className="landing-scroll-mark" aria-hidden="true" /> Scroll to follow the signal
        </div>

        <div className="landing-marquee absolute bottom-0 left-0 right-0 z-10 overflow-hidden border-t border-white/10" aria-hidden="true">
          <div className="landing-marquee-track flex w-max items-center py-4 font-mono text-[9px] uppercase tracking-[0.24em] text-white/50 sm:py-[18px]">
            {Array.from({ length: 2 }, (_, copy) => (
              <span key={copy} aria-hidden={copy > 0} className="flex shrink-0 items-center">
                {(["Trace", "Compare", "Context", "Evidence", "Caveats"] as const).map((word) => <span key={word} className="mx-5 inline-flex items-center gap-5 sm:mx-8 sm:gap-8">{word}<span className="landing-marquee-star" aria-hidden="true">✳</span></span>)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section ref={storyRef} id="how-it-works" className="landing-story scroll-mt-[68px] px-4 py-16 sm:px-8 sm:py-20 lg:min-h-[270vh] lg:px-12 lg:py-0">
        <div className="mx-auto max-w-[1440px] lg:sticky lg:top-[68px] lg:flex lg:h-[calc(100svh-68px)] lg:items-center lg:py-12">
          <div className="landing-story-desktop hidden w-full grid-cols-[1fr_0.88fr] items-center gap-12 lg:grid xl:gap-24">
            <div className="landing-story-visual relative h-[min(72vh,760px)] min-h-[500px] overflow-hidden bg-[#c9c8bc]">
              {STORY_STEPS.map((step, index) => (
                <motion.div
                  key={step.number}
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ opacity: imageOpacities[index] }}
                >
                  <Image src={step.image} alt="" fill sizes="(min-width: 1280px) 52vw, 50vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
                  <span className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80">{step.note}</span>
                </motion.div>
              ))}
              <div className="landing-image-stamp absolute left-6 top-6 grid size-16 place-items-center rounded-full border border-white/60 font-mono text-[10px] uppercase tracking-wider text-white sm:size-[76px]">
                <span>Look<br />closer</span>
              </div>
            </div>

            <div className="flex min-h-[min(72vh,760px)] flex-col justify-between py-2">
              <div>
                <p className="landing-kicker font-mono text-[10px] uppercase tracking-[0.19em]">How a check unfolds</p>
                <h2 className="mt-7 max-w-[10ch] text-[clamp(3rem,5.4vw,6.1rem)] font-medium leading-[0.92] tracking-[-0.075em]">A better read takes a little more.</h2>
              </div>

              <div className="relative min-h-[190px]">
                {STORY_STEPS.map((step, index) => (
                  <motion.article
                    key={step.number}
                    className="absolute inset-0 flex flex-col justify-end"
                    style={{ opacity: imageOpacities[index], y: copyY[index] }}
                  >
                    <p className="landing-kicker font-mono text-[11px] uppercase tracking-[0.18em]">{step.number} <span className="mx-2 opacity-40">/</span> {step.label}</p>
                    <h3 className="mt-3 text-3xl font-medium tracking-[-0.055em] sm:text-4xl">{step.title}</h3>
                    <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.75] text-[var(--ink-2)]">{step.description}</p>
                  </motion.article>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-8" role="group" aria-label="Progress through the verification story">
                {STORY_STEPS.map((step, index) => {
                  return (
                    <div key={step.number} className="space-y-2">
                      <div className="h-[2px] overflow-hidden bg-white/10"><motion.div className="h-full origin-left bg-[var(--accent)]" style={{ scaleX: progressBars[index] }} /></div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--ink-3)]">{step.number} {step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="landing-story-mobile lg:hidden">
            <p className="landing-kicker font-mono text-[10px] uppercase tracking-[0.19em]">How a check unfolds</p>
            <h2 className="mt-6 max-w-[10ch] text-[clamp(3.3rem,13vw,5.8rem)] font-medium leading-[0.9] tracking-[-0.075em]">A better read takes a little more.</h2>
            <div className="mt-10 space-y-12">
              {STORY_STEPS.map((step, index) => (
                <motion.article
                  key={step.number}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: index * 0.04 }}
                >
                  <div className="relative aspect-[1.14/1] overflow-hidden bg-[#c9c8bc]">
                    <Image src={step.image} alt={step.imageAlt} fill sizes="100vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    <span className="absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-[0.16em] text-white/80">{step.note}</span>
                  </div>
                  <div className="mt-5 flex items-baseline gap-3">
                    <p className="landing-kicker font-mono text-[10px] uppercase tracking-[0.18em]">{step.number}</p>
                    <h3 className="text-2xl font-medium tracking-[-0.05em]">{step.title}</h3>
                  </div>
                  <p className="mt-3 max-w-[48ch] text-sm leading-[1.75] text-[var(--ink-2)]">{step.description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-close relative isolate overflow-hidden px-4 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40">
        <div className="landing-close-orbit absolute -right-36 -top-40 -z-10 size-[min(80vw,850px)] rounded-full border border-white/10" aria-hidden="true" />
        <div className="mx-auto grid max-w-[1440px] items-end gap-10 lg:grid-cols-[1fr_auto]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.62 }}
          >
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">A little more context changes everything</p>
            <h2 className="max-w-[11ch] text-[clamp(3.6rem,8vw,8.8rem)] font-medium leading-[0.88] tracking-[-0.08em] text-white">Take a closer look.</h2>
          </motion.div>
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="landing-close-button group inline-flex min-h-14 items-center gap-5 justify-self-start rounded-full px-6 text-sm font-semibold lg:justify-self-end"
          >
            Open Veritas <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </motion.button>
        </div>
      </section>
    </div>
  );
}
