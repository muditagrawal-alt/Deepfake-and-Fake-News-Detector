"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
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
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const { scrollYProgress: storyProgress } = useScroll({ target: storyRef, offset: ["start start", "end end"] });
  const heroImageY = useTransform(heroProgress, [0, 1], [0, 72]);
  const heroImageScale = useTransform(heroProgress, [0, 1], [1.04, 1.12]);
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

  useEffect(() => {
    function showMethod() {
      document.getElementById("how-it-works")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    window.addEventListener("veritas:how-it-works", showMethod);
    return () => window.removeEventListener("veritas:how-it-works", showMethod);
  }, [reduceMotion]);

  return (
    <div data-app-stage="landing" className="landing-shell">
      <section ref={heroRef} className="landing-hero relative isolate flex min-h-[min(850px,calc(100svh-68px))] items-center px-4 py-16 sm:px-8 lg:px-12">
        <motion.div
          aria-hidden="true"
          className="landing-hero-photo absolute inset-y-0 right-0 w-full overflow-hidden sm:w-[78%] lg:w-[72%]"
          style={reduceMotion ? undefined : { y: heroImageY, scale: heroImageScale }}
        >
          <Image
            src="/images/landing/reporting.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 72vw, 100vw"
            className="object-cover object-[44%_50%]"
          />
        </motion.div>
        <div className="landing-hero-grain pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px]">
          <div className="max-w-[900px]">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.2, 0.8, 0.2, 1] }}
              className="mb-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 sm:text-xs"
            >
              <span className="size-2 rounded-full bg-lime-300" /> Independent media checks, with the evidence in view
            </motion.p>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[9ch] text-[clamp(4.25rem,10.8vw,10.25rem)] font-medium leading-[0.82] tracking-[-0.09em] text-white"
            >
              Look beyond<br />
              <span className="landing-highlight">the moment.</span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.18 }}
              className="mt-8 max-w-[48ch] text-[15px] leading-[1.75] text-white/75 sm:text-lg"
            >
              Trace a claim from a link, image or video to its context, file signals and independent sources.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.28 }}
              className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3"
            >
              <motion.button
                type="button"
                onClick={onContinue}
                whileHover={reduceMotion ? undefined : { y: -3, boxShadow: "0 16px 38px -18px rgb(201 239 89 / 0.55)" }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className="group inline-flex min-h-14 items-center gap-5 rounded-full bg-[#d4f36a] px-6 text-sm font-semibold text-[#12160e] transition-colors hover:bg-[#e2ff8c]"
              >
                Open the checker <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </motion.button>
              <button
                type="button"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })}
                className="group inline-flex min-h-12 items-center gap-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                Follow the evidence <ArrowDownRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:translate-y-1" aria-hidden />
              </button>
            </motion.div>
          </div>

          <div className="landing-hero-index absolute bottom-[-7.2rem] right-0 hidden items-end gap-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70 sm:flex lg:bottom-[-5.4rem]">
            <span>01 / 03</span><span className="h-px w-16 bg-white/40" /><span>Source · context · evidence</span>
          </div>
        </div>
        <div className="landing-photo-label absolute bottom-6 left-4 z-10 font-mono text-[9px] uppercase tracking-[0.18em] text-white/60 sm:left-8 lg:left-12">
          Read past the frame <span className="ml-2 text-white/35">—</span> Veritas
        </div>
      </section>

      <section ref={storyRef} id="how-it-works" className={`landing-story scroll-mt-[68px] px-4 py-16 sm:px-8 sm:py-20 lg:px-12 ${reduceMotion ? "" : "lg:min-h-[270vh] lg:py-0"}`}>
        <div className={`mx-auto max-w-[1440px] ${reduceMotion ? "" : "lg:sticky lg:top-[68px] lg:flex lg:h-[calc(100svh-68px)] lg:items-center lg:py-12"}`}>
          <div className={reduceMotion ? "hidden" : "hidden w-full grid-cols-[1fr_0.88fr] items-center gap-12 lg:grid xl:gap-24"}>
            <div className="landing-story-visual relative h-[min(72vh,760px)] min-h-[500px] overflow-hidden bg-[#c9c8bc]">
              {STORY_STEPS.map((step, index) => (
                <motion.div
                  key={step.number}
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={reduceMotion ? { opacity: index === 0 ? 1 : 0 } : { opacity: imageOpacities[index] }}
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
                    style={reduceMotion ? { opacity: index === 0 ? 1 : 0 } : { opacity: imageOpacities[index], y: copyY[index] }}
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
                      <div className="h-[2px] overflow-hidden bg-black/10"><motion.div className="h-full origin-left bg-[var(--accent)]" style={reduceMotion ? { scaleX: index === 0 ? 1 : 0 } : { scaleX: progressBars[index] }} /></div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--ink-3)]">{step.number} {step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={reduceMotion ? "landing-story-reduced" : "lg:hidden"}>
            <p className="landing-kicker font-mono text-[10px] uppercase tracking-[0.19em]">How a check unfolds</p>
            <h2 className="mt-6 max-w-[10ch] text-[clamp(3.3rem,13vw,5.8rem)] font-medium leading-[0.9] tracking-[-0.075em]">A better read takes a little more.</h2>
            <div className="mt-10 space-y-12">
              {STORY_STEPS.map((step, index) => (
                <motion.article
                  key={step.number}
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : index * 0.04 }}
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

      <section className="landing-tool px-4 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-[1440px] items-start gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div className="lg:sticky lg:top-28">
            <p className="landing-tool-kicker font-mono text-[10px] uppercase tracking-[0.19em]">Bring the piece you want to check</p>
            <h2 className="mt-6 max-w-[9ch] text-[clamp(3.3rem,7vw,7.5rem)] font-medium leading-[0.88] tracking-[-0.08em]">Start with a link, image or clip.</h2>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.8] text-[var(--ink-2)]">Choose what you have. Veritas brings the available signals and source context together for a more informed read.</p>
            <motion.button
              type="button"
              onClick={onContinue}
              whileHover={reduceMotion ? undefined : { x: 4 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className="landing-tool-button group mt-8 inline-flex min-h-12 items-center gap-3 rounded-full px-5 text-sm font-semibold"
            >
              Go to the workspace <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </motion.button>
          </div>

          <div className="landing-tool-card p-3 sm:p-5 lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-4 px-1">
              <div>
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-3)]">Veritas / Check</span>
                <span className="mt-1 block text-sm font-medium">Choose a starting point</span>
              </div>
              <span className="landing-tool-live inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em]"><span className="size-1.5 rounded-full bg-current" /> Live interface</span>
            </div>
            <Analyzer preview />
            <p className="px-1 pt-4 text-[10px] leading-relaxed text-[var(--ink-3)]">Switch between input types here. Open the workspace to submit a check and review its evidence.</p>
          </div>
        </div>
      </section>

      <section className="landing-close relative isolate overflow-hidden px-4 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40">
        <div className="landing-close-orbit absolute -right-36 -top-40 -z-10 size-[min(80vw,850px)] rounded-full border border-white/10" aria-hidden="true" />
        <div className="mx-auto grid max-w-[1440px] items-end gap-10 lg:grid-cols-[1fr_auto]">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: reduceMotion ? 0 : 0.62 }}
          >
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">A little more context changes everything</p>
            <h2 className="max-w-[11ch] text-[clamp(3.6rem,8vw,8.8rem)] font-medium leading-[0.88] tracking-[-0.08em] text-white">Take a closer look.</h2>
          </motion.div>
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            className="landing-close-button group inline-flex min-h-14 items-center gap-5 justify-self-start rounded-full px-6 text-sm font-semibold lg:justify-self-end"
          >
            Open Veritas <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </motion.button>
        </div>
      </section>
    </div>
  );
}
